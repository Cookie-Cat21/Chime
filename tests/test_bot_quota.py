"""Bot free-tier watch / alert quota helpers (Phase B caps)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from chime.bot import (
    _alert_quota_blocked,
    _watch_quota_blocked,
    free_alert_cap,
    free_watch_cap,
)
from chime.domain import AlertType
from tests.conftest import make_rule


class TestFreeCapsEnv:
    def test_alert_cap_default(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("DASH_FREE_ALERT_QUOTA", raising=False)
        assert free_alert_cap() == 3

    def test_watch_cap_default(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("DASH_FREE_WATCH_QUOTA", raising=False)
        assert free_watch_cap() == 5

    def test_alert_cap_env_override(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("DASH_FREE_ALERT_QUOTA", "7")
        assert free_alert_cap() == 7

    def test_watch_cap_rejects_zero(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("DASH_FREE_WATCH_QUOTA", "0")
        assert free_watch_cap() == 5


@pytest.mark.asyncio
async def test_watch_quota_allows_existing_symbol(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DASH_FREE_WATCH_QUOTA", "2")
    storage = AsyncMock()
    storage.list_watchlist = AsyncMock(return_value=["JKH.N0000", "CTC.N0000"])
    assert await _watch_quota_blocked(storage, 1, "JKH.N0000") is None


@pytest.mark.asyncio
async def test_watch_quota_blocks_new_at_cap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DASH_FREE_WATCH_QUOTA", "2")
    storage = AsyncMock()
    storage.list_watchlist = AsyncMock(return_value=["JKH.N0000", "CTC.N0000"])
    msg = await _watch_quota_blocked(storage, 1, "COMB.N0000")
    assert msg is not None
    assert "2" in msg
    assert "Pro" in msg


@pytest.mark.asyncio
async def test_alert_quota_allows_idempotent_duplicate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DASH_FREE_ALERT_QUOTA", "1")
    existing = make_rule(
        type=AlertType.PRICE_ABOVE,
        threshold=100.0,
        symbol="JKH.N0000",
    )
    storage = AsyncMock()
    storage.list_alerts = AsyncMock(return_value=[existing])
    assert (
        await _alert_quota_blocked(
            storage,
            1,
            symbol="JKH.N0000",
            alert_type=AlertType.PRICE_ABOVE,
            threshold=100.0,
        )
        is None
    )


@pytest.mark.asyncio
async def test_alert_quota_blocks_new_at_cap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DASH_FREE_ALERT_QUOTA", "1")
    existing = make_rule(
        type=AlertType.PRICE_ABOVE,
        threshold=100.0,
        symbol="JKH.N0000",
    )
    storage = AsyncMock()
    storage.list_alerts = AsyncMock(return_value=[existing])
    msg = await _alert_quota_blocked(
        storage,
        1,
        symbol="CTC.N0000",
        alert_type=AlertType.PRICE_ABOVE,
        threshold=50.0,
    )
    assert msg is not None
    assert "1" in msg
    assert "Pro" in msg
