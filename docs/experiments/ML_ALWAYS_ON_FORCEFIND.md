# Always-on force-find ledger

**Baseline (locked):** `baseline_cs_lmt_bag` mean symbol hit = **0.5930**  
**Keep rule:** Δ ≥ **+0.005** under purged protocol.

## Cycles

| Lever | Mean symbol hit | Δ vs baseline | Keep? |
|---|---:|---:|:---:|
| baseline_cs_lmt_bag | 0.5930 | — | lock |
| events (disc/notice counts, ~4.9k disc / 1y) | 0.5927 | −0.0003 | **NO** |
| sector_rs (peer-relative ret 5/20) | 0.5938 | +0.0008 | **NO** |
| sector_rs + events | 0.5935 | +0.0005 | **NO** |
| + disc history to 2023 (~14.6k) + interactions | 0.5918 | −0.0012 | **NO** |
| ASPI daily regime (`POST /chartData` period=5, 240 pts) | 0.5938 | +0.0008 | **NO** |
| Financial filing **dates** basic (`POST /financials`) | 0.5973 | +0.0042 | **NO** (near) |
| **Financial filing dates rich** (q90/q365/days/recent) | **0.5987** | **+0.0057** | **YES** |
| fin_rich + ASPI | 0.5914 | −0.0016 | **NO** |
| fin_rich + sector_rs | 0.5980 | +0.0050 | **YES** (marginal) |

### Probe note (from cse-api-test endpoints)

- `chartData` → usable **ASPI daily** (~1y) — wired; small lift alone.
- `financials` → **PDF metadata to ~2012**, not numeric line items (`reqFinancial` is labels only). Date/recency features are what moved the needle slightly.
- `getFinancialAnnouncement` → recent market-wide financial PDF feed (good for ops drain next).

**Still needed for bigger lifts:** actual YoY EPS/rev extracted from those PDFs.

## Data ingested this wave

- `disclosures-backfill`: **273** symbols, **~14.6k** rows (2023-01 → 2026-07)
- `stocks.sector` already populated (prior wave)
- `index_snapshots`: only **intraday today** — not usable for walk-forward regime yet
- `market_notices` with symbol: **53** (sparse)

## Interpretation

Announcement **counts** alone do not move always-on direction hit. Likely need:

1. **Filing metrics / YoY numerics** from PDFs (not just “had a disclosure”)
2. **Daily ASPI/sector index history** for true market-regime features
3. Or accept that always-on stays high-50s and lean on **HPE (~90% when speaking)**

## Commands

```bash
python3 -m chime ml-always-on                 # baseline scoreboard
python3 -m chime ml-always-on --events        # vs baseline
python3 -m chime ml-always-on --sector-rs
python3 -m chime disclosures-backfill --force --limit 0
```

Research only — not financial advice.
