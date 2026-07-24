"""Meta-label selective gates (research only).

Stage-1: take high-|score| candidates on each fold's calibration partition.
Stage-2: fit a point-in-time logistic on candidate shape features to predict
whether the stage-1 call is a directional hit. Apply the learned probability
floor on that fold's test partition only.

Never writes live policies / forecast_points / Telegram.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.linear_model import LogisticRegression

from koel.ml.distributed import (
    PredictionArtifact,
    SuccessContract,
    load_prediction_artifact,
    wilson_lower_bound,
)
from koel.ml.selective_gates import (
    DEFAULT_CONTRACT,
    SelectiveRow,
    _contract_checks,
    _is_hit,
    _parse_float_csv,
    _rows_from_artifacts,
)

DEFAULT_COVERAGE_GRID: tuple[float, ...] = (
    0.02,
    0.03,
    0.05,
    0.08,
    0.10,
    0.12,
    0.15,
    0.20,
)
DEFAULT_PROBA_GRID: tuple[float, ...] = (
    0.50,
    0.55,
    0.60,
    0.65,
    0.70,
    0.75,
    0.80,
    0.85,
    0.90,
)


def _candidate_slice(
    rows: Sequence[SelectiveRow], *, coverage: float
) -> list[SelectiveRow]:
    usable = [row for row in rows if row.y_dir != 0 and math.isfinite(row.score)]
    if not usable:
        return []
    ordered = sorted(usable, key=lambda row: abs(row.score), reverse=True)
    n = max(1, int(math.ceil(len(ordered) * coverage)))
    return ordered[:n]


def _day_ranks(rows: Sequence[SelectiveRow]) -> dict[tuple[Any, Any], float]:
    by_day: dict[Any, list[SelectiveRow]] = defaultdict(list)
    for row in rows:
        by_day[row.as_of].append(row)
    out: dict[tuple[Any, Any], float] = {}
    for day, day_rows in by_day.items():
        ordered = sorted(day_rows, key=lambda row: abs(row.score))
        denom = max(1, len(ordered) - 1)
        for rank, row in enumerate(ordered):
            out[(row.symbol, row.as_of)] = rank / denom
    return out


def _design_matrix(
    rows: Sequence[SelectiveRow],
    *,
    universe: Sequence[SelectiveRow],
) -> np.ndarray:
    ranks = _day_ranks(universe)
    day_scores: dict[Any, list[float]] = defaultdict(list)
    for row in universe:
        if math.isfinite(row.score):
            day_scores[row.as_of].append(row.score)
    day_disp = {
        day: float(np.std(vals)) if len(vals) > 1 else 0.0
        for day, vals in day_scores.items()
    }
    xs: list[list[float]] = []
    for row in rows:
        xs.append(
            [
                abs(row.score),
                row.score,
                1.0 if row.score > 0 else 0.0,
                ranks.get((row.symbol, row.as_of), 0.0),
                day_disp.get(row.as_of, 0.0),
            ]
        )
    return np.asarray(xs, dtype=float)


def _fit_meta(
    calibration: Sequence[SelectiveRow],
    *,
    coverage: float,
) -> tuple[LogisticRegression, float] | None:
    candidates = _candidate_slice(calibration, coverage=coverage)
    if len(candidates) < 40:
        return None
    y = np.asarray([1 if _is_hit(row) else 0 for row in candidates], dtype=int)
    if y.min() == y.max():
        return None
    x = _design_matrix(candidates, universe=calibration)
    model = LogisticRegression(max_iter=500, class_weight="balanced")
    model.fit(x, y)
    return model, coverage


def _apply_meta(
    rows: Sequence[SelectiveRow],
    *,
    universe: Sequence[SelectiveRow],
    model: LogisticRegression,
    coverage: float,
    proba_floor: float,
) -> list[SelectiveRow]:
    candidates = _candidate_slice(rows, coverage=coverage)
    if not candidates:
        return []
    x = _design_matrix(candidates, universe=universe)
    proba = model.predict_proba(x)[:, 1]
    return [
        row
        for row, p in zip(candidates, proba, strict=True)
        if float(p) >= proba_floor
    ]


def select_meta_gate(
    calibration: Sequence[SelectiveRow],
    *,
    contract: SuccessContract,
    coverage_grid: tuple[float, ...],
    proba_grid: tuple[float, ...],
) -> dict[str, Any] | None:
    """Pick coverage + probability floor on calibration labels only."""
    best: dict[str, Any] | None = None
    for coverage in coverage_grid:
        fitted = _fit_meta(calibration, coverage=coverage)
        if fitted is None:
            continue
        model, _ = fitted
        for proba_floor in proba_grid:
            selected = _apply_meta(
                calibration,
                universe=calibration,
                model=model,
                coverage=coverage,
                proba_floor=proba_floor,
            )
            emits = len(selected)
            if emits < contract.min_calibration_emits:
                continue
            hits = sum(1 for row in selected if _is_hit(row))
            precision = hits / emits
            lcb = wilson_lower_bound(
                hits, emits, confidence_level=contract.confidence_level
            )
            if precision < contract.target_precision:
                continue
            if lcb is None or lcb < contract.min_calibration_lcb:
                continue
            candidate = {
                "coverage": coverage,
                "proba_floor": proba_floor,
                "emits": emits,
                "precision": precision,
                "precision_lcb": lcb,
                "model": model,
            }
            key = (emits, lcb, precision, -proba_floor, -coverage)
            if best is None or key > best["key"]:
                best = {**candidate, "key": key}
    if best is None:
        return None
    best.pop("key", None)
    return best


def evaluate_selective_metalabel(
    artifacts: Sequence[PredictionArtifact],
    *,
    contract: SuccessContract = DEFAULT_CONTRACT,
    coverage_grid: tuple[float, ...] = DEFAULT_COVERAGE_GRID,
    proba_grid: tuple[float, ...] = DEFAULT_PROBA_GRID,
) -> dict[str, Any]:
    if not artifacts:
        raise ValueError("at least one artifact is required")
    model_name = artifacts[0].spec.model
    if any(artifact.spec.model != model_name for artifact in artifacts):
        raise ValueError("one model at a time")
    rows = _rows_from_artifacts(artifacts)
    group_keys = sorted({(row.outer_fold, row.horizon) for row in rows})
    folds: list[dict[str, Any]] = []
    emitted: list[SelectiveRow] = []
    total_test = 0
    for outer_fold, horizon in group_keys:
        calibration = [
            row
            for row in rows
            if row.outer_fold == outer_fold
            and row.horizon == horizon
            and row.partition == "calibration"
        ]
        test = [
            row
            for row in rows
            if row.outer_fold == outer_fold
            and row.horizon == horizon
            and row.partition == "test"
        ]
        total_test += len(test)
        gate = select_meta_gate(
            calibration,
            contract=contract,
            coverage_grid=coverage_grid,
            proba_grid=proba_grid,
        )
        if gate is None:
            folds.append(
                {
                    "outer_fold": outer_fold,
                    "horizon": horizon,
                    "gate": None,
                    "emits": 0,
                    "precision": None,
                }
            )
            continue
        selected = _apply_meta(
            test,
            universe=test,
            model=gate["model"],
            coverage=float(gate["coverage"]),
            proba_floor=float(gate["proba_floor"]),
        )
        hits = sum(1 for row in selected if _is_hit(row))
        emits = len(selected)
        precision = hits / emits if emits else None
        folds.append(
            {
                "outer_fold": outer_fold,
                "horizon": horizon,
                "gate": {
                    "coverage": gate["coverage"],
                    "proba_floor": gate["proba_floor"],
                    "cal_emits": gate["emits"],
                    "cal_precision": gate["precision"],
                    "cal_precision_lcb": gate["precision_lcb"],
                },
                "emits": emits,
                "hits": hits,
                "precision": precision,
            }
        )
        emitted.extend(selected)
    checks, summary = _contract_checks(
        rows=emitted,
        total_test_rows=total_test,
        folds=folds,
        contract=contract,
    )
    return {
        "model": model_name,
        "method": "selective_metalabel",
        "contract": asdict(contract),
        "contract_met": all(checks.values()),
        "checks": checks,
        "summary": summary,
        "folds": folds,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _load_artifacts(paths: Sequence[str]) -> list[PredictionArtifact]:
    out: list[PredictionArtifact] = []
    for raw in paths:
        path = Path(raw)
        if path.is_dir():
            files = sorted(path.glob("*.predictions.jsonl.gz"))
        else:
            files = [path]
        for file_path in files:
            out.append(load_prediction_artifact(file_path))
    return out


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifacts", nargs="+")
    parser.add_argument("--model", required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("/tmp/cpu-selective-metalabel"))
    parser.add_argument(
        "--coverage-grid",
        default=",".join(str(value) for value in DEFAULT_COVERAGE_GRID),
    )
    parser.add_argument(
        "--proba-grid",
        default=",".join(str(value) for value in DEFAULT_PROBA_GRID),
    )
    args = parser.parse_args(argv)
    artifacts = [
        artifact
        for artifact in _load_artifacts(args.artifacts)
        if artifact.spec.model == args.model
    ]
    if not artifacts:
        raise SystemExit(f"no artifacts for model {args.model}")
    report = evaluate_selective_metalabel(
        artifacts,
        coverage_grid=_parse_float_csv(args.coverage_grid),
        proba_grid=_parse_float_csv(args.proba_grid),
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{args.model}.selective_metalabel"
    json_path = args.output_dir / f"{stem}.json"
    md_path = args.output_dir / f"{stem}.md"
    # Drop non-serializable fold model objects (already stripped).
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    sm = report["summary"]
    lines = [
        f"# Selective metalabel — `{args.model}`",
        "",
        f"- contract_met: `{report['contract_met']}`",
        f"- precision: `{sm.get('precision')}` LCB=`{sm.get('precision_lcb')}`",
        f"- emits: `{sm.get('emits')}` symbols=`{sm.get('symbols')}` "
        f"coverage=`{sm.get('coverage')}`",
        f"- stable_folds: `{sm.get('stable_folds')}` / `{sm.get('folds')}`",
        "",
        "Research only — not financial advice.",
        "",
    ]
    md_path.write_text("\n".join(lines))
    print(
        json.dumps(
            {
                "json": str(json_path),
                "contract_met": report["contract_met"],
                "summary": sm,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
