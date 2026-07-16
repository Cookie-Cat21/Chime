# Signal Board Factor Catalog (F-001…F-100)

**Status:** Skeleton + first wave landed in `path_v1`.  
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

## Status board

| ID | Hypothesis | Status |
|---|---|---|
| F-001 | 5d / 20d / 60d path returns | **DONE** (`path_v1` mom_term) |
| F-002 | 20d realized vol penalty | **DONE** |
| F-003 | Log avg volume tilt | **DONE** |
| F-004 | Gap / range factors | OPEN |
| F-011 | Volume spike vs 20d avg | **DONE** (`vol_spike`) |
| F-012 | Turnover regimes | OPEN |
| F-021 | Symbol ret − sector-peer median ret | **DONE** (needs `stocks.sector` populated) |
| F-022 | ASPI-relative strength | OPEN |
| F-031 | EPS YoY from `filing_comparisons` | **DONE** |
| F-032 | Revenue / profit YoY | **DONE** |
| F-041 | Disclosure count 30d | **DONE** |
| F-042 | Category intensity | OPEN |
| F-051…060 | Notice flags | OPEN |
| F-061…070 | Calendar | OPEN |
| F-071…080 | Rank stability | OPEN |
| F-081 | Thin history discount | **PARTIAL** (reason) |
| F-091…100 | Macro | **DEFER** |

## Forecast lane

Naive mean-return forecast walk-forward hit rate ≈ **0.47** on 50 symbols — **noise**. Overlay stays opt-in; see [SIGNAL_WALK_FORWARD.md](../../experiments/SIGNAL_WALK_FORWARD.md).

Remaining IDs: open in waves ≤8. Do not spawn 100 agents at once.
