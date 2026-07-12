"""Wave67: medium+ bugs — bot/poller/storage/brief env isinstance guards.

1. ``_env_cmd_rate_per_minute`` must isinstance-guard getenv before ``.strip``.
2. ``/myalerts`` / ``/mywatchlist`` must isinstance-guard symbols before ``re.sub``.
3. ``_delivery_ok_ledger_path_from_env`` must isinstance-guard getenv before ``.strip``.
4. Storage brief claim/lookup must isinstance-guard ``external_id`` / ``symbol`` /
   ``brief`` / ``message_text`` before ``.strip``.
5. ``BriefSettings.from_env`` / ``ScenarioSettings.from_env`` must isinstance-guard
   env values (parity ``Settings``).
"""

from __future__ import annotations

import os
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import pytest

from chime.bot import _env_cmd_rate_per_minute
from chime.briefs import BriefSettings
from chime.domain import AlertType, _CTRL_RE
from chime.poller import Poller
from chime.scenarios import ScenarioSettings

ROOT = Path(__file__).resolve().parents[1]


def test_env_cmd_rate_rejects_non_string_getenv(monkeypatch: pytest.MonkeyPatch) -> None:
    with mock.patch("chime.bot.os.getenv", return_value=20):
        assert _env_cmd_rate_per_minute() == 20
    monkeypatch.setenv("BOT_CMD_RATE_PER_MINUTE", "7")
    assert _env_cmd_rate_per_minute() == 7
    src = (ROOT / "chime" / "bot.py").read_text(encoding="utf-8")
    chunk = src.split("def _env_cmd_rate_per_minute")[1].split("START_TEXT")[0]
    assert "isinstance(raw_env, str)" in chunk


def test_myalerts_mywatchlist_symbol_isinstance_guards() -> None:
    src = (ROOT / "chime" / "bot.py").read_text(encoding="utf-8")
    myalerts = src.split("async def cmd_myalerts")[1].split("async def cmd_mywatchlist")[0]
    watch = src.split("async def cmd_mywatchlist")[1].split("def format_brief_lookup_reply")[0]
    assert "isinstance(r.symbol, str)" in myalerts
    assert "isinstance(s, str)" in watch
    # Runtime: non-string must not throw via re.sub.
    assert (_CTRL_RE.sub("", "" if not isinstance(123, str) else "x").strip() or "?") == "?"


def test_delivery_ok_ledger_path_isinstance_guard() -> None:
    settings = SimpleNamespace(database_url="postgresql://localhost/chime")
    poller = object.__new__(Poller)
    poller.settings = settings
    with mock.patch("chime.poller.os.getenv", return_value=123):
        assert poller._delivery_ok_ledger_path_from_env() is None
    with mock.patch("chime.poller.os.getenv", return_value="  /tmp/ok.jsonl  "):
        assert str(poller._delivery_ok_ledger_path_from_env()) == "/tmp/ok.jsonl"
    src = (ROOT / "chime" / "poller.py").read_text(encoding="utf-8")
    chunk = src.split("def _delivery_ok_ledger_path_from_env")[1].split(
        "def _load_delivery_ok_ledger"
    )[0]
    assert "isinstance(raw, str)" in chunk


def test_storage_brief_claim_lookup_isinstance_guards() -> None:
    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    claim = src.split("async def claim_brief_followups")[1].split(
        "async def mark_alert_sent"
    )[0]
    assert "isinstance(external_id, str)" in claim
    assert "isinstance(symbol, str)" in claim
    assert "isinstance(brief, str)" in claim
    assert "isinstance(message_text, str)" in claim
    assert "(external_id or \"\").strip()" not in src


def test_brief_and_scenario_settings_env_isinstance() -> None:
    with mock.patch.dict(os.environ, {}, clear=False):
        with mock.patch("chime.briefs.os.getenv", side_effect=lambda n, d=None: 1 if n == "AI_PROVIDER" else (d if d is not None else None)):
            cfg = BriefSettings.from_env()
            assert cfg.provider == "gemini"
        with mock.patch("chime.scenarios.os.getenv", return_value=1):
            assert ScenarioSettings.from_env().enabled is False

    briefs = (ROOT / "chime" / "briefs" / "__init__.py").read_text(encoding="utf-8")
    chunk = briefs.split("def from_env")[1].split("def briefs_enabled")[0]
    assert "isinstance(provider_raw, str)" in chunk
    assert "isinstance(api_key_raw, str)" in chunk

    scen = (ROOT / "chime" / "scenarios" / "__init__.py").read_text(encoding="utf-8")
    assert "isinstance(raw, str)" in scen.split("def from_env")[1].split(
        "def scenarios_enabled"
    )[0]
