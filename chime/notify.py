"""Telegram send helpers with RetryAfter / NetworkError handling."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from telegram import Bot
from telegram.error import NetworkError, RetryAfter, TelegramError, TimedOut

from chime.logging_setup import get_logger

log = get_logger(__name__)

_SEND_KWARGS: dict[str, Any] = {"disable_web_page_preview": False}


def _retry_delay_seconds(retry_after: int | float | timedelta) -> float:
    if isinstance(retry_after, timedelta):
        return retry_after.total_seconds()
    return float(retry_after)


async def send_message(
    bot: Bot,
    chat_id: int,
    text: str,
    *,
    block_on_retry_after: bool = True,
) -> bool:
    """Send a Telegram message.

    When ``block_on_retry_after`` is False (poller hold the DB advisory lock),
    a ``RetryAfter`` returns False immediately so the lock is not held for the
    flood wait — ``alert_log.message_sent=False`` lets a later cycle retry.
    """
    try:
        await bot.send_message(chat_id=chat_id, text=text, **_SEND_KWARGS)
        return True
    except RetryAfter as exc:
        if not block_on_retry_after:
            log.warning(
                "telegram_retry_after_deferred",
                chat_id=chat_id,
                retry_after=str(exc.retry_after),
            )
            return False
        # Cap sleep so a RetryAfter storm cannot pin a caller indefinitely.
        delay = min(_retry_delay_seconds(exc.retry_after), 30.0)
        await asyncio.sleep(delay + 0.5)
        try:
            await bot.send_message(chat_id=chat_id, text=text, **_SEND_KWARGS)
            return True
        except TelegramError as retry_exc:
            log.warning("telegram_retry_failed", error=str(retry_exc), chat_id=chat_id)
            return False
    except (TimedOut, NetworkError) as exc:
        log.warning("telegram_transient", error=str(exc), chat_id=chat_id)
        return False
    except TelegramError as exc:
        log.error("telegram_error", error=str(exc), chat_id=chat_id)
        return False
