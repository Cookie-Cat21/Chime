# ML self-learn run (20260717T101729Z)

- event: `local`
- sha: `3c0d1aaf7f532d73e71e0ba86860323f7ae6b82a`
- champion: `challenger_ltr_gated_20260717T092730Z` (gated=0.6211702245326844 rankic=0.2640679863748712)
- forecast_points_by_gate: `{'null': 9555, 'always_on': 1088, 'gated_ltr': 404, 'gated_c55': 292, 'gated_p90': 24, 'hpe_p90': 4}`
- outcomes scored/total: `17541` / `28888`
- market_daily_summary_rows: `2`
- order_book_snapshots: `25`

## Logs (tail)

### ml-score-outcomes

```
{"examined": 0, "scored": 0, "skipped": 0, "event": "score_outcomes_done", "level": "info", "timestamp": "2026-07-17T10:16:56.731736Z"}
ml-score-outcomes: examined=0 scored=0 skipped=0
```

### ml-loop-nightly

```
HTTP Request: POST https://www.cse.lk/api/dailyMarketSummery "HTTP/1.1 200 "
ml-loop-nightly: market_summary_upserted=2
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
HTTP Request: POST https://www.cse.lk/api/orderBook "HTTP/1.1 200 "
ml-loop-nightly: order_book_ok=25/25
{"examined": 0, "scored": 0, "skipped": 0, "event": "score_outcomes_done", "level": "info", "timestamp": "2026-07-17T10:17:14.795050Z"}
{"n_symbols": 106, "sym_hit_thr": 0.61, "conf_thr": 0.71, "path": "data/ml_artifacts/reliable_symbols.json", "event": "symbol_allowlist_rebuilt", "level": "info", "timestamp": "2026-07-17T10:17:15.651774Z"}
{"emitted": 11347, "scored": 0, "alerts": [], "event": "loop_nightly_done", "level": "info", "timestamp": "2026-07-17T10:17:16.155057Z"}
ml-loop-nightly: emitted=11347 scored=0 alerts=- scoreboard=docs/experiments/LIVE_SCOREBOARD.md
```

Research only — not financial advice.
