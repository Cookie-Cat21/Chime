# ML self-improving loop — operator guide

Implementation of the closed-loop plan: outcomes → nightly adapt → weekly
promote → research agent backlog.

## Enable

```bash
# .env
ML_LOOP_ENABLED=1
ML_FORECAST_ENABLED=0   # keep user-facing off until you opt in
```

## Commands

| Command | Loop | Purpose |
|---|---|---|
| `python3 -m chime ml-forecast-unified --mode hpe_with_fallback` | serve | Emit forecasts (+ outcomes rows) |
| `python3 -m chime ml-score-outcomes` | A | Grade due horizons |
| `python3 -m chime ml-loop-nightly --force` | A | Emit+score+scoreboard+drift+gate recal |
| `python3 -m chime ml-loop-retrain --force` | B | Train challenger; promote if gates pass |
| Loop C | C | See `LOOP_C_PROMPT.md` + `EXPERIMENT_BACKLOG.md` |

## Tables

- `forecast_outcomes` — ground truth ledger (migration 019)
- `model_registry` — champion/challenger (migration 020)
- `forecast_points` — serve path + confidence (017/018)

## Artifacts

- `docs/experiments/LIVE_SCOREBOARD.md`
- `docs/experiments/MODEL_REGISTRY.md`
- `data/ml_artifacts/gate_calibration.json`

## Kill switch

`ML_LOOP_ENABLED=0` stops nightly/retrain CLIs (unless `--force`).
Champion artifacts remain; dash forecasts still require `ML_FORECAST_ENABLED`.

Research only — not financial advice.
