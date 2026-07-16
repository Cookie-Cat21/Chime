# Signal Board Factor Catalog (F-001…F-100)

**Status:** Skeleton — research IDs for waved execution (≤8 preferred / 16 hard).  
**Product:** Research scores + forecasts · NFA · never “invest tips”.  
**Data spine:** CSE Tier A (`daily_bars`, snapshots, filings, sectors). Tier B macros later ([THIRD_PARTY_DATA.md](../../THIRD_PARTY_DATA.md)).

## Rules

- One hypothesis per ID; OWNED_FILES disjoint within a wave.
- Kill if walk-forward IC / hit-rate ≤ noise.
- Reasons must pass buy/sell guardrails.

## Buckets (10 × 10)

| Range | Theme |
|---|---|
| F-001…010 | Price path microstructure (gaps, ranges, stale) |
| F-011…020 | Liquidity / turnover regimes |
| F-021…030 | Sector & index relative strength |
| F-031…040 | Filing calendar & EPS/YoY surprise |
| F-041…050 | Disclosure category intensity |
| F-051…060 | Non-compliance / buy-in / halt flags |
| F-061…070 | Calendar (SLT session, month-end) |
| F-071…080 | Cross-sectional rank stability |
| F-081…090 | Per-issuer idiosyncrasy (thin names, dual listings) |
| F-091…100 | External macro (DEFER until ToS-clean adapter) |

## Seed OPEN (implement next waves)

| ID | Hypothesis | Status |
|---|---|---|
| F-001 | 5d / 20d / 60d path returns predict next-session direction | PARTIAL (`path_v0`) |
| F-002 | 20d realized vol penalizes score (risk) | PARTIAL (`path_v0`) |
| F-003 | Log avg volume tilts liquid names | PARTIAL (`path_v0`) |
| F-011 | Volume spike vs 20d avg → short-horizon move | OPEN |
| F-021 | Symbol ret − sector ret (RS) | OPEN |
| F-031 | EPS YoY from `filing_metrics` when extract_ok | OPEN |
| F-041 | Disclosure count 30d | OPEN |
| F-081 | Thin history (<60 bars) confidence discount | PARTIAL (reason only) |
| F-091…100 | Macro | DEFER |

Remaining IDs F-004…F-100: fill as waves open (title + data source + kill metric). Do not spawn 100 agents at once.
