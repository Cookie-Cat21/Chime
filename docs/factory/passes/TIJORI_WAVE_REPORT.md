# Tijori CSE — Waves 1–75 report

**Branch:** `cursor/tijori-cse-phase1-e44e`  
**Date:** 2026-07-13  
**Plan:** [TIJORI_CSE_PLAN.md](../TIJORI_CSE_PLAN.md)  
**Ops:** [docs/runbooks/TIJORI.md](../../runbooks/TIJORI.md)  
**Range:** `a802cb7` … wave 75 (post-100% harden → soft ~100)

---

## Parallelism honesty (wave 12)

This Tijori multi-wave was **not** “1000 concurrent agents × 100 empty loops.” Actual shape:

- **~15 max-width waves** of bounded parallel agents (disjoint `OWNED_FILES` per lane; factory soft caps still apply unless a wave explicitly raised them).
- **~100+ agent tasks** across the scoped `wave` / `waveN` / `wN` inventory below — real commits that ship code, tests, or docs, not empty improve-loop iterations.
- **Quality-gated:** one concern per commit; stop when gates are green / two passes find nothing above minor — no always-on swarm or commit farming.
- **Wave 14+:** continue the same bounded improve loop toward a soft ~100 quality-gated loop horizon (discover → implement → test → fix → re-test). Not empty concurrency theater; early STOP still wins when CLEAN×2.

Matches the plan constraint note in [TIJORI_CSE_PLAN.md](../TIJORI_CSE_PLAN.md). Treat any “1000×100” framing as aspiration rhetoric, not an execution log.

---

## Verdict

