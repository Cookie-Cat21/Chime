"""Daily path normalize + backfill gate — no live CSE."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from chime.adapters.cse import (
    CHART_PERIOD_1Y,
    CHART_PERIOD_INTRADAY,
    ChartPointRow,
    TradeSummaryRow,
    chart_point_to_daily_bar,
    chart_trade_date,
    trade_row_to_snapshot,
)
from chime.config import Settings
from chime.domain import DailyBar, PriceSnapshot
from chime.path_backfill import PathBackfillResult, run_path_backfill


def test_trade_row_maps_cse_stock_id() -> None:
    row = TradeSummaryRow(id=297, symbol="jkh.n0000", price=20.0, name="JKH")
    snap = trade_row_to_snapshot(row)
    assert snap is not None
    assert snap.cse_stock_id == 297
    assert snap.symbol == "JKH.N0000"


def test_trade_row_rejects_bool_cse_stock_id() -> None:
    with pytest.raises(ValidationError):
        TradeSummaryRow(id=True, symbol="JKH.N0000", price=20.0)  # type: ignore[arg-type]


def test_chart_trade_date_colombo() -> None:
    # 18:30 UTC = midnight Colombo next calendar day
    ts = datetime(2026, 7, 15, 18, 30, tzinfo=UTC)
    assert chart_trade_date(ts).isoformat() == "2026-07-16"


def test_chart_point_to_daily_bar_period5() -> None:
    row = ChartPointRow.model_validate(
        {"p": 25.3, "h": 25.7, "l": 24.9, "o": None, "q": 1_000.0, "t": 1_752_703_800_000}
    )
    bar = chart_point_to_daily_bar(row, symbol="jkh.n0000", period=CHART_PERIOD_1Y)
    assert bar is not None
    assert bar.symbol == "JKH.N0000"
    assert bar.price == 25.3
    assert bar.high == 25.7
    assert bar.low == 24.9
    assert bar.open is None
    assert bar.volume == 1_000.0
    assert bar.source_period == 5


def test_chart_point_skips_intraday_period() -> None:
    row = ChartPointRow(p=20.0, t=1_752_703_800_000)
    assert chart_point_to_daily_bar(row, symbol="JKH.N0000", period=CHART_PERIOD_INTRADAY) is None


def test_chart_point_skips_non_finite_price() -> None:
    row = ChartPointRow(p=float("nan"), t=1_752_703_800_000)
    assert chart_point_to_daily_bar(row, symbol="JKH.N0000", period=CHART_PERIOD_1Y) is None


def test_daily_bar_rejects_bool_price() -> None:
    with pytest.raises(ValidationError):
        DailyBar(
            symbol="JKH.N0000",
            trade_date=chart_trade_date(datetime(2026, 7, 15, 18, 30, tzinfo=UTC)),
            price=True,  # type: ignore[arg-type]
            source_period=5,
            bar_ts=datetime(2026, 7, 15, 18, 30, tzinfo=UTC),
        )


@pytest.mark.asyncio
async def test_path_backfill_disabled_without_force() -> None:
    settings = MagicMock(spec=Settings)
    settings.path_backfill_enabled = False
    storage = AsyncMock()
    cse = AsyncMock()
    result = await run_path_backfill(
        settings=settings, storage=storage, cse=cse, force=False
    )
    assert result == PathBackfillResult(0, 0, 0, 0, 0)
    cse.fetch_trade_summary.assert_not_called()
    cse.fetch_company_chart.assert_not_called()


@pytest.mark.asyncio
async def test_path_backfill_force_runs_and_persists() -> None:
    settings = MagicMock(spec=Settings)
    settings.path_backfill_enabled = False
    settings.path_backfill_period = 5
    settings.path_backfill_sleep_seconds = 0.0

    bar = DailyBar(
        symbol="JKH.N0000",
        trade_date=chart_trade_date(datetime(2026, 7, 15, 18, 30, tzinfo=UTC)),
        price=20.0,
        high=20.2,
        low=19.9,
        open=None,
        volume=100.0,
        source_period=5,
        bar_ts=datetime(2026, 7, 15, 18, 30, tzinfo=UTC),
    )
    storage = AsyncMock()
    storage.persist_market_snapshots = AsyncMock(
        return_value=[
            PriceSnapshot(
                symbol="JKH.N0000",
                price=20.0,
                ts=datetime.now(UTC),
                cse_stock_id=297,
            )
        ]
    )
    storage.list_stocks_with_cse_ids = AsyncMock(return_value=[("JKH.N0000", 297)])
    storage.persist_daily_bars = AsyncMock(return_value=1)

    cse = AsyncMock()
    cse.fetch_trade_summary = AsyncMock(
        return_value=[
            PriceSnapshot(
                symbol="JKH.N0000",
                price=20.0,
                ts=datetime.now(UTC),
                cse_stock_id=297,
            )
        ]
    )
    cse.fetch_company_chart = AsyncMock(return_value=[bar])

    result = await run_path_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        sleep_seconds=0.0,
        limit=10,
    )
    assert result.symbols_targeted == 1
    assert result.symbols_ok == 1
    assert result.bars_upserted == 1
    cse.fetch_company_chart.assert_awaited_once()
    storage.persist_daily_bars.assert_awaited_once()
