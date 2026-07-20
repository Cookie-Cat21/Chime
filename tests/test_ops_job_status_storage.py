"""Unit coverage for ops_job_status + market-index sector helpers."""

from __future__ import annotations

import pytest

from tests.test_storage_unit import _Conn, _store


@pytest.mark.asyncio
async def test_list_symbols_missing_sector_excludes_indexes() -> None:
    conn = _Conn([[{"symbol": "jkh.n0000"}, {"symbol": "comb.n0000"}]])
    store = _store(conn)
    out = await store.list_symbols_missing_sector()
    assert out == ["JKH.N0000", "COMB.N0000"]
    assert "ASPI" in conn.sql[0]
    assert "SNP_SL20" in conn.sql[0]


@pytest.mark.asyncio
async def test_list_untagged_market_indexes() -> None:
    conn = _Conn([[{"symbol": "aspi"}, {"symbol": "snp_sl20"}]])
    store = _store(conn)
    out = await store.list_untagged_market_indexes()
    assert out == ["ASPI", "SNP_SL20"]
    assert "Market Index" in conn.sql[0]


@pytest.mark.asyncio
async def test_upsert_ops_job_status_normalizes() -> None:
    conn = _Conn([None])
    store = _store(conn)
    await store.upsert_ops_job_status(
        job_id="  sector-backfill  ",
        status="NOTICE",
        summary="  ok with index skips  ",
        detail="  ASPI: market index  ",
    )
    assert "ops_job_status" in conn.sql[0]
    assert conn.params[0][0] == "sector-backfill"
    assert conn.params[0][1] == "notice"
    assert conn.params[0][2] == "ok with index skips"
    assert conn.params[0][3] == "ASPI: market index"


@pytest.mark.asyncio
async def test_upsert_ops_job_status_rejects_blank_job() -> None:
    conn = _Conn([])
    store = _store(conn)
    await store.upsert_ops_job_status(
        job_id="   ",
        status="ok",
        summary="x",
    )
    assert conn.sql == []


@pytest.mark.asyncio
async def test_upsert_ops_job_status_defaults_bad_status() -> None:
    conn = _Conn([None])
    store = _store(conn)
    await store.upsert_ops_job_status(
        job_id="sector-backfill",
        status="weird",
        summary="",
        detail=None,
    )
    assert conn.params[0][1] == "failed"
    assert conn.params[0][2] == "no summary"
    assert conn.params[0][3] is None


@pytest.mark.asyncio
async def test_get_ops_job_status_roundtrip_shape() -> None:
    conn = _Conn(
        [
            {
                "job_id": "sector-backfill",
                "status": "notice",
                "summary": "ok with index skips",
                "detail": "ASPI: market index",
                "updated_at": "2026-07-20T00:00:00+00:00",
            }
        ]
    )
    store = _store(conn)
    row = await store.get_ops_job_status("sector-backfill")
    assert row is not None
    assert row["status"] == "notice"
    assert row["detail"] == "ASPI: market index"


@pytest.mark.asyncio
async def test_get_ops_job_status_none() -> None:
    conn = _Conn([None])
    store = _store(conn)
    assert await store.get_ops_job_status("missing") is None
    assert await store.get_ops_job_status("  ") is None
