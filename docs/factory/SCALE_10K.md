# Plan: 10K portfolio score (active target)

**Status:** Locked operating target (Portfolio KPI A)  
**Authority:** [COMMIT_FACTORY.md](COMMIT_FACTORY.md) §0 + [METRICS.md](METRICS.md) §6 + [PORTFOLIO_PLAN.md](PORTFOLIO_PLAN.md)  
**Baseline (2026-07-12):** Chime raw history ≈ 231 commits; `lifetime_factory_score` ≈ 148; **1** enrolled node.  
**Gap:** ≈ **9,852** proper/score points to `portfolio_score ≥ 10_000`.

## 0. Verdict

**Yes — `portfolio_score ≥ 10_000` is the active target.**  
**No — not 10K raw git commits farmed on Chime.**

| Interpretation | Allowed? | Honest path |
|---|---|---|
| `git rev-list --count` → 10,000 on Chime alone | **Rejected** if farmed | Only counts if each commit is proper |
| `portfolio_score` → 10,000 across enrolled factories | **Yes (locked)** | Chime + a few product nodes |
| Whitespace / split-fix / doc thrash to pad count | **Rejected** | Score 0; anti-churn STOP |

Locked KPI (Plan A):

```
repo_score(r)   = min(proper_commits(r), clusters_closed(r))
portfolio_score = Σ repo_score(r)   over enrolled nodes
```

**Active target:** `portfolio_score ≥ 10_000`  
**Far horizon (not operating):** 50M remains fantasy-scale — see historical note below. Do not optimize day-to-day for it.

---

## 1. Why 10K fits the constitution

- Chime fence-legal ceiling is **hundreds → low thousands** — not enough alone for 10K if we STOP on honest `NO_FUEL`, but it can carry a large share.
- 10K is ~67× current score (148 → 10_000), not seven orders of magnitude.
- Reachable with **2–5 quality-gated product nodes** (or Chime + 1–2 strong siblings), without inventing WS filler.
- Still forbids farming: every point needs a cluster closed with verify proof.

---

## 2. Math (order-of-magnitude)

Need ≈ **9,852** more score from `Σ min(proper, clusters)`.

| Mix | Example path to 10K |
|---|---|
| Solo-heavy | Chime → ~2–3K (stretch) + still short → **needs other nodes** |
| Small portfolio | Chime ~1.5K + node2 ~3K + node3 ~3K + node4 ~2.5K |
| Balanced | 5 nodes × ~2K each |
| Two-node push | Chime ~2K + one long-lived sibling ~8K |

**Throughput (portfolio-wide proper, not raw git):**

| Sustained proper / day | Days for remaining ~9.9K |
|---|---|
| 10 | ~985 |
| 25 | ~394 |
| 50 | ~197 |
| 100 | ~99 |

These are capacity sketches under quality gates — not quotas. Empty boards ⇒ refill or enroll; never pad.

---

## 3. Strategy

### Layer A — Chime (node 1)

1. Drain fence-legal fuel only; quality-bar movement required.  
2. CLEAN×2 + `NO_FUEL` → STOP Chime lanes (no filler).  
3. Human-approved fence expansions only when real product need exists.  
4. Aim for Chime `repo_score` in the **1K–3K** band over the product’s useful life — contribution, not the whole 10K.

### Layer B — Enroll siblings (the multiplier)

1. Copy factory kit (checklist below).  
2. Write non-goals before wave 1.  
3. Register in [PORTFOLIO_NODES.json](PORTFOLIO_NODES.json).  
4. `python3 scripts/factory/portfolio_sum.py` for the aggregate.  

**10K enrollment sketch:**

| Phase | Nodes | Portfolio score order |
|---|---|---|
| Now | 1 (Chime) | ~10² |
| Kit + node 2 | 2 | ~10³ |
| Small portfolio | 3–5 | **~10⁴ (target)** |

### Layer C — Ops already mostly done

| Capability | Status |
|---|---|
| `portfolio_sum.py` | Exists |
| Scoreboard `lifetime_*` fields | Exists |
| Kit copy checklist | Below |
| Second product choice | **Blocked on human** |

---

## 4. Anti-patterns (instant fail)

Do **not** “hit 10K” by:

- `--allow-empty`, whitespace, import-only, rename-only  
- Splitting one fix into N commits  
- Manufacturing findings to fill `MAX_WAVES`  
- Fake repos with no real fences  
- Treating raw `git rev-list --count` as the KPI  

---

## 5. Execution board

| ID | Item | Status |
|---|---|---|
| S10-01 | This plan (`SCALE_10K.md`) | DONE |
| S10-02 | Retarget scoreboard / nodes / cross-links to 10K | DONE (this change) |
| S10-03 | Factory-kit checklist | DONE (below) |
| S10-04 | Enroll node 2 | BLOCKED on human product choice |
| S10-05 | Hit milestones 1K → 5K → **10K** with `portfolio_sum.py` proof | OPEN |

### Kit copy checklist (node N)

1. Product constitution with hard non-goals.  
2. Factory docs: loop, metrics, this scale plan pointer.  
3. `SCOREBOARD.json` at zeros; `aspiration: portfolio_score_10K`.  
4. Scripts: `verify.sh`, `loop_status.py`, `update_scoreboard.py`, `refill_board.py`, `next_wave.py`.  
5. First epoch board with fence-legal OPEN only.  
6. Register in Chime `PORTFOLIO_NODES.json`.  
7. One green `factory-verify` before scoring.

---

## 6. Success definition

Claim **10K done** only when:

1. `python3 scripts/factory/portfolio_sum.py` reports `portfolio_score ≥ 10000`.  
2. Each contributing node’s score is backed by proper commits (not raw count).  
3. Fences intact on every node.  

**Milestones:** 500 → 1K → 2.5K → 5K → **10K**.

---

## 7. Far horizon (50M)

A prior sketch treated 50M as the headline number. Under Plan A that implies thousands of nodes or multi-decade industrial enrollment. **Not the operating target.** Do not open boards or invent products to chase 50M while 10K is open.

---

## 8. One-line operator answer

> Active goal: **10K `portfolio_score`** across a small set of quality-gated factories; never pad Chime’s git history to fake the number.
