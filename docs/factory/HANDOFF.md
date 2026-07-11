# Factory HANDOFF

**Updated:** 2026-07-11  
**Branch:** `cursor/epoch11-drain-cb19`  
**PR:** open for this branch (base `main`)  
**KPI:** Portfolio Plan A — `factory_score` (not raw commits)

## Resume

```bash
git pull origin cursor/epoch11-drain-cb19
make factory-status
# Continue OPEN items; refill when empty
make factory-verify   # clears DATABASE_URL (unit path)
```

## State

- See `SCOREBOARD.json` for lifetime score  
- Active board: `EPOCH13_BOARD.md` (refilled after Epoch 12 CLEAR)  
- Loop: `AGENTIC_LOOP.md` + `PORTFOLIO_PLAN.md` + `LONG_RUN_OPS.md`
- Prior: Epochs 10–11 cleared on this lineage; Epoch 12 residual reliability drained

## E12 -> E13 refill path

Epoch 12 CLEAR -> `make factory-refill` -> Epoch 13 active. Epoch 12 drained
8 residual reliability / ops polish items: durable TG-OK ledger, DOA display
log, pool contention health, web health degrade, alerts history delivery
badges, stale health copy, web regression tests, and alert_log contract docs.

Canonical factory verification is `make factory-verify`, which runs the unit
path with `DATABASE_URL=` via `scripts/factory/verify.sh`:
`DATABASE_URL= pytest -q --tb=line`.

## Next wave hint

Drain Epoch 13 OPEN rows only. Do not invent out-of-fence fuel.
