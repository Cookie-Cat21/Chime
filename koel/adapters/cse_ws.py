"""CSE live board via STOMP over SockJS (https://www.cse.lk/api/ws).

Unofficial — mirrors the cse.lk site client. Prefer polite HTTP tradeSummary
for full-board backfill; this adapter records push ticks (daytrade /
today-sharePrice) into Postgres for near-realtime dash freshness.

See Cookie-Cat21/cse-api-docs ``docs/WEBSOCKET.md``.
"""

from __future__ import annotations

import contextlib
import json
import math
import random
import string
import threading
import time
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import structlog
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from koel.domain import IndexSnapshot, PriceSnapshot

log = structlog.get_logger(__name__)

DEFAULT_WS_URL = "https://www.cse.lk/api/ws"

# Topics that carry symbol prices we persist.
PRICE_TOPICS = (
    "/topic/daytrade",
    "/topic/today-sharePrice",
    "/topic/top-gainers",
    "/topic/top-looses",
    "/topic/most-active-trades",
)
INDEX_TOPICS = (
    "/topic/aspi",
    "/topic/snp",
)
STATUS_TOPIC = "/topic/status"
SUMMARY_TOPIC = "/topic/summary"

ALL_TOPICS = PRICE_TOPICS + INDEX_TOPICS + (STATUS_TOPIC, SUMMARY_TOPIC)

REQUEST_DESTINATIONS = (
    "/app/request-daytrade",
    "/app/request-today-sharePrice",
    "/app/request-top-gainers",
    "/app/request-top-looses",
    "/app/request-most-active-trades",
    "/app/request-aspi",
    "/app/request-snp",
    "/app/request-status",
    "/app/request-summary",
)


class WsPriceRow(BaseModel):
    """Minimal CSE WS price row (daytrade / today-sharePrice / leaderboards)."""

    model_config = ConfigDict(extra="ignore")

    symbol: str
    price: float
    change: float | None = None
    changePercentage: float | None = Field(default=None, alias="changePercentage")
    percentageChange: float | None = None
    previousClose: float | None = None
    sharevolume: float | None = None
    name: str | None = None

    @field_validator("symbol", mode="before")
    @classmethod
    def _symbol_str(cls, v: object) -> str:
        if not isinstance(v, str):
            raise ValueError("symbol must be str")
        s = v.strip().upper()
        if not s:
            raise ValueError("blank symbol")
        return s

    @field_validator("price", mode="before")
    @classmethod
    def _finite_price(cls, v: object) -> float:
        if isinstance(v, bool) or not isinstance(v, int | float):
            raise ValueError("price must be numeric")
        f = float(v)
        if not math.isfinite(f) or f <= 0:
            raise ValueError("price must be finite and > 0")
        return f


def _finite_or_none(v: object) -> float | None:
    if isinstance(v, bool) or not isinstance(v, int | float):
        return None
    f = float(v)
    return f if math.isfinite(f) else None


def ws_price_row_to_snapshot(
    row: WsPriceRow, *, now: datetime | None = None
) -> PriceSnapshot | None:
    """Normalize a WS price row into ``PriceSnapshot`` (ts = receive time)."""
    ts = now if now is not None else datetime.now(UTC)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    change = _finite_or_none(row.change)
    change_pct = _finite_or_none(row.changePercentage)
    if change_pct is None:
        change_pct = _finite_or_none(row.percentageChange)
    prev = _finite_or_none(row.previousClose)
    if prev is None and change is not None:
        prev = row.price - change
    return PriceSnapshot(
        symbol=row.symbol,
        price=row.price,
        previous_close=prev,
        change=change,
        change_pct=change_pct,
        volume=_finite_or_none(row.sharevolume),
        name=row.name.strip() if isinstance(row.name, str) and row.name.strip() else None,
        ts=ts,
    )