Phase 1 foundations and Phase 2 Tijori-core plumbing are **landed** across waves 1–5. Waves 6–7 add sectors browse, storage/SQL harden, retention/sectors coverage, Groq provider, disclosure baseline watermark, and briefs PDF grace / late follow-up sweep. Waves 8–9 add OpenRouter provider, brief drain pacing, market UX/a11y polish, adversarial grace/storage close, env-example completeness, storage brief-method coverage, and a Phase 3 scenario stub fence (`AI_SCENARIOS_ENABLED=0`). Wave 10 hardens briefs ops (smoke, rate limits, CDN requeue, poller/disclosure coverage) and audits poll↔brief advisory locks as a non-issue. Wave 11 aligns `/brief` empty-state test copy with AI-off messaging. Wave 12 records parallelism honesty (plus follow-on fix/docs/test lanes). Wave 13 closes browse API examples, env sync, Telegram/dash URL egress caps, web adversarial harden, and coverage pushes (migrate / storage / CSE / poller / bot). Wave 14 ships coverage/harden lanes (web regress, health/circuit, config/migrate, main, rules format fuzz, worker) plus fail-closed non-finite float env knobs. Wave 15 adds `make tijori-report`, briefs extra-install docs, help-budget / web movers / briefs / residual coverage, and ops-knob harden. **Wave 16 milestone:** full-package `pytest --cov=chime` at **100%** (3427 stmts / 0 miss) — coverage ratchet complete; post-milestone CSE pacing, brief egress, NFA chrome, and integration-collect harden. **Wave 17** closes post-100% harden (loop status, storage NaN defense, CSE pace concurrency, login a11y, factory verify, health proxy timeout, DL/`myalerts`/lease floor, finite price egress). **Wave 18** hardens dash/ops (brief-queue health UI, category cancel, watchlist duplicate soft flag, sparkline finite filter, category confirm / history egress / nested health). **Wave 19** documents dash CSRF, aligns `/unwatch` copy, adds dash disclosure category, and hardens history/watchlist/browse egress. **Wave 20** advances loop status + report, START browse note, and cancel-id / category-read / dash egress harden. **Wave 21** hardens alerts history/list/forms symbol filters (`normalizeSymbol` / `invalid_symbol`), disclosure SafeInteger ids, and logout hard-redirect UX. **Wave 22** pushes loop status + symbol not-found Browse link (late sectors/alerts/health egress pin). **Wave 23** hardens sectors/health/browse egress + safe ids and rolls the report. **Wave 24** points `/market` empty state at `make tick` / poller seed (late history/watchlist/login SafeInteger pin). **Wave 25** hard-redirects mid-use 401 / missing CSRF to `/login?expired=1` and pins egress harden. **Wave 26** advances loop status (late mapRule/alerts/watchlist fail-closed pin). **Wave 27** hardens toIso/delivery/SafeInteger egress and rolls the report. **Wave 28** restores web `tsc` (`BigInt()` / sanitize string guards) + loop status (late sector ids / browse limits / toIso / session pin). **Wave 29** hardens demo auth telegram_id / allowlist via digits-only `toSafePositiveInt`. **Wave 30** keeps alert-form disclosure category a11y (`aria-describedby` / maxLength / `aria-busy`) (late symbol/health/nav fail-closed pin). **Wave 31** rolls the report (late session exp/sid / market numbers / health timeout / labels pin). **Wave 32** advances loop status + hardens `toFiniteNumber` / health SafeInt / alert thresholds. **Wave 33** resolves AppNav active state for `/scenarios` (longest-prefix) (late session/CSRF token caps + health body bound). **Wave 34** extends loading NFA chrome to browse/health/symbol shells (late history pagination / strict booleans / client finite). **Wave 35** hardens SSRF host / session mint / CSRF+symbol decode / formatTs. **Wave 36** advances loop status + hardens SSR loopback / HEALTH_URL SSRF / JSON body / CSRF path. **Wave 37** gates `apiMutate` to `/api/v1/*` and fails closed NavSession `/me` timestamps/CSRF. **Wave 38** bounds SSR fetch timeout/body and caps alert thresholds. **Wave 39** hardens `/me` parse, cancel id, session TTL, threshold, and SSR bounds. **Wave 40** pins SSR origin / HEALTH_URL / JSON body / CSRF path. **Wave 41** advances loop status + caps CSRF cookie / mapRule threshold / SSR Content-Length early-reject. **Wave 42** caps `jsonError` egress + pins SSR Cookie/CT/CL. **Wave 43** centralizes session/CSRF cookie Secure+SameSite helpers. **Wave 44** caps mapRule thresholds (parity GET `/alerts`). **Wave 45** bounds client mutate/login/NavSession, gates Unwatch, fail-closed SYMBOL_RE egress. **Wave 46** advances loop status + SYMBOL_RE page egress / health watched+CL. **Wave 47** early-rejects client Content-Length before body allocate. **Wave 48** aligns alerts empty CTAs with Browse + sectors SYMBOL_RE / SSR statusText / client CL. **Wave 49** sanitizes sparkline timestamps + pins circuit/sectors. **Wave 50** caps toast/inline copy, fail-closes format digits, bounds sparkline series, and appends the 46–50 rollup. **Wave 51** advances loop status + fail-closes bounded-reader `maxBytes`. **Wave 52** bounds GET `/alerts`/`/watchlist` SQL LIMITs + toast tone/timers + demo allowlist. **Wave 53** stream-bounds response bodies (`readBoundedResponseText`) so missing/understated Content-Length cannot bypass allocate caps. **Wave 54** fail-closes sanitize `maxLen`, caps EmptyState titles, typeof-guards InlineError, clamps skeleton rows, and caps page list parsers. **Wave 55** fail-closes format abs-caps + `alertTypeLabel` typeof and appends the 51–55 rollup. **Wave 56** advances loop status + fail-closed brief/PDF max caps. **Wave 57** typeof/length-caps API path/nav/CSRF. **Wave 58** history pagination a11y + threshold/sanitize. **Wave 59** sparkline abs-cap + toIso range. **Wave 60** toFiniteNumber abs-cap + report. **Wave 61** advances loop status + body abs-cap / formatTs range / session+category typeof. **Wave 62** bot threshold abs-cap + HEALTH_URL typeof. **Wave 63** sparkline/stale ts range + attempt cap. **Wave 64** health age range + dash auth env. **Wave 65** filing URL isinstance + notify symbol + mint secret. **Wave 66** advances loop status + pins briefs/scenarios/bot env + list isinstance. **Wave 67** bot/poller/storage/brief env isinstance. **Wave 68** brief prompt / resolve / alert parse / storage symbol isinstance. **Wave 69** isinstance/typeof fail-closed + price/log + env typeof. **Wave 70** config/poller/guardrails/browse/session + disclosure/DoA/sanitize guards. **Wave 71** advances loop status + wave67 pin import hygiene. **Wave 72** pins cancel/brief/CSE/persist isinstance/typeof fail-closed. **Wave 73** adds layout viewport meta and broad state/CSE/web fail-closed guards. **Wave 74** pins rule.type getattr + stock-name/board persist guards. **Wave 75** appends this rollup toward soft ~100 — not cov gap-fill. Live LLM briefs remain **flag/key gated** (`AI_BRIEFS_ENABLED=0` default; `AI_PROVIDER=gemini|groq|openrouter`). Phase 3 scenario AI is **stub only** — no LLM wiring yet.

