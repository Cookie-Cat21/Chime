"use client";

import { useMemo, useState } from "react";

import {
  BAND_ZONE_COLOR,
  type AppetiteDay,
} from "@/lib/api/appetite";
import { cn } from "@/lib/utils";

type RangeKey = "3M" | "1Y" | "MAX";

const RANGE_DAYS: Record<RangeKey, number | null> = {
  "3M": 63,
  "1Y": 252,
  MAX: null,
};

/**
 * Custom SVG area for appetite 0–100 history — no Recharts dep.
 */
export function AppetiteHistoryChart({
  historyAsc,
  className,
}: {
  historyAsc: AppetiteDay[];
  className?: string;
}) {
  const [range, setRange] = useState<RangeKey>("1Y");

  const series = useMemo(() => {
    const n = RANGE_DAYS[range];
    return n == null ? historyAsc : historyAsc.slice(-n);
  }, [historyAsc, range]);

  if (series.length < 2) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Need at least two sessions of appetite history.
      </p>
    );
  }

  const w = 720;
  const h = 220;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const coords = series.map((d, i) => {
    const x = padL + (i / (series.length - 1)) * plotW;
    const y = padT + (1 - d.score / 100) * plotH;
    return { x, y, d };
  });

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${padL},${padT + plotH} ${line} ${padL + plotW},${padT + plotH}`;

  const zoneBands: { y0: number; y1: number; color: string }[] = [
    { y0: 0, y1: 20, color: BAND_ZONE_COLOR.extreme_caution },
    { y0: 20, y1: 40, color: BAND_ZONE_COLOR.caution },
    { y0: 40, y1: 60, color: BAND_ZONE_COLOR.neutral },
    { y0: 60, y1: 80, color: BAND_ZONE_COLOR.appetite },
    { y0: 80, y1: 100, color: BAND_ZONE_COLOR.strong_appetite },
  ];

  const first = series[0]!;
  const last = series[series.length - 1]!;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(Object.keys(RANGE_DAYS) as RangeKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setRange(k)}
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-[11px] tabular-nums",
              range === k
                ? "border-foreground/30 bg-foreground text-background"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
            )}
          >
            {k}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {first.trade_date} → {last.trade_date}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Market Appetite from ${first.trade_date} to ${last.trade_date}, latest ${Math.round(last.score)}`}
      >
        {zoneBands.map((z) => {
          const yTop = padT + (1 - z.y1 / 100) * plotH;
          const yBot = padT + (1 - z.y0 / 100) * plotH;
          return (
            <rect
              key={`${z.y0}-${z.y1}`}
              x={padL}
              y={yTop}
              width={plotW}
              height={Math.max(0, yBot - yTop)}
              fill={z.color}
              opacity={0.22}
            />
          );
        })}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padT + (1 - v / 100) * plotH;
          return (
            <g key={v}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {v}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="currentColor" className="text-foreground" opacity={0.08} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          className="text-foreground"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={coords[coords.length - 1]!.x}
          cy={coords[coords.length - 1]!.y}
          r={3.5}
          className="fill-foreground"
        />
      </svg>
    </div>
  );
}
