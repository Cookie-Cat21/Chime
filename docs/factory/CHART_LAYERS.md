# Chart layers — fit every CSE user without becoming a terminal

**Status:** Active (2026-07-21)  
**Fence:** [CLAUDE.md](../../CLAUDE.md) · [DASH_IA.md](DASH_IA.md) · [KOEL_MASTER_PLAN.md](KOEL_MASTER_PLAN.md) S1

## Who we serve

| Segment | Need | koel surface |
|---|---|---|
| Telegram / casual | Glance + alert | Spark / compact candle (unchanged) |
| Daily dash user | Check price history, hover OHLC, zoom | **Layer A — koel Lightweight Charts** (default) |
| Power / TA user | Drawings, indicators, Pine, multi-pane | **Layer B — TradingView embed** (opt-in on symbol page) |
| Broker trader | Orders / DOM | Out of scope — ATrad / broker terminal |

## Three approaches → two layers (not three products)

1. **TradingView-like UX on koel data** → **Layer A** (`lightweight-charts`, Apache).  
   Crosshair, OHLC readout, pan/zoom, time scrub. Data = Postgres `daily_bars` / ticks only.  
   This is the cake chart. Alerts and provenance stay koel-truthful.

2. **Full TradingView widget** → **Layer B** (opt-in tab).  
   Embed `CSELK:{symbol}` advanced chart. Delayed/external. Clearly labeled:  
   *“External TradingView chart (often delayed). koel alerts still use koel’s poller data.”*  
   TV is **never** the alert/data spine — fence intact.

3. **Full TA terminal inside koel** → **Do not build.**  
   Layer B already gives drawings / indicators / Pine to that segment. Rebuilding it would violate the “not a trading terminal” fence and burn the team. Point TA users at Layer B.

## UX

Symbol expand dialog (and optional hero):

```
[ koel ]  [ TradingView ]
```

- Default = koel (LWC).  
- Switching to TradingView lazy-loads the widget (no TV script on first paint).  
- NFA on both; Layer B adds the external/delayed disclaimer.

## Non-goals

- TV as quote source for rules / Telegram fires  
- Shipping RSI/MACD/drawing toolbar in koel chrome  
- Replacing Telegram wedge with a chart product  
