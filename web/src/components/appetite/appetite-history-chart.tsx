"use client";

import { useMemo, useState } from "react";

import {
  BAND_ZONE_COLOR,
  type AppetiteDay,
} from "@/lib/api/appetite";
import { cn } from "@/lib/utils";

type RangeKey = "3M" | "1Y" | "MAX";

/** Calendar-day windows (not session counts) so 3M clearly differs from 1Y. */
const RANGE_CALENDAR_DAYS: Record<Exclude<RangeKey, "MAX">, number> = {
  "3M": 92,
  "1Y": 365,
};

function parseTradeDateMs(iso: string): number {
  const t = Date.parse(`${iso}T12:00:00Z`);
  return Number.isFinite(t) ? t : Number.NaN;
}

function sliceByRange(historyAsc: AppetiteDay[], range: RangeKey): AppetiteDay[] {
  if (historyAsc.length === 0) return historyAsc;
  if (range === "MAX") return historyAsc;
  const last = historyAsc[historyAsc.length - 1]!;
  const endMs = parseTradeDateMs(last.trade_date);
  if (!Number.isFinite(endMs)) {
    // Fail soft — fall back to approx session windows.
    const n = range === "3M" ? 63 : 252;
    return historyAsc.slice(-n);
  }
  const startMs = endMs - RANGE_CALENDAR_DAYS[range] * 86_400_000;
  const sliced = historyAsc.filter((d) => {
    const ms = parseTradeDateMs(d.trade_date);
    return Number.isFinite(ms) && ms >= startMs;
  });
  return sliced.length >= 2 ? sliced : historyAsc.slice(-2);
}

function formatAxisDate(iso: string): string {
  const ms = parseTradeDateMs(iso);
  if (!Number.isFinite(ms)) return iso;
  const d = new Date(ms);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}

function formatAxisDay(iso: string): string {
  const ms = parseTradeDateMs(iso);
  if (!Number.isFinite(ms)) return iso;
  const d = new Date(ms);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Evenly spaced tick indexes — always include first + last. */
function tickIndexes(n: number, target = 5): number[] {
  if (n <= 1) return [0];
  if (n <= target) return Array.from({ length: n }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    out.push(Math.round((i * (n - 1)) / (target - 1)));
  }
  return [...new Set(out)];
}

/**
 * Custom SVG area for appetite 0–100 history — no Recharts dep.
 * Range chips use calendar windows; MAX is full loaded series.
 */
export function AppetiteHistoryChart({
  historyAsc,
  className,
}: {
  historyAsc: AppetiteDay[];
  className?: string;
}) {
  const [range, setRange] = useState<RangeKey>("1Y");

  const series = useMemo(
    () => sliceByRange(historyAsc, range),
    [historyAsc, range],
  );

  const fullSpanDays = useMemo(() => {
    if (historyAsc.length < 2) return 0;
    const a = parseTradeDateMs(historyAsc[0]!.trade_date);
    const b = parseTradeDateMs(historyAsc[historyAsc.length - 1]!.trade_date);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return historyAsc.length;
    return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
  }, [historyAsc]);

  const maxSameAs1Y = fullSpanDays > 0 && fullSpanDays <= 370;

  if (series.length < 2) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Need at least two sessions of appetite history.
      </p>
    );
  }

  const w = 720;
  const h = 248;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 44;
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
  const xTicks = tickIndexes(series.length, series.length <= 80 ? 4 : 6);
  // Short windows: day+month; longer: Mon YY
  const shortWindow = range === "3M";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {(["3M", "1Y", "MAX"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setRange(k)}
            aria-pressed={range === k}
            className={cn(
              "min-h-9 rounded-md border px-2.5 py-1 font-mono text-[11px] tabular-nums",
              range === k
                ? "border-foreground/30 bg-foreground text-background"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
            )}
          >
            {k}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {first.trade_date} → {last.trade_date} · {series.length} sessions · min{" "}
          {Math.round(Math.min(...series.map((d) => d.score)))} / max{" "}
          {Math.round(Math.max(...series.map((d) => d.score)))}
        </span>
      </div>
      {range === "MAX" && maxSameAs1Y ? (
        <p className="mb-2 text-xs text-muted-foreground" role="status">
          MAX is the full CSE appetite history we have (~
          {fullSpanDays} calendar days). It matches 1Y until longer backfill
          lands — not a chart bug.
        </p>
      ) : null}
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
        {[0, 20, 40, 60, 80, 100].map((v) => {
          const y = padT + (1 - v / 100) * plotH;
          return (
            <g key={v}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={v % 40 === 0 ? 0.14 : 0.07}
                strokeDasharray={v % 40 === 0 ? undefined : "3 4"}
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
        {/* X-axis baseline + date ticks */}
        <line
          x1={padL}
          x2={padL + plotW}
          y1={padT + plotH}
          y2={padT + plotH}
          stroke="currentColor"
          strokeOpacity={0.22}
        />
        {xTicks.map((idx) => {
          const c = coords[idx]!;
          const label = shortWindow
            ? formatAxisDay(c.d.trade_date)
            : formatAxisDate(c.d.trade_date);
          return (
            <g key={`x-${idx}-${c.d.trade_date}`}>
              <line
                x1={c.x}
                x2={c.x}
                y1={padT + plotH}
                y2={padT + plotH + 5}
                stroke="currentColor"
                strokeOpacity={0.28}
              />
              <text
                x={c.x}
                y={padT + plotH + 18}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {label}
              </text>
            </g>
          );
        })}
        <polygon
          points={area}
          fill="currentColor"
          className="text-foreground"
          opacity={0.08}
        />
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
