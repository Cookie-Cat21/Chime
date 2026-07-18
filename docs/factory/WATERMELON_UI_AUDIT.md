# Watermelon UI audit — Quiverly only

Audit of [Watermelon UI](https://ui.watermelon.sh/) / [registry](https://github.com/WatermelonCorp/watermellon-registry) for Quiverly’s **marketing site** and **thin dash**. Other kits (Magic UI, Aceternity, React Bits, Cult shaders) are out of scope here.

**License:** MIT (Watermelon Contributors).  
**Install (verified):** prefer the `/r/` path:

```bash
npx shadcn@latest add "https://registry.watermelon.sh/r/<slug>.json"
```

Root URLs without `/r/` often 404 HTML. Fallback:

`https://raw.githubusercontent.com/WatermelonCorp/watermellon-registry/main/public/r/<slug>.json`

**Post-install rule:** port → rename under `components/marketing/` or `components/kit/` → Quiverly tokens (no purple glow, light theme, NFA) → log in `docs/THIRD_PARTY.md`.

---

## Already adapted in Quiverly

| Watermelon | Quiverly file | Notes |
|---|---|---|
| **footer-20** | `web/src/components/marketing/quiverly-footer.tsx` | NFA + link columns; no vendor email |
| **bento-2** | `web/src/components/marketing/quiverly-bento.tsx` | Product tiles, Quiverly tokens |
| **newsletter-5** `BackgroundGrid` | `web/src/components/marketing/hero-grid-backdrop.tsx` | Atmosphere only — no subscribe form |

---

## ACCEPT — marketing `/` (and public stubs)

### High priority

| Slug | Role | Quiverly use | Fence |
|---|---|---|---|
| `announcement-6` (or `announcement-8`) | Quiet muted bar + dismiss | Market hours / bot live — one bar | Factual ops copy; not KPI |
| `faq-3` | Numbered accordion FAQ | Densify FAQ beyond HyperUI `<details>` | Keep NFA answer; lucide icons |
| `faq-1` | Props-driven accordion | Drop-in for current FAQ data | No fake “updated” dates |
| `faq-6` | Split + dashed borders | Paper / hairline look | Don’t oversize display type |
| `cta-1` | Title + description + button | Mid/end CTA polish | No tip language; compose dual CTAs |
| `pricing-1` | Simple plan cards | `/pricing` Free / Later stub | **No checkout** |
| `blog-1` | Post list cards | Wave 3 `/blog` | Real posts only |

### Medium

| Slug | Notes |
|---|---|
| `announcement-1`, `announcement-3` | Promo rows — strip rocket copy |
| `faq-4`, `faq-5` | Two-col / categorized FAQ if it grows |
| `pricing-2`, `pricing-5` | Collapse to 2 tiers; no SSO theater |
| `auth-01` | `/login` card layout only |
| `navigation-3` | Only if replacing `MarketingNav` |
| `feature-5` | Workflow story — rewrite to CSE alert types |
| `stepper` / `step-indicator` | Motion ideas for how-it-works; restyle chrome |
| `footer-5` | Lighter alt to Footer-20 if needed |

### Low

| Slug | Notes |
|---|---|
| `animated-accordion` | FAQ motion primitive — optional |
| `hero-30` | Minimal hero **structure** only — don’t replace brand-first hero |
| Other `bento-*` | Bento-2 already shipped; more = card spam |

---

## ACCEPT — thin dash only (not marketing)

| Slug | Use |
|---|---|
| `alert`, `alert-01` | Ops honesty banners (`/health`, stale snapshot) |
| `status-indicator` | Poller / market open-closed |
| `notification-list` | Recent fires from real `alert_log` |
| `data-table`, `table-*` | Watchlist / rules — keep thin |
| `command-search` | Symbol picker |
| `sheet` / `dialog` / `drawer` | Create/edit alert |
| `breadcrumb` | Symbol detail |
| `skeleton`, `inline-toast`, `pagination` | Loading / feedback / history |
| `badge*` | Rule-type chips — restyle candy pills |
| `filter-disclosure` | Light market browse filters |
| `auth-*` | Login shell only |
| `sidebar` | Only if evolving dash chrome carefully |

---

## REJECT / skip

| Bucket | Examples | Why |
|---|---|---|
| Full dashboard packs | `business-operations-dashboard`, `erp-dashboard`, `portfolio-dashboard`, `web3-dashboard`, … | Fence — no Tracker Pro / KPI walls |
| Full landing template | `landing-01` | Fake testimonials + stats |
| Testimonials / social proof | `testimonials-1`…`4`, `cta-2` (avatar stacks) | Fake proof |
| Marketing KPI theater | `cta-4`, `feature-2`–`4`, `stats-1`–`4` | Heavy dash on landing |
| Dark / glow / agency | `hero-1`, `hero-8`, `cta-5`, `bento-7`, `announcement-4` | Fights light Quiverly brand |
| Crypto / DeFi | `aave-swap-*`, `uniswap-*`, `swap-*`, `web3-dashboard` | Wrong product |
| Marquee / logo clouds | `marquee` | Fake partner strip risk |
| Newsletter capture forms | `newsletter-*` (forms) | No email product — backdrop already stolen |
| Agency / real-estate pages | `luminia-*`, `apexflow-*`, … | Off-brand |
| Charts as marketing | chart / radar packs on `/` | Not for landing |

---

## Top 8 Watermelon-only picks to try next

1. **announcement-6** (or **8**) — market-hours / bot-live bar  
2. **faq-3** — numbered FAQ densify  
3. **cta-1** — mid/end CTA polish (no fake proof)  
4. **pricing-1** — `/pricing` Free / Later  
5. **faq-6** — dashed split FAQ if paper layout wins  
6. **blog-1** — when `/blog` lands  
7. **alert-01** — thin dash honesty banners  
8. **notification-list** — dash recent fires (real data only)

```bash
npx shadcn@latest add "https://registry.watermelon.sh/r/announcement-6.json"
npx shadcn@latest add "https://registry.watermelon.sh/r/faq-3.json"
npx shadcn@latest add "https://registry.watermelon.sh/r/cta-1.json"
npx shadcn@latest add "https://registry.watermelon.sh/r/pricing-1.json"
npx shadcn@latest add "https://registry.watermelon.sh/r/alert-01.json"
npx shadcn@latest add "https://registry.watermelon.sh/r/notification-list.json"
```

---

## Registry shape reminder

Marketing sections are mostly `registry:ui` named `footer-*`, `hero-*`, `bento-*`, `faq-*`, `cta-*`, `announcement-*` — not only `registry:block`. Full `dashboards/` + `landing-01` are skip for Quiverly.

Related fence docs: `MARKETING_SITE_MASTER_PLAN.md`, `DASH_COMPONENT_FILTER.md`, `THIRD_PARTY.md`.
