"use client";

import { useState } from "react";

import {
  BAND_LABEL,
  BAND_ZONE_COLOR,
  APPETITE_BANDS,
  type AppetiteDay,
} from "@/lib/api/appetite";
import { cn } from "@/lib/utils";

/** Tremor Tracker — equal-width session ticks, no wrap (avoids broken rows). */
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
  const [hover, setHover] = useState<AppetiteDay | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No appetite history yet.
      </p>
    );
  }

  const first = rows[0]!.trade_date;
  const last = rows[rows.length - 1]!.trade_date;
  const tip = hover;

  return (
    <div className={cn("relative w-full space-y-2.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Session bands
        </p>
        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {tip
            ? `${tip.trade_date} · ${Math.round(tip.score)} · ${BAND_LABEL[tip.band]}`
            : `${first} → ${last}`}
        </p>
      </div>
      <ul
        className="flex h-3.5 w-full gap-px sm:h-4"
        aria-label={`Appetite band for last ${rows.length} sessions`}
        onPointerLeave={() => setHover(null)}
      >
        {rows.map((d) => (
          <li key={d.trade_date} className="min-w-0 flex-1">
            <button
              type="button"
              title={`${d.trade_date}: ${Math.round(d.score)} — ${BAND_LABEL[d.band]}`}
              onPointerEnter={() => setHover(d)}
              onFocus={() => setHover(d)}
              onBlur={() => setHover(null)}
              className={cn(
                "block h-full w-full rounded-[1.5px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                tip?.trade_date === d.trade_date
                  ? "opacity-100 ring-1 ring-foreground/40"
                  : "hover:opacity-90",
              )}
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
              className="inline-block size-2.5 shrink-0 rounded-[2px]"
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
