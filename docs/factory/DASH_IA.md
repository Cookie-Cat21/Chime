# Chime Dashboard — Information Architecture & API Sketch

**Lane:** DASH · **Stack:** Next.js + Tailwind + shadcn/ui · **Scope:** thin management UI only  
**Constitution:** [COMMIT_FACTORY.md](COMMIT_FACTORY.md) §7 · [CLAUDE.md](../../CLAUDE.md)

Telegram remains the push channel. The dashboard is for CRUD + inspection — not a trading terminal.

---

## 1. Sitemap

| Route | Purpose | Auth |
|---|---|---|
| `/` | Redirect → `/watchlist` (or `/login` if unauthenticated) | — |
| `/login` | Local/demo sign-in (v1); Telegram Login Widget later | public |
| `/watchlist` | User watchlist + last price / change | user |
| `/alerts` | Active alert rules CRUD | user |
| `/alerts/history` | Fire history (`alert_log`) | user |
| `/symbols/[symbol]` | Symbol detail: last tick, sparkline, disclosures | user |
| `/health` | Ops: poller liveness / last poll (read-only) | ops / demo open |

No nested app shell beyond a single top nav: Watchlist · Alerts · History · (Health).

---

## 2. Wireframe notes (bullet layout)

### `/login`
- Brand wordmark “Chime” (hero-level, not nav-only)
- One line: manage watchlist & alerts; pushes still go to Telegram
- Primary CTA: sign in (demo user select / token)
- Footer NFA line
- No marketing sections, stats, or feature grids

### `/watchlist`
- Header: “Watchlist” + add-symbol control (input + Add)
- List rows: `symbol` · name · last `price` · `change_pct` · link to symbol detail
- Row action: Unwatch
- Empty state: “No symbols — add one or use `/watch` in Telegram”
- Mobile: stacked rows, full-width add form

### `/alerts`
- Header: “Alerts” + “New alert” form
- Form fields: symbol · type (`price_above` \| `price_below` \| `daily_move` \| `disclosure`) · threshold (hidden for disclosure)
- List rows: `#id` · symbol · type · threshold · armed/active badges · Cancel
- Empty state mirrors bot copy
- NFA under any price-adjacent copy

### `/alerts/history`
- Filter: symbol (optional), limit
- Rows: fired_at · symbol · type · trigger/message excerpt · message_sent
- No charts, no “P&L impact”

### `/symbols/[symbol]`
- Title: symbol + name + sector
- Last snapshot block: price, change, change_pct, volume, ts
- Sparkline: recent `price_snapshots` (price vs ts only — not TA)
- Disclosures list: published_at · title · category · external link
- Shortcuts: Add to watchlist · New alert for this symbol

### `/health`
- status · started_at · last_poll_at · last_poll_ok · symbols_polled · errors (from poller health payload)
- No config editors, no restart controls in v1

---

## 3. API endpoints (REST)

Base: `/api/v1`. JSON request/response. All user routes scoped by authenticated `user_id`. Errors: `{ "error": string, "code"?: string }`.

### Auth

| Method | Path | Request | Response |
|---|---|---|---|
| `POST` | `/api/v1/auth/demo` | `{ "telegram_id": number }` | `{ "token": string, "user": { "id", "telegram_id" } }` |
| `POST` | `/api/v1/auth/telegram` *(future)* | Telegram Login Widget payload | same as demo |
| `POST` | `/api/v1/auth/logout` | — | `{ "ok": true }` |
| `GET` | `/api/v1/me` | — | `{ "id", "telegram_id", "created_at" }` |

### Watchlist

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/v1/watchlist` | — | `{ "items": [{ "symbol", "name", "sector", "price", "change", "change_pct", "ts" }] }` |
| `POST` | `/api/v1/watchlist` | `{ "symbol": string }` | `{ "symbol", "name" }` (validates via CSE adapter; upserts `stocks`) |
| `DELETE` | `/api/v1/watchlist/{symbol}` | — | `{ "removed": bool, "deactivated_alerts": number }` |

### Alerts

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/v1/alerts` | `?active=true` | `{ "rules": [{ "id", "symbol", "type", "threshold", "active", "armed", "created_at" }] }` |
| `POST` | `/api/v1/alerts` | `{ "symbol", "type", "threshold"? }` | created rule object |
| `DELETE` | `/api/v1/alerts/{id}` | — | `{ "cancelled": bool }` (soft: `active=false`) |
| `GET` | `/api/v1/alerts/history` | `?symbol=&limit=50` | `{ "events": [{ "id", "rule_id", "symbol", "type", "fired_at", "message_sent", "message_text", "event_key" }] }` |

