"""Market-hours polling loop (09:30–14:30 Asia/Colombo, weekdays).

Fetches price + disclosure data via adapters, stores every snapshot, evaluates
rules, claims alerts idempotently, and dispatches Telegram sends.
"""

from __future__ import annotations

import asyncio
import contextlib
import random
import signal
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, time
from typing import Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from chime.adapters.cse import CSEClient
from chime.circuit import CircuitOpenError
from chime.config import Settings
from chime.domain import AlertEvent, format_alert_message
from chime.logging_setup import get_logger
from chime.rules import evaluate_disclosure_rules, evaluate_price_rules, filter_fireable
from chime.storage import Storage

log = get_logger(__name__)

SendFunc = Callable[[int, str], Awaitable[bool]]


def parse_hhmm(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def is_market_open(now: datetime, settings: Settings) -> bool:
    tz = ZoneInfo(settings.market_tz)
    local = now.astimezone(tz)
    if local.weekday() >= 5:
        return False
    open_t = parse_hhmm(settings.market_open)
    close_t = parse_hhmm(settings.market_close)
    return open_t <= local.time() <= close_t


class Poller:
    def __init__(
        self,
        settings: Settings,
        storage: Storage,
        cse: CSEClient,
        send: SendFunc,
    ) -> None:
        self.settings = settings
        self.storage = storage
        self.cse = cse
        self.send = send
        self._scheduler: AsyncIOScheduler | None = None
        self._stopping = asyncio.Event()
        self.last_tick_at: datetime | None = None
        self.last_tick_ok: bool = True
        self.last_error: str | None = None

    async def run_once(self, *, force: bool = False) -> list[AlertEvent]:
        """Single poll cycle. Returns fireable events that were claimed."""
        now = datetime.now(UTC)
        if not force and not is_market_open(now, self.settings):
            log.info("poll_skipped_outside_hours", now=now.isoformat())
            return []

        fired: list[AlertEvent] = []
        try:
            fired.extend(await self._poll_prices())
            fired.extend(await self._poll_disclosures())
            await self._retry_unsent()
            self.last_tick_ok = True
            self.last_error = None
        except Exception as exc:
            self.last_tick_ok = False
            self.last_error = str(exc)
            log.exception("poll_cycle_failed", error=str(exc))
        finally:
            self.last_tick_at = datetime.now(UTC)
        return fired

    async def _poll_prices(self) -> list[AlertEvent]:
        symbols = await self.storage.watched_symbols()
        if not symbols:
            log.info("poll_no_watchlist")
            return []

        try:
            all_snaps = await self.cse.fetch_trade_summary()
        except CircuitOpenError:
            log.error("price_poll_circuit_open")
            return []
        except Exception as exc:
            log.exception("price_poll_failed", error=str(exc))
            return []

        wanted = set(symbols)
        snaps = [s for s in all_snaps if s.symbol in wanted]
        rules = await self.storage.active_rules_for_symbols(list(wanted))
        rules_by_symbol: dict[str, list[Any]] = {}
        for rule in rules:
            rules_by_symbol.setdefault(rule.symbol, []).append(rule)

        fired: list[AlertEvent] = []
        for snap in snaps:
            stored = await self.storage.insert_snapshot(snap)
            assert stored.id is not None
            previous = await self.storage.get_previous_state(stored.symbol, before_id=stored.id)
            symbol_rules = rules_by_symbol.get(stored.symbol, [])
            events = evaluate_price_rules(
                snapshot=stored,
                previous=previous,
                rules=symbol_rules,
            )
            for event in events:
                if event.set_armed is not None and event.trigger == "rearm":
                    await self.storage.set_rule_armed(event.rule_id, True)
                    continue
                if event.set_armed is False:
                    await self.storage.set_rule_armed(event.rule_id, False)
            for event in filter_fireable(events):
                claimed = await self._claim_and_send(event)
                if claimed:
                    fired.append(event)
        return fired

    async def _poll_disclosures(self) -> list[AlertEvent]:
        symbols = await self.storage.watched_symbols()
        if not symbols:
            return []
        rules = await self.storage.active_rules_for_symbols(symbols)
        disclosure_rules = [r for r in rules if r.type.value == "disclosure"]
        if not disclosure_rules:
            # Still ingest disclosures for watched symbols (history asset)
            pass

        today = date.today()
        from_date = date(today.year - 1, today.month, today.day).isoformat()
        to_date = today.isoformat()
        fired: list[AlertEvent] = []

        for symbol in symbols:
            try:
                disclosures = await self.cse.fetch_announcements_for_symbol(
                    symbol, from_date=from_date, to_date=to_date
                )
            except Exception as exc:
                log.warning("disclosure_poll_failed", symbol=symbol, error=str(exc))
                continue

            symbol_rules = [r for r in disclosure_rules if r.symbol == symbol]
            for disc in disclosures:
                inserted = await self.storage.insert_disclosure_if_new(disc)
                if inserted is None:
                    continue
                events = evaluate_disclosure_rules(disclosure=inserted, rules=symbol_rules)
                for event in events:
                    claimed = await self._claim_and_send(event)
                    if claimed:
                        fired.append(event)
            # Polite pacing between symbols
            await asyncio.sleep(0.2 + random.random() * 0.3)
        return fired

    async def _claim_and_send(self, event: AlertEvent) -> bool:
        message = format_alert_message(event)
        log_id = await self.storage.claim_alert(event, message)
        if log_id is None:
            log.info("alert_already_claimed", event_key=event.event_key, rule_id=event.rule_id)
            return False
        ok = await self.send(event.telegram_id, message)
        if ok:
            await self.storage.mark_alert_sent(log_id)
            log.info("alert_sent", rule_id=event.rule_id, event_key=event.event_key)
            return True
        log.warning("alert_send_failed", rule_id=event.rule_id, event_key=event.event_key)
        return False

    async def _retry_unsent(self) -> None:
        pending = await self.storage.unsent_alerts()
        for row in pending:
            text = row["message_text"] or ""
            ok = await self.send(int(row["telegram_id"]), text)
            if ok:
                await self.storage.mark_alert_sent(int(row["id"]))

    async def _scheduled_tick(self) -> None:
        # Jitter so we don't stampede cse.lk on the wall clock
        jitter = random.uniform(0, self.settings.poll_jitter_seconds)
        await asyncio.sleep(jitter)
        await self.run_once()

    def start_scheduler(self) -> AsyncIOScheduler:
        tz = ZoneInfo(self.settings.market_tz)
        scheduler = AsyncIOScheduler(timezone=tz)
        scheduler.add_job(
            self._scheduled_tick,
            IntervalTrigger(seconds=self.settings.poll_interval_seconds, timezone=tz),
            id="cse_poll",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=30,
        )
        scheduler.start()
        self._scheduler = scheduler
        log.info(
            "poller_started",
            interval=self.settings.poll_interval_seconds,
            tz=self.settings.market_tz,
        )
        return scheduler

    async def shutdown(self) -> None:
        self._stopping.set()
        if self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None
        log.info("poller_stopped")


async def run_poller_forever(
    settings: Settings, storage: Storage, cse: CSEClient, send: SendFunc
) -> None:
    poller = Poller(settings, storage, cse, send)
    poller.start_scheduler()

    stop = asyncio.Event()

    def _handle_sig(*_: object) -> None:
        stop.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, _handle_sig)

    await stop.wait()
    await poller.shutdown()
