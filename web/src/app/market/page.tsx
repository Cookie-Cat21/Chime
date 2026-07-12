import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { EmptyState } from "@/components/empty-state";
import { NfaFooter } from "@/components/nfa-footer";
import { NfaInline } from "@/components/nfa-inline";
import { Button } from "@/components/ui/button";
import { serverApiGet } from "@/lib/api/server-fetch";
import { requirePageSession } from "@/lib/auth/page-session";
import { formatNumber, formatPct, formatTs } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse · Chime",
  description:
    "Thin CSE symbol browse from Chime snapshots — not a trading terminal.",
};

type MarketPayload = {
  items: {
    symbol: string;
    name: string | null;
    sector: string | null;
    price: number | null;
    change: number | null;
    change_pct: number | null;
    ts: string | null;
  }[];
  limit: number;
  offset: number;
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const qs = new URLSearchParams({ limit: "100", sort: "change_pct" });
  if (q) qs.set("q", q);

  const res = await serverApiGet(`/api/v1/symbols?${qs.toString()}`);
  const payload: MarketPayload | null = res.ok
    ? ((await res.json()) as MarketPayload)
    : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppNav active="/market" />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Browse
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          CSE symbols from Chime&apos;s latest poller snapshots. Use this to find
          names to watch — alerts still fire on Telegram.
        </p>

        <form className="mt-6 flex flex-wrap gap-2" method="get" action="/market">
          <label className="sr-only" htmlFor="market_q">
            Search symbols
          </label>
          <input
            id="market_q"
            name="q"
            defaultValue={q}
            placeholder="Symbol or name"
            className="min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <p className="mt-3">
          <NfaInline />
        </p>

        {!payload ? (
          <EmptyState
            title="Couldn’t load market list"
            description="Chime couldn’t read snapshot data just now. Retry, or confirm the poller has written tradeSummary rows."
            action={
              <Button asChild variant="outline">
                <a href="/market">Retry</a>
              </Button>
            }
          />
        ) : payload.items.length === 0 ? (
          <EmptyState
            title="No symbols yet"
            description={
              q
                ? "No symbols matched that search. Try another query after the poller has run."
                : "The poller has not persisted a market board yet. Run a tick during market hours (or tick --force), then refresh."
            }
          />
        ) : (
          <ul className="mt-8 divide-y divide-border/60">
            {payload.items.map((item) => {
              const pct = item.change_pct;
              const tone =
                pct == null
                  ? "text-muted-foreground"
                  : pct > 0
                    ? "text-[oklch(0.42_0.09_165)]"
                    : pct < 0
                      ? "text-[oklch(0.45_0.12_25)]"
                      : "text-muted-foreground";
              return (
                <li key={item.symbol} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/symbols/${encodeURIComponent(item.symbol)}`}
                      className="font-mono text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {item.symbol}
                    </Link>
                    {item.name ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {item.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-mono tabular-nums">
                      {formatNumber(item.price)}
                    </p>
                    <p className={`font-mono tabular-nums ${tone}`}>
                      {formatPct(pct)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTs(item.ts)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <NfaFooter />
    </div>
  );
}
