# Third-party *market data* checklist (not npm/PyPI)

Runtime open-source packages stay in [`THIRD_PARTY.md`](THIRD_PARTY.md) / [`docs/THIRD_PARTY.md`](THIRD_PARTY.md).  
This file tracks **external market / macro feeds** considered for Signal Board factors.

## Rules (locked)

1. Python adapter only → Postgres → `web/` reads DB (never calls the feed).
2. Feature-flagged + rate-limited + circuit-breaker shared patterns.
3. Log ToS / license / attribution here **before** enabling in prod.
4. No competitor scrape (`csetracker.lk` etc.).
5. Not a Finnhub / TradingView **data spine** ([CHIME_MASTER_PLAN.md](factory/CHIME_MASTER_PLAN.md)).

## Tiers

| Tier | Status | Examples |
|---|---|---|
| A — CSE / in-house | **Primary** | Path bars, tradeSummary, sectors, indexes, disclosures, filing_metrics |
| B — public macro | Candidate later | CBSL policy rate / inflation; ToS-clean USD/LKR; WB/IMF open series |
| B* — broker public boards | **Candidate (ToS gate open)** | LOLC StockLens JSON + dividend CSV — see plan below |
| C — text | Partial | Filing PDF extract + optional Gemini briefs (existing flags) |
| C* — public PDF stats | Candidate | CDS INFOLINE monthly; optional First Capital research PDFs |
| D — commercial | Deferred | Finnhub, Polygon, Bloomberg, … |
| D* — Yahoo CSE (unofficial) | **Research panel only** | `hybrid_daily_bars` via `yfinance` (`.CM` tickers); flag `HYBRID_BACKFILL_ENABLED` default 0; **not** dash truth; CSE wins on overlap; Yahoo cut on/after `YAHOO_STALE_CUTOFF` (2026-02-18) |
| E — banned | Never | Competitor HTML/APIs; dash→upstream scrapers; broker/CDS **holdings** session scrape |

## Adapter intake checklist (copy per source)

- [ ] Source name + official URL  
- [ ] ToS / license allows redistribution into Postgres for product use  
- [ ] Auth model (none / API key) + secret env name  
- [ ] Rate limit / politeness  
- [ ] Schema table(s) + migration id  
- [ ] Feature flag default `0`  
- [ ] Fail-soft behavior when feed down  
- [ ] NFA: factors describe data, never “buy/sell”

**No Tier B+ adapters shipped yet** — Signal Board v0 uses Tier A only.

## Candidate intakes — broker / CDS public feeds (2026-07-18)

Plan: [`docs/experiments/BROKER_PUBLIC_FEEDS_PLAN.md`](experiments/BROKER_PUBLIC_FEEDS_PLAN.md).  
**Not holdings** — personal CDS/broker positions remain unavailable via public API.

### LOLC StockLens (fundamentals board)

- [ ] Source: LOLC Securities StockLens — `https://www.lolcsecurities.lk/api/stock-screener/` (+ UI `/stock-screener/`)
- [ ] ToS / license: **OPEN** — site copyright “All Rights Reserved”; need OK / research-only decision before prod
- [ ] Auth: none
- [ ] Rate limit: ≤1 pull / 6h proposed
- [ ] Schema: `fundamentals_snapshots` (proposed)
- [ ] Flag: `LOLC_FUNDAMENTALS_ENABLED` default `0`
- [ ] Fail-soft: skip overlay; CSE prices unchanged
- [ ] NFA: PE/DY/FH% as descriptive metrics only; never tip language
- [ ] Notes: ~302 symbols; unlocks Signal Board **F-086** (foreign holding %) when companyInfo null

### LOLC dividend calendar

- [ ] Source: `https://www.lolcsecurities.lk/dividend-calendar/dividends_db.csv`
- [ ] ToS / license: **OPEN** (same LOLC gate as StockLens)
- [ ] Auth: none
- [ ] Rate limit: ≤1 pull / 12h proposed
- [ ] Schema: `dividend_events` (proposed)
- [ ] Flag: `LOLC_DIVIDENDS_ENABLED` default `0`
- [ ] Fail-soft: no XD alerts that day
- [ ] NFA: calendar facts only (“XD on DATE, DPS …”)
- [ ] Notes: ~2.3k rows; enables proposed `xd_soon` alert type

### CDS INFOLINE (monthly market plumbing)

- [ ] Source: `https://www.cds.lk/services/depository-operations/publications-downloads/cds-monthly-reports/`
- [ ] ToS / license: public publications; attribute CDS; confirm redistribution of extracted scalars
- [ ] Auth: none (PDF download)
- [ ] Rate limit: monthly
- [ ] Schema: `cds_monthly_stats` (proposed)
- [ ] Flag: `CDS_INFOLINE_ENABLED` default `0`
- [ ] Fail-soft: hide Overview strip
- [ ] NFA: aggregate market stats only

### First Capital research PDFs (deferred)

- [ ] Source: `https://firstcapital.lk/research/`
- [ ] ToS / license: **DEFER** — opinion/ratings; Imperva-brittle fetch
- [ ] Auth: none when PDFs reachable; WAF often blocks automation
- [ ] Flag: none until Phases 1–2 land
- [ ] NFA: link-out research notes only — **no** Telegram tip blasts
