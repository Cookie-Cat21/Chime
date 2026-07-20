/**
 * In-app Help copy — glossary, how-it-works, and calculation explainers.
 * Keep NFA-safe: facts and mechanics only; never buy/sell / “best to invest”.
 */

export type HelpFaqItem = {
  question: string;
  /** Plain text; use blank lines (`\\n\\n`) for separate paragraphs. */
  answer: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  items: readonly HelpFaqItem[];
};

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "getting-started",
    title: "Getting started",
    summary: "What koel is, how the dash and Telegram fit together.",
    items: [
      {
        question: "What is koel?",
        answer:
          "koel is a Colombo Stock Exchange (CSE) dashboard for browsing symbols, watching what you care about, and managing alert rules — with Telegram push when something fires.\n\nThe web app is the daily surface. Telegram is how you hear the market when the browser is closed. Neither is investment advice.",
      },
      {
        question: "Cake vs cherry — dash vs Telegram?",
        answer:
          "Cake = the dashboard (browse, watchlist, alerts, scores, health). Cherry = Telegram push when a rule fires.\n\nSame Postgres truth for both. Creating an alert in the dash also puts the symbol on your watchlist so the poller keeps snapshots for it.",
      },
      {
        question: "Watchlist vs alerts vs history?",
        answer:
          "Watchlist = symbols you follow (prices and disclosures koel keeps fresh).\n\nAlerts = active rules (price cross, daily move, disclosure, volume, and more). History = past fires that koel already sent or recorded.\n\nExample: add JKH.N0000 to Watchlist to track it; create “JKH.N0000 above 200” under Alerts to get a Telegram ping when that cross happens.",
      },
      {
        question: "Does the dashboard call cse.lk live?",
        answer:
          "No. The dash reads Postgres only. A separate poller fetches CSE JSON during market hours and writes snapshots. If data looks stale, check Health — not your browser network tab for cse.lk.",
      },
    ],
  },
  {
    id: "prices",
    title: "Prices & market fields",
    summary: "Last price, change %, volume, sparklines, and freshness.",
    items: [
      {
        question: "What do price, change, and change % mean?",
        answer:
          "Price is the latest last-traded price koel stored for that symbol.\n\nChange is absolute move vs previous close (same units as price). Change % is that move as a percent of previous close.\n\nExample: previous close 100.00, last 102.50 → change +2.50, change % +2.50%. If CSE omits change %, koel may derive it as (price − previous_close) / previous_close × 100.",
      },
      {
        question: "What is volume?",
        answer:
          "Shares traded in the session (or latest snapshot window koel stored). Volume alerts compare current volume to a recent average — see Alert types.",
      },
      {
        question: "What does the sparkline show?",
        answer:
          "A short price-over-time sketch from stored snapshots or daily bars — not a full technical-analysis chart suite. Use it to see recent path shape, not as a trading signal.",
      },
      {
        question: "Why is a quote missing or stale?",
        answer:
          "Common causes: symbol not on any watchlist (poller only persists watched names for some paths), market closed, poller idle outside 09:30–14:30 Asia/Colombo weekdays, or a CSE fetch failure.\n\nOpen Health for poller status and snapshot age. Symbol pages also show data-quality notices when rows are empty or old.",
      },
    ],
  },
  {
    id: "alerts",
    title: "How alerts work",
    summary: "Crossing, armed / re-arm, daily limits, mute, quiet hours.",
    items: [
      {
        question: "Do price alerts fire if the price is already past my level?",
        answer:
          "No — price above/below rules fire on a cross (transition), not on “currently above.”\n\nExample: rule “above 100.” Price path 99 → 100.5 fires once. If you create the rule while price is already 105, it does not fire until price goes below 100 and later crosses back up through 100.",
      },
      {
        question: "What does Armed mean?",
        answer:
          "Armed means the rule is ready to fire on the next valid cross. After a price above/below fire, koel disarms the rule so it does not spam every tick while price stays on that side.\n\nIt re-arms when price moves back to the other side of the threshold (a silent “rearm” event — not a Telegram push).",
      },
      {
        question: "How does Daily move work?",
        answer:
          "Daily move fires when the absolute daily % move (|change %|) reaches or crosses your threshold. koel uses CSE change % when present, otherwise derives % from previous close.\n\nAt most one fire per Colombo calendar day per rule (not UTC midnight).\n\nExample: threshold 5 — a day that goes +5.2% or −5.2% can fire once that Colombo day.",
      },
      {
        question: "When do disclosure alerts fire?",
        answer:
          "Only for filings koel sees with a published time at or after you created the rule — older archive rows do not back-fire. Filings missing a usable published time do not fire.\n\nOptional category filters narrow which announcement types count. You need an explicit disclosure rule; watching a symbol alone does not push every filing.",
      },
      {
        question: "Mute, quiet hours, digest, quota?",
        answer:
          "Mute pauses Telegram fires for one rule until a time you set. Quiet hours (Settings) hold pushes overnight in Asia/Colombo and can deliver a digest instead. Digest batches overnight activity.\n\nAlert quota caps how many active rules you can keep — Settings shows your limit. Test fire runs a dry-run style check from the dash without pretending to be a live market cross.",
      },
      {
        question: "Can I set the same alerts in Telegram?",
        answer:
          "Yes. Bot commands mirror the dash for core types — e.g. /alert JKH.N0000 above 200, /alert JKH.N0000 move 5, /alert JKH.N0000 disclosure. Full command list: /help in Telegram. See also the Telegram topic below.",
      },
    ],
  },
  {
    id: "alert-types",
    title: "Alert types & examples",
    summary: "What each rule type measures and a concrete example.",
    items: [
      {
        question: "Above / Below (price cross)",
        answer:
          "Fires when last price crosses your level from the other side (see Armed).\n\nExample: Below 45 on ABC.N0000 — path 45.20 → 44.90 fires; staying at 44.50 does not re-fire until re-armed above 45.",
      },
      {
        question: "Daily move",
        answer:
          "|change %| vs previous close reaches your percent threshold; one fire per Colombo day.\n\nExample: move 3 on LOLC.N0000 when the day is +3.1% or −3.1%.",
      },
      {
        question: "Disclosure",
        answer:
          "New CSE announcement for the symbol after the rule was created (optional category).\n\nExample: disclosure on COMB.N0000 with category filter for financial results.",
      },
      {
        question: "Volume spike / up / down",
        answer:
          "Current volume ≥ your multiple × recent average volume. Volume up/down also care about price direction that day.\n\nExample: volume spike 3 — today’s volume at least 3× the recent average.",
      },
      {
        question: "Crossing volume & big print",
        answer:
          "Crossing volume: notable volume threshold crossed for the symbol. Big print: a single trade/print size at or above your share count.\n\nThese are activity signals from stored trade/volume fields — not a recommendation to trade.",
      },
      {
        question: "Gap",
        answer:
          "Fires when |open − previous_close| / previous_close × 100 reaches your percent.\n\nExample: gap 2 — open is at least 2% away from prior close.",
      },
      {
        question: "Buy-in, non-compliance, halt",
        answer:
          "Notice-board style rules. Buy-in and non-compliance are per symbol; halt can be market-wide (MARKET).\n\nThey fire when koel ingests matching CSE notices — informational only.",
      },
      {
        question: "Bid-heavy / ask-heavy book",
        answer:
          "Order-book pressure heuristics: bid side (or ask side) looks heavy vs your threshold multiple.\n\nExample: bidheavy 2 — bid interest at least about 2× the ask side by koel’s stored book snapshot.",
      },
      {
        question: "EPS / revenue / profit YoY filing metrics",
        answer:
          "Optional rules that compare extracted filing metrics (EPS, revenue YoY, profit YoY) to a threshold. Live fire needs metrics flags enabled in the deployment.\n\nExample: “EPS YoY above 10” when a filing’s extracted YoY EPS % clears +10.",
      },
      {
        question: "Market Appetite, foreign flow, book pressure, USD/LKR, oil",
        answer:
          "Regime-style MARKET rules. Appetite band fires when the composite appetite score enters bands you care about. Foreign flow / book pressure / USD/LKR / oil move use stored macro or market aggregates — research bridges, not tips.\n\nExample: appetite alert when the meter enters “strong appetite” or “extreme caution.”",
      },
      {
        question: "XD soon / XD digest",
        answer:
          "Dividend calendar helpers: ping when an ex-dividend date is approaching, or a digest of upcoming XD events koel already stored from CSE disclosures.\n\nAlways verify the CSE announcement before acting on dates.",
      },
    ],
  },
  {
    id: "signals",
    title: "Signal Board",
    summary: "Research scores (−100…100), reasons, Spoke vs Silent.",
    items: [
      {
        question: "What is a research score?",
        answer:
          "A transparent composite from daily path data (and optional filing / peer / notice factors), clamped to about −100…100. Model version labels like path_v5 tell you which factor set was used.\n\nHigher score ≠ buy. Lower score ≠ sell. Scores are research diagnostics with explainable reason lines — never “best to invest” language.",
      },
      {
        question: "How is the score calculated (path_v5 gist)?",
        answer:
          "Needs at least 5 daily bars. Momentum blends 5-day, 20-day, and 60-day returns (roughly 40 / 35 / 25 weight). koel subtracts a volatility penalty, then adds smaller terms for liquidity, volume regime, turnover, filing YoY / disclosure activity, sector relative strength, notices, and rank stability when those inputs exist.\n\nThe raw sum is clamped to [−100, 100]. Missing optional factors simply contribute zero — they do not invent data.",
      },
      {
        question: "What are reasons and rank Δ?",
        answer:
          "Reasons are short, guardrailed explanations of the largest factor contributions (safe wording only).\n\nRank is position on the board that day; rank Δ is change vs the prior board date (positive = moved up the list). Rank moves are not tips.",
      },
      {
        question: "Spoke vs Silent / forecast gates?",
        answer:
          "Spoke means a selective forecast overlay cleared koel’s gates for that row. Silent means no selective forecast is shown — the research score can still appear.\n\nGates are quality filters, not buy/sell calls. Confidence bands describe model self-checks, not guaranteed outcomes.",
      },
    ],
  },
  {
    id: "appetite",
    title: "Market Appetite",
    summary: "0–100 session mood proxy and band labels.",
    items: [
      {
        question: "What does Appetite measure?",
        answer:
          "A daily research composite (0–100) for how “risk-on” the CSE tape looks from breadth, move intensity, ASPI day change, and participation. It is a mood proxy — not a recommendation to buy or sell anything.",
      },
      {
        question: "How is the score calculated?",
        answer:
          "Weighted blend of four 0–100 component scores:\n\n• Breadth 40% — share of names with positive daily change %\n• Intensity 25% — among names moving at least ~2%, share that are up\n• Index 20% — ASPI daily change % mapped so about −3% → 0, 0% → 50, +3% → 100\n• Participation 15% — turnover/volume participation vs recent history (z-score style), with simpler fallbacks when history is thin\n\nExample: breadth 60, intensity 55, index 50, participation 40 → 0.40×60 + 0.25×55 + 0.20×50 + 0.15×40 = 53.75.",
      },
      {
        question: "What do the bands mean?",
        answer:
          "Bands are labels on the 0–100 score:\n\n• under 20 — extreme caution\n• 20–40 — caution\n• 40–60 — neutral\n• 60–80 — appetite\n• 80+ — strong appetite\n\nLabels describe the meter, not what you should trade.",
      },
      {
        question: "CSE vs hybrid research series?",
        answer:
          "The Appetite page can show a CSE-truth history and a longer hybrid research series (extra history for charts). Treat hybrid as research context; headline session mood prefers CSE-backed days when available.",
      },
    ],
  },
  {
    id: "disclosures",
    title: "Disclosures & briefs",
    summary: "Filings, PDFs, categories, and AI brief status.",
    items: [
      {
        question: "Where do disclosures come from?",
        answer:
          "CSE announcement JSON the poller stores (preferred: per-company feed for watchlist symbols; also market-wide approved announcements). Titles, URLs/PDFs, and published times are what koel shows on symbol pages and in alert pushes.",
      },
      {
        question: "What about AI briefs?",
        answer:
          "Some deployments can attach a short filing brief (status shown on the row). Live AI generation is flag- and key-gated and may be off by default. A missing brief is normal — the source PDF/link remains the authority.",
      },
      {
        question: "Category filters on disclosure alerts?",
        answer:
          "When you set a category, only matching announcement types fire that rule. Leave category empty to listen for any new filing after rule create (still subject to published-time rules above).",
      },
    ],
  },
  {
    id: "dividends",
    title: "Dividends",
    summary: "XD timing and the session-only cash estimate.",
    items: [
      {
        question: "How does the dividend calculator work?",
        answer:
          "Estimate ≈ DPS × shares, with an optional rough withholding-tax (WHT) haircut. Share quantities stay in the browser session only — koel does not store a portfolio or cost basis here.\n\nExample: DPS 1.50, 1,000 shares → 1,500 before WHT estimate.",
      },
      {
        question: "XD vs payment day?",
        answer:
          "Ex-dividend (XD) day: new buyers typically do not receive that dividend; the stock usually still trades. Payment day is when cash is scheduled — not a market holiday.\n\nDates come from CSE dividend disclosures koel stored. If a filing says “dates to be notified,” koel shows that honestly until a later filing fills them in.",
      },
    ],
  },
  {
    id: "people-graph",
    title: "People & ownership graph",
    summary: "Director / holder snapshots — not a live register.",
    items: [
      {
        question: "What is People / Graph?",
        answer:
          "Research views over stored people and ownership links (who appears connected to which issuers). Data is a snapshot koel ingested — not a real-time company registry and not advice about following any person or stock.",
      },
      {
        question: "Why might a person or edge be missing?",
        answer:
          "Coverage follows what koel has stored from public CSE-adjacent sources. Incomplete filings, name-matching limits, or not-yet-ingested rows all mean gaps. Treat absences as missing data, not as “no relationship.”",
      },
    ],
  },
  {
    id: "health",
    title: "Health & the poller",
    summary: "Market hours, freshness, and what Health reports.",
    items: [
      {
        question: "When does the poller run?",
        answer:
          "During CSE market hours: about 09:30–14:30 Asia/Colombo on weekdays. Outside that window the poller idles. Operators can force a tick with the backend `tick --force` command; the dash never scrapes CSE itself.",
      },
      {
        question: "What should I look at on Health?",
        answer:
          "Poller / snapshot freshness, recent errors, and related ops signals (including ML health when present). If Overview looks empty after a holiday weekend, confirm the next session has produced new snapshots.",
      },
      {
        question: "Near-realtime — how fresh is “fresh”?",
        answer:
          "koel is poll-interval near-realtime, not exchange co-lo. Expect updates on the order of the poller interval during the session, then quiet after the close until the next open (unless someone forces a tick).",
      },
    ],
  },
  {
    id: "telegram",
    title: "Telegram commands",
    summary: "Parity with the bot /help surface.",
    items: [
      {
        question: "Core commands",
        answer:
          "/start — register and short explainer\n/watch SYMBOL — add to watchlist\n/unwatch SYMBOL — remove\n/alert SYMBOL above|below PRICE — price cross\n/alert SYMBOL move PERCENT — daily |%| move\n/alert SYMBOL disclosure — new filings\n/myalerts — list rules\n/mywatchlist — list watchlist\n\nMore activity and notice types share the same /alert family; the bot /help lists the full syntax. Dash and bot share one rule store.",
      },
      {
        question: "Will every dash alert push to Telegram?",
        answer:
          "Active, unmuted rules fire to Telegram when conditions match, subject to quiet hours, digest, and mute. Rearm-only events do not send a push. History in the dash shows what already fired.",
      },
    ],
  },
  {
    id: "nfa",
    title: "Not financial advice",
    summary: "Compliance framing for every price- and score-adjacent view.",
    items: [
      {
        question: "Is koel investment advice?",
        answer:
          "No. koel is an information tool. Prices, scores, appetite bands, briefs, and alerts are not invitations to deal in securities and are not recommendations.\n\nCopy matches the spirit of SEC Sri Lanka Part V market-misconduct themes: do not treat koel as inducing dealing or as a source of insider information. Always verify primary CSE disclosures before acting.",
      },
      {
        question: "What koel deliberately does not do (yet)",
        answer:
          "No portfolio quantities / cost basis / P&L tracker, no tax reports, no heavy multi-filter trading terminal, no full TA suite, no native mobile app, and no payments. If a feature is not about seeing the market in the dash or getting pinged on Telegram, it is out of scope for now.",
      },
    ],
  },
] as const;

/** Lookup a topic by hash id (without leading #). */
export function getHelpTopic(id: string): HelpTopic | undefined {
  if (typeof id !== "string" || !id) return undefined;
  return HELP_TOPICS.find((t) => t.id === id);
}
