"""Telegram bot — the only user-facing surface for v1.

Commands: /start, /watch, /unwatch, /alert, /myalerts, /mywatchlist.
Alert dispatch happens from the poller via notify.send_message.
"""

from __future__ import annotations

import re
from typing import Any

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from chime.adapters.cse import CSEClient
from chime.domain import AlertType, disclaimer
from chime.logging_setup import get_logger
from chime.storage import Storage

log = get_logger(__name__)

SYMBOL_RE = re.compile(r"^[A-Za-z0-9]{1,12}(\.[A-Za-z0-9]{1,8})?$")

START_TEXT = (
    "Chime watches the Colombo Stock Exchange and pings you on Telegram "
    "when a price crosses your threshold, a daily move hits your %, or a "
    "new company disclosure drops — no app or browser tab required.\n\n"
    f"{disclaimer()}"
)

HELP_HINT = (
    "Commands:\n"
    "/watch SYMBOL\n"
    "/unwatch SYMBOL\n"
    "/alert SYMBOL above PRICE\n"
    "/alert SYMBOL below PRICE\n"
    "/alert SYMBOL move PERCENT\n"
    "/alert SYMBOL disclosure\n"
    "/myalerts\n"
    "/mywatchlist"
)


def normalize_symbol(raw: str) -> str | None:
    s = raw.strip().upper()
    if not s or not SYMBOL_RE.match(s):
        return None
    # CSE common shares often use .N0000 — accept bare ticker and common forms
    return s


async def _user_id(storage: Storage, update: Update) -> int | None:
    if update.effective_user is None:
        return None
    return await storage.ensure_user(update.effective_user.id)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    storage: Storage = context.application.bot_data["storage"]
    await _user_id(storage, update)
    if update.effective_message:
        await update.effective_message.reply_text(f"{START_TEXT}\n\n{HELP_HINT}")


