"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/** Allowed sparkline depths — must stay ≤ API / SVG absolute max (500). */
export const SPARKLINE_TICK_OPTIONS = [60, 120, 200, 500] as const;
export type SparklineTickOption = (typeof SPARKLINE_TICK_OPTIONS)[number];

export const DEFAULT_SPARKLINE_TICKS = 60;
/** Absolute max polyline points (API + SVG + parse caps stay in lockstep). */
export const ABSOLUTE_MAX_SPARKLINE_TICKS = 500;

export function parseSparklineTicks(raw: unknown): SparklineTickOption {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (typeof text !== "string" || !text.trim()) return DEFAULT_SPARKLINE_TICKS;
  const n = Number.parseInt(text.trim(), 10);
  if (!Number.isSafeInteger(n)) return DEFAULT_SPARKLINE_TICKS;
  if ((SPARKLINE_TICK_OPTIONS as readonly number[]).includes(n)) {
    return n as SparklineTickOption;
  }
  return DEFAULT_SPARKLINE_TICKS;
}

/**
 * Query-param control for sparkline depth (`?ticks=`). Server page re-fetches
 * snapshots with the chosen limit.
 */
export function SparklineTicksControl({
  value,
  className,
}: {
  value: SparklineTickOption;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      role="group"
      aria-label="Sparkline tick count"
    >
      <span className="text-xs text-muted-foreground">Ticks</span>
      {SPARKLINE_TICK_OPTIONS.map((n) => {
        const params = new URLSearchParams(searchParams.toString());
        if (n === DEFAULT_SPARKLINE_TICKS) {
          params.delete("ticks");
        } else {
          params.set("ticks", String(n));
        }
        const qs = params.toString();
        const href = qs ? `${pathname}?${qs}` : pathname;
        const active = value === n;
        return (
          <Link
            key={n}
            href={href}
            scroll={false}
            className={cn(
              "inline-flex min-h-7 items-center rounded-md border px-2 text-xs tabular-nums transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            aria-current={active ? "true" : undefined}
          >
            {n}
          </Link>
        );
      })}
    </div>
  );
}
