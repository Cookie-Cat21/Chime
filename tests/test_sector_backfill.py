"""Sector backfill normalize / gate — no live CSE."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from koel.config import Settings
from koel.sector_backfill import (
    MARKET_INDEX_SECTOR,
    SectorBackfillResult,
    _classify_failure,
    _index_issue,
    _trim_detail,
    run_sector_backfill,
)


@pytest.mark.asyncio
async def test_sector_backfill_disabled_without_force() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = False
    storage = AsyncMock()
    cse = AsyncMock()
    result = await run_sector_backfill(
        settings=settings, storage=storage, cse=cse, force=False
    )
    assert result == SectorBackfillResult(0, 0, 0, 0, ())
    cse.fetch_company_sector.assert_not_called()


@pytest.mark.asyncio
async def test_sector_backfill_force_updates() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = False
    settings.sector_backfill_sleep_seconds = 0.0
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(return_value=[])
    storage.list_symbols_missing_sector = AsyncMock(
        return_value=["JKH.N0000", "COMB.N0000"]
    )
    storage.upsert_stock = AsyncMock()
    storage.upsert_ops_job_status = AsyncMock()
    cse = AsyncMock()
    cse.fetch_company_sector = AsyncMock(side_effect=["Capital Goods", None])

    result = await run_sector_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        sleep_seconds=0.0,
    )
    assert result.symbols_targeted == 2
    assert result.symbols_updated == 1
    assert result.symbols_skipped == 1
    assert result.symbols_failed == 0
    storage.upsert_stock.assert_awaited_once_with(
        "JKH.N0000", sector="Capital Goods"
    )
    storage.upsert_ops_job_status.assert_awaited()
    status_kwargs = storage.upsert_ops_job_status.await_args.kwargs
    assert status_kwargs["status"] == "ok"


@pytest.mark.asyncio
async def test_sector_backfill_tags_indexes_with_exact_issue() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = True
    settings.sector_backfill_sleep_seconds = 0.0
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(
        return_value=["ASPI", "SNP_SL20"]
    )
    storage.list_symbols_missing_sector = AsyncMock(return_value=[])
    storage.upsert_stock = AsyncMock()
    storage.upsert_ops_job_status = AsyncMock()
    cse = AsyncMock()

    result = await run_sector_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        sleep_seconds=0.0,
    )
    assert result.symbols_failed == 0
    assert result.symbols_skipped == 2
    assert any("ASPI: market index" in i for i in result.issues)
    assert any("SNP_SL20: market index" in i for i in result.issues)
    cse.fetch_company_sector.assert_not_called()
    storage.upsert_stock.assert_any_await("ASPI", sector=MARKET_INDEX_SECTOR)
    storage.upsert_stock.assert_any_await("SNP_SL20", sector=MARKET_INDEX_SECTOR)
    status_kwargs = storage.upsert_ops_job_status.await_args.kwargs
    assert status_kwargs["status"] == "notice"
    assert status_kwargs["detail"]
    assert "ASPI" in status_kwargs["detail"]
    assert "companyProfile" in status_kwargs["detail"]


@pytest.mark.asyncio
async def test_sector_backfill_records_exact_failure_for_health() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = True
    settings.sector_backfill_sleep_seconds = 0.0
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(return_value=[])
    storage.list_symbols_missing_sector = AsyncMock(return_value=["DEAD.N0000"])
    storage.upsert_stock = AsyncMock()
    storage.upsert_ops_job_status = AsyncMock()
    cse = AsyncMock()
    cse.fetch_company_sector = AsyncMock(
        side_effect=ValueError("Expecting value: line 1 column 1 (char 0)")
    )

    result = await run_sector_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        sleep_seconds=0.0,
    )
    assert result.symbols_failed == 1
    assert result.issues
    assert "DEAD.N0000" in result.issues[0]
    assert "companyProfile" in result.issues[0]
    status_kwargs = storage.upsert_ops_job_status.await_args.kwargs
    assert status_kwargs["status"] == "failed"
    assert "DEAD.N0000" in (status_kwargs["detail"] or "")


def test_classify_failure_index_and_generic() -> None:
    assert "market index" in _classify_failure(
        "ASPI", ValueError("Expecting value: line 1 column 1 (char 0)")
    )
    assert "empty/non-JSON" in _classify_failure(
        "FOO.N0000", ValueError("JSON decode empty")
    )
    assert "timeout" in _classify_failure("BAR.N0000", RuntimeError("timeout"))
    assert _index_issue("SNP_SL20").startswith("SNP_SL20:")


def test_trim_detail_empty_overflow_and_cap() -> None:
    assert _trim_detail([]) is None
    many = [f"issue-{i}" for i in range(20)]
    out = _trim_detail(many)
    assert out is not None
    assert "…+8 more" in out
    long = ["x" * 200 for _ in range(12)]
    capped = _trim_detail(long)
    assert capped is not None
    assert len(capped) <= 480
    assert capped.endswith("…")


@pytest.mark.asyncio
async def test_sector_backfill_index_list_failure_is_soft() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = True
    settings.sector_backfill_sleep_seconds = True  # invalid pause → default
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(
        side_effect=RuntimeError("db down")
    )
    storage.list_symbols_missing_sector = AsyncMock(return_value=[])
    storage.upsert_ops_job_status = AsyncMock()
    cse = AsyncMock()

    result = await run_sector_backfill(
        settings=settings, storage=storage, cse=cse, force=True
    )
    assert result.symbols_targeted == 0
    assert result.symbols_failed == 0
    storage.upsert_ops_job_status.assert_awaited()


@pytest.mark.asyncio
async def test_sector_backfill_index_tag_and_ops_status_failures() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = True
    settings.sector_backfill_sleep_seconds = 0.0
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(return_value=["ASPI"])
    storage.upsert_stock = AsyncMock(side_effect=RuntimeError("write failed"))
    storage.list_symbols_missing_sector = AsyncMock(return_value=[])
    storage.upsert_ops_job_status = AsyncMock(side_effect=RuntimeError("ops fail"))
    cse = AsyncMock()

    result = await run_sector_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        sleep_seconds=0.0,
    )
    assert result.symbols_skipped == 1
    assert any("ASPI: market index" in i for i in result.issues)


@pytest.mark.asyncio
async def test_sector_backfill_filters_indexes_when_not_only_missing() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = True
    settings.sector_backfill_sleep_seconds = 0.0
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(return_value=[])
    storage.list_symbols_with_daily_bars = AsyncMock(
        return_value=["ASPI", "JKH.N0000", "SNP_SL20"]
    )
    storage.upsert_stock = AsyncMock()
    storage.upsert_ops_job_status = AsyncMock()
    cse = AsyncMock()
    cse.fetch_company_sector = AsyncMock(return_value="Banks")

    result = await run_sector_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        only_missing=False,
        sleep_seconds=0.0,
        limit=10,
    )
    assert result.symbols_updated == 1
    cse.fetch_company_sector.assert_awaited_once_with("JKH.N0000")


@pytest.mark.asyncio
async def test_sector_backfill_blank_symbol_skipped() -> None:
    settings = MagicMock(spec=Settings)
    settings.sector_backfill_enabled = True
    settings.sector_backfill_sleep_seconds = 0.0
    storage = AsyncMock()
    storage.list_untagged_market_indexes = AsyncMock(return_value=[])
    storage.list_symbols_missing_sector = AsyncMock(return_value=["  ", "JKH.N0000"])
    storage.upsert_stock = AsyncMock()
    storage.upsert_ops_job_status = AsyncMock()
    cse = AsyncMock()
    cse.fetch_company_sector = AsyncMock(return_value="Banks")

    result = await run_sector_backfill(
        settings=settings,
        storage=storage,
        cse=cse,
        force=True,
        sleep_seconds=0.01,
    )
    assert result.symbols_updated == 1
    assert result.symbols_skipped >= 1