async def cmd_watch(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    storage: Storage = context.application.bot_data["storage"]
    cse: CSEClient = context.application.bot_data["cse"]
    if not update.effective_message:
        return
    if not context.args:
        await update.effective_message.reply_text("Usage: /watch SYMBOL\nExample: /watch JKH.N0000")
        return
    symbol = normalize_symbol(context.args[0])
    if symbol is None:
        await update.effective_message.reply_text(
            "That doesn't look like a CSE symbol. Try e.g. JKH.N0000 or COMB.N0000."
        )
        return
    exists = await cse.symbol_exists(symbol)
    if not exists:
        await update.effective_message.reply_text(
            f"Couldn't find {symbol} on cse.lk. Check the ticker and try again."
        )
        return
    user_id = await _user_id(storage, update)
    assert user_id is not None
    info = await cse.fetch_company_info(symbol)
    await storage.upsert_stock(symbol, info.name if info else None)
    await storage.add_watch(user_id, symbol)
    await update.effective_message.reply_text(
        f"Watching {symbol}. Set an alert with /alert.\n{disclaimer()}"
    )


async def cmd_unwatch(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    storage: Storage = context.application.bot_data["storage"]
    if not update.effective_message:
        return
    if not context.args:
        await update.effective_message.reply_text("Usage: /unwatch SYMBOL")
        return
    symbol = normalize_symbol(context.args[0])
    if symbol is None:
        await update.effective_message.reply_text("That doesn't look like a CSE symbol.")
        return
    user_id = await _user_id(storage, update)
    assert user_id is not None
    removed = await storage.remove_watch(user_id, symbol)
    if removed:
        await update.effective_message.reply_text(f"Removed {symbol} from your watchlist.")
    else:
        await update.effective_message.reply_text(f"{symbol} wasn't on your watchlist.")


async def cmd_alert(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    storage: Storage = context.application.bot_data["storage"]
    cse: CSEClient = context.application.bot_data["cse"]
    if not update.effective_message:
        return
    args = context.args or []
    if len(args) < 2:
        await update.effective_message.reply_text(
            "Usage:\n"
            "/alert SYMBOL above PRICE\n"
            "/alert SYMBOL below PRICE\n"
            "/alert SYMBOL move PERCENT\n"
            "/alert SYMBOL disclosure"
        )
        return
    symbol = normalize_symbol(args[0])
    if symbol is None:
        await update.effective_message.reply_text("That doesn't look like a CSE symbol.")
        return
    kind = args[1].lower()
    threshold: float | None = None
    alert_type: AlertType

    if kind in ("above", "below", "move"):
        if len(args) < 3:
            await update.effective_message.reply_text(f"Usage: /alert SYMBOL {kind} NUMBER")
            return
        try:
            threshold = float(args[2].replace(",", ""))
        except ValueError:
            await update.effective_message.reply_text("The threshold must be a number.")
            return
        if threshold <= 0:
            await update.effective_message.reply_text("Threshold must be positive.")
            return
        if kind == "above":
            alert_type = AlertType.PRICE_ABOVE
        elif kind == "below":
            alert_type = AlertType.PRICE_BELOW
        else:
            alert_type = AlertType.DAILY_MOVE
    elif kind in ("disclosure", "announcement"):
        alert_type = AlertType.DISCLOSURE
    else:
        await update.effective_message.reply_text(
            "Unknown alert kind. Use above, below, move, or disclosure."
        )
        return

    exists = await cse.symbol_exists(symbol)
    if not exists:
        await update.effective_message.reply_text(
            f"Couldn't find {symbol} on cse.lk. Check the ticker and try again."
        )
        return

    user_id = await _user_id(storage, update)
    assert user_id is not None
    info = await cse.fetch_company_info(symbol)
    await storage.upsert_stock(symbol, info.name if info else None)
    rule = await storage.create_alert_rule(user_id, symbol, alert_type, threshold)

    if alert_type == AlertType.DISCLOSURE:
        desc = f"new disclosure for {symbol}"
    elif alert_type == AlertType.DAILY_MOVE:
        desc = f"{symbol} daily move ≥ {threshold:g}%"
    elif alert_type == AlertType.PRICE_ABOVE:
        desc = f"{symbol} crosses above {threshold:g}"
    else:
        desc = f"{symbol} crosses below {threshold:g}"

    await update.effective_message.reply_text(
        f"Alert #{rule.id} set: {desc}.\n{disclaimer()}"
    )


async def cmd_myalerts(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    storage: Storage = context.application.bot_data["storage"]
    if not update.effective_message:
        return
    user_id = await _user_id(storage, update)
    assert user_id is not None
    rules = await storage.list_alerts(user_id)
    if not rules:
        await update.effective_message.reply_text("No active alerts. Set one with /alert.")
        return
    lines = ["Your alerts:"]
    for r in rules:
        if r.type == AlertType.DISCLOSURE:
            lines.append(f"#{r.id} {r.symbol} disclosure")
        elif r.type == AlertType.DAILY_MOVE:
            lines.append(f"#{r.id} {r.symbol} move {r.threshold:g}%")
        elif r.type == AlertType.PRICE_ABOVE:
            lines.append(f"#{r.id} {r.symbol} above {r.threshold:g}")
        else:
            lines.append(f"#{r.id} {r.symbol} below {r.threshold:g}")
    lines.append("")
    lines.append(disclaimer())
    await update.effective_message.reply_text("\n".join(lines))


async def cmd_mywatchlist(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    storage: Storage = context.application.bot_data["storage"]
    if not update.effective_message:
        return
    user_id = await _user_id(storage, update)
    assert user_id is not None
    symbols = await storage.list_watchlist(user_id)
    if not symbols:
        await update.effective_message.reply_text("Watchlist empty. Add with /watch SYMBOL.")
        return
    await update.effective_message.reply_text("Watchlist:\n" + "\n".join(symbols))


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    log.exception("bot_handler_error", error=str(context.error), update=str(update)[:200])


def build_application(
    token: str, storage: Storage, cse: CSEClient
) -> Application[Any, Any, Any, Any, Any, Any]:
    app = (
        Application.builder()
        .token(token)
        .connect_timeout(10.0)
        .read_timeout(20.0)
        .write_timeout(20.0)
        .pool_timeout(5.0)
        .build()
    )
    app.bot_data["storage"] = storage
    app.bot_data["cse"] = cse
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("watch", cmd_watch))
    app.add_handler(CommandHandler("unwatch", cmd_unwatch))
    app.add_handler(CommandHandler("alert", cmd_alert))
    app.add_handler(CommandHandler("myalerts", cmd_myalerts))
    app.add_handler(CommandHandler("mywatchlist", cmd_mywatchlist))
    app.add_error_handler(on_error)
    return app
