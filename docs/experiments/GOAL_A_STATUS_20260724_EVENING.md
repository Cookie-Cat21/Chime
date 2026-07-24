# Goal A / B status — 2026-07-24 evening

## Goal A (SuccessContract offline)

**NOT MET.** Closest approaches:

| Track | Best selective | Prec | LCB | Emits |
|---|---|---:|---:|---:|
| abs + material_median + rich metalabel | `xgb_lmt` / `xgb_two_stage` | 0.88 / 0.85 | 0.85 / 0.82 | 315 / **442** |
| abs + material_median gates | `hgb_bagged` | 0.89 | 0.84 | 160 |
| rel + material_median | hgb_lmt gates | 0.80 | 0.76 | 232 |
| near-miss fpv2+liq_v4 | xgb_lmt | 0.88 | 0.79 | 58 |

### RankIC research unlock
- `material_median` relative: **0.3017** (+0.016 vs frozen 0.2861) → W5 done (hyper test ~0.306)
- Frozen default-label RankIC champ unchanged: `xgb_two_stage` **0.2861**

### Killed this session
- Skip-day labels (RankIC ~0.08)
- Horizon-agree (0.86/0.76/50)
- Same-matrix near-miss / fpv3+liq_v4 / 5-fold without new labels

## Goal B (exhaustion)

| Item | Status |
|---|---|
| E7 prospective DE ≥60 | **1/60** non-partial; Mon+ loop armed (`koel-shadow-mon`) |
| Hist DE replay | **40 sessions**, hit≈0.72, policy `…_hist_v1` — **not E7** |
| E8 | Insufficient prospective scored DE non-partial |
| E10 dossier | Living drafts updated |

## Hard gates held
- SuccessContract thresholds unchanged
- No `forecast_points` / Telegram / promotion
- NFA framing

## Next
1. Keep Mon+ prospective shadow loop for E7
2. Continue Goal A on abs+material_median (nearest miss) — need ≥500 emits @ ≥0.90 LCB