def parse_ws_price_payload(raw: object, *, now: datetime | None = None) -> list[PriceSnapshot]:
    """Parse a WS MESSAGE body (list or dict-wrapped list) into snapshots."""
    items: list[object]
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, dict):
        # Some topics wrap under a key — take the first list value.
        lists = [v for v in raw.values() if isinstance(v, list)]
        items = lists[0] if lists else [raw]
    else:
        return []

    out: list[PriceSnapshot] = []
    ts = now if now is not None else datetime.now(UTC)
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            row = WsPriceRow.model_validate(item)
        except ValidationError:
            continue
        snap = ws_price_row_to_snapshot(row, now=ts)
        if snap is not None:
            out.append(snap)
    return out


def parse_ws_index_payload(
    raw: object, *, code: str, now: datetime | None = None
) -> IndexSnapshot | None:
    """Parse ASPI / SNP tick dict into ``IndexSnapshot``."""
    if not isinstance(raw, dict):
        return None
    value = _finite_or_none(raw.get("value"))
    if value is None:
        return None
    ts = now if now is not None else datetime.now(UTC)
    # timestamp field is ISO-ish when present
    raw_ts = raw.get("timestamp")
    if isinstance(raw_ts, str) and raw_ts.strip():
        try:
            parsed = datetime.fromisoformat(raw_ts.strip().replace("+0000", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=UTC)
            ts = parsed.astimezone(UTC)
        except ValueError:
            pass
    return IndexSnapshot(
        code=code,
        value=value,
        change=_finite_or_none(raw.get("change")),
        change_pct=_finite_or_none(raw.get("percentage")),
        ts=ts,
    )


def _sockjs_session_id(n: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=n))


def _ws_url_from_http(broker: str) -> str:
    """Build SockJS native websocket URL from https://…/api/ws broker."""
    base = broker.rstrip("/")
    parsed = urlparse(base)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    server = f"{random.randint(0, 999):03d}"
    session = _sockjs_session_id()
    path = parsed.path.rstrip("/")
    return f"{scheme}://{parsed.netloc}{path}/{server}/{session}/websocket"


OnPriceBatch = Callable[[str, list[PriceSnapshot]], None]
OnIndex = Callable[[IndexSnapshot], None]
OnStatus = Callable[[object], None]


