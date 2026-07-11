"""E4-C03: loopback health includes watched_missing from poller state."""

from __future__ import annotations

import http.client
import json
import socket
from collections.abc import Iterator
from contextlib import contextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

from chime.__main__ import _refresh_both_health
from chime.health import HealthState, start_health_server


@contextmanager
def _health_server(state: HealthState) -> Iterator[int]:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        port = int(sock.getsockname()[1])
    server = start_health_server("127.0.0.1", port, state)
    try:
        yield port
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.asyncio
async def test_refresh_both_health_exports_watched_missing() -> None:
    storage = AsyncMock()
    storage.health_check = AsyncMock(return_value=True)
    poller = MagicMock()
    poller.last_tick_ok = False
    poller.last_tick_at = None
    poller.price_poll_ok = False
    poller.disclosure_poll_ok = True
    poller.lock_held_skip = False
    poller.watched_missing = ["COMB.N0000", "SAMP.N0000"]
    poller.last_error = "poll_degraded"

    health = HealthState()
    await _refresh_both_health(storage, health, poller)

    assert health.details["watched_missing"] == ["COMB.N0000", "SAMP.N0000"]
    assert health.ok is False
    assert health.details["price_poll_ok"] is False


def test_loopback_health_json_includes_watched_missing() -> None:
    state = HealthState()
    state.update(
        ok=False,
        watched_missing=["COMB.N0000"],
        price_poll_ok=False,
        last_error="poll_degraded",
    )
    with _health_server(state) as port:
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
        try:
            conn.request("GET", "/health")
            resp = conn.getresponse()
            body = json.loads(resp.read().decode())
        finally:
            conn.close()
    assert resp.status == 503
    assert body["watched_missing"] == ["COMB.N0000"]
    assert body["last_error"] == "poll_degraded"
