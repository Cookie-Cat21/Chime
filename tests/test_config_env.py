"""E9-C01: Settings.from_env env validation (missing TELEGRAM_BOT_TOKEN)."""

from __future__ import annotations

import pytest

from chime.config import Settings

_DSN = "postgresql://chime:chime@localhost:5432/chime"


def test_from_env_missing_telegram_token_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.setenv("DATABASE_URL", _DSN)
    with pytest.raises(RuntimeError, match="TELEGRAM_BOT_TOKEN"):
        Settings.from_env(require_token=True)


def test_from_env_blank_telegram_token_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "   ")
    monkeypatch.setenv("DATABASE_URL", _DSN)
    with pytest.raises(RuntimeError, match="TELEGRAM_BOT_TOKEN"):
        Settings.from_env(require_token=True)


def test_from_env_require_token_false_allows_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.setenv("DATABASE_URL", _DSN)
    settings = Settings.from_env(require_token=False)
    assert settings.telegram_bot_token == ""
    assert settings.database_url == _DSN


def test_from_env_missing_database_url_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        Settings.from_env(require_token=True)


def test_snapshot_retention_days_default_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("DATABASE_URL", _DSN)
    monkeypatch.delenv("SNAPSHOT_RETENTION_DAYS", raising=False)
    settings = Settings.from_env(require_token=True)
    assert settings.snapshot_retention_days == 0


def test_snapshot_retention_days_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("DATABASE_URL", _DSN)
    monkeypatch.setenv("SNAPSHOT_RETENTION_DAYS", "14")
    settings = Settings.from_env(require_token=True)
    assert settings.snapshot_retention_days == 14


def test_snapshot_retention_days_negative_clamped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("DATABASE_URL", _DSN)
    monkeypatch.setenv("SNAPSHOT_RETENTION_DAYS", "-5")
    settings = Settings.from_env(require_token=True)
    assert settings.snapshot_retention_days == 0


@pytest.mark.parametrize("raw", ["nan", "NaN", "inf", "+inf", "-inf", "not-a-float"])
def test_float_env_rejects_nonfinite_and_invalid(
    monkeypatch: pytest.MonkeyPatch,
    raw: str,
) -> None:
    """Wave14: POLL_INTERVAL_SECONDS=nan/inf must not break the poller sleep loop."""
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("DATABASE_URL", _DSN)
    monkeypatch.setenv("POLL_INTERVAL_SECONDS", raw)
    monkeypatch.setenv("HTTP_TIMEOUT_SECONDS", raw)
    settings = Settings.from_env(require_token=True)
    assert settings.poll_interval_seconds == 60.0
    assert settings.http_timeout_seconds == 15.0
