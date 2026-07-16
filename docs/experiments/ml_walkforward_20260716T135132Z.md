# ML walk-forward experiment report

**Generated (UTC):** 2026-07-16T13:51:32Z
**Universe:** 273 symbols · 64400 daily_bars rows
**Decision:** **GO**
**Leakage checklist:** PASS

## Reasons

- B1_logistic h=1 hit_rate=0.586 (origins=12957)
- B1_logistic h=1 IC=0.082 (origins=12957)
- B2_ridge h=1 IC=0.105 (origins=12957)
- M1_hgb_clf h=1 hit_rate=0.563 (origins=12957)
- M1_hgb_clf h=1 IC=0.119 (origins=12957)
- M2_hgb_reg h=1 IC=0.156 (origins=12957)
- B1_logistic h=5 hit_rate=0.573 (origins=9981)
- B1_logistic h=5 IC=0.097 (origins=9981)
- M1_hgb_clf h=5 hit_rate=0.561 (origins=9981)
- M1_hgb_clf h=5 IC=0.131 (origins=9981)
- M2_hgb_reg h=5 IC=0.077 (origins=9981)

## Metrics

| Model | Horizon | Origins | Dir hits | Hit rate | IC | MAE | Folds |
|---|---:|---:|---:|---:|---:|---:|---:|
| B1_logistic | 1 | 12957 | 7587/12957 | 0.586 | 0.082 | — | 3 |
| B2_ridge | 1 | 12957 | 6678/12957 | 0.515 | 0.105 | 0.0211 | 3 |
| M1_hgb_clf | 1 | 12957 | 7291/12957 | 0.563 | 0.119 | — | 3 |
| M2_hgb_reg | 1 | 12957 | 6963/12957 | 0.537 | 0.156 | 0.0207 | 3 |
| B0_naive | 5 | 9500 | 2823/6366 | 0.443 | — | 11.2722 | 0 |
| B1_logistic | 5 | 9981 | 5718/9981 | 0.573 | 0.097 | — | 2 |
| B2_ridge | 5 | 9981 | 4791/9981 | 0.480 | -0.007 | 0.0449 | 2 |
| M1_hgb_clf | 5 | 9981 | 5604/9981 | 0.561 | 0.131 | — | 2 |
| M2_hgb_reg | 5 | 9981 | 5229/9981 | 0.524 | 0.077 | 0.0449 | 2 |

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
