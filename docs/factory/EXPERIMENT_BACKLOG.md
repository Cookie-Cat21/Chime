# Experiment backlog (Loop C)

Priority order — research agent picks the **top open** item each cycle.
Initial seed from force-find ledger + factor expansion waves.

| id | priority | status | hypothesis | protocol | kill if |
|---|---:|---|---|---|---|
| B-001 | 10 | OPEN | Persist order-book imbalance history → liquidity shock features | purged panel | RankIC lift &lt; 0.005 — table exists; seeded 5 symbols, need multi-day history accrual |
| B-002 | 20 | BLOCKED | Daily market summary (turnover / foreign) as regime features | purged panel | CSE `/dailyMarketSummery` returns **only ~2 sessions** — accumulate in poller going forward |
| B-003 | 30 | DEAD | Denser YoY → always-on mean ≥ 0.62 | ml-always-on | +0.002 only |
| B-004 | 40 | KEEP-PARTIAL | Per-regime HPE gate thresholds | ml-precision90 | conf×regime helps; regimes alone flat |
| B-005 | 50 | KEEP | Meta-label / conf gate conf≥0.55 | purged + gate | **KEEP** 0.7268 @ 11% cov — champion `challenger_gated_c55_20260717` |
| B-006 | 60 | DEAD | Rolling 120d train window | Loop C | +0.001 |
| B-007 | 70 | DEAD | Interaction filing×range + ret×vol | Loop C | +0.001 |
| B-008 | 80 | DEAD | Vol-scaled next-day return target | label change | mean −0.005; p90 0.82 |
| B-009 | 90 | DEAD | Announcement count features alone | — | prior ledger |
| B-010 | 100 | KEEP | Shuffle labels → hit≈0.5 | audit | **PASS** 0.524 |
| B-011 | 15 | OPEN | Accrue `market_daily_summary` nightly until ≥60 days then re-run B-002 | poller + Loop C | — |
| B-012 | 25 | KEEP | Ultra gate thr=0.84 → ≥90% precision | WF ledger | **KEEP** in-sample 90.5%@n=42; holdout pure conf≥0.80 → 95%@n=21 |
| B-013 | 18 | KEEP | Symbol reliability × conf gate | temporal holdout | **KEEP** train-fit allowlist; holdout sym≥0.61 & conf≥0.71 → **90%@n=60**; serve `gated_p90` |
| B-014 | 35 | KEEP-PARTIAL | Magnitude-conditional eval (|y|≥day median) | ml-iterate | mean_symbol≈0.627 (not 0.70) but HIGH bucket≈0.687; reinforces selective path |
| B-015 | 12 | KEEP | XGB `rank:pairwise` / LGB LambdaRank vs HGB | ml-ltr-dual | **KEEP** xgb_pairwise RankIC 0.269 (Δ+0.038 vs HGB reg); near-tie HGB clf 0.266 |
| B-016 | 11 | KEEP | Dual-target next-day \|return\| (vol proxy) | ml-ltr-dual | **KEEP** hgb_vol RankIC **0.378** · big-move P@25% 0.46 — use for alert sizing |
| B-017 | 22 | KEEP-PARTIAL | Liquidity×turnover regime split | ml-ltr-dual | low_turnover RankIC 0.316 vs high 0.180 — gate/weight by turnover tercile |
| B-018 | 28 | KEEP-PARTIAL | Large-move + multi-horizon labels | ml-ltr-dual | LMT h=1 RankIC 0.304 / hit 0.619; h=5/10 full RankIC weaker — keep LMT, drop long proxies |
| B-019 | 45 | BLOCKED | Buy-in notice→symbol resolution | notices | CSE board company always "TRADING AND MARKET SURVEILLANCE"; needs PDF/detail path |
| B-020 | 55 | DEFERRED | ASPI macros / news sentiment regime gate | THIRD_PARTY_DATA | ToS checklist; not per-name next-day |

**Anti-plateau:** data accrual (B-001/B-011) until market summary / order-book history deepens.
Wire LTR + vol into serve path only after registry challenge vs `challenger_gated_c55_20260717`.

**Serve modes**
- `gated` — calibrated thr (~0.45–0.55), ~72% selective
- `gated_p90` — thr=0.84, ~90% selective, very sparse emits
- `hpe_with_fallback` — HPE + always-on board fill

Research only — not financial advice.
