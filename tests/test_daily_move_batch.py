"""Phase A loop 23 — batch ≥3 daily_move fires per user per tick."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from chime.config import Settings
from chime.domain import (
    AlertEvent,
    AlertType,
    disclaimer,
    format_daily_move_batch_message,
)
from chime.notify import SendResult
from chime.poller import PendingSend, Poller


def _settings() -> Settings:
    return Settings(
        telegram_bot_token="x",
        database_url="postgresql://x",
        poll_jitter_seconds=0,
    )


def _move_event(
    *,
    rule_id: int,
    symbol: str,
    telegram_id: int = 9001,
    trigger: str = "daily move 5.0% up",
    price: float = 100.0,
) -> AlertEvent:
    return AlertEvent(
        rule_id=rule_id,
        user_id=1,
        telegram_id=telegram_id,
        symbol=symbol,
        type=AlertType.DAILY_MOVE,
        threshold=5.0,
        trigger=trigger,
        current_price=price,
        event_key=f"move:{rule_id}:2026-07-18",
    )


def _pending(event: AlertEvent, log_id: int) -> PendingSend:
    return PendingSend(
        log_id=log_id,
        telegram_id=event.telegram_id,
        message=f"🔔 {event.symbol}\nTrigger: {event.trigger}\n\n{disclaimer()}",
        already_claimed_new=True,
        rule_id=event.rule_id,
        event=event,
        symbol=event.symbol,
    )


def test_format_daily_move_batch_message_nfa() -> None:
    msg = format_daily_move_batch_message(
        [
            ("JKH.N0000", "daily move 5% up", 180.0),
            ("COMB.N0000", "daily move 6% down", 90.0),
            ("DIAL.N0000", "daily move 7% up", 12.5),
        ]
    )
    assert "Daily movers (3)" in msg
    assert "JKH.N0000" in msg
    assert "COMB.N0000" in msg
    assert "DIAL.N0000" in msg
    assert disclaimer() in msg
    assert msg.rstrip().endswith(disclaimer())


@pytest.mark.asyncio
async def test_deliver_pending_batches_three_daily_moves() -> None:
    sent: list[tuple[int, str]] = []

    async def send(chat_id: int, text: str, **_kwargs: object) -> SendResult:
        sent.append((chat_id, text))
        return SendResult.OK

    storage = AsyncMock()
    storage.mark_alert_sent = AsyncMock()
    storage.mark_delivery_attempted_ok = AsyncMock()
    storage.get_user_quiet_hours_by_telegram = AsyncMock(return_value=None)

    poller = Poller(_settings(), storage, AsyncMock(), send)
    moves = [
        _pending(_move_event(rule_id=1, symbol="JKH.N0000"), 101),
        _pending(_move_event(rule_id=2, symbol="COMB.N0000"), 102),
        _pending(_move_event(rule_id=3, symbol="DIAL.N0000"), 103),
    ]
    await poller._deliver_pending(moves)

    assert len(sent) == 1
    assert sent[0][0] == 9001
    assert "Daily movers (3)" in sent[0][1]
    assert "JKH.N0000" in sent[0][1]
    assert storage.mark_alert_sent.await_count == 3


@pytest.mark.asyncio
async def test_deliver_pending_does_not_batch_two_daily_moves() -> None:
    sent: list[str] = []

    async def send(_chat_id: int, text: str, **_kwargs: object) -> SendResult:
        sent.append(text)
        return SendResult.OK

    storage = AsyncMock()
    storage.mark_alert_sent = AsyncMock()
    storage.mark_delivery_attempted_ok = AsyncMock()
    storage.get_user_quiet_hours_by_telegram = AsyncMock(return_value=None)

    poller = Poller(_settings(), storage, AsyncMock(), send)
    moves = [
        _pending(_move_event(rule_id=1, symbol="JKH.N0000"), 101),
        _pending(_move_event(rule_id=2, symbol="COMB.N0000"), 102),
    ]
    await poller._deliver_pending(moves)

    assert len(sent) == 2
    assert all("Daily movers" not in t for t in sent)


@pytest.mark.asyncio
async def test_closing_bell_digest_stub_logs_only() -> None:
    sent: list[object] = []

    async def send(chat_id: int, text: str, **_kwargs: object) -> SendResult:
        sent.append((chat_id, text))
        return SendResult.OK

    storage = AsyncMock()
    storage.count_digest_enabled_users = AsyncMock(return_value=4)

    poller = Poller(_settings(), storage, AsyncMock(), send)
    await poller._maybe_closing_bell_digest_stub()

    storage.count_digest_enabled_users.assert_awaited_once()
    assert sent == []
