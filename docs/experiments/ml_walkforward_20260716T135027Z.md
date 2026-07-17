# ML walk-forward experiment report

**Generated (UTC):** 2026-07-16T13:50:27Z
**Universe:** 40 symbols · 9517 daily_bars rows
**Decision:** **GO**
**Leakage checklist:** PASS

## Reasons

- B1_logistic h=1 hit_rate=0.587 (origins=1934)
- B1_logistic h=1 IC=0.121 (origins=1934)
- B2_ridge h=1 IC=0.187 (origins=1934)
- M1_hgb_clf h=1 hit_rate=0.567 (origins=1934)
- M1_hgb_clf h=1 IC=0.074 (origins=1934)
- M2_hgb_reg h=1 IC=0.146 (origins=1934)
- B1_logistic h=5 IC=0.146 (origins=1490)
- B2_ridge h=5 IC=0.056 (origins=1490)
- M1_hgb_clf h=5 IC=0.097 (origins=1490)
- M2_hgb_reg h=5 IC=0.044 (origins=1490)

## Metrics

| Model | Horizon | Origins | Dir hits | Hit rate | IC | MAE | Folds |
|---|---:|---:|---:|---:|---:|---:|---:|
| B1_logistic | 1 | 1934 | 1135/1934 | 0.587 | 0.121 | — | 3 |
| B2_ridge | 1 | 1934 | 1013/1934 | 0.524 | 0.187 | 0.0229 | 3 |
| M1_hgb_clf | 1 | 1934 | 1097/1934 | 0.567 | 0.074 | — | 3 |
| M2_hgb_reg | 1 | 1934 | 1016/1934 | 0.525 | 0.146 | 0.0230 | 3 |
| B0_naive | 5 | 1408 | 458/976 | 0.469 | — | 10.6967 | 0 |
| B1_logistic | 5 | 1490 | 817/1490 | 0.548 | 0.146 | — | 2 |
| B2_ridge | 5 | 1490 | 685/1490 | 0.460 | 0.056 | 0.0492 | 2 |
| M1_hgb_clf | 5 | 1490 | 804/1490 | 0.540 | 0.097 | — | 2 |
| M2_hgb_reg | 5 | 1490 | 740/1490 | 0.497 | 0.044 | 0.0543 | 2 |

## Gates

- Promote (GO) if hit rate ≥ **0.55** or Spearman IC ≥ **0.03**
  with enough origins and leakage checklist green.
- NO-GO: keep naive opt-in forecast; do not wire ML into dash.
- UNCLEAR: marginal band — one more experiment pass before hard kill.

## Leakage checklist

1. Features from bars with `trade_date ≤ as_of` only
2. Labels from future closes only
3. Expanding-window folds by calendar `as_of`
4. No fit on evaluation fold
5. No random shuffle across time

## NFA

Even on GO, any product surface must stay research / estimate — not financial advice.