| Track | Status |
|---|---|
| Phase 1 foundations | ✅ done |
| Phase 2 Tijori core | ◐ mostly done — live LLM still off until keyed |
| Phase 3 scenario AI | ◐ stub fence only (`AI_SCENARIOS_ENABLED=0`) |
| `chime` unit coverage | ✅ **100%** (wave 16 milestone) |
| Improve-loop / CI on touched paths | ongoing — wave 75 post-100% harden → soft ~100 loops |

---

## Wave 1 — Phase 1 foundations + PDF enrich kickoff

**Theme:** Market-wide persist, thin browse, briefs schema/stub, legacy PDF URL enrich.

| SHA | Commit |
|---|---|
| `a802cb7` | fix(tijori): phase1 market persist + browse; harden empty-watchlist health |
| `447a74b` | perf(wave): batch market snapshot persist |
| `04d5931` | test(wave): market persist browse coverage |
| `cc3b503` | feat(wave): enqueue disclosure_briefs rows |
| `03f3917` | fix(wave): harden market browse q/LIKE, a11y, fence |
| `6e1137d` | fix(wave): document symbols GET as session-only (no CSRF) |
| `dbbf262` | test(wave): regress symbols CSRF exemption and error disclosure |
| `5517988` | feat(wave): legacy PDF URL enrichment |
| `b3d9ae0` | fix(wave): harden market persist health and snapshot dedupe |
| `ac648c6` | docs(wave): tijori plan wave log |

**Shipped**

- Full `tradeSummary` → `stocks` + `price_snapshots`; empty watchlist still persists (no rule fires).
- Batch snapshot persist; market health / snapshot dedupe harden.
- `GET /api/v1/symbols` + `/market` Browse (session-only GET; CSRF documented).
- Browse harden (`q`/LIKE, a11y, dash fence — no cse.lk from `web/`).
- `pdf_url` + `disclosure_briefs` schema; `chime/briefs/` stub (`AI_BRIEFS_ENABLED=0`).
- Enqueue `disclosure_briefs` on new disclosures.
- Legacy `POST /announcements` → CDN `pdf_url` enrichment.
- Tests: market persist / browse / symbols CSRF regression.

---

## Wave 2 — Phase 2 surface + ops

**Theme:** Ops runbook, optional brief-in-alert, bulk feed, category filter, dash brief/pdf fields, harden.

