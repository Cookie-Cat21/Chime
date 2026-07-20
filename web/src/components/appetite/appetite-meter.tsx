"use client";

import {
  BAND_LABEL,
  BAND_ZONE_COLOR,
  type AppetiteBand,
} from "@/lib/api/appetite";
import { cn } from "@/lib/utils";

const ZONES: { band: AppetiteBand; from: number; to: number }[] = [
  { band: "extreme_caution", from: 0, to: 20 },
  { band: "caution", from: 20, to: 40 },
  { band: "neutral", from: 40, to: 60 },
  { band: "appetite", from: 60, to: 80 },
  { band: "strong_appetite", from: 80, to: 100 },
];

/**
 * Horizontal 5-zone Market Appetite spectrum + needle (bullet-chart lineage).
 */
export function AppetiteMeter({
  score,
  band,
  size = "md",
  className,
}: {
  score: number;
  band: AppetiteBand;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50;
  const h = size === "lg" ? 22 : size === "sm" ? 10 : 16;
  const label = BAND_LABEL[band];

  // sm: needle stays inside the bar (no clipped triangle above).
  // md/lg: caret sits just above the spectrum.
  return (
    <div className={cn("w-full", size === "sm" ? "pt-0" : "pt-1.5", className)}>
      <div
        className={cn(
          "relative w-full rounded-md border border-border/70",
          size === "sm" ? "overflow-hidden" : "overflow-visible",
        )}
        style={{ height: h }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s)}
        aria-valuetext={`${Math.round(s)} — ${label}`}
      >
        <div className="absolute inset-0 flex overflow-hidden rounded-[5px]">
          {ZONES.map((z) => (
            <div
              key={z.band}
              className="h-full"
              style={{
                width: `${z.to - z.from}%`,
                backgroundColor: BAND_ZONE_COLOR[z.band],
                opacity: z.band === band ? 1 : 0.42,
              }}
              title={BAND_LABEL[z.band]}
            />
          ))}
        </div>
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-foreground shadow-[0_0_0_1px_oklch(1_0_0_/_0.55)] transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `clamp(0px, calc(${s}% - 1px), calc(100% - 2px))` }}
          aria-hidden
        />
        {size !== "sm" ? (
          <div
            className="absolute -top-1.5 z-10 h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-foreground transition-[left] duration-500 ease-out motion-reduce:transition-none"
            style={{ left: `clamp(0px, calc(${s}% - 5px), calc(100% - 10px))` }}
            aria-hidden
          />
        ) : null}
      </div>
      {size !== "sm" ? (
        <div className="mt-2 grid grid-cols-5 gap-1 text-center font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>Extreme</span>
          <span>Caution</span>
          <span>Neutral</span>
          <span>Appetite</span>
          <span>Strong</span>
        </div>
      ) : null}
    </div>
  );
}

export function AppetiteBandBadge({
  band,
  className,
}: {
  band: AppetiteBand;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-foreground/15 px-2.5 py-0.5 text-sm font-semibold tracking-tight shadow-sm",
        className,
      )}
      style={{
        backgroundColor: BAND_ZONE_COLOR[band],
        color: "oklch(0.2 0.03 250)",
      }}
    >
      {BAND_LABEL[band]}
    </span>
  );
}
