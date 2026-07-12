"""Gemini brief provider stub + claim_pending_briefs drain (httpx mocked)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from chime.briefs import BriefSettings
from chime.briefs.provider import (
    BriefsDisabledError,
    GeminiBriefProvider,
    make_brief_provider,
)
from chime.briefs.worker import claim_pending_briefs
from tests.test_storage_unit import _Conn, _store


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


def _gemini_ok_response(text: str = "Board met; no dividend.") -> httpx.Response:
    return httpx.Response(
        200,
        json={"candidates": [{"content": {"parts": [{"text": text}]}}]},
    )


@pytest.mark.asyncio
async def test_summarize_raises_when_briefs_disabled() -> None:
    provider = GeminiBriefProvider(BriefSettings(enabled=False, api_key=""))
    with pytest.raises(BriefsDisabledError, match="AI briefs disabled"):
        await provider.summarize("filing text")


@pytest.mark.asyncio
async def test_summarize_raises_when_enabled_without_key() -> None:
    provider = GeminiBriefProvider(BriefSettings(enabled=True, api_key=""))
    with pytest.raises(BriefsDisabledError):
        await provider.summarize("filing text")


@pytest.mark.asyncio
async def test_gemini_summarize_httpx_mock() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return _gemini_ok_response("Interim results summarized.")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiBriefProvider(_enabled_settings(), client=client)
        out = await provider.summarize("JKH.N0000: Interim Report")

    assert out == "Interim results summarized."
    assert len(captured) == 1
    req = captured[0]
    assert req.method == "POST"
    assert "gemini-2.0-flash:generateContent" in str(req.url)
    assert req.headers.get("x-goog-api-key") == "test-key"


@pytest.mark.asyncio
async def test_gemini_summarize_truncates_input() -> None:
    bodies: list[bytes] = []

    def handler(request: httpx.Request) -> httpx.Response:
        bodies.append(request.content)
        return _gemini_ok_response("ok")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiBriefProvider(
            _enabled_settings(max_input_chars=20),
            client=client,
        )
        await provider.summarize("x" * 100)

    assert b"xxxxxxxxxxxxxxxxxxxx" in bodies[0]
    assert b"xxxxxxxxxxxxxxxxxxxxx" not in bodies[0]  # 21 x's


@pytest.mark.asyncio
async def test_make_brief_provider_rejects_unknown() -> None:
    with pytest.raises(RuntimeError, match="Unsupported AI_PROVIDER"):
        make_brief_provider(_enabled_settings(provider="openai"))


@pytest.mark.asyncio
async def test_claim_pending_briefs_noop_when_disabled() -> None:
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(return_value=[])
    n = await claim_pending_briefs(
        storage,
        settings=BriefSettings(enabled=False, api_key=""),
    )
    assert n == 0
    storage.claim_pending_briefs.assert_not_awaited()


@pytest.mark.asyncio
async def test_claim_pending_briefs_noop_when_empty() -> None:
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(return_value=[])
    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(),
        provider=AsyncMock(),
    )
    assert n == 0


@pytest.mark.asyncio
async def test_claim_pending_briefs_respects_daily_cap() -> None:
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=50)
    storage.claim_pending_briefs = AsyncMock(return_value=[])
    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(max_briefs_per_day=50),
        provider=AsyncMock(),
    )
    assert n == 0
    storage.claim_pending_briefs.assert_not_awaited()


@pytest.mark.asyncio
async def test_claim_pending_briefs_marks_ready() -> None:
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(
        return_value=[
            {"disclosure_id": 7, "symbol": "JKH.N0000", "title": "AGM Notice"},
        ]
    )
    storage.mark_brief_ready = AsyncMock(return_value=True)
    storage.mark_brief_failed = AsyncMock(return_value=True)

    provider = AsyncMock()
    provider.summarize = AsyncMock(return_value="AGM set for August.")

    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(),
        provider=provider,
    )
    assert n == 1
    provider.summarize.assert_awaited_once_with("JKH.N0000: AGM Notice")
    storage.mark_brief_ready.assert_awaited_once()
    assert storage.mark_brief_ready.await_args.kwargs["brief"] == "AGM set for August."
    storage.mark_brief_failed.assert_not_awaited()


@pytest.mark.asyncio
async def test_claim_pending_briefs_marks_failed_on_provider_error() -> None:
    storage = MagicMock()
    storage.count_briefs_today = AsyncMock(return_value=0)
    storage.claim_pending_briefs = AsyncMock(
        return_value=[{"disclosure_id": 3, "symbol": "COMB.N0000", "title": "X"}]
    )
    storage.mark_brief_ready = AsyncMock(return_value=True)
    storage.mark_brief_failed = AsyncMock(return_value=True)

    provider = AsyncMock()
    provider.summarize = AsyncMock(side_effect=RuntimeError("boom"))

    n = await claim_pending_briefs(
        storage,
        settings=_enabled_settings(),
        provider=provider,
    )
    assert n == 1
    storage.mark_brief_failed.assert_awaited_once()
    assert "boom" in storage.mark_brief_failed.await_args.kwargs["error"]
    storage.mark_brief_ready.assert_not_awaited()


@pytest.mark.asyncio
async def test_storage_claim_pending_briefs_sql() -> None:
    conn = _Conn(
        [
            [
                {
                    "disclosure_id": 1,
                    "symbol": "JKH.N0000",
                    "title": "Filing",
                    "pdf_url": None,
                }
            ]
        ]
    )
    store = _store(conn)
    rows = await store.claim_pending_briefs(limit=3)
    assert len(rows) == 1
    assert rows[0]["disclosure_id"] == 1
    assert "FOR UPDATE OF b SKIP LOCKED" in conn.sql[0]
    assert conn.params[0] == (3,)


@pytest.mark.asyncio
async def test_storage_mark_brief_ready_and_failed() -> None:
    conn = _Conn([{"disclosure_id": 9}, {"disclosure_id": 10}])
    store = _store(conn)
    assert await store.mark_brief_ready(9, brief="ok", model="gemini-2.0-flash") is True
    assert "status = 'ready'" in conn.sql[0]
    assert await store.mark_brief_failed(10, error="nope", model="gemini-2.0-flash") is True
    assert "status = 'failed'" in conn.sql[1]


@pytest.mark.asyncio
async def test_storage_count_briefs_today() -> None:
    conn = _Conn([{"n": 12}])
    store = _store(conn)
    assert await store.count_briefs_today() == 12
    assert "ready" in conn.sql[0] and "failed" in conn.sql[0]


@pytest.mark.asyncio
async def test_poller_schedule_brief_drain_only_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import chime.poller as poller_mod
    from chime.config import Settings
    from chime.poller import Poller

    assert hasattr(Poller, "_schedule_brief_drain")
    assert hasattr(Poller, "_drain_briefs_safe")

    settings = Settings(
        telegram_bot_token="t",
        database_url="postgresql://unused",
    )
    storage = MagicMock()
    cse = MagicMock()
    poller = Poller(settings, storage, cse, AsyncMock())

    called: list[bool] = []

    async def fake_drain() -> None:
        called.append(True)

    monkeypatch.setattr(poller_mod.Poller, "_drain_briefs_safe", fake_drain)
    # rebind instance method
    poller._drain_briefs_safe = fake_drain  # type: ignore[method-assign]

    monkeypatch.setattr(poller_mod, "briefs_enabled", lambda: False)
    poller._schedule_brief_drain()
    assert not poller._brief_drain_tasks

    monkeypatch.setattr(poller_mod, "briefs_enabled", lambda: True)
    poller._schedule_brief_drain()
    assert len(poller._brief_drain_tasks) == 1
    await poller.await_brief_drain()
    assert called == [True]