class CSEWebSocketClient:
    """Blocking SockJS+STOMP client (run in a worker thread).

    Calls ``on_prices`` / ``on_index`` synchronously from the reader loop —
    keep handlers short or hand off to a queue.
    """

    def __init__(
        self,
        *,
        broker_url: str = DEFAULT_WS_URL,
        origin: str = "https://www.cse.lk",
        request_interval_seconds: float = 8.0,
        on_prices: OnPriceBatch | None = None,
        on_index: OnIndex | None = None,
        on_status: OnStatus | None = None,
        topics: Iterable[str] = ALL_TOPICS,
    ) -> None:
        self.broker_url = broker_url.rstrip("/")
        self.origin = origin
        self.request_interval_seconds = max(2.0, float(request_interval_seconds))
        self.on_prices = on_prices
        self.on_index = on_index
        self.on_status = on_status
        self.topics = tuple(topics)
        self._stop = threading.Event()
        self._ws: Any = None
        self.messages_received = 0
        self.price_batches = 0
        self.last_error: str | None = None
        self.connected = False

    def stop(self) -> None:
        self._stop.set()
        ws = self._ws
        if ws is not None:
            with contextlib.suppress(Exception):
                ws.close()

    def run_forever(self) -> None:
        """Connect, subscribe, request, read until ``stop()``."""
        try:
            from websocket import WebSocketTimeoutException, create_connection
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "websocket-client is required for CSE WS ingest "
                "(pip install websocket-client)"
            ) from exc

        backoff = 1.0
        while not self._stop.is_set():
            try:
                self._session(create_connection, WebSocketTimeoutException)
                backoff = 1.0
            except Exception as exc:
                self.last_error = str(exc)
                self.connected = False
                log.warning("cse_ws_session_failed", error=str(exc), backoff=backoff)
                self._stop.wait(backoff)
                backoff = min(60.0, backoff * 2)

    def _session(self, create_connection: Any, timeout_exc: type[BaseException]) -> None:
        url = _ws_url_from_http(self.broker_url)
        log.info("cse_ws_connecting", url=url)
        ws = create_connection(
            url,
            header=[
                f"Origin: {self.origin}",
                f"Referer: {self.origin}/",
                "User-Agent: Mozilla/5.0 (compatible; KoelBot/0.1; CSE WS ingest)",
            ],
            timeout=20,
        )
        self._ws = ws
        try:
            open_frame = ws.recv()
            if open_frame != "o":
                raise RuntimeError(f"unexpected SockJS open frame: {open_frame!r}")

            self._send_stomp(
                ws,
                "CONNECT\naccept-version:1.1,1.0\nhost:www.cse.lk\n"
                "heart-beat:10000,10000\n\n\x00",
            )
            connected = ws.recv()
            if "CONNECTED" not in connected:
                raise RuntimeError(f"STOMP CONNECT failed: {connected[:200]!r}")
            self.connected = True
            self.last_error = None
            log.info("cse_ws_connected", topics=len(self.topics))

            for i, topic in enumerate(self.topics):
                self._send_stomp(
                    ws,
                    f"SUBSCRIBE\nid:sub-{i}\ndestination:{topic}\nack:auto\n\n\x00",
                )
            self._request_all(ws)
            last_req = time.monotonic()

            while not self._stop.is_set():
                if time.monotonic() - last_req >= self.request_interval_seconds:
                    self._request_all(ws)
                    last_req = time.monotonic()
                try:
                    ws.settimeout(2.0)
                    raw = ws.recv()
                except timeout_exc:
                    continue
                except Exception:
                    raise
                if not raw or raw == "h":
                    continue
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8", errors="replace")
                if raw.startswith("c"):
                    log.info("cse_ws_sockjs_close", frame=raw[:80])
                    break
                if not raw.startswith("a"):
                    continue
                try:
                    arr = json.loads(raw[1:])
                except json.JSONDecodeError:
                    continue
                if not isinstance(arr, list):
                    continue
                for item in arr:
                    if isinstance(item, str):
                        self._handle_stomp_frame(item)
        finally:
            self.connected = False
            with contextlib.suppress(Exception):
                self._send_stomp(ws, "DISCONNECT\n\n\x00")
            with contextlib.suppress(Exception):
                ws.close()
            self._ws = None

    def _request_all(self, ws: Any) -> None:
        for dest in REQUEST_DESTINATIONS:
            self._send_stomp(
                ws,
                f"SEND\ndestination:{dest}\ncontent-type:application/json\n"
                f"content-length:2\n\n{{}}\x00",
            )

    @staticmethod
    def _send_stomp(ws: Any, frame: str) -> None:
        ws.send(json.dumps([frame]))

    def _handle_stomp_frame(self, frame: str) -> None:
        if frame.startswith("ERROR"):
            self.last_error = frame[:300]
            log.warning("cse_ws_stomp_error", frame=frame[:300])
            return
        if not frame.startswith("MESSAGE"):
            return
        self.messages_received += 1
        headers, _, body = frame.partition("\n\n")
        dest = ""
        for line in headers.split("\n"):
            if line.startswith("destination:"):
                dest = line.split(":", 1)[1].strip()
                break
        body = body.rstrip("\x00")
        try:
            payload = json.loads(body) if body else None
        except json.JSONDecodeError:
            return
        now = datetime.now(UTC)
        if dest in PRICE_TOPICS:
            snaps = parse_ws_price_payload(payload, now=now)
            if snaps and self.on_prices is not None:
                self.price_batches += 1
                self.on_prices(dest, snaps)
            return
        if dest == "/topic/aspi" and self.on_index is not None:
            idx = parse_ws_index_payload(payload, code="ASPI", now=now)
            if idx is not None:
                self.on_index(idx)
            return
        if dest == "/topic/snp" and self.on_index is not None:
            idx = parse_ws_index_payload(payload, code="SNP_SL20", now=now)
            if idx is not None:
                self.on_index(idx)
            return
        if dest in {STATUS_TOPIC, SUMMARY_TOPIC} and self.on_status is not None:
            self.on_status(payload)
