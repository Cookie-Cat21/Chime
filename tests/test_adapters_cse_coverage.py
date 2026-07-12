"""Wave11: unit coverage push for cse adapter legacy / PDF / sectors branches."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from structlog.testing import capture_logs

from chime.adapters.cse import (
    CDN_BASE,
    CSEClient,
    LegacyAnnouncementRow,
    SectorRow,
    allowed_cdn_pdf_url,
    allowed_filing_url,
    legacy_pdf_urls_by_id,
    sector_row_to_snapshot,
)
from chime.circuit import CircuitOpenError


def test_allowed_cdn_pdf_url_null_empty_and_traversal() -> None:
    assert allowed_cdn_pdf_url(None) is None
    assert allowed_cdn_pdf_url("") is None
    assert allowed_cdn_pdf_url("   ") is None
    assert allowed_cdn_pdf_url("https://cdn.cse.lk/upload/../etc/passwd") is None
    assert allowed_cdn_pdf_url("https://cdn.cse.lk/./ok.pdf") is None
    assert allowed_cdn_pdf_url("https://cdn.cse.lk/") == f"{CDN_BASE}/"
    assert allowed_cdn_pdf_url("https://cdn.cse.lk") == f"{CDN_BASE}/"


def test_allowed_filing_url_null_empty_creds_query_and_traversal() -> None:
    assert allowed_filing_url(None) is None
    assert allowed_filing_url("") is None
    assert allowed_filing_url("   ") is None
    assert allowed_filing_url("https://user:pass@www.cse.lk/announcements") is None
    assert allowed_filing_url("https://www.cse.lk/foo/../bar") is None
    assert allowed_filing_url("https://www.cse.lk/./announcements") is None
    assert (
        allowed_filing_url("https://www.cse.lk/announcements?x=1")
        == "https://www.cse.lk/announcements?x=1"
    )
    assert (
        allowed_filing_url("https://www.cse.lk/announcements?x=1#42")
        == "https://www.cse.lk/announcements?x=1#42"
    )


def test_legacy_pdf_urls_by_id_skips_missing_announcement_id() -> None:
    rows = [
        LegacyAnnouncementRow(announcementId=None, filePath="uploadAnnounceFiles/a.pdf"),
        LegacyAnnouncementRow(announcementId=9, filePath=None),
        LegacyAnnouncementRow(announcementId=10, filePath="uploadAnnounceFiles/b.pdf"),
    ]
    mapping = legacy_pdf_urls_by_id(rows)
    assert mapping == {"10": f"{CDN_BASE}/uploadAnnounceFiles/b.pdf"}


@pytest.mark.asyncio
async def test_fetch_legacy_announcements_schema_error_raises() -> None:
    from pydantic import ValidationError

    client = CSEClient(client=AsyncMock())
    client._request = AsyncMock(return_value=["not", "an", "object"])  # type: ignore[method-assign]

    with capture_logs() as logs, pytest.raises(ValidationError):
        await client.fetch_legacy_announcements("JKH.N0000")

    assert any(
        e.get("event") == "cse_schema_error" and e.get("endpoint") == "announcements" for e in logs
    )


@pytest.mark.asyncio
async def test_fetch_legacy_announcements_reraises_circuit_open() -> None:
    client = CSEClient(fail_max=1, reset_timeout=60.0, client=AsyncMock())
    client._breaker("announcements").record_failure()

    with pytest.raises(CircuitOpenError, match="circuit open"):
        await client.fetch_legacy_announcements("COMB.N0000")


@pytest.mark.asyncio
async def test_fetch_all_sectors_skips_blank_name() -> None:
    client = CSEClient(client=AsyncMock())
    client._request = AsyncMock(  # type: ignore[method-assign]
        return_value=[
            {
                "sectorId": 223,
                "symbol": "EGY",
                "name": "   ",
                "indexValue": 100.0,
            },
            {
                "sectorId": 224,
                "symbol": "MAT",
                "name": "Materials",
                "indexValue": 200.0,
                "transactionTime": 1_720_000_000_000,
            },
        ]
    )

    with capture_logs() as logs:
        out = await client.fetch_all_sectors()

    assert len(out) == 1
    assert out[0].symbol == "MAT"
    assert any(
        e.get("event") == "cse_sector_row_skipped" and "blank" in str(e.get("error", ""))
        for e in logs
    )


@pytest.mark.asyncio
async def test_fetch_all_sectors_empty_ok_log() -> None:
    client = CSEClient(client=AsyncMock())
    client._request = AsyncMock(return_value=[])  # type: ignore[method-assign]

    with capture_logs() as logs:
        assert await client.fetch_all_sectors() == []

    assert {
        "event": "cse_all_sectors_empty_ok",
        "log_level": "warning",
        "endpoint": "allSectors",
    } in logs


@pytest.mark.asyncio
async def test_fetch_all_sectors_reraises_circuit_open() -> None:
    client = CSEClient(fail_max=1, reset_timeout=60.0, client=AsyncMock())
    client._breaker("allSectors").record_failure()

    with pytest.raises(CircuitOpenError, match="circuit open"):
        await client.fetch_all_sectors()


def test_sector_row_to_snapshot_defaults_ts_when_now_omitted() -> None:
    """No transactionTime and no now= → ts falls back to datetime.now(UTC)."""
    before = datetime.now(UTC) - timedelta(seconds=1)
    row = SectorRow(sectorId=1, symbol="egy", name="Energy", indexValue=10.0)
    snap = sector_row_to_snapshot(row)
    after = datetime.now(UTC) + timedelta(seconds=1)
    assert before <= snap.ts <= after
    assert snap.symbol == "EGY"
