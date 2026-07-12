# Plan: 50M under factory constitution

**Status:** Planning (aspiration locked to Portfolio KPI A)  
**Authority:** [COMMIT_FACTORY.md](COMMIT_FACTORY.md) §0 + [METRICS.md](METRICS.md) §6 + [PORTFOLIO_PLAN.md](PORTFOLIO_PLAN.md)  
**Baseline (2026-07-12):** Chime raw history ≈ 231 commits; `lifetime_factory_score` ≈ 148; **1** enrolled node.

## 0. Verdict

**Yes — as portfolio factory score. No — as 50M git objects on this repo alone.**

| Interpretation | Allowed? | Honest path |
|---|---|---|
| `git rev-list --count` → 50,000,000 on `Cookie-Cat21/Chime` | **Rejected** | Farming; banned by constitution |
| `portfolio_score` → 50,000,000 across enrolled factories | **Yes** | Many products × years × proper commits |
| 50M “commits” that are whitespace / split fixes / doc thrash | **Rejected** | Score 0; anti-churn STOP |

Locked KPI (unchanged from Plan A):

```
repo_score(r)   = min(proper_commits(r), clusters_closed(r))
portfolio_score = Σ repo_score(r)   over enrolled nodes
```

**Target:** `portfolio_score ≥ 50_000_000`  
**Not the target:** any single repo’s raw commit count.

---

## 1. Why Chime alone cannot carry 50M

From [PORTFOLIO_PLAN.md](PORTFOLIO_PLAN.md) and the quality bar:

- Fence-legal fuel on Chime is finite (alert spine + thin dash + ops). Epochs 5–18 already burned most of the pre-seed ladder.
- Proper commits require acceptance criteria, verify proof, and adversarial review. Throughput is bounded by real findings, not `MAX_PASSES`.
- Estimated **Chime-only proper ceiling:** hundreds → low thousands over the product’s useful life — **orders of magnitude below 50M**.
- Manufacturing WS rows or micro-splitting one fix into N commits is explicitly banned ([METRICS.md](METRICS.md) §2, §5).

So this repo stays **node 1 / template**. Growth past low thousands must come from **new factory nodes**, not deeper thrash on Chime.

---

## 2. Math (order-of-magnitude, not a schedule)

Let:

- `N` = enrolled factory repos  
- `C` = lifetime proper commits per repo (score-eligible)  
- Need `N × C ≥ 50e6` (assuming score ≈ proper when clusters keep pace)

| Avg proper / node (`C`) | Nodes needed (`N`) | What that implies |
|---|---|---|
| 1,000 | 50,000 | Many small tools, short factory life |
| 5,000 | 10,000 | Solid multi-epoch product each |
| 10,000 | 5,000 | Long-lived products, heavy quality ratchet |
| 50,000 | 1,000 | Decade-scale nodes (rare under honest fences) |

**Throughput reality check** (portfolio-wide proper commits, not raw git):

| Sustained proper / day | Days to 50M | Calendar (approx) |
|---|---|---|
| 100 | 500,000 | multi-century |
| 1,000 | 50,000 | ~137 years |
| 10,000 | 5,000 | ~14 years |
| 100,000 | 500 | ~1.4 years |

Hitting the high rows requires **thousands of concurrent factory nodes** (or extreme per-node yield), each still under quality gates — not 16 agents hammering one Chime board.

**Chime contribution to 50M:** negligible as a fraction; critical as the **kit** other nodes copy.

---

## 3. Strategy (three layers)

### Layer A — Keep Chime honest (ongoing)

1. Drain fence-legal boards only; refill from constitution-approved fuel.  
2. Prefer quality-bar movement over epoch count.  
3. On CLEAN×2 + `NO_FUEL` → global STOP for Chime lanes (do not invent filler).  
4. Optional later: human-approved fence expansions (still no portfolio/screener/TA/payments).

**Exit for Layer A:** Chime `repo_score` plateaued; handoff says “template ready, enroll next node.”

### Layer B — Portfolio enrollment (the actual climb)

For each new product:

