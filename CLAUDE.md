# Chime — CSE Alerting Layer

## What this is

Chime is a Telegram-first alerting product for the Colombo Stock Exchange (CSE).
It is NOT a portfolio tracker, NOT a trading terminal, and NOT a dashboard the
user is expected to open regularly. It is a background watcher that pushes a
message the moment something the user cares about happens: a price crossing a
threshold, a daily % move, or a new company disclosure/announcement.

The one thing every existing tool in this space fails to do (CSE's own mobile
app, CSE Tracker Pro, TradingView, etc.) is real push notification that works
without the user having a browser tab or app open. That is Chime's entire
reason to exist. Everything else is secondary.

**Non-goals for v1 (do not build these yet):**
- No portfolio / P&L tracking
- No tax reports
- No stock screener
- No technical analysis charts
- No web dashboard beyond the minimum needed to manage a watchlist
- No native mobile app
- No payment integration

If a feature isn't required to make "user sets an alert condition and gets
pinged on Telegram when it fires" work end to end, it does not belong in v1.

## Context / competitive landscape (for reasoning, not for building yet)

- cse.lk has undocumented but public JSON endpoints used by their own web
  portal (see Data Sources below). No official docs, no published rate limits.
- CSE's own mobile app has notification *category* toggles but no custom
  per-stock price-threshold alerts, and its push only reaches users of that
  specific app.
- CSE Tracker Pro (csetracker.lk) is a comprehensive local competitor
  (portfolio tracker, tax reports, screener, technical analysis) but its own
  price alerts are explicitly browser-open-only — confirmed on their site.
- Precedent: Zerodha (India's largest broker) had the same gap for years and
  shipped "Tijori Alerts" — a standalone WhatsApp-first filing/alert summarizer
  — specifically to close it, even after Kite already had in-app alerts.

Chime is the CSE equivalent of Tijori Alerts, not a CSE Tracker Pro clone.

## Data sources (starting point — verify each endpoint still works before use)

Base: `https://www.cse.lk/api/`

- `POST /companyInfoSummery` — body `{symbol}` — last price, change, market cap
- `GET/POST /chartData` — historical price series for a symbol
- `GET /dailyMarketSummery` — end-of-day market summary
- `GET /allSectors` — sector list/performance
- `GET /snpData` — S&P Sri Lanka 20 index data
- `GET /detailedTrades` — trade-level detail

These are reverse-engineered, undocumented, and may change or rate-limit
without notice. Build the poller with a clean adapter layer so a broken
endpoint is a one-file fix, not a rewrite. Log every failed call.

Company disclosures/announcements: CSE publishes these on cse.lk under
market announcements — find the underlying endpoint the same way (check
network requests on the announcements page) before hardcoding a scraper
against HTML, which will break on redesign.

## MVP scope (v1 — this is the whole build)

1. **Poller** — polls price + disclosure data on an interval during market
   hours (09:30–14:30 SLT, weekdays). Normalizes into a clean internal schema.
   Stores every snapshot (this historical data is itself a future asset —
   don't discard it).
2. **Rule engine** — evaluates each new snapshot against active alert rules.
   Rule types for v1:
   - Price crosses above X
   - Price crosses below X
   - Daily % move exceeds X (up or down)
   - New disclosure/announcement published for a watched symbol
3. **Telegram bot** — the only user-facing surface for v1.
   - `/start` — register user, short explainer
   - `/watch SYMBOL` — add to watchlist
   - `/unwatch SYMBOL`
   - `/alert SYMBOL above PRICE` / `/alert SYMBOL below PRICE`
   - `/alert SYMBOL move PERCENT`
   - `/myalerts` — list active alerts
   - `/mywatchlist`
   - Fires a message the moment a rule matches. Message includes symbol,
     what triggered it, current price, and (for disclosures) a link to the
     source.
4. **Storage** — Postgres. Keep it simple; this is not a big-data problem yet.

## Suggested schema (adjust as needed, don't over-design)

- `stocks (symbol, name, sector)`
- `price_snapshots (symbol, price, change, change_pct, volume, ts)`
- `disclosures (symbol, title, url, published_at, seen_at)`
- `users (telegram_id, created_at)`
- `watchlist_items (user_id, symbol)`
- `alert_rules (user_id, symbol, type, threshold, active, created_at)`
- `alert_log (rule_id, fired_at, message_sent)`

## Tech stack

- Python for poller + bot (matches existing scraping experience from prior
  projects — reuse that muscle, don't relearn a new stack for this)
- `python-telegram-bot` for the bot
- Postgres (Supabase is fine if convenient — matches other projects, gives
  free hosting tier)
- Simple cron / scheduled job for the poller (APScheduler or plain cron) —
  no need for Kafka/Flink-scale infra for this volume of data
- No web framework needed for v1 unless the bot needs a companion webhook

## Compliance notes (do not skip)

- This is an information tool, not investment advice. Every bot response
  involving a price or recommendation-adjacent phrasing should carry a short
  "not financial advice" framing, matching the tone CSE Tracker Pro uses in
  their disclaimer (SEC Sri Lanka Part V Market Misconduct — sections on not
  inducing dealing in securities, not disseminating insider information).
- Only use publicly available data. Do not scrape csetracker.lk or any other
  competitor's platform — their ToS explicitly forbids it and it isn't
  needed; cse.lk is the direct source.
- Rate-limit the poller politely. This is unofficial infrastructure — don't
  hammer it in a way that gets noticed or blocked.

## Build order (for when implementation actually starts — not this session)

1. Data adapter layer + verify each cse.lk endpoint still works, log real
   sample responses to `docs/sample_responses/`
2. Postgres schema + migrations
3. Poller loop writing snapshots
4. Rule engine matching snapshots against rules
5. Telegram bot wired to rule engine + Postgres
6. Manual end-to-end test: set an alert, force a condition, confirm push

## What to do in THIS session

Only scaffold the repository structure and make the initial commit. Do not
implement the poller, bot, or database logic yet — that starts in a future
session once this plan is reviewed. This session's job is: clean folder
structure, this file, README, .gitignore, and empty placeholder files where
useful, committed once.
