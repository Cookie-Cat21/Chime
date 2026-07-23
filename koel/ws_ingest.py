"""Run CSE STOMP WebSocket ingest → Postgres price/index snapshots.

``python3 -m koel ws`` or enable ``CSE_WS_ENABLED=1`` beside the HTTP poller.
"""

from __future__ import annotations

import asyncio
import queue
import threading
from datetime import UTC, datetime
from typing import Any

import structlog

from koel.adapters.cse_ws import CSEWebSocketClient, DEFAULT_WS_URL
from koel.config import Settings
from koel.domain import IndexSnapshot, PriceSnapshot
from koel.storage import Storage

log = structlog.get_logger(__name__)

# Live quote sources for dash / alert previous lookups (not chart backfill).
LIVE_SNAPSHOT_SOURCES = ("poller", "cse_ws")


async def persist_ws_batch(
    storage: Storage,
    snaps: list[PriceSnapshot],
    *,
    indexes: list[IndexSnapshot] | None = None,
) -> tuple[int, int]:
    """Persist WS price (+ optional index) ticks. Returns (prices, indexes)."""
    n_prices = 0
    n_idx = 0
    if snaps:
        stored = await storage.persist_market_snapshots(snaps, source="cse_ws")
        n_prices = len(stored)
    if indexes:
        stored_i = await storage.persist_index_snapshots(indexes)
        n_idx = len(stored_i)
    return n_prices, n_idx


async def run_ws_ingest(
    settings: Settings,
    storage: Storage,
    *,
    seconds: float | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """Connect to CSE WS and record ticks until ``seconds`` elapse or cancelled.

    Outside market hours the loop idles unless ``force`` (same fence as poller).
    """
    from koel.poller import is_market_open

    broker = getattr(settings, "cse_ws_url", None) or DEFAULT_WS_URL
    req_iv = float(getattr(settings, "cse_ws_request_interval_seconds", 8.0) or 8.0)

    event_q: queue.SimpleQueue[tuple[str, object]] = queue.SimpleQueue()
    stats: dict[str, Any] = {
        "price_rows": 0,
        "index_rows": 0,
        "batches": 0,
        "messages": 0,
        "started_at": datetime.now(UTC).isoformat(),
        "last_error": None,
    }

    def on_prices(topic: str, snaps: list[PriceSnapshot]) -> None:
        event_q.put(("prices", (topic, snaps)))

    def on_index(idx: IndexSnapshot) -> None:
        event_q.put(("index", idx))

    client = CSEWebSocketClient(
        broker_url=str(broker),
        request_interval_seconds=req_iv,
        on_prices=on_prices,
        on_index=on_index,
    )

    worker = threading.Thread(
        target=client.run_forever, name="cse-ws", daemon=True
    )
    worker.start()
    log.info("cse_ws_ingest_started", broker=broker, force=force, seconds=seconds)

    deadline = (
        None if seconds is None else asyncio.get_running_loop().time() + max(1.0, seconds)
    )
    try:
        while True:
            if deadline is not None and asyncio.get_running_loop().time() >= deadline:
                break
            if not force and not is_market_open(datetime.now(UTC), settings):
                # Outside session — keep socket warm but skip persist spam.
                await asyncio.sleep(2.0)
                # Drain queue without writing.
                while True:
                    try:
                        event_q.get_nowait()
                    except queue.Empty:
                        break
                continue

            try:
                kind, payload = event_q.get_nowait()
            except queue.Empty:
                await asyncio.sleep(0.05)
                stats["messages"] = client.messages_received
                stats["last_error"] = client.last_error
                stats["connected"] = client.connected
                continue

            if kind == "prices":
                topic, snaps = payload  # type: ignore[misc]
                assert isinstance(snaps, list)
                n, _ = await persist_ws_batch(storage, snaps)
                stats["price_rows"] += n
                stats["batches"] += 1
                log.info(
                    "cse_ws_prices_persisted",
                    topic=topic,
                    n=n,
                    symbols=[s.symbol for s in snaps[:12]],
                )
            elif kind == "index":
                idx = payload
                assert isinstance(idx, IndexSnapshot)
                _, n_i = await persist_ws_batch(storage, [], indexes=[idx])
                stats["index_rows"] += n_i
                log.info(
                    "cse_ws_index_persisted",
                    code=idx.code,
                    value=idx.value,
                )
    finally:
        client.stop()
        worker.join(timeout=5.0)
        stats["messages"] = client.messages_received
        stats["last_error"] = client.last_error
        stats["connected"] = False
        stats["finished_at"] = datetime.now(UTC).isoformat()
        log.info("cse_ws_ingest_stopped", **stats)
    return stats
