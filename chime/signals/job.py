"""Batch Signal Board scoring from ``daily_bars`` → ``symbol_scores``."""

from __future__ import annotations

import math
import statistics
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta

from chime.domain import DailyBar
from chime.logging_setup import get_logger
from chime.signals.forecast import forecast_path
from chime.signals.score import (
    MODEL_VERSION,
    ExtraFactors,
    score_symbol_path,
)
from chime.storage import Storage

log = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class SignalScoreResult:
    symbols_targeted: int
    symbols_scored: int
    symbols_skipped: int
    forecasts_written: int
    model_version: str


def _window_return_from_bars(bars: list[DailyBar], n: int = 20) -> float | None:
    """n-session return from daily bars."""
    ordered = sorted(bars, key=lambda b: b.trade_date)
    prices = [b.price for b in ordered if math.isfinite(b.price)]
    if len(prices) <= n:
        return None
    start, end = prices[-(n + 1)], prices[-1]
    if start == 0 or not math.isfinite(start) or not math.isfinite(end):
        return None
    return (end / start) - 1.0


def _percentile_ranks(values: dict[str, float]) -> dict[str, float]:
    """Return percentile ranks in [0, 1] for each symbol (average ranks on ties)."""
    if not values:
        return {}
    items = sorted(values.items(), key=lambda kv: kv[1])
    n = len(items)
    if n == 1:
        return {items[0][0]: 0.5}
    ranks: dict[str, float] = {}
    i = 0
    while i < n:
        j = i
        while j + 1 < n and items[j + 1][1] == items[i][1]:
            j += 1
        # average 0-based rank for ties
        avg = (i + j) / 2.0
        pct = avg / (n - 1)
        for k in range(i, j + 1):
            ranks[items[k][0]] = pct
        i = j + 1
    return ranks


async def _sector_peer_ret_20d(
    storage: Storage,
    *,
    symbol: str,
    cache: dict[str, float | None],
) -> float | None:
    sector = await storage.get_stock_sector(symbol)
    if sector is None:
        return None
    if sector in cache:
        return cache[sector]
    peers = await storage.list_symbols_in_sector(sector)
    rets: list[float] = []
    for peer in peers:
        if peer == symbol:
            continue
        peer_bars = await storage.list_daily_bars(peer)
        ret = _window_return_from_bars(peer_bars, 20)
        if ret is not None:
            rets.append(ret)
    value = statistics.median(rets) if len(rets) >= 2 else None
    cache[sector] = value
    return value


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

    # Pass 1: load bars + 20d returns (current and lag-5 for rank stability).
    bars_by_symbol: dict[str, list[DailyBar]] = {}
    ret20_now: dict[str, float] = {}
    ret20_lag: dict[str, float] = {}
    for symbol in symbols:
        bars = await storage.list_daily_bars(symbol)
        bars_by_symbol[symbol] = bars
        r_now = _window_return_from_bars(bars, 20)
        if r_now is not None:
            ret20_now[symbol] = r_now
        if len(bars) > 25:
            r_lag = _window_return_from_bars(bars[:-5], 20)
            if r_lag is not None:
                ret20_lag[symbol] = r_lag

    pct_now = _percentile_ranks(ret20_now)
    pct_lag = _percentile_ranks(ret20_lag)

    scored = 0
    skipped = 0
    forecasts = 0
    peer_cache: dict[str, float | None] = {}
    since = datetime.now(UTC) - timedelta(days=30)
    aspi_pct = await storage.latest_index_change_pct("ASPI")

    for symbol in symbols:
        bars = bars_by_symbol.get(symbol, [])
        yoy = await storage.get_latest_filing_yoy(symbol)
        peer_ret = await _sector_peer_ret_20d(
            storage, symbol=symbol, cache=peer_cache
        )
        disc_n = await storage.count_disclosures_since(symbol, since=since)
        notice_by = await storage.count_notices_by_type_since(symbol, since=since)
        notice_n = sum(notice_by.values())
        cats = await storage.count_disclosure_categories_since(symbol, since=since)
        fin_share: float | None = None
        if cats and disc_n > 0:
            fin_n = 0
            for cat, n in cats.items():
                low = cat.lower()
                if any(
                    key in low
                    for key in (
                        "financial",
                        "interim",
                        "annual",
                        "quarter",
                        "accounts",
                        "earnings",
                    )
                ):
                    fin_n += n
            fin_share = fin_n / float(disc_n)

        rank_stability: float | None = None
        pctile = pct_now.get(symbol)
        if pctile is not None and symbol in pct_lag:
            rank_stability = 1.0 - abs(pctile - pct_lag[symbol])

        dual_gap: float | None = None
        pair = await storage.get_paired_listing_symbol(symbol)
        if pair is not None:
            my_ret = ret20_now.get(symbol)
            # Pair may not be in this score batch — load if needed.
            pair_ret = ret20_now.get(pair)
            if pair_ret is None and pair in bars_by_symbol:
                pair_ret = _window_return_from_bars(bars_by_symbol[pair], 20)
            elif pair_ret is None:
                pair_bars = await storage.list_daily_bars(pair)
                pair_ret = _window_return_from_bars(pair_bars, 20)
            if my_ret is not None and pair_ret is not None:
                dual_gap = my_ret - pair_ret

        extra = ExtraFactors(
            eps_yoy_pct=yoy.get("eps_yoy_pct"),
            rev_yoy_pct=yoy.get("rev_yoy_pct"),
            profit_yoy_pct=yoy.get("profit_yoy_pct"),
            sector_peer_ret_20d=peer_ret,
            disclosure_count_30d=disc_n if disc_n > 0 else None,
            financial_disclosure_share=fin_share,
            aspi_change_pct=aspi_pct,
            notice_count_30d=notice_n if notice_n > 0 else None,
            notice_buy_in_30d=notice_by.get("buy_in"),
            notice_non_compliance_30d=notice_by.get("non_compliance"),
            notice_halt_30d=notice_by.get("halt"),
            ret20_percentile=pctile,
            ret20_rank_stability=rank_stability,
            dual_listing_ret20_gap=dual_gap,
        )
        result = score_symbol_path(
            bars, extra=extra, model_version=model_version
        )
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
