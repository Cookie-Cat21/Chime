# Signal Board Factor Catalog (F-001…F-100)

**Status:** Waves 1–3 landed in `path_v3`.  
**Product:** Research scores + forecasts · NFA · never “invest tips”.  
**Data spine:** CSE Tier A (`daily_bars`, snapshots, filings, sectors, notices, indexes).

## Rules

- One hypothesis per ID; OWNED_FILES disjoint within a wave.
- Kill if walk-forward IC / hit-rate ≤ noise.
- Reasons must pass buy/sell guardrails (no “buy/sell” substrings).

## Status board

| ID | Hypothesis | Status |
|---|---|---|
| F-001 | 5d / 20d / 60d path returns | **DONE** |
| F-002 | 20d realized vol penalty | **DONE** |
| F-003 | Log avg volume tilt | **DONE** |
| F-004 | Avg (high−low)/price range | **DONE** |
| F-011 | Volume spike vs 20d avg | **DONE** |
| F-012 | Volume regime + turnover proxy | **DONE** |
| F-021 | Symbol ret − sector-peer median | **DONE** |
| F-022 | Latest session vs ASPI change | **DONE** |
| F-031 | EPS YoY | **DONE** |
| F-032 | Revenue / profit YoY | **DONE** |
| F-041 | Disclosure count 30d | **DONE** |
| F-042 | Financial-category disclosure share | **DONE** |
| F-051 | Board/non-compliance/halt notices 30d | **DONE** (dormant until notices ingested) |
| F-061 | Colombo weekday / month-end calendar | **DONE** |
| F-071 | Cross-sectional 20d return rank stability | **DONE** |
| F-081 | Thin history discount | **DONE** |
| F-052…060 | Finer notice subtypes | OPEN |
| F-062…070 | Holiday / session-open calendar | OPEN |
| F-072…080 | Score-rank autocorrelation | OPEN |
| F-082…090 | Dual-listing / thin-name quirks | OPEN |
| F-091…100 | Macro | **DEFER** |

## Forecast lane

`path_v2_fc` / `path_v3_fc` walk-forward hit rate ≈ **0.46** — **noise**. Overlay stays opt-in.  
See [SIGNAL_WALK_FORWARD.md](../../experiments/SIGNAL_WALK_FORWARD.md).

## Ops

```bash
python3 -m chime sector-backfill --force --limit 1000
python3 -m chime score-signals --limit 1000
python3 -m chime eval-signals --limit 50
```
