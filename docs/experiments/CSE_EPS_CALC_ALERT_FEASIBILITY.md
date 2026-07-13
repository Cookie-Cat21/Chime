# EPS calc-alert feasibility (`/alert SYMBOL eps above X`)

Generated: `2026-07-13T06:49:05.098235+00:00`  
Research only — proves whether calc alerts are *possible* at high accuracy.

## Alert semantics under test

1. **Metric:** basic EPS (default); diluted stored separately
2. **Period:** current quarter (quarterlies) / full year (annuals)
3. **Entity:** Group preferred over Company-only
4. **Trigger:** new filing extract vs user threshold (not live price poll)
5. **Dedupe:** one fire per `(rule_id, filing_id)`

## Results

| Gate | Result |
|---|---:|
| Human+dual scored gold | 37 (of 41 listed) |
| EPS accuracy vs scored gold | **100.0%** |
| Seed human gold (strict) | **100.0%** (15/15) |
| Dual-agree subset | **100.0%** (22/22) |
| Synthetic threshold decision accuracy | **100.0%** |
| Filing→filing crossing accuracy | **100.0%** (28/28) |
| Unresolved disagreements excluded | 0 |
| Target | 99% |
| Feasible at target? | **YES** |

### Gold construction

```json
{
  "n": 41,
  "seed": 15,
  "dual_agree": 22,
  "disagree": 0,
  "extractor_only": 4,
  "independent_only": 0,
  "both_miss": 0,
  "unresolved_excluded": 0
}
```

Accuracy gates use **human_seed + dual_agree only**. `extractor_only` rows are listed for coverage but excluded from the accuracy denominator. Disagreements are excluded until human-labeled.

## Path to bot implementation (only if feasible)

1. Migration: `filing_metrics` + `alert_rules.type` in (`eps_above`,`eps_below`)
2. Job: on new `financials` PDF for watched symbols → extract → gate → store
3. Rule eval: compare new `eps_basic` to threshold; fire Telegram once per filing
4. Message must include: EPS, period, scale, Group/Company, PDF link, NFA
5. Fail closed: if extract gates fail, **do not fire**, notify ops/log only
6. Expand human gold to ≥50 before production flag flip

## Still blocked for production if

- Human-seed EPS accuracy < 99%
- Unresolved disagreement cluster grows
- No filing-id dedupe / no scale tag in message

Raw: `cse_eps_calc_alert_feasibility_20260713T064905Z.json`

## EPS misses vs gold

- _(none)_
