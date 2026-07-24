# Near-miss LMT trio on fpv2+liq_v4 (2026-07-24)

## Setup

- Snapshot: `/tmp/koel-live-final-snapshot-split` (hybrid/split)
- Matrix: `--feature-pack v2 --universe-filter liq_v4`
- Models: `xgb_two_stage`, `xgb_lmt`, `hgb_lmt` (+ forced `double_ensemble_native`)
- Nested: 3 folds × seeds 0,1,2; `--skip-hyper`
- Output: `/tmp/cpu-exhaust-rel-h1-fpv2-liqv4-nearmiss`

## Nested RankIC vs frozen 0.2861

| Model | RankIC | Δ |
|---|---:|---:|
| xgb_two_stage | 0.2835 | −0.0026 |
| xgb_lmt | 0.2828 | −0.0033 |
| hgb_lmt | 0.2802 | −0.0059 |
| double_ensemble_native | 0.2532 | −0.0329 |

No RankIC materiality (+0.005). Cost spreads @112 remain negative on this nest.

## Selective (postprocess / ultra-dense)

Best observed in continue-queue log before f5 start: **precision ≈ 0.789 / LCB ≈ 0.713 / emits = 95**, `stable_folds=0`. SuccessContract **NOT MET**.

## Verdict

**Killed for Goal A unlock** on this matrix+trio. Proceed to 5-fold mass, fpv3+liq_v4, then wave2 skip-day + horizon-agree + rich metalabel.