`type` enum: `price_above` \| `price_below` \| `daily_move` \| `disclosure`  
`threshold` required except `disclosure` (null). Mirror bot: unwatch deactivates rules for that symbol.

### Symbols / market data (read)

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/v1/symbols/{symbol}` | — | `{ "symbol", "name", "sector", "last": PriceSnapshotFields \| null }` |
| `GET` | `/api/v1/symbols/{symbol}/snapshots` | `?limit=60` | `{ "points": [{ "ts", "price", "change_pct" }] }` |
| `GET` | `/api/v1/symbols/{symbol}/disclosures` | `?limit=20` | `{ "items": [{ "id", "title", "category", "url", "published_at", "company_name" }] }` |

`PriceSnapshotFields`: `price`, `change`, `change_pct`, `previous_close`, `volume`, `high`, `low`, `open`, `market_cap`, `ts` (from `price_snapshots` / domain `PriceSnapshot`).

### Health (ops)

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/v1/health` | — | `{ "status": "ok"\|"degraded", "started_at", ...poller details }` |

Proxy or re-expose existing poller `/health` — do not invent a second source of truth.

### Conventions
- Symbol normalize: uppercase, same regex as bot (`SYMBOL_RE`).
- Every price-bearing response may include `disclaimer: "Not financial advice — informational only."` or UI appends `disclaimer()` client-side.
- No WebSocket in v1; pages refresh on navigation / short poll optional later.

---

## 4. Auth recommendation

| Phase | Approach |
|---|---|
| **v1 local/demo** | Signed session cookie (or bearer) after `POST /auth/demo` with a known `telegram_id` that already exists in `users` (or auto-`ensure_user`). Env gate: `DASH_DEMO_AUTH=1`. Fine for single-operator / staging. |
| **Future** | [Telegram Login Widget](https://core.telegram.org/widgets/login): verify `hash` with bot token; upsert `users.telegram_id`; issue same session shape. Drop demo endpoint in production. |

Do not introduce email/password, OAuth providers, or multi-tenant orgs in v1. Dashboard identity = Telegram user row.

---

## 5. Explicitly out of scope (per page)

| Page | Out of scope |
|---|---|
| `/login` | Marketing site, waitlist, payments, multi-provider SSO |
| `/watchlist` | Portfolio quantities, cost basis, P&L, sector allocation |
| `/alerts` | Complex boolean rules, trailing stops, backtests, quiet hours UI |
| `/alerts/history` | Analytics funnels, export-to-tax, “would have made” sims |
| `/symbols/[symbol]` | Full TA charts, order book, screener peers, news scrape beyond CSE disclosures |
| `/health` | Deploy controls, secret editing, CSE rate-limit knobs |

Global bans (every page): tax reports, screener, payments, native-app CTAs, competitor data.

---

## 6. Bot command → UI action map

| Bot command | UI equivalent |
|---|---|
| `/start` | `/login` + post-auth landing; copy mirrors bot explainer + NFA |
| `/watch SYMBOL` | Watchlist → Add symbol (`POST /watchlist`) |
| `/unwatch SYMBOL` | Watchlist row → Unwatch (`DELETE /watchlist/{symbol}`) |
| `/alert SYMBOL above PRICE` | Alerts → New · type `price_above` · threshold |
| `/alert SYMBOL below PRICE` | Alerts → New · type `price_below` · threshold |
| `/alert SYMBOL move PERCENT` | Alerts → New · type `daily_move` · threshold |
| `/alert SYMBOL disclosure` | Alerts → New · type `disclosure` · no threshold |
| `/cancel ALERT_ID` | Alerts row → Cancel (`DELETE /alerts/{id}`) |
| `/myalerts` | `/alerts` list |
| `/mywatchlist` | `/watchlist` list |
| *(push on fire)* | Telegram only; History is read-only audit of `alert_log` |

Parity rule: any mutation available in the UI must use the same storage semantics as the bot (validate symbol via CSE, upsert stock, deactivate rules on unwatch, unique active rule constraints).

---

## Implementation notes (non-binding)

1. Prefer a thin FastAPI/Starlette (or Next Route Handlers wrapping `chime.storage`) — reuse Postgres schema; no parallel tables.
2. First ship: read-only watchlist + auth demo → then alert CRUD → symbol detail → history → health.
3. Mobile-first list UIs; brand-readable first viewport on `/login` and empty states (quality bar #8).
