# Live CSE shadow canary — 2026-07-21

**Status:** capture active; partial-session canary excluded from standards  
**User-facing forecasts written:** 0  
**Telegram alerts sent:** 0

## Live market evidence

First persisted cycle at 13:25 SLT:

| Surface | Captured |
|---|---:|
| `tradeSummary` board | 280 symbols |
| Valid prices | 280 |
| Sector indexes | 22 |
| Market indexes | ASPI + S&P SL20 |
| Stable ordinary-share order-book panel | 25 |
| Daily market summary rows returned | 2 |

The minute board loop continued through close. Sector/index snapshots were
captured every five cycles and the stable top-turnover ordinary-share order-book
panel every ten cycles.

## Shadow canary

At approximately 13:31 SLT, before close, a deliberately marked partial canary verified the
complete train → live features → prediction → ledger path:

| Shadow stream | Rows |
|---|---:|
| Absolute one-session base model | 172 |
| Top-0.5% selective stream | 1 |
| Public-book pressure challenger | 18 |

All rows were written only to `forecast_outcomes` with model versions ending in
`_partial`. Query verification found **zero** matching `forecast_points`, so the
dashboard and Telegram surfaces were untouched. The standards report excludes
every partial row.

## Frozen live streams

| Model version | Purpose |
|---|---|
| `shadow_abs_xgb2_context_v1` | All eligible-company absolute direction |
| `shadow_abs_xgb2_context_p005_v1` | Sparse confidence-ranked challenger |
| `shadow_abs_xgb2_context_book_v1` | Public displayed-book imbalance overlay |

The base model uses historical path, temporal lags, market breadth, source and
missingness masks, and publication-safe filing features. The pressure
challenger adds `0.05 × displayed_book_imbalance` only for symbols with a recent
book snapshot. This coefficient is an untrained prospective challenger and
must show paired lift before it can survive.

“Buy pressure” is deliberately named **public displayed-book imbalance**. The
public endpoint does not establish aggressor side or executed buying pressure.

## Eligibility and scoring

- Ordinary company shares only (`.N0000` / `.X0000`).
- At least 60 historical bars.
- Current and prior prices finite and positive.
- No unresolved current-session move over 35%.
- Trailing 60-session flat-return fraction ≤40%.
- Absolute next-session direction; flat realization is not a directional hit.
- Final board is persisted to both `daily_bars` and `hybrid_daily_bars`.
- Existing `ml-score-outcomes` scores rows after the next official session.

## Standards

No live accuracy can be reported on issue day. Promotion remains blocked until
one frozen model version has:

- precision and one-sided 95% LCB ≥90%;
- at least 500 scored emits, 80 symbols and 60 sessions;
- at least 1% eligible-universe coverage;
- maximum symbol and session share ≤5%;
- no partial-session rows in the sample.

Always-on/all-company quality is reported separately and cannot be represented
by the sparse selective stream.

Research only — not financial advice.
