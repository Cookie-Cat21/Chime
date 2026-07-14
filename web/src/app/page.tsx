import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ChimeWordmark } from "@/components/brand/chime-brand";
import { ChatBubble } from "@/components/kit/chat-bubble";
import { FaqSection } from "@/components/kit/faq-section";
import { Steps } from "@/components/kit/steps";
import { NfaFooter } from "@/components/nfa-footer";
import { NfaInline } from "@/components/nfa-inline";
import { Button } from "@/components/ui/button";
import { getDashAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";

const FAQ = [
  {
    question: "Does Chime replace the CSE app?",
    answer:
      "No. Chime is a background watcher. You set conditions; Telegram gets the ping. The exchange app and brokers stay where they are.",
  },
  {
    question: "Where do alerts fire?",
    answer:
      "On Telegram. This site manages watchlists and rules. Push delivery is the product — keep the bot open in Telegram, not a browser tab.",
  },
  {
    question: "Is this financial advice?",
    answer:
      "No. Prices and disclosures are informational only. Always verify filings and make your own decisions.",
  },
  {
    question: "What can I alert on?",
    answer:
      "Price above/below, daily % move, disclosures, activity signals, and (when enabled) EPS / YoY filing metrics.",
  },
];

/**
 * Brand landing — Dinaya composition + Ceyfi kit ports (chat / steps / FAQ).
 * Signed-in users still land on watchlist.
 */
export default async function HomePage() {
  const cfg = getDashAuthConfig();
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const session =
    raw && cfg.sessionSecret
      ? verifySessionToken(raw, cfg.sessionSecret)
      : null;

  if (session) {
    redirect("/watchlist");
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="chime-atmosphere flex min-h-full flex-1 flex-col"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16 sm:py-20">
        {/* Hero — brand first */}
        <div className="chime-rise">
          <ChimeWordmark size="hero" priority />
        </div>
        <h1 className="chime-rise chime-rise-delay-1 mt-6 max-w-xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          CSE moves. You hear it.
        </h1>
        <p className="chime-rise chime-rise-delay-2 mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
          Set a price, move, disclosure, or filing rule. Chime pings Telegram
          the moment it fires — no tab left open.
        </p>
        <NfaInline className="chime-rise chime-rise-delay-2 mt-4" />
        <div className="chime-rise chime-rise-delay-3 mt-10 flex flex-wrap items-center gap-3">
          <Button
            asChild
            size="lg"
            className="min-w-36 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Manage in browser</Link>
          </Button>
        </div>

        {/* Product proof — DaisyUI chat pattern */}
        <section className="chime-rise chime-rise-delay-3 mt-16">
          <p className="relative mb-4 pl-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span
              aria-hidden
              className="absolute top-1/2 left-0 h-3 w-[3px] -translate-y-1/2 rounded-sm bg-primary"
            />
            On Telegram
          </p>
          <div className="rounded-xl border border-border bg-card/80 p-5 sm:p-6">
            <ChatBubble
              header="Chime CSE"
              footer="Not financial advice"
            >
              <p className="font-medium">JKH.N0000 crossed above</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                22.50
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Last 22.75 · rule #184
              </p>
            </ChatBubble>
          </div>
        </section>

        {/* How it works — DaisyUI steps */}
        <section className="mt-16">
          <p className="relative mb-4 pl-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span
              aria-hidden
              className="absolute top-1/2 left-0 h-3 w-[3px] -translate-y-1/2 rounded-sm bg-primary"
            />
            How it works
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Three steps
          </h2>
          <div className="mt-8">
            <Steps
              steps={[
                { label: "Watch a CSE symbol", status: "complete" },
                { label: "Set a rule", status: "complete" },
                { label: "Get the Telegram ping", status: "active" },
              ]}
            />
          </div>
        </section>

        {/* FAQ — HyperUI pattern */}
        <FaqSection
          className="mt-16 mb-8"
          eyebrow="FAQ"
          heading="Before you start"
          description="Short answers. Telegram stays the push channel."
          items={FAQ}
        />
      </div>
      <NfaFooter />
    </main>
  );
}