| SHA | Commit |
|---|---|
| `07b1f82` | docs(wave2): tijori ops enablement |
| `365543c` | feat(wave2): optional brief in alert message |
| `07ebae4` | feat(wave2): optional bulk disclosure feed |
| `90a76e0` | fix(wave2): drop accidental category bleed from bulk feed |
| `a8b4e10` | test(wave2): briefs pdf integration coverage |
| `1d02d3a` | feat(wave2): disclosure category filter |
| `3d45cbe` | feat(wave2): dash disclosure brief+pdf fields |
| `d793a30` | fix(wave2): harden alert parse and disclosure gating |
| `77c4dc0` | fix(wave2): harden legacy PDF enrichment against SSRF and rate gaps |

**Shipped**

- Tijori ops enablement (`docs/runbooks/TIJORI.md`).
- Optional brief text on disclosure Telegram when ready at claim time.
- Optional `DISCLOSURE_BULK_FEED` (no category bleed into bulk path).
- `/alert SYMBOL disclosure [CATEGORY]` filter.
- Dash disclosure API/UI: `brief` + `pdf_url`.
- Legacy PDF enrich SSRF allowlist + rate-gap harden.
- Alert parse / disclosure gating harden; briefs/PDF integration tests.

---

## Wave 3 — Gemini stub + Telegram attach

**Theme:** Provider stub, attach ready brief on push, health hint, XSS egress, coverage.

| SHA | Commit |
|---|---|
| `c70c00c` | fix(wave3): align bot threshold error assertion with finite check |
| `aa8dfd8` | docs(wave3): sync bulk feed ops docs |
| `388d0ca` | fix(wave3): lint type sweep |
| `68608a7` | test(wave3): migration 005 006 presence |
| `722f00e` | test(wave3): alert parse edge coverage |
| `de45bb4` | fix(wave3): harden disclosure brief/pdf egress against XSS |
| `1202399` | feat(wave3): health brief queue hint |
| `6891df4` | feat(wave3): attach ready brief to disclosure Telegram and push |
| `0b22246` | feat(wave3): gemini brief provider stub |

**Shipped**

- Gemini brief provider stub (`chime/briefs/provider.py`).
- Attach ready brief to disclosure Telegram at alert claim.
- Health brief-queue hint.
- Dash brief/pdf egress XSS harden.
- Migrations 005/006 presence tests; alert-parse edge coverage.
- Bulk-feed ops docs sync; lint/type sweep.

---

## Wave 4 — PDF extract + follow-up + browse polish

**Theme:** PDF text extract, brief-ready follow-up notify, movers, shutdown-safe drain, provider harden.

| SHA | Commit |
|---|---|
| `ded9ef4` | chore(wave4): env example parity |
| `18fa33e` | feat(wave4): thin movers endpoint push |
| `c090a5f` | fix(wave4): poller shutdown briefs push |
| `0e45991` | feat(wave4): pdf text extract for briefs push |
| `2c4fb6a` | feat(wave4): brief follow-up Telegram when ready after alert |
| `5cd424e` | feat(wave4): wire brief-ready follow-up notify in worker |
| `e5b9155` | fix(wave4): brief provider harden |
| `8af85da` | fix(wave4): post-wave consistency |
| `49e5c0b` | docs(wave4): plan progress checklist |

**Shipped**

- `.env.example` parity for Tijori flags.
- Thin `GET /api/v1/market/movers` + `/market` top-movers strip.
- Poller shutdown-safe briefs push.
- PDF text extract (`chime/briefs/extract.py`) + worker drain.
- Brief follow-up Telegram via `claim_pending_briefs(..., notify=)` when ready after primary alert.
- Worker wiring for brief-ready notify; provider harden (timeouts / empty candidates).
- Post-wave consistency + plan progress checklist.

---

## Wave 5 — Wave report + Tijori surface polish

**Theme:** Wave rollup, bot copy, briefs coverage, optional retention/sectors ingest, movers/follow-up harden.

