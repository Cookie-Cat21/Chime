"""Forecast outcome ledger: emit shadow/serve rows and score realized hits."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from chime.logging_setup import get_logger
from chime.ml.regime import aspi_ret_20d_as_of, tag_regime
from chime.storage import Storage

log = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class OutcomeEmit:
    model_id: str
    model_version: str
    symbol: str
    issued_at: date
    horizon_days: int
    y_pred: float
    confidence: float | None = None
    gate: str | None = None
    regime_tag: str | None = None


@dataclass(frozen=True, slots=True)
class ScoreOutcomesResult:
    examined: int
    scored: int
    skipped: int


def _add_trading_days(start: date, n: int, calendar: list[date]) -> date | None:
    """Advance ``n`` sessions on a sorted unique trade-date calendar."""
    if n < 1 or not calendar:
        return None
    # find first index >= start
    i = 0
    while i < len(calendar) and calendar[i] < start:
        i += 1
    # issued_at may equal a session; realized is n sessions after that session
    if i >= len(calendar) or calendar[i] != start:
        # if start not a trading day, use next session as issue anchor
        if i >= len(calendar):
            return None
    j = i + n
    if j >= len(calendar):
        return None
    return calendar[j]


async def market_calendar(storage: Storage) -> list[date]:
    """Union of trade dates from ASPI bars, else any equity with dense history."""
    bars = await storage.list_daily_bars("ASPI")
    if len(bars) >= 60:
        return sorted({b.trade_date for b in bars})
    # fallback: pick first symbol with many bars
    syms = await storage.list_symbols_with_daily_bars()
    for sym in syms[:20]:
        if sym == "ASPI":
            continue
        b = await storage.list_daily_bars(sym)
        if len(b) >= 100:
            return sorted({x.trade_date for x in b})
    return []


async def emit_outcome_rows(
    storage: Storage,
    emits: list[OutcomeEmit],
) -> int:
    """Upsert forecast_outcomes rows (idempotent on unique key)."""
    if not emits:
        return 0
    cal = await market_calendar(storage)
    rows_out: list[tuple] = []
    for e in emits:
        if (
            not isinstance(e.symbol, str)
            or not e.symbol.strip()
            or e.horizon_days < 1
        ):
            continue
        if not math.isfinite(e.y_pred):
            continue
        realized = _add_trading_days(e.issued_at, e.horizon_days, cal)
        rows_out.append(
            (
                e.model_id,
                e.model_version,
                e.symbol.strip().upper(),
                e.issued_at,
                int(e.horizon_days),
                float(e.y_pred),
                e.confidence,
                e.gate,
                realized,
                e.regime_tag,
            )
        )
    if not rows_out:
        return 0
    async with storage._pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.executemany(
                """
                INSERT INTO forecast_outcomes (
                    model_id, model_version, symbol, issued_at, horizon_days,
                    y_pred, confidence, gate, realized_at, regime_tag
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (model_version, symbol, issued_at, horizon_days)
                DO UPDATE SET
                    y_pred = EXCLUDED.y_pred,
                    confidence = EXCLUDED.confidence,
                    gate = EXCLUDED.gate,
                    realized_at = COALESCE(
                        EXCLUDED.realized_at, forecast_outcomes.realized_at
                    ),
                    regime_tag = COALESCE(
                        EXCLUDED.regime_tag, forecast_outcomes.regime_tag
                    )
                """,
                rows_out,
            )
    return len(rows_out)


async def score_due_outcomes(storage: Storage, *, limit: int = 5000) -> ScoreOutcomesResult:
    """Fill y_real/hit for rows whose realized_at <= today and not yet scored."""
    today = date.today()
    lim = max(1, min(int(limit), 50_000))
    async with storage._pool.connection() as conn:
        rows = await (
            await conn.execute(
                """
                SELECT id, symbol, issued_at, horizon_days, y_pred, realized_at
                FROM forecast_outcomes
                WHERE scored = FALSE
                  AND realized_at IS NOT NULL
                  AND realized_at <= %s
                ORDER BY realized_at ASC, id ASC
                LIMIT %s
                """,
                (today, lim),
            )
        ).fetchall()

    examined = scored = skipped = 0
    # cache bars per symbol
    bar_cache: dict[str, dict[date, float]] = {}

    async def prices(symbol: str) -> dict[date, float]:
        if symbol in bar_cache:
            return bar_cache[symbol]
        bars = await storage.list_daily_bars(symbol)
        m = {b.trade_date: b.price for b in bars if math.isfinite(b.price)}
        bar_cache[symbol] = m
        return m

    async with storage._pool.connection() as conn:
        for row in rows:
            examined += 1
            d = dict(row)
            oid = d["id"]
            sym = str(d["symbol"])
            issued = d["issued_at"]
            realized = d["realized_at"]
            y_pred = float(d["y_pred"])
            if not isinstance(issued, date) or not isinstance(realized, date):
                skipped += 1
                continue
            px = await prices(sym)
            p0 = px.get(issued)
            p1 = px.get(realized)
            if p0 is None or p1 is None or p0 == 0:
                skipped += 1
                continue
            y_real = (p1 / p0) - 1.0
            # demean approx: use raw return for hit vs sign(y_pred)
            # For panel models y_pred is demeaned; sign match still useful.
            if y_pred == 0 or y_real == 0:
                hit = None
            else:
                hit = (y_pred > 0 and y_real > 0) or (y_pred < 0 and y_real < 0)
            await conn.execute(
                """
                UPDATE forecast_outcomes
                SET y_real = %s, hit = %s, scored = TRUE, scored_at = now()
                WHERE id = %s
                """,
                (y_real, hit, oid),
            )
            scored += 1

    log.info("score_outcomes_done", examined=examined, scored=scored, skipped=skipped)
    return ScoreOutcomesResult(examined, scored, skipped)


async def attach_regime_and_emit_from_forecast_points(
    storage: Storage,
    *,
    as_of: date | None = None,
) -> int:
    """Copy today's forecast_points into forecast_outcomes with regime tags."""
    day = as_of or date.today()
    aspi_r = await aspi_ret_20d_as_of(storage, day)
    reg = tag_regime(as_of=day, aspi_ret_20d=aspi_r)
    async with storage._pool.connection() as conn:
        rows = await (
            await conn.execute(
                """
                SELECT symbol, model_version, as_of, horizon_i, yhat,
                       confidence, gate
                FROM forecast_points
                WHERE as_of = %s
                """,
                (day,),
            )
        ).fetchall()

    # Batch last close on/before as_of for all symbols in one query.
    symbols = sorted(
        {
            str(dict(r)["symbol"]).strip().upper()
            for r in rows
            if str(dict(r).get("symbol") or "").strip().upper()
            and str(dict(r)["symbol"]).strip().upper() != "ASPI"
        }
    )
    last_close: dict[str, float] = {}
    if symbols:
        async with storage._pool.connection() as conn:
            px_rows = await (
                await conn.execute(
                    """
                    SELECT DISTINCT ON (symbol) symbol, price
                    FROM daily_bars
                    WHERE symbol = ANY(%s) AND trade_date <= %s
                    ORDER BY symbol, trade_date DESC
                    """,
                    (symbols, day),
                )
            ).fetchall()
        for pr in px_rows:
            pd = dict(pr)
            sym = str(pd["symbol"]).strip().upper()
            price = pd.get("price")
            if (
                isinstance(price, int | float)
                and not isinstance(price, bool)
                and math.isfinite(float(price))
                and float(price) > 0
            ):
                last_close[sym] = float(price)

    emits: list[OutcomeEmit] = []
    for row in rows:
        d = dict(row)
        sym = str(d["symbol"]).strip().upper()
        if sym == "ASPI" or sym not in last_close:
            continue
        last_px = last_close[sym]
        yhat = float(d["yhat"])
        if not math.isfinite(yhat):
            continue
        y_pred = (yhat / last_px) - 1.0
        emits.append(
            OutcomeEmit(
                model_id=str(d["model_version"]),
                model_version=str(d["model_version"]),
                symbol=sym,
                issued_at=d["as_of"],
                horizon_days=int(d["horizon_i"]),
                y_pred=y_pred,
                confidence=d.get("confidence"),
                gate=d.get("gate"),
                regime_tag=reg.tag,
            )
        )
    return await emit_outcome_rows(storage, emits)


def live_metrics_from_rows(rows: list[dict[str, Any]], *, window: int = 20) -> dict[str, Any]:
    """Aggregate scored outcomes into a compact live metrics dict."""
    scored = [r for r in rows if r.get("scored") and r.get("hit") is not None]
    scored = sorted(scored, key=lambda r: r.get("issued_at") or date.min, reverse=True)
    w = scored[: max(1, window) * 50]  # rough pool
    if not w:
        return {
            "n": 0,
            "hit_rate": None,
            "gated_hit": None,
            "coverage_high": None,
        }
    hits = [1 for r in w if r.get("hit")]
    hit_rate = sum(hits) / len(w)
    gated = [
        r
        for r in w
        if r.get("gate") in {"hpe_p90", "always_on"}
        and (r.get("confidence") or 0) >= 0.35
    ]
    gated_hit = (
        sum(1 for r in gated if r.get("hit")) / len(gated) if gated else None
    )
    high = [r for r in w if (r.get("confidence") or 0) >= 0.7]
    return {
        "n": len(w),
        "hit_rate": hit_rate,
        "gated_n": len(gated),
        "gated_hit": gated_hit,
        "high_n": len(high),
        "high_hit": (
            sum(1 for r in high if r.get("hit")) / len(high) if high else None
        ),
    }
