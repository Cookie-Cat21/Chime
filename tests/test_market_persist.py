"""Market-wide persist on every price poll (empty watchlist still fetches)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from chime.briefs import BriefSettings, briefs_enabled
from chime.config import Settings
from chime.domain import PreviousPriceState, PriceSnapshot
from chime.poller import Poller


def _settings() -> Settings:
    return Settings(
        telegram_bot_token="x",
        database_url="postgresql://x",
        poll_jitter_seconds=0,
    )


def _snap(symbol: str, price: float = 20.0) -> PriceSnapshot:
    return PriceSnapshot(symbol=symbol, price=price, ts=datetime.now(UTC))


def _persist_with_ids(snaps: list[PriceSnapshot]) -> list[PriceSnapshot]:
    return [s.model_copy(update={"id": i}) for i, s in enumerate(snaps, start=1)]


@pytest.mark.asyncio
async def test_empty_watchlist_persists_market() -> None:
    storage = AsyncMock()
    storage.watched_symbols = AsyncMock(return_value=[])
    storage.active_rules_for_symbols = AsyncMock(return_value=[])
    storage.persist_market_snapshots = AsyncMock(side_effect=_persist_with_ids)
    storage.get_previous_state = AsyncMock()

    board = [_snap("JKH.N0000"), _snap("COMB.N0000", 90.0)]
    cse = AsyncMock()
    cse.fetch_trade_summary = AsyncMock(return_value=board)

    poller = Poller(_settings(), storage, cse, AsyncMock(return_value=True))
    events, price_ok = await poller._poll_prices()

    assert events == []
    assert price_ok is True
    assert poller.watched_missing == []
    cse.fetch_trade_summary.assert_awaited_once()
    storage.persist_market_snapshots.assert_awaited_once_with(board)
    storage.get_previous_state.assert_not_awaited()
    storage.active_rules_for_symbols.assert_not_awaited()


@pytest.mark.asyncio
async def test_persist_only_evaluates_watched() -> None:
    """Two snaps in summary, one watched — persist both; evaluate only watched."""
    storage = AsyncMock()
    storage.watched_symbols = AsyncMock(return_value=["JKH.N0000"])
    storage.active_rules_for_symbols = AsyncMock(return_value=[])
    storage.persist_market_snapshots = AsyncMock(side_effect=_persist_with_ids)
    storage.get_previous_state = AsyncMock(return_value=PreviousPriceState(price=None))

    board = [_snap("JKH.N0000"), _snap("COMB.N0000", 90.0)]
    cse = AsyncMock()
    cse.fetch_trade_summary = AsyncMock(return_value=board)

    poller = Poller(_settings(), storage, cse, AsyncMock(return_value=True))
    events, price_ok = await poller._poll_prices()

    assert events == []
    assert price_ok is True
    assert poller.watched_missing == []
    storage.persist_market_snapshots.assert_awaited_once_with(board)
    storage.get_previous_state.assert_awaited_once()
    assert storage.get_previous_state.await_args.args[0] == "JKH.N0000"
    assert storage.get_previous_state.await_args.kwargs["before_id"] == 1


def test_briefs_disabled_by_default() -> None:
    assert briefs_enabled(BriefSettings()) is False
    assert BriefSettings.from_env().enabled is False
