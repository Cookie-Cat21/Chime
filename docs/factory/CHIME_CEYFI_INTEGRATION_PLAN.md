# Chime × Ceyfi integration master plan

**Date:** 2026-07-17  
**Status:** Planning only — **do not implement** until a human unlocks the
“Ceyfi merge” fence in `CLAUDE.md` / `COMMIT_FACTORY.md`.  
**Repos:** [ArdenoStudio/ceyfi](https://github.com/ArdenoStudio/ceyfi) · Chime
(this repo)

---

## 0. Reception first (read before any build)

### What people will actually hear

| Audience | Likely reaction | Why |
|---|---|---|
| **Retail CSE watchers** (Chime’s core) | Cautious-positive on *alerts*; cold on *bank merge* | They want “ping me when COMB moves,” not a Seylan wallet in the same chrome. Upsell to loans/remittance feels off-mission. |
| **Diaspora parents** (Ceyfi’s Nimal persona) | Warm *if* the story is “watch family stocks + send money home,” not “day-trade from Telegram” | Ceyfi already owns remittance clarity. CSE alerts are a cherry for relatives who hold listed names — not a brokerage. |
| **Borrowers / SME** (Sunil / Suresh) | Mostly indifferent to CSE alerts | Loan health and bookkeeping don’t need price crosses. Forced CSE chrome will feel bolted on. |
| **Brokers / CDS ecosystem** | Skeptical → hostile if you imply execution | Neither product places CSE orders today. Claiming “invest from alerts” without a licensed path is a red flag. |
| **SEC / compliance-minded users** | High scrutiny | Alert → “invest now” is one step from **inducement** language (CSE Tracker Pro already hedges hard). NFA must stay louder than CTAs. |
| **Seylan (if real rails)** | Interested in CX layer; allergic to unlicensed securities UX | Ceyfi is framed as bank CX, not retail IB. Securities would need a separate license story or partner broker. |
| **Competitors (Tracker Pro, etc.)** | “Cute Telegram bot glued to a bank demo” | Fine — if reliability of push is undeniable, the jab doesn’t matter. |
| **Ardeno / judges / press** | Strong *narrative* if phased honestly | “Alerts for the market + clarity for the rupee” lands. “We merged two demos into a Super App” does not. |

### Verdict on reception

**People will take the *pair* well only if you sell a journey, not a megamerge.**

- **Works:** *Chime tells you when something moved. Ceyfi helps you see whether you can afford to act (cash, FX, family wallet). You still place the trade with your broker.*
- **Fails:** *One app to buy CSE stocks from a Telegram alert* — neither codebase supports that, and regulators / brokers will smell it.

**Do not start product merge work** until you accept that Phase 0–2 are
**link + identity + money-context**, and **execution** is Phase 4+ with a
licensed partner (or never).

---

## 1. Honest product map (today)

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  CHIME                      │     │  CEYFI                      │
│  CSE dash + Telegram alerts │     │  Seylan-oriented AI bank CX │
│                             │     │                             │
│  • Price / move / disclosure│     │  • Diaspora family wallet   │
│  • Watchlist + rules        │     │  • Loans / SME books        │
│  • People / ownership maps  │     │  • Assistant (EN/Si)        │
│  • Postgres CSE truth       │     │  • Pay rails (MPGS/PayHere) │
│  • NFA market info          │     │  • Spend alerts (not CSE)   │
└─────────────────────────────┘     └─────────────────────────────┘
         ↑                                       ↑
         │         NO shared broker / CDS        │
         └─────────── gap to “invest” ───────────┘
```

| Capability | Chime | Ceyfi |
|---|---|---|
| CSE prices / disclosures | Yes (cse.lk → poller) | No |
| Price / disclosure **push** | Yes (Telegram) | No (spend alerts only) |
| Bank balances / wallet | No | Yes (demo + Seylan flags) |
| Payments / transfers | Fence: deferred | Yes (demo rails) |
| Place CSE orders | **No** | **No** |
| Portfolio / P&L | Fence: deferred | Bank buckets ≠ securities book |
| KYC / CDS account | No | No |

**Implication:** “Invest more easily with our alerts” cannot mean one-tap buy.
It means **shorten the decision loop**: notice → understand cash/risk → act
via existing brokerage.

---

## 2. North-star journey (what we’re actually building toward)

### Target user loop (honest)

```
1. User watches COMB on Chime (dash or Telegram)
2. Rule fires → Telegram: price crossed / disclosure landed (NFA)
3. Deep link → Chime symbol brief (what happened)
4. Optional: “Can I afford this?” → Ceyfi cash/wallet snapshot
5. User opens their broker / CDS participant and trades there
6. Later (Phase 4+): optional partner-broker handoff with explicit consent
```

### One-liner for marketing (safe)

> **Chime watches the CSE when you can’t. Ceyfi shows whether your rupees
> are ready. You still invest through your broker.**

Avoid: buy, sell, best stock, guaranteed, invest now from this alert.

---

## 3. Integration models (pick one spine)

| Model | Description | Effort | Reception |
|---|---|---|---|
| **A. Twin apps (recommended spine)** | Separate products; shared Ardeno account; deep links + optional “money context” API | Low–med | Best |
| **B. Shell hub** | `ardeno.app` launcher: Chime | Ceyfi modules; shared nav chrome | Med | OK if modules stay distinct |
| **C. Hard merge** | One Next app, one DB, one Telegram bot | High | Poor until execution exists |
| **D. Broker-assisted** | Chime alert → partner broker deep link / prefilled order ticket | High + legal | Strong *if* licensed partner exists |

**Recommendation:** **A → light B → optional D**. Never start with C.

---

## 4. Phased master plan

### Phase 0 — Narrative + fence (1 constitution PR, no product merge)

**Goal:** Align the team on what *not* to claim.

- [ ] Amend `CLAUDE.md` / factory fence: “Ceyfi link-up allowed; hard merge
      still deferred; no payments in Chime; no order entry.”
- [ ] Public wording pack: NFA + “not a broker” + “not Seylan IB.”
- [ ] Reception test: 5 CSE users + 3 diaspora users — show mock Telegram
      alert with Ceyfi CTA vs without; measure trust, not clicks only.
- [ ] Decide partner path: none | Seylan intro | named broker later.

**Exit:** Written “invest journey” that legal/compliance-minded readers accept.

---

### Phase 1 — Cross-links + shared identity (thin)

**Goal:** Same human can open both without confusion.

| Work | Chime | Ceyfi |
|---|---|---|
| Deep links | `chime…/symbols/X` from Telegram already | Add `ceyfi…/wallet` links from Chime “cash context” |
| Account bridge | Map `telegram_id` ↔ Ceyfi `user_id` / persona (opt-in) | Expose link-token or magic-link |
| UI | Settings: “Linked Ceyfi account” (optional) | Settings: “Linked Chime alerts” |
| Telegram | Keep **two bots** or one bot with `/market` vs `/wallet` namespaces | Prefer two bots until trust is high |

**Non-goals:** shared Postgres; wallet UI inside Chime; CSE data inside Ceyfi.

**Exit:** User with Telegram can link once and jump Chime ↔ Ceyfi in ≤2 taps.

---

### Phase 2 — “Can I act?” money context (the real invest assist)

**Goal:** After an alert, show **cash readiness**, not a trade ticket.

When a Chime alert fires (or user opens the fire history row):

1. Chime shows symbol + trigger + NFA (as today).
2. If Ceyfi linked: call a **read-only** Ceyfi snapshot  
   `GET /api/financial-snapshot/{user}` (already exists in Ceyfi).
3. Render a thin panel (Chime tokens, not Ceyfi green chrome):
   - Available wallet / liquid cash (demo or live)
   - Optional: FX note for diaspora
   - CTA: “Review cash in Ceyfi” (deep link) — **not** “Buy now”

**Data rules**

- Chime `web/` stays Postgres-only for CSE; Ceyfi call is server-side,
  user-consented, timeout-hard, never blocks alert delivery.
- Cache snapshot ≤ few minutes; never store full bank payloads longer than needed.
- If Ceyfi down → alert still delivers; panel shows “cash context unavailable.”

**Exit:** Alert → understand move → see whether cash exists → leave to broker.

---

### Phase 3 — Shared attention graph (research, still no orders)

**Goal:** Make Ardeno smarter without becoming Tracker Pro.

| Idea | Owner | Note |
|---|---|---|
| Watchlist sync | Chime truth → optional Ceyfi “watched names” chip | Read-only mirror |
| Disclosure → family impact | Chime disclosure on a watched symbol → Ceyfi note if wallet tagged to that family story | Soft, narrative |
| Scenario bridge | Ceyfi Scenario Lab shock × Chime “what moved today” | Demo-friendly; keep NFA |
| People / ownership | Stay Chime-only | Do not dump board graphs into bank UI |

**Exit:** One weekly “Ardeno brief” Telegram (optional subscribe): market pings
from Chime + cash health from Ceyfi — clearly sectioned.

---

### Phase 4 — Broker / CDS handoff (only with a partner)

**Goal:** Actually make investing *easier* — legally.

Prerequisites (human, not agent):

- Named licensed stockbroker or CDS participant agreement
- Explicit user consent + risk disclosure per order intent
- No Chime/Ceyfi holding client securities custody unless licensed

Possible shapes:

1. **Deep link prefill** — alert carries symbol + side hint → broker URL  
2. **Interest list** — “Notify my broker I care about COMB” (lead gen)  
3. **Full order API** — only inside partner app; Chime remains signal layer  

**Exit:** Measurable “alert → broker session” conversion with compliance pack.

---

### Phase 5 — Hard product merge (optional, late)

Only if Phases 1–3 win retention and Phase 4 has a partner:

- Single Ardeno shell, module federation or monorepo apps
- Unified design tokens (not green-on-Chime or ink-on-Ceyfi blindly)
- One billing relationship later (payments stay out of Chime until then)

Until then, **UI stealing** (already underway: StatCard, AlertBanner, etc.)
continues; **domain merge** does not.

---

## 5. Technical integration surfaces

| Surface | Approach | Risk |
|---|---|---|
| Identity | Opt-in link: `telegram_id` ↔ Ceyfi user; signed link tokens | Account takeover if secret weak |
| Alerts | Chime owns CSE fires; Ceyfi owns spend fires; never mix copy | Confused users |
| Snapshot API | Ceyfi read-only; Chime BFF proxies with user token | PII in logs |
| Telegram | Two bots, or one bot with hard command namespaces | Support burden |
| Design | Keep Chime ink / Ceyfi green separate; shared primitives OK | Brand mud |
| Data | No shared CSE poller into Ceyfi; no Seylan secrets in Chime | Scope creep / ToS |
| Compliance | NFA on every price path; no “invest” verb on alert buttons | Regulatory |

### Suggested contract (Phase 2)

```http
GET /v1/link/cash-context
Authorization: Bearer <user-link-token>
→ {
  "as_of": "ISO-8601",
  "currency": "LKR",
  "liquid_estimate": 125000.0,
  "wallet_label": "Family wallet",
  "deep_link": "https://ceyfi…/wallet",
  "disclaimer": "Banking snapshot — not investment advice."
}
```

Chime renders; never invents affordability scores that look like buy ratings.

---

## 6. What “invest more easily” means per phase

| Phase | User-facing meaning |
|---|---|
| 0–1 | Find the alert and the cash app without hunting |
| 2 | Know if you have dry powder when the alert fires |
| 3 | See market + money in one weekly brief |
| 4 | Jump toward a real broker ticket with less typing |
| 5 | One Ardeno home (optional) |

If Phase 4 never happens, Phases 1–3 still create a coherent Ardeno story.

---

## 7. Explicit non-goals (keep the fence)

- Placing CSE buy/sell orders inside Chime or Ceyfi without a license
- Portfolio quantities / P&L as a reason to merge (Chime deferred; Ceyfi ≠ CDS book)
- Scraping csetracker or any competitor
- Turning Chime dash into a bank sidebar (steal sheet already forbids wallet chrome)
- AI “buy recommendations” from disclosure briefs
- Payments inside Chime before push reliability is boring

---

## 8. Success metrics (only after unlock)

| Metric | Target sense |
|---|---|
| Alert delivery success | Stay #1 — never regress for Ceyfi work |
| Link rate | % of Chime users who opt into Ceyfi link |
| Context attach rate | % of fires that successfully show cash panel |
| Trust survey | “This felt like a sales push” ≤ low double digits |
| Broker handoff (Phase 4) | Alert → broker session (partner-defined) |

Vanity: “one Super App.” Ignore.

---

## 9. Decision gate (human)

Unlock implementation only when all are true:

1. [ ] Reception test (Phase 0) does not tank trust  
2. [ ] Wording pack approved (NFA + not a broker)  
3. [ ] Phase spine chosen: **A (twin apps)** unless overridden  
4. [ ] Owner named for Ceyfi snapshot auth + secrets  
5. [ ] Chime factory still treats hard merge as deferred  

Until then: continue **UI ports** and **Chime-only** reliability; this doc is
the roadmap, not a build ticket.

---

## 10. Appendix — why the GitHub one-liner misleads for CSE

Ceyfi README: *“AI-powered banking for Sri Lanka: diaspora wallets, voice
assistant, loan health, and SME bookkeeping.”*

That is adjacent to **funding** investing, not **doing** investing. Chime is
the CSE attention layer. The join is **attention + affordability**, then a
**licensed execution** partner — or stop at affordability and still win.
