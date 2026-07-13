"""Wave83: medium+ bugs — claim/disarm/attempt/lock/health/count soft-accepts.

1. ``claim_alert`` / ``claim_and_disarm`` must isinstance-guard RETURNING ids
   (no ``int(True)==1`` mid deliver / disarm).
2. ``mark_alert_attempt`` must isinstance-guard ``attempt_count`` (no undercount
   that delays dead-letter).
3. ``try_advisory_lock`` must require ``locked is True`` (no ``bool(1)/"false"``).
4. ``health_check`` must reject ``True == 1`` bool soft-accept as healthy.
5. COUNT helpers / pool stats must reject bool ``isinstance(True, int)``.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import pytest

from chime.domain import AlertEvent, AlertType
from chime.storage import Storage

ROOT = Path(__file__).resolve().parents[1]


class _Cursor:
    def __init__(self, *, one: Any = None) -> None:
        self._one = one

    async def fetchone(self) -> Any:
        return self._one


class _Conn:
    def __init__(self, results: list[Any] | None = None) -> None:
        self._results = list(results or [])
        self.sql: list[str] = []

    async def execute(self, sql: str, params: Any = None) -> _Cursor:
        self.sql.append(sql)
        if not self._results:
            return _Cursor()
        nxt = self._results.pop(0)
        if isinstance(nxt, Exception):
            raise nxt
        return _Cursor(one=nxt)

    @asynccontextmanager
    async def transaction(self) -> Any:
        yield


class _Pool:
    def __init__(self, conn: _Conn) -> None:
        self._conn = conn

    @asynccontextmanager
    async def connection(self) -> Any:
        yield self._conn


def _store(conn: _Conn) -> Storage:
    store = Storage("postgresql://unused", min_size=1, max_size=2)
    store._pool = _Pool(conn)  # type: ignore[assignment]
    return store


def _event() -> AlertEvent:
    return AlertEvent(
        rule_id=1,
        user_id=2,
        telegram_id=1001,
        symbol="JKH.N0000",
        type=AlertType.PRICE_ABOVE,
        threshold=100.0,
        trigger="above 100",
        current_price=101.0,
        event_key="above:1:100",
        snapshot_id=9,
    )


@pytest.mark.asyncio
async def test_claim_alert_rejects_poisoned_returning_id() -> None:
    with pytest.raises(ValueError, match="claim_alert RETURNING id"):
        await _store(_Conn([{"id": True}])).claim_alert(_event(), "ping")
    with pytest.raises(ValueError, match="claim_alert RETURNING id"):
        await _store(_Conn([{"id": [1]}])).claim_alert(_event(), "ping")
    assert await _store(_Conn([{"id": 77}])).claim_alert(_event(), "ping") == 77
    assert await _store(_Conn([None])).claim_alert(_event(), "ping") is None

    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    chunk = src.split("async def claim_alert")[1].split("async def claim_and_disarm")[0]
    assert "_require_pg_int" in chunk
    assert 'int(_as_row(row)["id"])' not in chunk


@pytest.mark.asyncio
async def test_claim_and_disarm_rejects_poisoned_id_before_disarm() -> None:
    conn = _Conn([{"id": True}])
    with pytest.raises(ValueError, match="claim_and_disarm RETURNING id"):
        await _store(conn).claim_and_disarm(_event(), "ping")
    assert not any("UPDATE alert_rules SET armed" in s for s in conn.sql)

    ok = _Conn([{"id": 88}, None])
    assert await _store(ok).claim_and_disarm(_event(), "ping") == 88
    assert any("UPDATE alert_rules SET armed" in s for s in ok.sql)

    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    chunk = src.split("async def claim_and_disarm")[1].split(
        "async def mark_delivery_attempted_ok"
    )[0]
    assert "_require_pg_int" in chunk
    assert 'int(_as_row(row)["id"])' not in chunk


@pytest.mark.asyncio
async def test_mark_alert_attempt_rejects_bool_and_non_int_count() -> None:
    with pytest.raises(ValueError, match="attempt_count"):
        await _store(_Conn([{"attempt_count": True}])).mark_alert_attempt(5)
    with pytest.raises(ValueError, match="attempt_count"):
        await _store(_Conn([{"attempt_count": 2.5}])).mark_alert_attempt(5)
    assert await _store(_Conn([{"attempt_count": 3}])).mark_alert_attempt(5) == 3

    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    chunk = src.split("async def mark_alert_attempt")[1].split("async def dead_letter")[0]
    assert "_require_pg_int" in chunk
    assert 'int(_as_row(row)["attempt_count"])' not in chunk


@pytest.mark.asyncio
async def test_try_advisory_lock_requires_locked_is_true() -> None:
    assert await _store(_Conn([{"locked": True}])).try_advisory_lock(1) is True
    for bad in (1, 0, "false", "true", False, None, [True]):
        store = _store(_Conn([{"locked": bad}]))
        assert await store.try_advisory_lock(1) is False
        assert store._lock_conn is None

    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    chunk = src.split("async def try_advisory_lock")[1].split("async def advisory_unlock")[0]
    assert ".get(\"locked\") is True" in chunk or ".get('locked') is True" in chunk
    assert 'bool(row and _as_row(row)["locked"])' not in chunk


@pytest.mark.asyncio
async def test_health_check_rejects_bool_true_eq_one() -> None:
    assert await _store(_Conn([{"ok": 1}])).health_check() is True
    assert await _store(_Conn([{"ok": True}])).health_check() is False
    assert await _store(_Conn([{"ok": "1"}])).health_check() is False
    assert await _store(_Conn([None])).health_check() is False

    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    chunk = src.split("async def health_check")[1].split(
        "async def count_pending_disclosure_briefs"
    )[0]
    assert "isinstance(raw_ok, int)" in chunk
    assert 'bool(row and _as_row(row)["ok"] == 1)' not in chunk


@pytest.mark.asyncio
async def test_count_helpers_and_pool_stats_reject_bool() -> None:
    with pytest.raises(ValueError, match="count_briefs_today"):
        await _store(_Conn([{"n": True}])).count_briefs_today()
    with pytest.raises(ValueError, match="count_pending"):
        await _store(_Conn([{"n": True}])).count_pending_disclosure_briefs()
    assert await _store(_Conn([{"n": 0}])).delete_old_non_watchlist_snapshots(7) == 0
    assert await _store(_Conn([{"n": True}])).delete_old_non_watchlist_snapshots(7) == 0
    assert await _store(_Conn([{"n": 5}])).count_briefs_today() == 5

    store = _store(_Conn([]))

    class _StatsPool:
        def get_stats(self) -> dict[str, Any]:
            return {"pool_min": True, "pool_max": 4, "pool_size": False}

    store._pool = _StatsPool()  # type: ignore[assignment]
    store._last_health_checkout_wait_ms = None
    snap = store.pool_health_snapshot()
    assert snap == {"health_checkout_wait_ms": None, "pool_max": 4}

    src = (ROOT / "chime" / "storage.py").read_text(encoding="utf-8")
    assert "def _pg_count" in src
    assert "def _require_pg_int" in src
    pool_chunk = src.split("def pool_health_snapshot")[1]
    assert "isinstance(value, bool)" in pool_chunk
