import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { UpcomingDividendEvent } from "@/lib/db/dividend-events";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function daysUntilLabel(date: string | null): string {
  if (!date) return "XD date unknown";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((target - today) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

export function XdWeekStrip({
  items,
  className,
}: {
  items: UpcomingDividendEvent[];
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border/70 bg-card/60 p-4", className)}
      aria-labelledby="xd-week-strip-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="xd-week-strip-heading"
            className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
          >
            XD this week
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Watchlist dividends from stored CSE disclosures. Not financial advice.
          </p>
        </div>
        <Link
          href="/dividends"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Calculator
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border/80 px-3 py-2 text-sm text-muted-foreground">
          No watched symbols go XD in the next 7 days.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {items.slice(0, 8).map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/symbols/${encodeURIComponent(item.symbol)}`}
                  className="font-mono text-sm font-semibold underline-offset-2 hover:underline"
                >
                  {item.symbol}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.title ?? item.kind ?? "Dividend event"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Badge variant="outline" className="font-mono tabular-nums">
                  XD {item.d_xd}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {daysUntilLabel(item.d_xd)}
                </span>
                {item.dps != null ? (
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {formatNumber(item.dps)} DPS
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
