"""Wave4: brief-ready Telegram follow-up (fail-soft + NFA)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from chime.briefs import BriefSettings
from chime.briefs.worker import claim_pending_briefs
from chime.domain import AlertType, disclaimer, format_brief_followup
from chime.notify import SendResult
from tests.conftest import make_rule


def _enabled_settings(**kwargs: Any) -> BriefSettings:
    base = dict(
        enabled=True,
        api_key="test-key",
        provider="gemini",
        model="gemini-2.0-flash",
        max_briefs_per_day=50,
        max_input_chars=12_000,
    )
    base.update(kwargs)
    return BriefSettings(**base)  # type: ignore[arg-type]


def test_format_brief_followup_nfa_last() -> None:
    msg = format_brief_followup(
        symbol="JKH.N0000",
        brief="Board met; no dividend.",
        title="AGM Notice",
    )
    assert "Filing brief ready" in msg
    assert "Board met; no dividend." in msg
    last = [ln for ln in msg.strip().splitlines() if ln.strip()][-1]
    assert last == disclaimer()


@pytest.mark.asyncio
async def test_claim_pending_briefs_followup_when_notify_and_disclosure_rules() -> None:
    brief = "AGM set for August."
    disc_rule = make_rule(
        id=9,
        telegram_id=1001,
        symbol="JKH.N0000",
        type=AlertType.DISCLOSURE,
        threshold=None,
    )
    price_rule = make_rule(
        id=2,
        telegram_id=1002,
        symbol="JKH.N0000",
        type=AlertType.PRICE_ABOVE,
        threshold=100.0,
    )
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(
        return_value=[
            {
                "disclosure_id": 7,
                "symbol": "JKH.N0000",
                "title": "AGM Notice",
                "url": "https://www.cse.lk/announcements#99",
            },
        ]
    )
    storage.mark_brief_ready = AsyncMock(return_value=True)
    storage.mark_brief_failed = AsyncMock(return_value=True)
    storage.active_rules_for_symbols = AsyncMock(return_value=[disc_rule, price_rule])

    provider = AsyncMock()
    provider.summarize = AsyncMock(return_value=brief)

    sent: list[tuple[int, str]] = []

    async def notify(chat_id: int, text: str) -> SendResult:
        sent.append((chat_id, text))
        return SendResult.OK

    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(),
        provider=provider,
        notify=notify,
        http_client=AsyncMock(),
    )
    assert n == 1
    storage.active_rules_for_symbols.assert_awaited_once_with(["JKH.N0000"])
    assert len(sent) == 1
    assert sent[0][0] == 1001
    assert brief in sent[0][1]
    assert "Filing brief ready" in sent[0][1]
    assert disclaimer() in sent[0][1]


@pytest.mark.asyncio
async def test_claim_pending_briefs_followup_fail_soft_on_notify_error() -> None:
    disc_rule = make_rule(
        id=9,
        telegram_id=1001,
        symbol="JKH.N0000",
        type=AlertType.DISCLOSURE,
        threshold=None,
    )
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(
        return_value=[{"disclosure_id": 7, "symbol": "JKH.N0000", "title": "AGM Notice"}]
    )
    storage.mark_brief_ready = AsyncMock(return_value=True)
    storage.mark_brief_failed = AsyncMock(return_value=True)
    storage.active_rules_for_symbols = AsyncMock(return_value=[disc_rule])
    provider = AsyncMock()
    provider.summarize = AsyncMock(return_value="ok brief")

    async def notify(_chat_id: int, _text: str) -> None:
        raise RuntimeError("telegram down")

    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(),
        provider=provider,
        notify=notify,
        http_client=AsyncMock(),
    )
    assert n == 1
    storage.mark_brief_ready.assert_awaited_once()
    storage.mark_brief_failed.assert_not_awaited()


@pytest.mark.asyncio
async def test_claim_pending_briefs_skips_followup_when_mark_ready_false() -> None:
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(
        return_value=[{"disclosure_id": 7, "symbol": "JKH.N0000", "title": "AGM Notice"}]
    )
    storage.mark_brief_ready = AsyncMock(return_value=False)
    storage.active_rules_for_symbols = AsyncMock(return_value=[])
    provider = AsyncMock()
    provider.summarize = AsyncMock(return_value="brief")
    notify = AsyncMock()
    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(),
        provider=provider,
        notify=notify,
        http_client=AsyncMock(),
    )
    assert n == 1
    notify.assert_not_awaited()


@pytest.mark.asyncio
async def test_poller_drain_briefs_passes_notify(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import chime.poller as poller_mod
    from chime.config import Settings
    from chime.poller import Poller

    settings = Settings(
        telegram_bot_token="t",
        database_url="postgresql://unused",
    )
    send = AsyncMock(return_value=True)
    poller = Poller(settings, MagicMock(), MagicMock(), send)
    captured: dict[str, Any] = {}

    async def fake_claim(storage: Any, **kwargs: Any) -> int:
        captured["kwargs"] = kwargs
        return 1

    monkeypatch.setattr(poller_mod, "claim_pending_briefs", fake_claim)
    await poller._drain_briefs_safe()
    assert captured["kwargs"].get("notify") is send
