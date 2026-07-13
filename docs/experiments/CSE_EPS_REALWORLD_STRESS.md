# CSE EPS real-world stress test

Generated: `2026-07-13T08:54:40.883180+00:00`  
Research only — full-board style extract + calc-alert gates.

## Universe

- Live board symbols: **281**
- Local PDF symbols: **225**
- Filings indexed: **444**
- Text-ok filings: **428**
- Strong (rev+profit+EPS labels): **277**
- Scanned / text-poor (excluded from extract perfection): **16**

## Extract + calc-alert gates (strong set)

| Gate | Result |
|---|---:|
| Strong unique filings | 277 |
| Extractable (text SOPL) | 269 |
| Unextractable quarantined | 8 |
| Coverage on extractable | **100.0%** (269/269) |
| Scored gold EPS accuracy | **100.0%** (n=232) |
| Human-seed EPS accuracy | **100.0%** (n=16) |
| Alert decision accuracy | **100.0%** |
| Crossing accuracy | **100.0%** (n=106) |
| Dual-agree disagreements | 0 |
| Perfect on extractable set? | **YES** |

## Unextractable (OCR / image SOPL / annualized-only / no EPS number)

- `AFSL.N0000` (quarterly) reason=ocr_garble fails=['revenue:missing', 'eps_basic:missing']
- `CABO.N0000` (annual) reason=image_or_empty_sopl fails=['revenue:missing', 'profit:missing', 'eps_basic:missing']
- `CLND.N0000` (quarterly) reason=eps_label_without_number fails=['revenue:missing', 'profit:missing', 'eps_basic:missing']
- `COMD.N0000` (quarterly) reason=eps_label_without_number fails=['eps_basic:missing']
- `CRL.N0000` (quarterly) reason=annualized_eps_only fails=['eps_basic:missing']
- `HUNT.N0000` (annual) reason=image_or_empty_sopl fails=['revenue:missing']
- `RAL.N0000` (annual) reason=image_or_empty_sopl fails=['revenue:missing']
- `SDF.N0000` (quarterly) reason=annualized_eps_only fails=['eps_basic:missing']

## Coverage misses (extractable — should be empty when perfect)

- _(none)_

## EPS misses vs scored gold

- _(none)_

## Disagreements (excluded from scored gold)

- _(none)_

Raw: `cse_eps_realworld_stress_20260713T085440Z.json`

