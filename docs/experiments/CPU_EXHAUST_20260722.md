# CPU exhaust ladder — 2026-07-22

Status: **relative/h1 complete (family + nested + 10 000 LGB screen);
absolute/h1 nested running**. GPU ladder retired as the active search.

## Goal

Beat the prior champion — native DoubleEnsemble RankIC **0.2526**
(BA 0.5763, MCC 0.1509, net spread @112 bps −0.69%) — under the same
nested protocol (3 folds, CSE eval domain, max flat fraction 0.40).
The strict selective 90% precision/LCB contract remains the promotion bar.

## Snapshot

- `bars_sha256`: `dc7de31d5c9ac46f17d878aee89676306da1959ff0b006badc7020a4a00f1da7`
- `fundamentals_sha256`: `ce153d84cac292ad124478c18dc83467ddaeee2e9842dc12c276386ac06621a2`
- 917 087 rows / 292 symbols / 2000-01-03 → 2026-07-21
- pooled nested test footprint (relative/h1): **17 529 rows / 117 sessions**

## Relative / horizon-1 — nested deep

| model | RankIC | BA | MCC | net@112bps | net@30bps | beats prior baseline |
|---|---:|---:|---:|---:|---:|---|
| **xgb_two_stage** | **0.2861** | **0.5882** | 0.1771 | −0.78% | +1.92% | **yes** |
| xgb_lmt | 0.2836 | 0.5857 | 0.1721 | −1.02% | +1.77% | yes |
| hgb_two_stage | 0.2816 | 0.5857 | 0.1787 | −0.88% | +1.85% | yes |
| hgb_lmt | 0.2806 | 0.5840 | 0.1748 | −1.13% | +1.65% | yes |
| hgb_bagged | 0.2748 | 0.5760 | 0.1801 | −1.03% | +1.78% | yes |
| hgb_deep | 0.2748 | 0.5757 | 0.1801 | −1.03% | +1.79% | yes |
| double_ensemble_native | 0.2566 | 0.5777 | 0.1538 | −0.44% | +2.23% | yes (replicated) |

**CPU RankIC champion: `xgb_two_stage` at 0.2861.**

## Relative / horizon-1 — 10 000 LightGBM screen

- Predeclared grid: 10 000 configs (lr × depth × leaves × subsample × λ)
- Ranking screen: chronological 40 000-row train tail, 80 estimators,
  **calibration RankIC only**
- Winners: top-10 re-fit on full calibration_train (600 estimators),
  scored once on fold-0 test

Best winner on fold-0 test:

| fingerprint | cal RankIC | test RankIC | BA | MCC | net@112bps | beats 0.2526 |
|---|---:|---:|---:|---:|---:|---|
| `lgb_c34120c27d` | 0.2516 | 0.2640 | 0.5872 | 0.1745 | −0.73% | yes |
| `lgb_14c403cdc6` | 0.2501 | 0.2637 | 0.5905 | 0.1809 | −0.83% | yes |
| `lgb_ca764b9c59` | 0.2501 | 0.2631 | 0.5926 | 0.1850 | −0.83% | yes |

Config of the top fingerprint: `lr=0.06, max_depth=8, num_leaves=63,
subsample=0.9, colsample=0.95, reg_lambda=100`.

**None of the 10 000 LightGBM configs beat nested `xgb_two_stage`
(0.2861).** Several beat the old DoubleEnsemble mark on fold-0 test,
but post-cost @112 bps stays negative.

Artifacts: `cpu_exhaust_rel_h1_*.json`, `cpu_exhaust_rel_h1_lgb_10k.json`.

## Still not promotion-ready

- selective 90% precision / LCB contract: **not met**
- post-cost spread @112 bps: **negative for every survivor and every
  LGB winner** (best nested is DoubleEnsemble at −0.44%)
- @30 bps every nested survivor is net-positive — the gap is
  transaction-cost / turnover plus unadjusted corporate-action factors

## Absolute / horizon-1

Running now (family screen + nested, hyper skipped). Results will
update this section.

## Relative / horizon-5

Queued after absolute/h1.

## Safety

- `live_shadow.py` / policy IDs untouched
- no `forecast_points` / Telegram writes
- hyperparameter selection is calibration-only
