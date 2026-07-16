"""Iterate modeling levers toward board-wide ~70–75% mean symbol hit."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable

from chime.logging_setup import get_logger
from chime.ml import sklearn_available
from chime.ml.dataset import Sample, build_samples, load_symbol_bars
from chime.ml.diagnose import PredRow, analyze_rows, load_sector_map
from chime.ml.features import FEATURE_NAMES
from chime.ml.harden import _demean_by_day, _purge_train
from chime.ml.walkforward import _unique_sorted_dates
from chime.storage import Storage

log = get_logger(__name__)


@dataclass
class LeverResult:
    lever: str
    pooled_hit: float | None
    mean_symbol_hit: float | None
    symbols_ge_070: int
    symbols_ge_075: int
    n_symbols: int
    n_rows: int
    high_bucket_hit: float | None
    notes: str = ""

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class IterateResult:
    baseline_mean_symbol_hit: float | None
    best_lever: str | None
    best_mean_symbol_hit: float | None
    target_met: bool
    levers: list[LeverResult] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "baseline_mean_symbol_hit": self.baseline_mean_symbol_hit,
            "best_lever": self.best_lever,
            "best_mean_symbol_hit": self.best_mean_symbol_hit,
            "target_met": self.target_met,
            "levers": [asdict(x) for x in self.levers],
            "recommendations": list(self.recommendations),
        }


def _enrich_cross_section(samples: list[Sample]) -> list[Sample]:
    """Append within-day percentiles for ret_1d, ret_5d, vol_20d."""
    by_day: dict[Any, list[Sample]] = defaultdict(list)
    for s in samples:
        by_day[s.as_of].append(s)
    idx_ret1 = FEATURE_NAMES.index("ret_1d")
    idx_ret5 = FEATURE_NAMES.index("ret_5d")
    idx_vol = FEATURE_NAMES.index("vol_20d")
    out: list[Sample] = []
    for day_samples in by_day.values():

        def pct_map(index: int) -> dict[str, float]:
            pairs = [
                (s.symbol, s.x[index])
                for s in day_samples
                if math.isfinite(s.x[index])
            ]
            if len(pairs) < 3:
                return {s.symbol: float("nan") for s in day_samples}
            ordered = sorted(pairs, key=lambda t: t[1])
            n = len(ordered)
            return {
                sym: i / (n - 1) if n > 1 else 0.5
                for i, (sym, _) in enumerate(ordered)
            }

        p1 = pct_map(idx_ret1)
        p5 = pct_map(idx_ret5)
        pv = pct_map(idx_vol)
        for s in day_samples:
            extra = (
                p1.get(s.symbol, float("nan")),
                p5.get(s.symbol, float("nan")),
                pv.get(s.symbol, float("nan")),
            )
            out.append(
                Sample(
                    symbol=s.symbol,
                    as_of=s.as_of,
                    x=tuple(s.x) + extra,
                    y_ret=s.y_ret,
                    y_dir=s.y_dir,
                    horizon=s.horizon,
                )
            )
    return out


def _fit_hgb_clf(
    train: list[Sample],
    test: list[Sample],
    *,
    max_depth: int = 4,
    max_iter: int = 100,
    sample_weight: list[float] | None = None,
) -> list[float]:
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingClassifier

    x_train = np.asarray([s.x for s in train], dtype=float)
    x_test = np.asarray([s.x for s in test], dtype=float)
    y = np.asarray([1 if s.y_dir > 0 else 0 for s in train])
    clf = HistGradientBoostingClassifier(
        max_depth=max_depth, max_iter=max_iter, learning_rate=0.08
    )
    if sample_weight is not None:
        clf.fit(x_train, y, sample_weight=np.asarray(sample_weight, dtype=float))
    else:
        clf.fit(x_train, y)
    proba = clf.predict_proba(x_test)[:, 1]
    return [float(p - 0.5) for p in proba]


def _fit_logistic(train: list[Sample], test: list[Sample]) -> list[float]:
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    x_train = np.asarray([s.x for s in train], dtype=float).copy()
    x_test = np.asarray([s.x for s in test], dtype=float).copy()
    col_med = np.nanmedian(x_train, axis=0)
    col_med = np.where(np.isnan(col_med), 0.0, col_med)
    for arr in (x_train, x_test):
        inds = np.where(np.isnan(arr))
        arr[inds] = np.take(col_med, inds[1])
    y = np.asarray([1 if s.y_dir > 0 else 0 for s in train])
    clf = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500, C=1.0))
    clf.fit(x_train, y)
    proba = clf.predict_proba(x_test)[:, 1]
    return [float(p - 0.5) for p in proba]


def _rows_from_scores(
    test: list[Sample],
    scores: list[float],
    *,
    fold: int,
    sectors: dict[str, str] | None,
) -> list[PredRow]:
    rows: list[PredRow] = []
    for s, sc in zip(test, scores, strict=True):
        if s.y_dir == 0 or sc == 0:
            continue
        pred_d = 1.0 if sc > 0 else -1.0
        hit = (s.y_dir > 0 and pred_d > 0) or (s.y_dir < 0 and pred_d < 0)
        rows.append(
            PredRow(
                symbol=s.symbol,
                as_of=s.as_of,
                fold=fold,
                score=float(sc),
                y_dir=float(s.y_dir),
                y_ret=float(s.y_ret),
                hit=hit,
                features=s.x[: len(FEATURE_NAMES)]
                if len(s.x) >= len(FEATURE_NAMES)
                else s.x,
                sector=(sectors or {}).get(s.symbol),
            )
        )
    return rows


PredictFn = Callable[[list[Sample], list[Sample]], list[float]]


def _walk_predict(
    samples: list[Sample],
    *,
    horizon: int,
    predict: PredictFn,
    sectors: dict[str, str] | None,
    min_train_days: int = 100,
    fold_step: int = 10,
    embargo: int = 2,
) -> list[PredRow]:
    dates = _unique_sorted_dates(samples)
    if len(dates) < min_train_days + fold_step:
        return []
    rows: list[PredRow] = []
    cut = min_train_days
    fold = 0
    while cut + fold_step <= len(dates):
        test_dates = set(dates[cut : cut + fold_step])
        train = _purge_train(
            samples, dates=dates, cut=cut, horizon=horizon, embargo=embargo
        )
        test = [s for s in samples if s.as_of in test_dates]
        cut += fold_step
        if len(train) < 50 or len(test) < 10:
            continue
        try:
            scores = predict(train, test)
        except Exception as exc:
            log.warning("iterate_fold_failed", fold=fold, error=str(exc))
            continue
        rows.extend(
            _rows_from_scores(test, scores, fold=fold, sectors=sectors)
        )
        fold += 1
    return rows


def _predict_sector_models(
    train: list[Sample],
    test: list[Sample],
    *,
    sectors: dict[str, str],
) -> list[float]:
    """Fit a global model plus per-sector models; use sector when enough train."""
    global_scores = _fit_hgb_clf(train, test)
    by_sec_train: dict[str, list[Sample]] = defaultdict(list)
    for s in train:
        sec = sectors.get(s.symbol, "_UNK")
        by_sec_train[sec].append(s)
    sec_models: dict[str, Any] = {}
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingClassifier

    for sec, ts in by_sec_train.items():
        if len(ts) < 80:
            continue
        x = np.asarray([s.x for s in ts], dtype=float)
        y = np.asarray([1 if s.y_dir > 0 else 0 for s in ts])
        if len(set(y.tolist())) < 2:
            continue
        clf = HistGradientBoostingClassifier(max_depth=4, max_iter=100)
        clf.fit(x, y)
        sec_models[sec] = clf

    out: list[float] = []
    for i, s in enumerate(test):
        sec = sectors.get(s.symbol, "_UNK")
        clf = sec_models.get(sec)
        if clf is None:
            out.append(global_scores[i])
            continue
        import numpy as np

        proba = clf.predict_proba(np.asarray([s.x], dtype=float))[0, 1]
        out.append(float(proba - 0.5))
    return out


def _predict_vol_bucket(
    train: list[Sample], test: list[Sample]
) -> list[float]:
    """Three HGBs on vol_20d terciles of train; route test by train cutpoints."""
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingClassifier

    vol_i = FEATURE_NAMES.index("vol_20d")
    vols = [s.x[vol_i] for s in train if math.isfinite(s.x[vol_i])]
    if len(vols) < 90:
        return _fit_hgb_clf(train, test)
    ordered = sorted(vols)
    t1 = ordered[len(ordered) // 3]
    t2 = ordered[(2 * len(ordered)) // 3]

    def bucket(v: float) -> str:
        if not math.isfinite(v) or v <= t1:
            return "low"
        if v <= t2:
            return "mid"
        return "high"

    models: dict[str, Any] = {}
    for name in ("low", "mid", "high"):
        ts = [s for s in train if bucket(s.x[vol_i]) == name]
        if len(ts) < 40:
            continue
        x = np.asarray([s.x for s in ts], dtype=float)
        y = np.asarray([1 if s.y_dir > 0 else 0 for s in ts])
        if len(set(y.tolist())) < 2:
            continue
        clf = HistGradientBoostingClassifier(max_depth=4, max_iter=100)
        clf.fit(x, y)
        models[name] = clf
    global_scores = _fit_hgb_clf(train, test)
    out: list[float] = []
    for i, s in enumerate(test):
        clf = models.get(bucket(s.x[vol_i]))
        if clf is None:
            out.append(global_scores[i])
            continue
        proba = clf.predict_proba(np.asarray([s.x], dtype=float))[0, 1]
        out.append(float(proba - 0.5))
    return out


def _predict_ensemble(train: list[Sample], test: list[Sample]) -> list[float]:
    a = _fit_hgb_clf(train, test)
    b = _fit_logistic(train, test)
    return [0.6 * x + 0.4 * y for x, y in zip(a, b, strict=True)]


def _predict_weighted(train: list[Sample], test: list[Sample]) -> list[float]:
    # Weight by |y_ret| so larger moves matter more in training.
    w = [max(abs(s.y_ret), 1e-4) for s in train]
    return _fit_hgb_clf(train, test, sample_weight=w)


def _predict_deep(train: list[Sample], test: list[Sample]) -> list[float]:
    return _fit_hgb_clf(train, test, max_depth=6, max_iter=200)


def _summarize(
    lever: str, rows: list[PredRow], *, notes: str = ""
) -> LeverResult:
    diag = analyze_rows(rows, model_id=lever, horizon=1, panel=True)
    return LeverResult(
        lever=lever,
        pooled_hit=diag.pooled_hit,
        mean_symbol_hit=diag.mean_symbol_hit,
        symbols_ge_070=diag.symbols_ge_070,
        symbols_ge_075=diag.symbols_ge_075,
        n_symbols=diag.n_symbols,
        n_rows=diag.n_rows,
        high_bucket_hit=diag.bucket_hits.get("HIGH"),
        notes=notes,
    )


async def run_iterate(
    *,
    storage: Storage,
    limit_symbols: int | None = None,
    out_dir: Path = Path("docs/experiments"),
) -> IterateResult:
    if not sklearn_available():
        return IterateResult(
            baseline_mean_symbol_hit=None,
            best_lever=None,
            best_mean_symbol_hit=None,
            target_met=False,
            recommendations=["sklearn not installed"],
        )

    series = await load_symbol_bars(storage, limit_symbols=limit_symbols)
    sectors = await load_sector_map(storage)
    base = build_samples(series, horizon=1, min_history=60)
    panel = _demean_by_day(base)
    panel_cs = _enrich_cross_section(panel)

    levers: list[tuple[str, list[Sample], PredictFn, str]] = [
        ("baseline_panel_hgb", panel, _fit_hgb_clf, "panel demean + M1"),
        (
            "panel_cs_features",
            panel_cs,
            _fit_hgb_clf,
            "panel + within-day ret/vol percentiles",
        ),
        (
            "panel_sector_models",
            panel,
            lambda tr, te: _predict_sector_models(tr, te, sectors=sectors),
            "global + per-sector HGB when n_train≥80",
        ),
        (
            "panel_vol_buckets",
            panel,
            _predict_vol_bucket,
            "separate HGB per vol_20d tercile",
        ),
        (
            "panel_ensemble",
            panel,
            _predict_ensemble,
            "0.6 HGB + 0.4 logistic",
        ),
        (
            "panel_cs_ensemble",
            panel_cs,
            _predict_ensemble,
            "CS features + blend",
        ),
        (
            "panel_absret_weighted",
            panel,
            _predict_weighted,
            "sample weight ∝ |y_ret|",
        ),
        (
            "panel_deeper_hgb",
            panel,
            _predict_deep,
            "max_depth=6 max_iter=200",
        ),
        (
            "panel_cs_deeper",
            panel_cs,
            _predict_deep,
            "CS features + deeper HGB",
        ),
    ]

    results: list[LeverResult] = []
    for name, samples, predict, notes in levers:
        log.info("iterate_lever_start", lever=name, samples=len(samples))
        rows = _walk_predict(
            samples, horizon=1, predict=predict, sectors=sectors
        )
        lr = _summarize(name, rows, notes=notes)
        results.append(lr)
        log.info(
            "iterate_lever_done",
            lever=name,
            mean_symbol_hit=lr.mean_symbol_hit,
            pooled_hit=lr.pooled_hit,
            ge70=lr.symbols_ge_070,
        )

    baseline = next(
        (r for r in results if r.lever == "baseline_panel_hgb"), None
    )
    best = max(
        results,
        key=lambda r: r.mean_symbol_hit if r.mean_symbol_hit is not None else -1,
    )
    target = (
        best.mean_symbol_hit is not None and best.mean_symbol_hit >= 0.70
    )
    recs: list[str] = []
    if target:
        recs.append(
            f"TARGET MET via `{best.lever}` "
            f"mean_symbol_hit={best.mean_symbol_hit:.3f}"
        )
    else:
        recs.append(
            f"Best so far `{best.lever}` "
            f"mean_symbol_hit={best.mean_symbol_hit} — still below 0.70. "
            "Next: notices/filings features, meta-label, or longer history."
        )
        if baseline and best.mean_symbol_hit and baseline.mean_symbol_hit:
            lift = best.mean_symbol_hit - baseline.mean_symbol_hit
            recs.append(f"Lift vs baseline: {lift:+.3f}")

    out = IterateResult(
        baseline_mean_symbol_hit=baseline.mean_symbol_hit if baseline else None,
        best_lever=best.lever,
        best_mean_symbol_hit=best.mean_symbol_hit,
        target_met=target,
        levers=results,
        recommendations=recs,
    )
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    out_dir.mkdir(parents=True, exist_ok=True)
    md = out_dir / f"ml_iterate_{stamp}.md"
    js = md.with_suffix(".json")
    md.write_text(render_iterate_markdown(out), encoding="utf-8")
    js.write_text(json.dumps(out.as_dict(), indent=2) + "\n", encoding="utf-8")
    log.info("iterate_done", report=str(md), target_met=target)
    return out


def render_iterate_markdown(result: IterateResult) -> str:
    lines = [
        "# ML iterate — chasing board-wide 70–75%",
        "",
        f"**Generated (UTC):** {datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Baseline mean symbol hit:** {result.baseline_mean_symbol_hit}",
        f"**Best lever:** `{result.best_lever}` @ {result.best_mean_symbol_hit}",
        f"**Target met (≥0.70 mean symbol hit):** {result.target_met}",
        "",
        "## Lever board",
        "",
        "| Lever | Mean sym hit | Pooled | ≥70% syms | ≥75% | Rows | HIGH hit | Notes |",
        "|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    for r in sorted(
        result.levers,
        key=lambda x: x.mean_symbol_hit if x.mean_symbol_hit is not None else -1,
        reverse=True,
    ):
        lines.append(
            f"| {r.lever} | {r.mean_symbol_hit} | {r.pooled_hit} | "
            f"{r.symbols_ge_070}/{r.n_symbols} | {r.symbols_ge_075} | "
            f"{r.n_rows} | {r.high_bucket_hit} | {r.notes} |"
        )
    lines.extend(["", "## Recommendations", ""])
    for rec in result.recommendations:
        lines.append(f"- {rec}")
    lines.extend(
        [
            "",
            "## Context from diagnose",
            "",
            "- HIGH confidence bucket already ~71% — board drag is LOW/MID.",
            "- HIGH_HIT skews to higher `range_20d` / `vol_20d`, lower `log_price`.",
            "- Food/beverage & quiet names dominate the bottom of the board.",
            "",
            "Research only — not financial advice.",
            "",
        ]
    )
    return "\n".join(lines)
