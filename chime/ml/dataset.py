"""Build leakage-safe sample rows from ``daily_bars``."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from chime.domain import DailyBar
from chime.ml.features import FEATURE_NAMES, labels_at, path_features
from chime.storage import Storage


@dataclass(frozen=True, slots=True)
class Sample:
    symbol: str
    as_of: date
    x: tuple[float, ...]
    y_ret: float
    y_dir: float
    horizon: int


async def load_symbol_bars(
    storage: Storage,
    *,
    limit_symbols: int | None = None,
) -> dict[str, list[DailyBar]]:
    symbols = await storage.list_symbols_with_daily_bars()
    if (
        limit_symbols is not None
        and isinstance(limit_symbols, int)
        and not isinstance(limit_symbols, bool)
        and limit_symbols > 0
    ):
        symbols = symbols[:limit_symbols]
    out: dict[str, list[DailyBar]] = {}
    for symbol in symbols:
        bars = await storage.list_daily_bars(symbol)
        if bars:
            out[symbol] = sorted(bars, key=lambda b: b.trade_date)
    return out


def build_samples(
    series: dict[str, list[DailyBar]],
    *,
    horizon: int,
    min_history: int = 60,
) -> list[Sample]:
    """One sample per (symbol, t) with ≥ min_history bars and a future label."""
    samples: list[Sample] = []
    for symbol, bars in series.items():
        ordered = sorted(bars, key=lambda b: b.trade_date)
        prices = [b.price for b in ordered]
        if len(prices) < min_history + horizon:
            continue
        for i in range(min_history - 1, len(prices) - horizon):
            window = ordered[: i + 1]
            feats = path_features(window)
            if feats is None:
                continue
            lab = labels_at(prices, index=i, horizon=horizon)
            if lab is None:
                continue
            y_ret, y_dir = lab
            samples.append(
                Sample(
                    symbol=symbol,
                    as_of=feats.as_of,
                    x=feats.values,
                    y_ret=y_ret,
                    y_dir=y_dir,
                    horizon=horizon,
                )
            )
    return samples


def feature_names() -> tuple[str, ...]:
    return FEATURE_NAMES
