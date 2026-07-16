"""Transparent path-based research score (v0).

Higher score ≠ buy. Components are explainable momentum / risk / liquidity
factors from ``daily_bars``. Reasons must pass buy/sell guardrails.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from datetime import date

from chime.domain import DailyBar
from chime.scenarios.guardrails import (
    GuardrailViolation,
    assert_safe_scenario_output,
)

MODEL_VERSION = "path_v0"


@dataclass(frozen=True, slots=True)
class ScoreResult:
    symbol: str
    as_of: date
    score: float
    components: dict[str, float | None]
    reasons: list[str]
    bar_count: int
    model_version: str = MODEL_VERSION


def _returns(prices: list[float]) -> list[float]:
    out: list[float] = []
    for i in range(1, len(prices)):
        prev = prices[i - 1]
        cur = prices[i]
        if prev == 0 or not math.isfinite(prev) or not math.isfinite(cur):
            continue
        out.append((cur / prev) - 1.0)
    return out


def _window_return(prices: list[float], n: int) -> float | None:
    if len(prices) <= n:
        return None
    start = prices[-(n + 1)]
    end = prices[-1]
    if start == 0 or not math.isfinite(start) or not math.isfinite(end):
        return None
    return (end / start) - 1.0


def _safe_reason(text: str) -> str | None:
    try:
        return assert_safe_scenario_output(text)
    except GuardrailViolation:
        return None


def score_symbol_path(bars: list[DailyBar]) -> ScoreResult | None:
    """Score one symbol from ascending daily bars. ``None`` if < 5 bars."""
    if not bars:
        return None
    ordered = sorted(bars, key=lambda b: b.trade_date)
    symbol = ordered[-1].symbol
    as_of = ordered[-1].trade_date
    prices = [b.price for b in ordered if math.isfinite(b.price)]
    if len(prices) < 5:
        return None

    ret_5 = _window_return(prices, 5)
    ret_20 = _window_return(prices, 20)
    ret_60 = _window_return(prices, 60)
    rets_20 = _returns(prices[-21:]) if len(prices) >= 21 else _returns(prices)
    vol_20 = statistics.pstdev(rets_20) if len(rets_20) >= 5 else None

    vols = [b.volume for b in ordered[-20:] if b.volume is not None and math.isfinite(b.volume)]
    liq = statistics.fmean(vols) if vols else None

    # Simple transparent blend → roughly [-100, 100].
    # Momentum positive; vol penalty; log liquidity tilt.
    mom = 0.0
    mom_w = 0.0
    if ret_5 is not None:
        mom += ret_5 * 40.0
        mom_w += 1.0
    if ret_20 is not None:
        mom += ret_20 * 35.0
        mom_w += 1.0
    if ret_60 is not None:
        mom += ret_60 * 25.0
        mom_w += 1.0
    mom_term = mom if mom_w else 0.0

    vol_penalty = 0.0
    if vol_20 is not None:
        vol_penalty = min(40.0, vol_20 * 400.0)

    liq_term = 0.0
    if liq is not None and liq > 0:
        liq_term = min(15.0, math.log10(liq + 1.0) * 3.0)

    # mom_term is already in score-ish units (e.g. 0.05*40 = 2). Clamp.
    raw = mom_term - vol_penalty + liq_term
    score = max(-100.0, min(100.0, raw))

    components: dict[str, float | None] = {
        "ret_5d": ret_5,
        "ret_20d": ret_20,
        "ret_60d": ret_60,
        "vol_20d": vol_20,
        "liquidity_20d": liq,
        "mom_term": mom_term,
        "vol_penalty": vol_penalty,
        "liq_term": liq_term,
    }

    reasons: list[str] = []
    if ret_20 is not None:
        pct = ret_20 * 100.0
        direction = "up" if pct >= 0 else "down"
        r = _safe_reason(f"20-session path {direction} {abs(pct):.1f}%")
        if r:
            reasons.append(r)
    if ret_5 is not None and (ret_20 is None or abs(ret_5 - ret_20) > 0.01):
        pct = ret_5 * 100.0
        direction = "up" if pct >= 0 else "down"
        r = _safe_reason(f"5-session path {direction} {abs(pct):.1f}%")
        if r:
            reasons.append(r)
    if vol_20 is not None:
        r = _safe_reason(f"20-session daily volatility {vol_20 * 100.0:.2f}%")
        if r:
            reasons.append(r)
    if liq is not None and liq > 0:
        r = _safe_reason(f"Avg 20-session volume {liq:,.0f} shares")
        if r:
            reasons.append(r)
    if len(prices) < 60:
        r = _safe_reason(f"Limited history ({len(prices)} daily bars; max CSE path ~1y)")
        if r:
            reasons.append(r)
    if not reasons:
        r = _safe_reason("Path factors available; research score only — not advice")
        if r:
            reasons.append(r)

    return ScoreResult(
        symbol=symbol,
        as_of=as_of,
        score=score,
        components=components,
        reasons=reasons,
        bar_count=len(prices),
    )
