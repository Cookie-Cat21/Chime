# Interactive charts + MARKET alert poller delivery

**Date:** 2026-07-20  
**Goal:** Depth on (1) shared interactive spark primitives and (2) actually delivering MARKET regime Telegram alerts from the poller.

## Plan

| Track | Work |
|---|---|
| A. Charts | `chart-geometry` + `useChartHover` + `AreaSpark interactive` (hover/crosshair/keyboard) |
| B. Alerts | Storage reads → `_poll_market_regime` → claim/send (same path as notices) |
| C. Dash | Create-form MARKET types (appetite/foreign/book/usdlkr/oil) force symbol `MARKET` |
| D. Tests | usdlkr/oil eval + poller unit with mocked storage |

## Five improvement loops

1. Geometry + hover hook + interactive AreaSpark  
2. Poller wire + storage (appetite/foreign/book/FX/oil)  
3. Dash create parity + Context/Tape opt-in `interactive`  
4. A11y polish (live region, focus ring, tooltip placement)  
5. Tests + scorecard adversarial pass  

## Non-goals

- Candle crosshair rewrite  
- Macro terminal clone  
- Calling CSE/CBSL/EIA from the web or inside `_poll_market_regime` (Postgres only)  
