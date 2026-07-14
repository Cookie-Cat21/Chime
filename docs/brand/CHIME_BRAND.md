# Chime Brand — Signal Mist

**Status:** Locked direction for the fuller product UI  
**Date:** 2026-07-14  
**Amendment:** Extends past the thin-dash fence for marketing + product surfaces; Telegram remains the **push** channel. Web may become a full inspect/manage product home — still not a trading terminal, portfolio tracker, or screener.

---

## 1. One-liner

**Chime watches the CSE so you don’t have to leave a tab open.**

Secondary (when space allows): *Set a condition. Get pinged on Telegram when it fires.*

---

## 2. Voice — five rules

1. **Lead with the event, not the product.**  
   “JKH crossed 22.50” beats “Chime is excited to notify you…”

2. **Quiet until it matters.**  
   Default copy is calm and short. Energy only when an alert fires.

3. **Precise numbers, plain words.**  
   Prices, %, EPS, YoY — tabular and exact. No hype adjectives.

4. **Honest about limits.**  
   Always carry NFA. Say “verify in the filing” for extracted fundamentals. Never imply advice.

5. **Name the channel.**  
   Pushes live on Telegram. The site manages and inspects; it does not replace the ping.

**Tone words:** clear · local · unhurried · exact  
**Avoid:** “unlock,” “crush the market,” emoji rows, purple-SaaS optimism, broker cosplay

---

## 3. Logo treatment

**Primary: wordmark only — `Chime`**

- Display face: Fraunces semibold, tight tracking  
- Color: deep teal ink on mist; inverted mist-on-ink for dark chrome only if needed later  
- No icon required for v1 marketing or app chrome

**Optional mark (secondary, never alone on first viewport):**

A single soft **bell-arc** — one open curve suggesting a strike, not a cartoon bell. Stroke in brand teal. Use in favicon / app icon only after wordmark is established.

**Do not:** monogram in a rounded square, gradient orb, stock-chart chevron, Sri Lankan flag lockup as logo.

---

## 4. Color tokens

Cool mist + deep teal ink. **Brass/amber is alert-fired only** — never the brand color.

| Token | OKLCH (approx) | Hex guide | Use |
|---|---|---|---|
| `--mist` | `oklch(0.97 0.015 205)` | `#F2F7F8` | Page ground |
| `--mist-deep` | `oklch(0.91 0.025 195)` | `#D7E8E6` | Atmosphere wash |
| `--ink` | `oklch(0.24 0.035 230)` | `#1A2A36` | Body / wordmark |
| `--ink-soft` | `oklch(0.48 0.03 220)` | `#5A6B78` | Secondary text |
| `--teal` | `oklch(0.36 0.055 200)` | `#1F4A52` | Primary actions, links |
| `--teal-signal` | `oklch(0.55 0.08 185)` | `#2A8A7A` | Focus / live “watching” |
| `--jade` | `oklch(0.62 0.09 165)` | `#3BA88A` | Positive Δ (price up, YoY up) |
| `--coral` | `oklch(0.55 0.18 25)` | `#C44B3A` | Destructive / price down |
| `--brass` | `oklch(0.72 0.12 85)` | `#C9A227` | **Alert fired only** |
| `--brass-soft` | `oklch(0.88 0.06 90)` | `#F0E4B8` | Fired row wash (sparingly) |
| `--line` | `oklch(0.86 0.02 210)` | `#C9D5DA` | Hairline borders |

**Atmosphere:** full-bleed radial mist (teal + cool blue), soft grain, slow drift. No purple. No cream/terracotta. No neon terminal green on black as default.

---

## 5. Type scale

| Role | Family | Weight | Size (desktop → mobile) | Notes |
|---|---|---|---|---|
| Wordmark | Fraunces | 600 | 72→48 | Hero brand; never overpowered by H1 |
| Display | Fraunces | 500–600 | 40→28 | Section titles sparingly |
| Headline | Sora | 500–600 | 24→20 | One per section |
| Body | Sora | 400 | 16→15 | Comfortable line-height ~1.5 |
| Meta / NFA | Sora | 400 | 13→12 | Muted ink-soft |
| Numbers | JetBrains Mono | 400–500 | match context | Prices, EPS, % — always tabular |

---

## 6. Landing — first viewport (brand-first)

**One composition. Full-bleed mist atmosphere. No cards in the hero.**

Allowed in the first viewport only:

1. **Chime** wordmark (hero-level)  
2. One headline (must not overpower the wordmark)  
3. One supporting sentence  
4. One CTA group (primary + optional secondary)  
5. Dominant atmospheric plane (mist gradients + grain) — not an inset image card  

**Headline:** `CSE alerts that find you.`  
**Support:** `Watch prices, moves, disclosures, and filings. Chime pings Telegram the moment a rule fires.`  
**Primary CTA:** `Open Telegram bot`  
**Secondary CTA:** `Manage in browser`  

**Not in first viewport:** stats strips, schedule, feature grids, alert type pills, testimonials, address blocks.

**Motion (2–3):**  
1. Atmosphere drift (slow)  
2. Wordmark + copy rise-in  
3. Primary CTA soft underline pulse once on load (respect `prefers-reduced-motion`)

---

## 7. Product UI implications (fuller frontend)

When we expand past thin CRUD:

- Same tokens everywhere; brass appears **only** on fired alert rows / toast / history “sent” flash  
- Filings / YoY panels use jade/coral for Δ%, ink for values — never brass for “EPS looks good”  
- Landing can sell the product; app shell stays quieter (mist + ink), still brand-first in nav wordmark  
- Still no portfolio P&L, TA charts, or screener unless the constitution is amended again  

---

## 8. Brand test

Remove the nav. If the first viewport could belong to another fintech after deleting the wordmark, branding is too weak — enlarge **Chime**, shorten the headline, strengthen mist.
