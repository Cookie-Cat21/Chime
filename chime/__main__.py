"""Chime entrypoint: bot, poller, migrate, or both."""

from __future__ import annotations

import argparse
import asyncio

from telegram import Bot

from chime.adapters.cse import CSEClient
from chime.bot import build_application
from chime.config import Settings
from chime.health import HealthState, start_health_server
from chime.logging_setup import configure_logging, get_logger
from chime.migrate import apply_migrations
from chime.notify import send_message
from chime.poller import Poller, run_poller_forever
from chime.storage import Storage

log = get_logger(__name__)


async def _run_both(settings: Settings) -> None:
    storage = Storage(settings.database_url)
    await storage.open()
    cse = CSEClient(
        base_url=settings.cse_base_url,
        timeout=settings.http_timeout_seconds,
        fail_max=settings.circuit_fail_max,
        reset_timeout=settings.circuit_reset_seconds,
    )
    bot = Bot(settings.telegram_bot_token)

    async def send(chat_id: int, text: str) -> bool:
        return await send_message(bot, chat_id, text)

    health = HealthState()
    server = start_health_server(settings.health_host, settings.health_port, health)

    poller = Poller(settings, storage, cse, send)
    poller.start_scheduler()

    app = build_application(settings.telegram_bot_token, storage, cse)

    async def _post_init(application: object) -> None:
        log.info("bot_started")

    app.post_init = _post_init

    try:
        await app.initialize()
        await app.start()
        assert app.updater is not None
        await app.updater.start_polling(drop_pending_updates=True)

        # Keep health fresh
        while True:
            db_ok = False
            try:
                db_ok = await storage.health_check()
            except Exception as exc:
                log.warning("health_db_failed", error=str(exc))
            health.update(
                ok=db_ok,
                db_ok=db_ok,
                last_tick_at=poller.last_tick_at.isoformat() if poller.last_tick_at else None,
                last_tick_ok=poller.last_tick_ok,
                last_error=poller.last_error,
            )
            await asyncio.sleep(10)
    finally:
        await poller.shutdown()
        if app.updater is not None:
            await app.updater.stop()
        await app.stop()
        await app.shutdown()
        await cse.aclose()
        await storage.close()
        server.shutdown()


async def _run_poller(settings: Settings) -> None:
    storage = Storage(settings.database_url)
    await storage.open()
    cse = CSEClient(
        base_url=settings.cse_base_url,
        timeout=settings.http_timeout_seconds,
        fail_max=settings.circuit_fail_max,
        reset_timeout=settings.circuit_reset_seconds,
    )
    bot = Bot(settings.telegram_bot_token)

    async def send(chat_id: int, text: str) -> bool:
        return await send_message(bot, chat_id, text)

    health = HealthState()
    server = start_health_server(settings.health_host, settings.health_port, health)
    try:
        await run_poller_forever(settings, storage, cse, send)
    finally:
        await cse.aclose()
        await storage.close()
        server.shutdown()


def _run_bot(settings: Settings) -> None:
    storage = Storage(settings.database_url)

    async def _setup(app: object) -> None:
        await storage.open()

    async def _shutdown(app: object) -> None:
        await storage.close()
        await cse.aclose()

    cse = CSEClient(
        base_url=settings.cse_base_url,
        timeout=settings.http_timeout_seconds,
        fail_max=settings.circuit_fail_max,
        reset_timeout=settings.circuit_reset_seconds,
    )
    app = build_application(settings.telegram_bot_token, storage, cse)
    app.post_init = _setup
    app.post_shutdown = _shutdown
    health = HealthState()
    server = start_health_server(settings.health_host, settings.health_port, health)
    try:
        app.run_polling(drop_pending_updates=True)
    finally:
        server.shutdown()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="chime", description="CSE Telegram alerting")
    parser.add_argument(
        "command",
        choices=["bot", "poller", "both", "migrate", "tick"],
        help="bot | poller | both | migrate | tick (one forced poll)",
    )
    parser.add_argument("--force", action="store_true", help="For tick: ignore market hours")
    args = parser.parse_args(argv)

    if args.command == "migrate":
        configure_logging()
        settings = Settings.from_env(require_token=False)
        applied = apply_migrations(settings.database_url)
        print("Applied:", ", ".join(applied) if applied else "(none)")
        return

    settings = Settings.from_env(require_token=True)
    configure_logging(settings.log_level)

    if args.command == "bot":
        _run_bot(settings)
    elif args.command == "poller":
        asyncio.run(_run_poller(settings))
    elif args.command == "both":
        asyncio.run(_run_both(settings))
    elif args.command == "tick":
        async def _tick() -> None:
            storage = Storage(settings.database_url)
            await storage.open()
            cse = CSEClient(base_url=settings.cse_base_url)
            bot = Bot(settings.telegram_bot_token)

            async def send(chat_id: int, text: str) -> bool:
                return await send_message(bot, chat_id, text)

            poller = Poller(settings, storage, cse, send)
            events = await poller.run_once(force=args.force or True)
            print(f"Fired {len(events)} alert(s)")
            await cse.aclose()
            await storage.close()

        asyncio.run(_tick())


if __name__ == "__main__":
    main()
