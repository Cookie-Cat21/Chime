"""Resilience: poller survives CSE failures without crashing the loop."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from chime.circuit import CircuitOpenError
from chime.config import Settings
from chime.domain import PriceSnapshot
from chime.poller import Poller, is_market_open


def test_market_hours_weekday_boundaries() -> None:
    settings = Settings(
        telegram_bot_token="x",
        database_url="postgresql://x",
        market_tz="Asia/Colombo",
        market_open="09:30",
        market_close="14:30",
    )
    # Friday 09:30 SLT = 04:00 UTC
    open_dt = datetime(2026, 7, 10, 4, 0, tzinfo=UTC)
    assert is_market_open(open_dt, settings)
    # Friday 14:31 SLT = 09:01 UTC
    after = datetime(2026, 7, 10, 9, 1, tzinfo=UTC)
    assert not is_market_open(after, settings)
    # Saturday
    sat = datetime(2026, 7, 11, 5, 0, tzinfo=UTC)
    assert not is_market_open(sat, settings)


@pytest.mark.asyncio
async def test_poller_survives_circuit_open() -> None:
    storage = AsyncMock()
    storage.watched_symbols = AsyncMock(return_value=["JKH.N0000"])
    storage.active_rules_for_symbols = AsyncMock(return_value=[])
    storage.unsent_alerts = AsyncMock(return_value=[])

    cse = AsyncMock()
    cse.fetch_trade_summary = AsyncMock(side_effect=CircuitOpenError("open"))
    cse.fetch_announcements_for_symbol = AsyncMock(return_value=[])

    sent: list = []

    async def send(chat_id: int, text: str) -> bool:
        sent.append(text)
        return True

    settings = Settings(
        telegram_bot_token="x",
        database_url="postgresql://x",
        poll_jitter_seconds=0,
    )
    poller = Poller(settings, storage, cse, send)
    events = await poller.run_once(force=True)
    assert events == []
    assert poller.last_tick_ok is True  # degraded path handled, no crash


@pytest.mark.asyncio
async def test_poller_survives_junk_then_ok() -> None:
    storage = AsyncMock()
    storage.watched_symbols = AsyncMock(return_value=["JKH.N0000"])
    storage.active_rules_for_symbols = AsyncMock(return_value=[])
    storage.insert_snapshot = AsyncMock(
        side_effect=lambda s: s.model_copy(update={"id": 1})
    )
    storage.get_previous_state = AsyncMock()
    from chime.domain import PreviousPriceState

    storage.get_previous_state.return_value = PreviousPriceState(price=None)
    storage.unsent_alerts = AsyncMock(return_value=[])

    cse = AsyncMock()
    cse.fetch_trade_summary = AsyncMock(
        return_value=[
            PriceSnapshot(
                symbol="JKH.N0000",
                price=20.0,
                ts=datetime.now(UTC),
            )
        ]
    )
    cse.fetch_announcements_for_symbol = AsyncMock(
        side_effect=RuntimeError("html error page")
    )

    settings = Settings(
        telegram_bot_token="x",
        database_url="postgresql://x",
        poll_jitter_seconds=0,
    )
    poller = Poller(settings, storage, cse, AsyncMock(return_value=True))
    events = await poller.run_once(force=True)
    assert events == []
    assert poller.last_tick_at is not None