| SHA | Commit |
|---|---|
| `67ee2cf` | docs(wave5): wave report |
| `1240f80` | feat(wave5): bot copy tijori surfaces push |
| `0c075d9` | test(wave5): briefs extract provider coverage |
| `81d7dc4` | feat(wave5): optional non-watchlist snapshot retention |
| `a45b306` | fix(wave5): movers harden push |
| `44bbc3a` | feat(wave5): optional sectors ingest |
| `2e4514e` | fix(wave5): brief followup idempotency push |

**Shipped**

- Initial `TIJORI_WAVE_REPORT.md` rollup (waves 1–4).
- Bot copy for Tijori surfaces; briefs extract/provider coverage.
- Optional non-watchlist snapshot retention; optional sectors ingest.
- Movers harden; brief follow-up idempotency.

---

## Wave 6 — Sectors browse + harden + coverage

**Theme:** Seed/browse docs, sectors UI, follow-up isolation, SQL harden, CI, retention/sectors tests, adversarial briefs/PDF sweep.

| SHA | Commit |
|---|---|
| `46cb49e` | docs(wave6): seed browse via tick --force |
| `74473fe` | feat(wave6): sectors browse surface |
| `29d923b` | test(wave6): followup key isolation |
| `4da7397` | chore(wave6): dead code cleanup |
| `18a1969` | fix(wave6): storage sql harden push |
| `c2cca70` | fix(wave6): ci |
| `1bd98be` | test(wave6): retention sectors poller coverage |
| `02d4d59` | fix(wave6): adversarial sweep |

**Shipped**

- Ops/docs: seed browse via `tick --force` (Makefile / README / TIJORI runbook).
- `/market` sectors browse surface.
- Follow-up key isolation tests; dead-code cleanup.
- Parameterized UNNEST inserts for market snapshots + sectors (no f-string VALUES).
- CI: fence tokens, sectors route pins, dash_smoke + migrate 007/008 notes.
- Retention log + `SECTORS_INGEST` fail-soft poller coverage.
- Adversarial harden: honor `SendResult` on brief follow-up; reject CDN PDF redirects / non-200; primary-alert + paragraph-bounded brief skip; PDF page/char caps; batch retention deletes; `processing` `brief_status` in dash egress.

---

## Wave 7 — Assert harden + Groq + briefs grace

**Theme:** Flake-proof retention/sectors asserts; Groq provider; disclosure baseline; PDF grace / late follow-up / env harden; wave report append.

| SHA | Commit |
|---|---|
| `c016b06` | fix(wave7): assert retention/sectors via mocks not stdout logs |
| `a3ae6e4` | docs(wave7): makefile readme tijori pointers |
| `76bfce4` | docs(wave7): wave report append |
| `af4ad49` | test(wave7): alert parse fuzz |
| `75b8dc9` | feat(wave7): groq brief provider |
| `c0d5d60` | test(wave7): disclosure baseline push |
| `c483c83` | fix(wave7): briefs PDF grace, late follow-up sweep, env harden |

**Shipped**

- Retention/sectors tests assert via mocks (not `capsys` stdout logs) to avoid full-suite capture flakes.
- Makefile / README Tijori pointers; `TIJORI_WAVE_REPORT.md` waves 6–7 append.
- Alert-parse fuzz coverage; disclosure create-watermark baseline (no historical flood).
- `AI_PROVIDER=groq` OpenAI-compatible chat path (+ httpx-mocked coverage).
- Briefs PDF grace (wait for `pdf_url` before title-only summarize), late follow-up retry after primary delivery, promote recent skipped rows when AI enabled, soft-parse `BriefSettings`, aclose owned providers after drain.

---

## Wave 8 — OpenRouter + pacing + adversarial close

**Theme:** OpenRouter provider, brief drain pacing, market UX polish, grace/storage adversarial close, docs.

