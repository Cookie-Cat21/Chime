# CSE financial extract — verified accuracy spike

Generated: `2026-07-13T06:50:01.246293+00:00`  
Sample: **41** unique strong-set PDFs  
Research only — not alert truth.

## Headline

| Metric | Value |
|---|---:|
| **Human gold accuracy** (value match) | **100.0%** (15/15) |
| Coverage gate (required_ok, adjacency-verified) | **100.0%** (41/41) |
| All three metrics present (pre-verify) | 100.0% |

Human gold = hand-checked revenue / PAT / basic EPS from the SOPL page (current quarter when both Q + YTD exist; Group when Company+Group exist). See `cse_financial_gold_labels.json`.

### By kind (coverage)

```json
{
  "quarterly": {
    "n": 20,
    "ok": 20
  },
  "annual": {
    "n": 21,
    "ok": 21
  }
}
```

### Fail reasons (coverage)

```json
[]
```

## Human gold panel

- PASS `AAF.N0000` (annual) exp={'revenue': 5972861421.0, 'profit': 115756549.0, 'eps_basic': 3.55} got={'revenue': 5972861421.0, 'profit': 115756549.0, 'eps_basic': 3.55}
- PASS `AAF.N0000` (quarterly) exp={'revenue': 2358166994.0, 'profit': 280257691.0, 'eps_basic': 2.26} got={'revenue': 2358166994.0, 'profit': 280257691.0, 'eps_basic': 2.26}
- PASS `AAIC.N0000` (annual) exp={'revenue': None, 'profit': None, 'eps_basic': 12.61} got={'revenue': 290.0, 'profit': 4521797.0, 'eps_basic': 12.61}
- PASS `AAIC.N0000` (quarterly) exp={'revenue': 10968969.0, 'profit': 2389200.0, 'eps_basic': 7.55} got={'revenue': 10968969.0, 'profit': 2389200.0, 'eps_basic': 7.55}
- PASS `ABL.N0000` (quarterly) exp={'revenue': 16918379.0, 'profit': 2480983.0, 'eps_basic': 4.5} got={'revenue': 16918379.0, 'profit': 2480983.0, 'eps_basic': 4.5}
- PASS `AGAL.N0000` (annual) exp={'revenue': 4839661.0, 'profit': 781489.0, 'eps_basic': 5.0} got={'revenue': 4839661.0, 'profit': 781489.0, 'eps_basic': 5.0}
- PASS `AHUN.N0000` (annual) exp={'revenue': 52349252.0, 'profit': -544187.0, 'eps_basic': 9.16} got={'revenue': 52349252.0, 'profit': -544187.0, 'eps_basic': 9.16}
- PASS `AHUN.N0000` (quarterly) exp={'revenue': 14210028.0, 'profit': 2160621.0, 'eps_basic': 3.99} got={'revenue': 14210028.0, 'profit': 2160621.0, 'eps_basic': 3.99}
- PASS `ALLI.N0000` (quarterly) exp={'revenue': 4669290719.0, 'profit': 769247716.0, 'eps_basic': 89.22} got={'revenue': 4669290719.0, 'profit': 769247716.0, 'eps_basic': 89.22}
- PASS `ALUM.N0000` (annual) exp={'revenue': 14338260.0, 'profit': 867154.0, 'eps_basic': 1.45} got={'revenue': 14338260.0, 'profit': 867154.0, 'eps_basic': 1.45}
- PASS `APLA.N0000` (quarterly) exp={'revenue': 731203.0, 'profit': 207284.0, 'eps_basic': 4.92} got={'revenue': 731203.0, 'profit': 207284.0, 'eps_basic': 4.92}
- PASS `ASCO.N0000` (annual) exp={'revenue': 1205078755.0, 'profit': 147282135.0, 'eps_basic': -0.45} got={'revenue': 1205078755.0, 'profit': 147282135.0, 'eps_basic': -0.45}
- PASS `ASIR.N0000` (quarterly) exp={'revenue': 8864199973.0, 'profit': 1348951466.0, 'eps_basic': 1.11} got={'revenue': 8864199973.0, 'profit': 1348951466.0, 'eps_basic': 1.11}
- PASS `ASPH.N0000` (quarterly) exp={'revenue': 40635.0, 'profit': 10985.0, 'eps_basic': 0.003} got={'revenue': 40635.0, 'profit': 10985.0, 'eps_basic': 0.003}
- PASS `ATL.N0000` (quarterly) exp={'revenue': 3237758580.0, 'profit': -289226338.0, 'eps_basic': -1.27} got={'revenue': 3237758580.0, 'profit': -289226338.0, 'eps_basic': -1.27}

## Sample coverage OK

- `AAF.N0000` (quarterly) scale=unknown  
  rev=2358166994.0 pat=280257691.0 eps=2.26
- `AAF.N0000` (annual) scale=unknown  
  rev=5972861421.0 pat=115756549.0 eps=3.55
- `AAIC.N0000` (quarterly) scale=thousands  
  rev=10968969.0 pat=2389200.0 eps=7.55
- `AAIC.N0000` (annual) scale=millions  
  rev=290.0 pat=4521797.0 eps=12.61
- `ABAN.N0000` (quarterly) scale=millions  
  rev=1928502029.0 pat=132442736.0 eps=25.92
- `ABAN.N0000` (annual) scale=unknown  
  rev=6123805633.0 pat=438720434.0 eps=85.85
- `ABL.N0000` (quarterly) scale=thousands  
  rev=16918379.0 pat=2480983.0 eps=4.5
- `ABL.N0000` (annual) scale=millions  
  rev=15399562261.0 pat=1774665732.0 eps=3.22

## Sample coverage FAIL

- _(none)_

## Method

1. Rank SOPL-like pages (PyMuPDF; annuals scan full PDF; TOC page hints).
2. Prefer **quarter** pages over YTD, **Group** over Company-only.
3. Line-parse revenue / profit / EPS with CSE aliases (premiums, financing income, Profit/(Loss), Dialuted typo, Basic/Diluted).
4. Skip note-number lines; stitch broken `( 825,505)` layouts; leftmost column.
5. Adjacency-verify each pick in page text.
6. Score against hand gold labels for true value accuracy.

**Still not Telegram alert truth** — scale/unit and issuer quirks remain.

Raw: `cse_financial_accuracy_eval_20260713T065001Z.json`