1. Copy factory kit (`AGENTIC_LOOP`, boards, `verify.sh`, scoreboard, constitution stub).  
2. Write product fences (non-goals) before any wave.  
3. Register in [PORTFOLIO_NODES.json](PORTFOLIO_NODES.json).  
4. Run the same loop; score only proper commits.  
5. Sum via `scripts/factory/portfolio_sum.py` (build when ≥2 nodes).

**Enrollment cadence (aspirational, quality-gated):**

| Phase | Enrolled nodes | Portfolio score order |
|---|---|---|
| Now | 1 (Chime) | ~10² |
| Kit proven | 2–10 | ~10³–10⁴ |
| Portfolio ops mature | 10² | ~10⁵–10⁶ |
| Industrial enrollment | 10³–10⁴ | ~10⁶–10⁷ |
| Scale target | ~5×10³–5×10⁴ | **~5×10⁷** |

Exact phase gates: each new node must ship a green `factory-verify` and a non-zero `repo_score` before counting toward enrollment KPIs.

### Layer C — Ops that make large N possible

Without these, enrollment stalls at a handful of repos:

| Capability | Why |
|---|---|
| `portfolio_sum.py` + CI badge | Honest aggregate; no spreadsheet theater |
| Factory kit as a reusable template repo | Minutes to enroll, not days |
| Per-node `SCOREBOARD.json` schema freeze | Summation stays correct |
| Orchestrator that can fan out across nodes | One session ≠ one repo forever |
| Human fence review for new products | Prevents farm-shaped “products” |

---

## 4. Anti-patterns (instant fail)

Do **not** “hit 50M” by:

- Empty commits, `--allow-empty` loops, or commit bots  
- Whitespace / import / rename farms  
- Splitting one logical change into thousands of commits  
- Inflating `git rev-list` on Chime while `factory_score` stays flat  
- Opening fake repos with no real product fences  
- Equating `MAX_PASSES × agents × epochs` with progress  

Any of the above ⇒ score **0** for that work and STOP the offending lane.

---

## 5. Near-term execution board (this repo)

Planning deliverables only until a second product exists:

| ID | Item | Status |
|---|---|---|
| S50-01 | This plan (`SCALE_50M.md`) | DONE |
| S50-02 | Cross-link from PORTFOLIO_PLAN + COMMIT_FACTORY + METRICS | DONE |
| S50-03 | Scoreboard fields for multi-node sum (`lifetime_*` + aspiration) | DONE |
| S50-04 | `scripts/factory/portfolio_sum.py` (reads `PORTFOLIO_NODES.json`) | DONE (exists) |
| S50-05 | Factory-kit copy checklist for node 2 | DONE (below) |
| S50-06 | Enroll node 2 (separate product repo) | BLOCKED on human product choice |

### S50-05 — Factory kit copy checklist (node N)

Copy into the new repo before its first scored wave:

1. Constitution: product `CLAUDE.md` (or equivalent) with hard non-goals.  
2. Factory docs: `COMMIT_FACTORY.md` (trimmed), `AGENTIC_LOOP.md`, `METRICS.md`, `PORTFOLIO_PLAN.md` pointer, `SCALE_50M.md` pointer.  
3. `SCOREBOARD.json` seeded at zeros with `aspiration: portfolio_score_50M`.  
4. Scripts: `verify.sh`, `loop_status.py`, `update_scoreboard.py`, `refill_board.py`, `next_wave.py`.  
5. First `EPOCH1_BOARD.md` with fence-legal OPEN items only.  
6. Register node in Chime’s `PORTFOLIO_NODES.json` (or a dedicated portfolio registry later).  
7. Prove `factory-verify` green once before counting `repo_score`.

Items S50-03…S50-05 are OPS/planning proper work. **S50-06 is the real multiplier.**

---

## 6. Success definition

We claim progress toward 50M only when:

1. `portfolio_score` (sum of `min(proper, clusters)` per node) rises with proof artifacts.  
2. `raw_commit_count` is reported optionally and **never** used as a goal.  
3. Chime remains within CLAUDE.md fences.  
4. New nodes have written non-goals before their first scored commit.

**Milestone markers** (portfolio_score): 1K → 10K → 100K → 1M → 10M → **50M**.

---

## 7. One-line operator answer

> We plan to hit **50M portfolio factory score** across many quality-gated product nodes; we will **not** inflate Chime’s git history to 50M commits.
