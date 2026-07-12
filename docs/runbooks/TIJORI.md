# Tijori / CSE Phase 1 — ops enablement

Short flags for market browse + filing-brief plumbing. Full deploy: [PRODUCTION.md](PRODUCTION.md). Plan: [TIJORI_CSE_PLAN.md](../factory/TIJORI_CSE_PLAN.md).

## Market browse (`/market`)

No extra env. Poller already persists full `tradeSummary` into `stocks` + `price_snapshots` (watchlist empty still OK).

```bash
python -m chime migrate
python -m chime poller   # or: both / tick --force
# dash → /market (session); data = Postgres only
```

Empty board ⇒ poller not running or tradeSummary empty that tick.

## AI briefs (`AI_BRIEFS_ENABLED`)

Default **off**. Stub in `chime/briefs/`; no LLM until explicitly enabled.

```bash
AI_BRIEFS_ENABLED=0          # leave off in prod until Phase 2
# Phase 2 live:
# AI_BRIEFS_ENABLED=1
# AI_API_KEY=…               # required; briefs_enabled() needs both
# AI_PROVIDER=gemini
# AI_MODEL=gemini-2.0-flash
```

## PDF enrich sleep

Legacy `/announcements` → `pdf_url` runs **after** alert claim, outside the poll lock. Polite pause between symbols:

```bash
PDF_ENRICH_SLEEP_SECONDS=0.5   # default; raise if CSE rate-limits
```

## `DISCLOSURE_BULK`

**Not present** — no `DISCLOSURE_BULK` env. Disclosures stay per-symbol `getAnnouncementByCompany` for symbols with disclosure rules.
