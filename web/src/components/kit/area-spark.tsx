"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

export type AreaSparkTone = "up" | "down" | "flat" | "neutral";

const STROKE: Record<AreaSparkTone, string> = {
  up: "oklch(0.45 0.1 160)",
  down: "oklch(0.52 0.12 25)",
  flat: "oklch(0.55 0.02 250)",
  neutral: "oklch(0.48 0.04 250)",
};

/**
 * Tremor-style area spark — gradient fill + polyline.
 * Keeps aspect ratio (no horizontal stretch) so short series don't look broken.
 */
export function AreaSpark({
  values,
  tone = "neutral",
  className,
  heightClass = "h-14",
  ariaLabel,
}: {
  values: Array<number | null | undefined>;
  tone?: AreaSparkTone;
  className?: string;
  heightClass?: string;
  ariaLabel?: string;
}) {
  const gid = useId();
  const series = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (series.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted/40 text-[10px] text-muted-foreground",
          heightClass,
          className,
        )}
        role="status"
      >
        Not enough points
      </div>
    );
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max !== min ? max - min : 1;
  const w = 240;
  const h = 64;
  const padX = 2;
  const padY = 4;

  const coords = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - min) / span) * (h - padY * 2);
    return { x, y };
  });
  const linePts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPts = [
    `${coords[0]!.x.toFixed(1)},${(h - padY).toFixed(1)}`,
    ...coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
    `${coords[coords.length - 1]!.x.toFixed(1)},${(h - padY).toFixed(1)}`,
  ].join(" ");

  const stroke = STROKE[tone];
  const last = coords[coords.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("w-full", heightClass, className)}
      role="img"
      aria-label={ariaLabel ?? `Sparkline, ${series.length} points`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gid})`} points={areaPts} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        points={linePts}
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="2.5"
        fill={stroke}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Infer tone from first→last move. */
export function toneFromSeries(
  values: Array<number | null | undefined>,
  upIsGood = true,
): AreaSparkTone {
  const series = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (series.length < 2) return "flat";
  const up = series[series.length - 1]! >= series[0]!;
  if (Math.abs(series[series.length - 1]! - series[0]!) < 1e-9) return "flat";
  const good = upIsGood ? up : !up;
  return good ? "up" : "down";
}
