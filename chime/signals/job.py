"""Batch Signal Board scoring from ``daily_bars`` → ``symbol_scores``."""

from __future__ import annotations

from dataclasses import asdict, dataclass

from chime.logging_setup import get_logger
from chime.signals.forecast import forecast_path
from chime.signals.score import MODEL_VERSION, score_symbol_path
from chime.storage import Storage

log = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class SignalScoreResult:
    symbols_targeted: int
    symbols_scored: int
    symbols_skipped: int
    forecasts_written: int
    model_version: str


async def run_signal_score_job(
    *,
    storage: Storage,
    limit: int | None = None,
    model_version: str = MODEL_VERSION,
) -> SignalScoreResult:
    """Score all symbols that have daily bars (or first ``limit`` symbols)."""
    symbols = await storage.list_symbols_with_daily_bars()
    if (
        limit is not None
        and isinstance(limit, int)
        and not isinstance(limit, bool)
        and limit > 0
    ):
        symbols = symbols[:limit]

    scored = 0
    skipped = 0
    forecasts = 0
    for symbol in symbols:
        bars = await storage.list_daily_bars(symbol)
        result = score_symbol_path(bars)
        if result is None:
            skipped += 1
            continue
        await storage.upsert_symbol_score(
            symbol=result.symbol,
            as_of=result.as_of,
            model_version=model_version,
            score=result.score,
            components=result.components,
            reasons=result.reasons,
            bar_count=result.bar_count,
        )
        scored += 1
        points = forecast_path(bars)
        if points:
            forecasts += await storage.replace_forecast_points(points)

    out = SignalScoreResult(
        symbols_targeted=len(symbols),
        symbols_scored=scored,
        symbols_skipped=skipped,
        forecasts_written=forecasts,
        model_version=model_version,
    )
    log.info("signal_score_job_done", **asdict(out))
    return out
