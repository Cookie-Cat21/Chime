"""Guided /start onboard + tap-to-mute callback (Phase A)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from chime.bot import (
    HELP_TEXT,
    build_application,
    mute_callback,
    normalize_symbol,
    onboard_callback,
    _start_symbol_keyboard,
)
from chime.domain import AlertType, PriceSnapshot, disclaimer
from chime.telegram_markup import fire_mute_keyboard


def test_normalize_symbol_bare_ticker_appends_n0000() -> None:
    assert normalize_symbol("jkh") == "JKH.N0000"
    assert normalize_symbol("JKH.N0000") == "JKH.N0000"
    assert normalize_symbol("") is None


def test_fire_mute_keyboard_callback_data() -> None:
    markup = fire_mute_keyboard(42)
    assert markup.inline_keyboard[0][0].callback_data == "mute:42:24h"
    assert markup.inline_keyboard[0][0].text == "Mute 24h"


@pytest.mark.asyncio
async def test_send_message_passes_fire_mute_keyboard_reply_markup() -> None:
    """Fire cards attach Mute 24h via notify.send_message reply_markup passthrough."""
    from chime.notify import SendResult, send_message

    bot = AsyncMock()
    bot.send_message = AsyncMock(return_value=None)
    markup = fire_mute_keyboard(99)

    result = await send_message(
        bot,
        chat_id=1001,
        text="🔔 JKH.N0000\nTrigger: test\n\nNot financial advice.",
        reply_markup=markup,
    )

    assert result is SendResult.OK
    bot.send_message.assert_awaited_once()
    kwargs = bot.send_message.await_args.kwargs
    assert kwargs["chat_id"] == 1001
    assert kwargs["reply_markup"] is markup
    assert kwargs["reply_markup"].inline_keyboard[0][0].callback_data == "mute:99:24h"


def test_build_application_registers_callback_handlers() -> None:
    storage = AsyncMock()
    cse = AsyncMock()
    app = build_application("000:placeholder", storage, cse, cmd_rate_per_minute=100)
    patterns = []
    for handler in app.handlers[0]:
        pattern = getattr(handler, "pattern", None)
        if pattern is not None:
            patterns.append(pattern.pattern if hasattr(pattern, "pattern") else str(pattern))
    joined = " ".join(patterns)
    assert "onboard:" in joined
    assert "mute:" in joined


def _callback_update_context(
    *,
    data: str,
    storage: AsyncMock,
    cse: AsyncMock | None = None,
    telegram_id: int = 1001,
) -> tuple[MagicMock, MagicMock]:
    message = AsyncMock()
    message.reply_text = AsyncMock()
    query = AsyncMock()
    query.data = data
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()
    query.edit_message_reply_markup = AsyncMock()
    query.message = message

    user = MagicMock()
    user.id = telegram_id

    update = MagicMock()
    update.callback_query = query
    update.effective_user = user
    update.effective_message = message

    application = MagicMock()
    application.bot_data = {
        "storage": storage,
        "cse": cse or AsyncMock(),
        "cmd_rate_per_minute": 100,
    }
    context = MagicMock()
    context.application = application
    return update, context


def test_start_keyboard_includes_skip() -> None:
    markup = _start_symbol_keyboard()
    flat = [btn.callback_data for row in markup.inline_keyboard for btn in row]
    assert "onboard:skip" in flat
    texts = [btn.text for row in markup.inline_keyboard for btn in row]
    assert "Skip" in texts


@pytest.mark.asyncio
async def test_onboard_skip_shows_help_text() -> None:
    storage = AsyncMock()
    storage.ensure_user = AsyncMock(return_value=7)
    update, context = _callback_update_context(data="onboard:skip", storage=storage)
    await onboard_callback(update, context)
    text = update.callback_query.edit_message_text.await_args.args[0]
    assert text == HELP_TEXT
    assert "/watch SYMBOL" in text
    assert disclaimer() in text


@pytest.mark.asyncio
async def test_onboard_manual_points_to_watch() -> None:
    storage = AsyncMock()
    storage.ensure_user = AsyncMock(return_value=7)
    update, context = _callback_update_context(data="onboard:manual", storage=storage)
    await onboard_callback(update, context)
    text = update.callback_query.edit_message_text.await_args.args[0]
    assert "/watch" in text
    assert disclaimer() in text


@pytest.mark.asyncio
async def test_onboard_symbol_then_disclosure_creates_rule() -> None:
    storage = AsyncMock()
    storage.ensure_user = AsyncMock(return_value=7)
    storage.list_watchlist = AsyncMock(return_value=[])
    storage.list_alerts = AsyncMock(return_value=[])
    storage.upsert_stock = AsyncMock()
    storage.add_watch = AsyncMock()
    rule = MagicMock()
    rule.id = 99
    storage.create_alert_rule = AsyncMock(return_value=rule)

    snap = PriceSnapshot(
        symbol="JKH.N0000",
        price=180.0,
        name="John Keells",
        ts=datetime.now(UTC),
    )
    cse = AsyncMock()
    cse.fetch_company_info = AsyncMock(return_value=snap)

    update, context = _callback_update_context(
        data="onboard:rule:JKH.N0000:disclosure",
        storage=storage,
        cse=cse,
    )
    await onboard_callback(update, context)

    storage.create_alert_rule.assert_awaited_once_with(
        7, "JKH.N0000", AlertType.DISCLOSURE, None
    )
    text = update.callback_query.edit_message_text.await_args.args[0]
    assert "Alert #99" in text
    assert "disclosure" in text.lower()
    assert disclaimer() in text


@pytest.mark.asyncio
async def test_mute_callback_sets_24h() -> None:
    storage = AsyncMock()
    storage.ensure_user = AsyncMock(return_value=7)
    storage.mute_alert = AsyncMock(return_value=True)

    update, context = _callback_update_context(data="mute:12:24h", storage=storage)
    before = datetime.now(UTC)
    await mute_callback(update, context)
    after = datetime.now(UTC)

    storage.mute_alert.assert_awaited_once()
    args = storage.mute_alert.await_args.args
    assert args[0] == 7
    assert args[1] == 12
    muted_until = args[2]
    assert muted_until.tzinfo is not None
    # ~24h from now (allow a few seconds of test skew)
    delta_h = (muted_until - before).total_seconds() / 3600
    assert 23.9 <= delta_h <= 24.1
    assert muted_until >= after  # still in the future
    update.callback_query.edit_message_reply_markup.assert_awaited_once_with(
        reply_markup=None
    )
    reply = update.callback_query.message.reply_text.await_args.args[0]
    assert "Muted alert #12" in reply
    assert disclaimer() in reply
