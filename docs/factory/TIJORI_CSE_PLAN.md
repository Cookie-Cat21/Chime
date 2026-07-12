# Chime — Tijori-for-CSE Plan

**Branch intent:** `cursor/tijori-cse-phase1-e44e`  
**Updated:** 2026-07-12  
**Product bet:** Be Sri Lanka’s exchange-filing + alert layer (Tijori play), with a thin CSE browse dash, then optional scenario AI. Not a Tracker Pro clone. Not a price oracle.

**Constraint note:** “1000 subagents × 100 loops” is not an execution strategy. Factory fence = quality over count, hard max ~16 concurrent agents, STOP when two passes find nothing above minor. This plan uses a **bounded agentic improve loop** (discover → implement → test → fix → re-test) until gates are green.

---

## 0. What we already have (deep dive)

| Layer | Status |
|---|---|
| CSE adapter + poller + rules + Telegram | Production-hardened |
| Disclosure alerts | Raw title + announcements `#id` link; no AI brief; no PDF URL |
| Thin dash | Watchlist / alerts / history / symbol / health |
| Market browse | **Missing** — poller fetches full `tradeSummary` but stores **watched only** |
| LLM / PDF pipeline | **None** |
| Scenario AI | **None** |

Competitive gap in CSE: Tracker Pro owns portfolio; InvestNow/Rovana own analysis dashboards. Nobody cleanly owns **official filing → plain-language brief → real push**.

---

## 1. Phases

### Phase 1 — Foundations (this PR) ✅ implement now

1. **Market-wide persist** — every poll stores all `tradeSummary` rows into `stocks` + `price_snapshots`; rule eval stays watchlist-scoped. Fetch even when watchlist empty (browse needs data).
2. **Thin browse** — `GET /api/v1/symbols` + `/market` page (Symbols · name · last · change_pct). Not a screener / OHLC board.
3. **Filing-brief schema + worker stub** — `disclosures.pdf_url`, `disclosure_briefs` table; `chime/briefs/` with provider interface; `AI_BRIEFS_ENABLED=0` default.
4. **Tests** — poller market persist, API list shape, briefs disabled-by-default, web still never calls cse.lk.
5. **Docs** — this plan + contract/IA amendments.

### Phase 2 — Tijori core (next)

1. Legacy `POST /announcements` enricher → resolve `filePath` → `cdn.cse.lk` PDF URL.
2. PDF fetch + text extract (size/rate capped).
3. Free-tier LLM brief (Gemini Flash default) on **new** disclosures only.
4. Append brief to Telegram disclosure alert when ready (or follow-up message).
5. Dash symbol page shows brief when `status=ready`.
6. Optional: category filter on `/alert SYMBOL disclosure [CATEGORY]`.

### Phase 3 — Optional scenario AI (later)

1. On-demand only (“Run scenario” on symbol / filing).
2. Small panel (≤15 personas × ≤8 rounds), queued, daily caps.
3. Label: simulated reactions from public info — **not advice**.
4. MiroFish inspiration / rewrite — avoid AGPL entanglement until legal review.

### Explicit non-goals (still)

Portfolio/P&L, tax, heavy TA, screener, payments, native app, always-on swarm, price targets as product.

---

## 2. Architecture (Phase 1–2)

```
cse.lk tradeSummary ──► poller ──► stocks + price_snapshots (ALL symbols)
cse.lk announcements ──► poller ──► disclosures (+ pdf_url Phase 2)
                                         │
                                         ├─► rules ──► Telegram alert
                                         └─► briefs worker (Phase 2; stub Phase 1)
                                                   └─► disclosure_briefs
                                                         └─► dash / Telegram
web/ ──► Postgres only (ADR 001) ──► /market browse + symbol briefs
```

---

## 3. Acceptance criteria (Phase 1)

| ID | Criterion | Proof |
|---|---|---|
| P1-A | Poller persists non-watched symbols from tradeSummary | unit/integration test |
| P1-B | Empty watchlist still market-persists (no rule fires) | test |
| P1-C | `GET /api/v1/symbols` returns paginated slim quotes from Postgres | route + test / smoke |
| P1-D | `/market` page lists symbols; nav link “Browse” | UI + lint |
| P1-E | Migration adds `pdf_url` + `disclosure_briefs`; migrate applies | migrate dry-run / SQL |
| P1-F | Briefs module importable; disabled without `AI_BRIEFS_ENABLED=1` | unit test |
| P1-G | `web/` still has zero cse.lk calls | existing regression |
| P1-H | ruff + mypy + pytest green on touched paths | CI commands |

---

## 4. Agentic improve loop (bounded)

```
LOOP i = 1..N (N soft-cap 8; STOP early on two clean passes):
  1. Run: ruff, mypy, pytest (unit), web lint/tsc if web touched
  2. Adversarial pass: empty watchlist, huge market list, briefs-off, CSRF, NFA
  3. Fix findings above minor
  4. Re-test
  5. If zero findings above minor twice → STOP
```

No commit farming. One concern per commit where practical.

---

## 5. Env (Phase 1 stub / Phase 2 live)

```bash
# Phase 1: market browse needs no new env

# Phase 2 (documented now, default off)
AI_BRIEFS_ENABLED=0
AI_PROVIDER=gemini
AI_API_KEY=
AI_MODEL=gemini-2.0-flash
AI_MAX_BRIEFS_PER_DAY=50
AI_MAX_INPUT_CHARS=12000
PDF_MAX_BYTES=5242880
```

---

## 6. Success metric (product)

User can: browse CSE symbols in dash → watch → set disclosure alert → get Telegram ping when filing lands → (Phase 2) read a short AI brief of the official filing. Scenario AI is optional polish, not the wedge.