| SHA | Commit |
|---|---|
| `8bf12b0` | docs(wave8): third party pypdf |
| `8b5e28a` | docs(wave8): claude status tijori |
| `f854cb2` | feat(wave8): market UX polish |
| `371c72a` | test(wave8): poller brief pdf coverage |
| `cb6bad8` | feat(wave8): brief drain pacing |
| `6539563` | feat(wave8): openrouter brief provider |
| `bd61382` | fix(wave8): briefs grace, late follow-up, groq defaults |
| `e264242` | docs(wave8): mention openrouter in BriefSettings |
| `78f536d` | fix(wave8): storage grace + follow-up sweep starvation |

**Shipped**

- Third-party `pypdf` note; CLAUDE.md Tijori status; OpenRouter in `BriefSettings` docs.
- `/market` movers **Watch** links + “Add via watchlist” note (no inline watch POST).
- Poller brief/PDF fail-soft coverage (worker errors, cancel re-raise, enrich edge cases).
- `AI_BRIEF_SLEEP_SECONDS` pacing between consecutive LLM drain calls.
- `AI_PROVIDER=openrouter` OpenAI-compatible path (+ soft-default model when unset).
- Adversarial close: grace keyed off `updated_at` (promote-safe); reject empty `pdf_url`; late follow-up sweep only ready briefs missing a follow-up row (oldest-first); Groq soft-default model; list content-part parse.

---

## Wave 9 — Format, env docs, scenario stub, coverage, a11y

**Theme:** Ruff format; complete `.env.example`; scenario AI stub fence; storage brief-method coverage; market a11y; wave report refresh.

| SHA | Commit |
|---|---|
| `d46e3ea` | style(wave9): ruff format chime and tests |
| `b67c559` | chore(wave9): env example complete |
| `9530172` | docs(wave9): wave report refresh |
| `b438154` | feat(wave9): scenario AI stub fence |
| `f652f9d` | test(wave9): storage brief methods coverage |
| `6be6430` | fix(wave9): market a11y push |
| _(this)_ | docs(wave9): wave report refresh |

**Shipped**

- `ruff format` over `chime/` and related tests (style-only).
- Root + `web/.env.example`: remaining `Settings` knobs (`HTTP_TIMEOUT_SECONDS`, `MARKET_*`) and annotated `BriefSettings` AI/PDF/BRIEF flags.
- `chime/scenarios/` stub gated by `AI_SCENARIOS_ENABLED=0` with NFA guardrails (reject buy/sell language); no LLM wiring.
- Unit coverage for claim/list/mark/count/promote brief storage paths.
- `/market` a11y: merged movers symbol+Watch labelled link; list headings via `aria-labelledby`; sectors empty/truncation + change-direction cues.
- `TIJORI_WAVE_REPORT.md` — waves 8–9 inventory + updated totals.

---

## Wave 10 — Smoke, harden, coverage, lock audit

**Theme:** Tijori smoke; API contract sync; brief rate limit; advisory-lock audit; poller/disclosure coverage; CDN requeue + `/brief` egress + scenario fence.

| SHA | Commit |
|---|---|
| `35b1b97` | chore(wave10): tijori smoke script |
| `821bbbb` | docs(wave10): contract sync |
| `c251b00` | chore(wave10): clear todos |
| `aa87ed9` | fix/test(wave10): brief rate limit push |
| `303ffbc` | docs(wave10): defer poll/brief advisory lock deadlock |
| `c6eb42f` | test(wave10): disclosure rules fuzz push |
| `0070ea1` | test(wave10): poller coverage push |
| `cd5b5f3` | fix(wave10): brief CDN requeue, /brief egress, scenario fence |

**Shipped**

- Tijori smoke script; API contract sync; drop leftover Phase-1 stub naming in briefs worker/docs.
- `/brief` behind the same per-user cmd rate limit as other handlers (+ shared-budget / structural gate tests).
- Audit: poll `4_201_337` (session try) vs brief-cap `4_201_339` (xact) — **no deadlock**; pin `BRIEF_CAP_LOCK_ID` + docs ([ADVISORY_LOCK_DEADLOCK.md](ADVISORY_LOCK_D