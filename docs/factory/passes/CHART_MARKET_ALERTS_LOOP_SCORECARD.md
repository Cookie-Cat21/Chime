# Interactive charts + MARKET poller — 5 improvement loops

**Date:** 2026-07-20  
**Branch:** `cursor/csepal-macro-gap-plan-a0d6`

| Loop | Change | Depth |
|---|---|---|
| 1 | `chart-geometry` + `useChartHover` + interactive `AreaSpark` (crosshair, tip, ←/→) | Shared primitive |
| 2 | Storage reads + `Poller._poll_market_regime` → claim/send | Delivery path |
| 3 | Dash create-form MARKET types; Context/Tape `interactive` sparks | Product parity |
| 4 | Label/value zip alignment; MARKET symbol lock + hint; tip clipping | Harden |
| 5 | usdlkr/oil + poller unit tests; geometry mts harness; plan doc | Proof |

## Adversarial checks

- Regime path is Postgres-only (no CSE/CBSL/EIA in poller leg)  
- Day-bucket dedupe via `event_key` + `claim_alert`  
- Missing legs fail-soft (that alert type does not fire)  
- Halt still via `_poll_market_notices` (unchanged)  
- Candles deferred (not merged into AreaSpark)  

## Still open

- Candle crosshair upgrade (reuse hover hook later)  
- Prod flags for CBSL/EIA before usdlkr/oil fire live  
