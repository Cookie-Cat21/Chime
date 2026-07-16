# Signal Board Factor Catalog (F-001…F-100)

**Status:** Wave 1–2 landed in `path_v2`. Sectors populated via `companyProfile`.  
**Product:** Research scores + forecasts · NFA · never “invest tips”.  
**Data spine:** CSE Tier A (`daily_bars`, snapshots, filings, `stocks.sector`, indexes).

## Rules

- One hypothesis per ID; OWNED_FILES disjoint within a wave.
- Kill if walk-forward IC / hit-rate ≤ noise.
- Reasons must pass buy/sell guardrails.

## Buckets (10 × 10)

| Range | Theme |
|---|---|
| F-001…010 | Price path microstructure |
| F-011…020 | Liquidity / turnover regimes |
| F-021…030 | Sector & index relative strength |
| F-031…040 | Filing calendar & EPS/YoY surprise |
| F-041…050 | Disclosure category intensity |
| F-051…060 | Non-compliance / buy-in / halt flags |
| F-061…070 | Calendar (SLT session, month-end) |
| F-071…080 | Cross-sectional rank stability |
| F-081…090 | Per-issuer idiosyncrasy |
| F-091…100 | External macro (DEFER) |

## Status board

| ID | Hypothesis | Status |
|---|---|---|
| F-001 | 5d / 20d / 60d path returns | **DONE** |
| F-002 | 20d realized vol penalty | **DONE** |
| F-003 | Log avg volume tilt | **DONE** |
| F-004 | Avg (high−low)/price range | **DONE** (`range_20d`) |
| F-011 | Volume spike vs 20d avg | **DONE** |
| F-012 | Volume regime + turnover proxy | **DONE** |
| F-021 | Symbol ret − sector-peer median | **DONE** (272+ sectors via `sector-backfill`) |
| F-022 | Latest session vs ASPI change | **DONE** (needs `index_snapshots`) |
| F-031 | EPS YoY | **DONE** |
| F-032 | Revenue / profit YoY | **DONE** |
| F-041 | Disclosure count 30d | **DONE** |
| F-042 | Financial-category disclosure share | **DONE** |
| F-051…060 | Notice flags | OPEN |
| F-061…070 | Calendar | OPEN |
| F-071…080 | Rank stability | OPEN |
| F-081 | Thin history discount | **PARTIAL** |
| F-091…100 | Macro | **DEFER** |

## Forecast lane

`path_v2_fc` walk-forward hit rate ≈ **0.46** — **noise**. Overlay stays opt-in.  
See [SIGNAL_WALK_FORWARD.md](../../experiments/SIGNAL_WALK_FORWARD.md).

## Ops

```bash
python3 -m chime sector-backfill --force --limit 1000
python3 -m chime score-signals --limit 1000
python3 -m chime eval-signals --limit 50
```
