# Chime

Telegram-first alerting layer for the Colombo Stock Exchange (CSE).

Chime is a background watcher, not a dashboard. You set an alert condition —
a price threshold, a daily % move, or "any new disclosure for this company" —
and get a Telegram message the moment it fires, with no browser tab or app
open. That push-when-it-matters gap is the whole product; see
[CLAUDE.md](CLAUDE.md) for the full plan, scope, and build order.

**Status: scaffold only.** No poller, bot, or database logic is implemented
yet. Implementation follows the build order in CLAUDE.md.

## Layout

```
chime/                  Python package (placeholders for now)
  adapters/             cse.lk API adapter layer — one file per upstream
  poller.py             market-hours polling loop
  rules.py              alert rule engine
  bot.py                Telegram bot (the only user-facing surface in v1)
  storage.py            Postgres access
  config.py             runtime configuration
db/migrations/          SQL migrations
docs/sample_responses/  logged real responses from cse.lk endpoints
tests/
```

## Stack

Python · python-telegram-bot · Postgres (Supabase) · APScheduler

Configuration comes from environment variables — copy `.env.example` to
`.env` and fill it in (never commit `.env`).

## Disclaimer

Chime relays publicly available market information. It is an information
tool, not investment advice.
