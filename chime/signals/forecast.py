"""Naive path forecast from recent returns (research estimate · not a target)."""

from __future__ import annotations

import math
from datetime import UTC, timedelta

from chime.domain import DailyBar, ForecastPoint
from chime.signals.score import MODEL_VERSION

FORECAST_HORIZON = 5
FORECAST_MODEL_VERSION = f"{MODEL_VERSION}_fc"


def forecast_path(
    bars: list[DailyBar],
    *,
    horizon: int = FORECAST_HORIZON,
) -> list[ForecastPoint]:
    """Project last close forward using mean of last 5 daily returns.

    Fail closed on short history / non-finite prices. Timestamps step +1
    calendar day in UTC from last bar (display-only; not session-aware).
    """
    if horizon < 1 or horizon > 30:
        return []
    if not bars or len(bars) < 6:
        return []
    ordered = sorted(bars, key=lambda b: b.trade_date)
    symbol = ordered[-1].symbol
    as_of = ordered[-1].trade_date
    prices = [b.price for b in ordered if math.isfinite(b.price)]
    if len(prices) < 6:
        return []
    rets: list[float] = []
    for i in range(-5, 0):
        prev, cur = prices[i - 1], prices[i]
        if prev == 0 or not math.isfinite(prev) or not math.isfinite(cur):
            continue
        rets.append((cur / prev) - 1.0)
    if len(rets) < 3:
        return []
    mean_ret = sum(rets) / len(rets)
    if not math.isfinite(mean_ret):
        return []
    # Cap extreme single-step projections.
    mean_ret = max(-0.05, min(0.05, mean_ret))

    last_price = prices[-1]
    last_ts = ordered[-1].bar_ts
    if last_ts.tzinfo is None:
        last_ts = last_ts.replace(tzinfo=UTC)

    out: list[ForecastPoint] = []
    price = last_price
    for i in range(1, horizon + 1):
        price = price * (1.0 + mean_ret)
        if not math.isfinite(price) or price <= 0:
            break
        out.append(
            ForecastPoint(
                symbol=symbol,
                as_of=as_of,
                horizon_i=i,
                ts=last_ts + timedelta(days=i),
                yhat=price,
                model_version=FORECAST_MODEL_VERSION,
            )
        )
    return out
