# Experiment backlog (Loop C)

Priority order — research agent picks the **top open** item each cycle.
Initial seed from force-find ledger + factor expansion waves.

| id | priority | status | hypothesis | protocol | kill if |
|---|---:|---|---|---|---|
| B-001 | 10 | OPEN | Persist order-book imbalance history → liquidity shock features | purged panel | RankIC lift &lt; 0.005 |
| B-002 | 20 | OPEN | Daily market summary (turnover / foreign) as regime features | purged panel | no keep vs fin_rich |
| B-003 | 30 | OPEN | Denser YoY (finish PDF drain) → always-on mean ≥ 0.62 | ml-always-on | &lt; +0.005 after full drain |
| B-004 | 40 | OPEN | Per-regime HPE gate thresholds (up/down/flat) | ml-precision90 | coverage↓ without precision↑ |
| B-005 | 50 | OPEN | Meta-label always-on: only emit when P(correct)≥τ | purged + gate | gated hit &lt; 0.62 @ cov≥0.1 |
| B-006 | 60 | OPEN | Rolling 120d train window vs expanding | Loop B challenger | worse fold robustness |
| B-007 | 70 | OPEN | Interaction: filing_recent × range_20d | feature add | importance &lt; 1% × 3 cycles |
| B-008 | 80 | OPEN | Target: next-day vol-scaled return | label change | RankIC not ≥ hit-only stack |
| B-009 | 90 | DEAD | Announcement count features alone | — | already no-keep in ledger |
| B-010 | 100 | OPEN | Protocol audit: shuffle labels → hit≈0.5 | audit | fail = leakage |

**Anti-plateau:** after 3 consecutive no-keeps, next cycle must be data acquisition (B-001/B-002/B-003), target engineering (B-008), or protocol audit (B-010).

Research only — not financial advice.
