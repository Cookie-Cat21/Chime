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
  const h = size === "lg" ? 18 : size === "sm" ? 10 : 14;
  const label = BAND_LABEL[band];

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative w-full overflow-hidden rounded-md border border-border/70"
        style={{ height: h }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s)}
        aria-valuetext={`${Math.round(s)} — ${label}`}
      >
        <div className="absolute inset-0 flex">
          {ZONES.map((z) => (
            <div
              key={z.band}
              className="h-full"
              style={{
                width: `${z.to - z.from}%`,
                backgroundColor: BAND_ZONE_COLOR[z.band],
                opacity: z.band === band ? 0.95 : 0.55,
              }}
              title={BAND_LABEL[z.band]}
            />
          ))}
        </div>
        {/* Needle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground shadow-sm"
          style={{ left: `calc(${s}% - 1px)` }}
          aria-hidden
        />
        <div
          className="absolute -top-1 h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-foreground"
          style={{ left: `calc(${s}% - 5px)` }}
          aria-hidden
        />
      </div>
      {size !== "sm" ? (
        <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>0</span>
          <span>Caution</span>
          <span>Neutral</span>
          <span>Appetite</span>
          <span>100</span>
        </div>
      ) : null}
    </div>
  );
}
