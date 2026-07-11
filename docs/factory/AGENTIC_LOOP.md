# Chime — Agentic Factory Loop (perpetual)

**Status:** Active (Epoch 2+)  
**Authority:** [COMMIT_FACTORY.md](COMMIT_FACTORY.md) + [CLAUDE.md](../CLAUDE.md)  
**Aspiration:** Maximize lifetime `factory_score` with outstanding quality.  
**Literal “5 trillion commits”:** Not a git-count target. Farming is banned. The loop’s job is unbounded *proper* throughput until product fences / backlog exhaustion.

## 1. Loop (never idle while backlog remains)

```
while True:
  1. LOAD board (epoch open items + ACCEPT-DEFER + adversarial findings)
  2. if board empty AND 2 consecutive CLEAN passes globally:
       STOP  # only honest terminal state
  3. PLAN wave: pick ≤8 OWNED_FILES-disjoint work items (hard max 16)
  4. IMPLEMENT via parallel agents
  5. VERIFY: ruff + mypy + pytest (+ dash smoke when web/ exists); cite HEAD SHA
  6. ADVERSARIAL: ≤8 reviewers; REFUTE ⇒ fix same pass
  7. REPORT: pass md + scorecard; update SCOREBOARD.json
  8. if pass has 0 findings > minor: clean_streak += 1 else clean_streak = 0
  9. if clean_streak >= 2 AND board has only ACCEPT-DEFER-human: STOP lane
     else: open next epoch / refill board from fences (DASH features, ratchet)
  10. NEVER stop because “N passes done” or “commit count looks big”
```

## 2. Outstanding performance bar

Every accepted commit must move at least one of:

| Bar | Evidence |
|---|---|
| Alert correctness | Test or fix with scenario |
| Zero dup / zero loss | Lock/claim/retry/DL proof |
| Resilience | Failure path covered |
| Ops honesty | Health/CI/DX |
| Bot UX | Handler + test |
| Dash UX | Usable surface inside fence |
| Code quality | ruff/mypy/pytest green |

Minors-only churn → score 0, anti-churn STOP for that lane, then **open next fuel** (new epoch board), do not farm.

## 3. Concurrency

| Knob | Value |
|---|---|
| Preferred parallel implementers | 8 |
| Hard max | 16 |
| Preferred adversarial | 4–8 |
| Path intersect in a wave | **Fail the wave** |

## 4. Fuel refill (how the loop stays alive without farming)

When a lane CLEAN×2:

1. Pull next unused WS from catalog / product fence expansions **approved by constitution**.
2. Prefer **DASH** (largest surface) while `web/` incomplete.
3. Prefer **quality ratchet** (cov floors, integration proofs).
4. Prefer **real user-visible gaps** over doc thrash.
5. If no fuel remains inside fences → **global STOP** (honest).

## 5. Artifacts

| Path | Role |
|---|---|
| [EPOCH2_BOARD.md](EPOCH2_BOARD.md) | Open work items |
| [passes/epoch2/](passes/epoch2/) | Pass reports |
| [../SCOREBOARD.json](SCOREBOARD.json) | Machine-readable score |
| `scripts/factory/loop_status.py` | Print board + score + next wave hint |
| `scripts/factory/verify.sh` | Canonical verify proof |

## 6. Orchestrator prompt (every session)

1. Read CLAUDE.md + this file + current epoch board.  
2. Run `python scripts/factory/loop_status.py`.  
3. Spawn ≤8 implementers on top open items (disjoint paths).  
4. Verify + adversarial.  
5. Commit/push/update PR.  
6. If not global STOP → continue next wave same session when possible.
