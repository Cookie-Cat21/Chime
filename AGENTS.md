# AGENTS.md

koel — Telegram-first alerting layer for the Colombo Stock Exchange (CSE).
Product plan and non-goals live in `CLAUDE.md`; developer commands in `README.md`.

## Cursor Cloud specific instructions

The startup update script installs dependencies only (Python
`pip install -e ".[dev,macro]" --break-system-packages` and `web/` `npm --prefix web ci`).
Everything below is not run automatically — future agents must install Postgres (see below)
and start the datastore/services themselves.

### Services

| Service | Language / runtime | Run (dev) | Notes |
|---|---|---|---|
| Postgres 16 | apt package (not Docker here) | install then `sudo pg_ctlcluster 16 main start` | Local DB for backend + dashboard / integration tests. Not preinstalled — `sudo apt-get install -y postgresql postgresql-contrib` first. |
| Backend (`koel`) | Python 3.12 | `python3 -m koel {bot,poller,both,tick}` | `bot`/`poller`/`both`/`tick` require `TELEGRAM_BOT_TOKEN`; `migrate` does not. |
| Dashboard (`web/`) | Node 22 / Next.js 16 | `cd web && npm run dev` (`:3000`) | Postgres-only; never calls cse.lk. |

### Postgres (no Docker in this VM)

`docker` is not installed here, so the `docker-compose.yml` / `make up` path does **not**
work. Postgres is **not preinstalled** on a fresh VM and is not part of the update script
(system dep) — install it once per session, then start it and (re)create the role/db if
missing:

```bash
sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib
```

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='koel'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE koel LOGIN PASSWORD 'koel';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='koel'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE koel OWNER koel;"
```

`DATABASE_URL=postgresql://koel:koel@localhost:5432/koel` (the repo default). Copy
`.env.example` → `.env` for the backend; the `.env` default `DATABASE_URL` already matches.
Apply migrations with `python3 -m koel.migrate` (idempotent).

> **Secrets may or may not be injected — check first (`env | grep -E "DASH_|DATABASE_URL|TELEGRAM"`).**
> When Cloud Agent secrets *are* injected (a **Neon** `DATABASE_URL` like
> `…neon.tech/neondb` plus `DASH_SESSION_SECRET`, `DASH_DEMO_TELEGRAM_IDS`,
> `DASH_DEFAULT_TELEGRAM_ID`, `TELEGRAM_BOT_TOKEN`), the Neon DB is already migrated +
> richly seeded, and both the backend (`python3 -m koel …` with no explicit
> `DATABASE_URL`) and the dashboard (Next.js does **not** let `.env.local` override an
> existing `process.env` var) talk to Neon, **not** the local cluster. Sign in with an ID
> from the `DASH_DEMO_TELEGRAM_IDS` allowlist; `ensureUser` creates the row on first login.
> **But injection is not guaranteed** — in some runs the env is empty. When absent, either
> (a) run local Postgres as above and point everything at
> `postgresql://koel:koel@localhost:5432/koel`, or (b) write the values into `/workspace/.env`
> (backend) and `/workspace/web/.env.local` (dashboard, needs `DASH_DEMO_AUTH=1`). With
> nothing shadowing them, `.env`/`.env.local` are honored (start the dash from a shell where
> `DATABASE_URL`/`DASH_*` are unset so `.env.local` wins). Never run integration `pytest`
> against a shared/Neon `DATABASE_URL` — it writes fixtures into that DB.

### Non-obvious gotchas

- Use `python3`, not `python` — the CLI examples in `README.md`/`Makefile` say `python`, but
  only `python3` exists on this VM.
- pip installs need `--break-system-packages` (system Python is externally managed); scripts
  land in `~/.local/bin`, which is not on `PATH` by default (invoke tools by module, e.g.
  `python3 -m koel ...`, or add that dir to `PATH`).
- Running `pytest` with `DATABASE_URL` set writes fixture rows into that database; it does not
  fully clean up. Point tests at a throwaway DB, or `TRUNCATE ... RESTART IDENTITY CASCADE`
  before demos so the DB is pristine.
- `tick`/`bot`/`poller`/`both` require `TELEGRAM_BOT_TOKEN` even to start. For a poll-only
  smoke that never sends Telegram (no matching alert rules), a placeholder token works:
  `TELEGRAM_BOT_TOKEN=000:placeholder python3 -m koel tick --force`.
- The poller only persists `price_snapshots` for symbols that are on someone's watchlist.
  Poll a symbol you actually want by adding it to `watchlist_items` first.
- The dashboard's add-symbol input rejects symbols missing from the `stocks` table
  ("Unknown symbol"). The poller populates `stocks`; when running the dash alone, seed the
  row first (`INSERT INTO stocks (symbol) VALUES ('X.N0000') ON CONFLICT DO NOTHING;`).
- Dashboard demo auth (`web/.env.local`): needs `DASH_DEMO_AUTH=1`,
 `DASH_DEMO_TELEGRAM_IDS=<id>` matching a `users.telegram_id`, and a non-empty
 `DASH_SESSION_SECRET` (empty → session/mutate routes return 503). Mutations require the
 `X-CSRF-Token` header returned at login.
- **If** the VM injects `DASH_DEMO_AUTH=0` / an empty `DASH_SESSION_SECRET` as real shell
 env vars, Next.js gives real `process.env` precedence over `.env.local`, so they **shadow**
 `web/.env.local` and demo login fails with `demo_auth_disabled` (403). Either start the dash
 from a shell that `unset`s those vars (so `.env.local` wins), or pass them inline, e.g.
 `DASH_DEMO_AUTH=1 DASH_SESSION_SECRET=$(openssl rand -hex 32) DASH_DEMO_TELEGRAM_IDS=123456789 npm run dev`.
 A `users` row with that `telegram_id` must exist (`INSERT INTO users (telegram_id) VALUES (123456789) ON CONFLICT DO NOTHING;`).
 (In runs with no injected env, `web/.env.local` alone is enough.)
- The full `pytest` suite needs the `[macro]` extra (`openpyxl`) — CI installs `.[dev,macro]`.
 Without it, `tests/test_macro_storage_and_ingest.py` fails on `ModuleNotFoundError: openpyxl`.
- `tests/test_web_route_regressions.py::{test_market_movers_route_unit,test_symbols_list_query_validation_unit}`
 fail **only when `web/node_modules` is installed** (they run a `tsx` harness that asserts
 `no session → 401`, but the movers/symbols routes now use `optionalSession` and return 200
 for public market data). CI never hits this — its Python unit job has no `web/` deps, so
 `_require_web_node_modules()` skips them. Treat as known harness/route drift, not an env bug.
- Running `bot`/`both` with a **live/shared** `TELEGRAM_BOT_TOKEN` throws
 `telegram.error.Conflict: terminated by other getUpdates request` when another instance is
 already long-polling that token. For a backend/health smoke, run `poller` (no Telegram
 long-poll) instead of `both`.
- Cloud Agent port previews use a `*.agent.cvm.dev` Host (not localhost). Next 16
  blocks `/_next/*` for unknown dev origins — `web/next.config.ts` sets
  `allowedDevOrigins` for those hosts so login JS can hydrate. Restart `npm run
  dev` after changing that list.
- Market-hours gating (09:30–14:30 `Asia/Colombo`, weekdays): the poller idles outside those
  hours — use `tick --force` to poll on demand.
