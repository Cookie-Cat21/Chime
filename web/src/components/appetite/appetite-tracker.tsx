"use client";

import {
  BAND_LABEL,
  BAND_ZONE_COLOR,
  APPETITE_BANDS,
  type AppetiteDay,
} from "@/lib/api/appetite";
import { cn } from "@/lib/utils";

/** Tremor-style day-of-band color ticks (last N sessions). */
export function AppetiteTracker({
  historyAsc,
  limit = 90,
  className,
}: {
  historyAsc: AppetiteDay[];
  limit?: number;
  className?: string;
}) {
  const rows = historyAsc.slice(-limit);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No appetite history yet.
      </p>
    );
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <ul
        className="flex flex-wrap gap-0.5"
        aria-label={`Appetite band for last ${rows.length} sessions`}
      >
        {rows.map((d) => (
          <li key={d.trade_date}>
            <button
              type="button"
              title={`${d.trade_date}: ${Math.round(d.score)} — ${BAND_LABEL[d.band]}`}
              className="block h-3.5 w-2 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: BAND_ZONE_COLOR[d.band] }}
              aria-label={`${d.trade_date}: ${Math.round(d.score)} ${BAND_LABEL[d.band]}`}
            />
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {APPETITE_BANDS.map((b) => (
          <li key={b} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[2px]"
              style={{ backgroundColor: BAND_ZONE_COLOR[b] }}
              aria-hidden
            />
            {BAND_LABEL[b]}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Last {rows.length} sessions · color = band (not a tip)
      </p>
    </div>
  );
}
