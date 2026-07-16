"use client";

import { useId, useState } from "react";

import { Sparkline } from "@/components/sparkline";
import { finiteSparklinePoints } from "@/lib/sparkline";
import { formatNumber } from "@/lib/format";

type Point = { ts: string | null; price: number | null | undefined };

/**
 * Realtime sparkline with optional dashed forecast overlay.
 * Default = realtime only. Forecast is a model estimate — not advice.
 */
export function SparklineWithForecast({
  points,
  forecastPoints,
  className,
}: {
  points: Point[];
  forecastPoints?: Point[];
  className?: string;
}) {
  const toggleId = useId();
  const [showForecast, setShowForecast] = useState(false);
  const series = finiteSparklinePoints(points);
  const forecast = finiteSparklinePoints(forecastPoints ?? []);
  const canToggle = forecast.length >= 1 && series.length >= 2;

  if (series.length < 2) {
    return <Sparkline points={points} className={className} />;
  }

  const combinedPrices = [
    ...series.map((p) => p.price),
    ...(showForecast ? forecast.map((p) => p.price) : []),
  ];
  const min = Math.min(...combinedPrices);
  const max = Math.max(...combinedPrices);
  const span = Number.isFinite(max - min) && max !== min ? max - min : 1;
  const w = 320;
  const h = 72;
  const pad = 4;
  const totalN = series.length + (showForecast ? forecast.length : 0);

  const toCoord = (price: number, i: number, n: number) => {
    const x = pad + (i / Math.max(1, n - 1)) * (w - pad * 2);
    const y = pad + (1 - (price - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const realCoords = series.map((p, i) => toCoord(p.price, i, totalN));
  const forecastCoords =
    showForecast && forecast.length > 0
      ? [
          toCoord(series[series.length - 1]!.price, series.length - 1, totalN),
          ...forecast.map((p, i) => toCoord(p.price, series.length + i, totalN)),
        ]
      : [];

  const first = series[0]!.price;
  const last = series[series.length - 1]!.price;
  const up = last >= first;
  const aria = showForecast
    ? `Recent price from ${formatNumber(first)} to ${formatNumber(last)}, with model forecast overlay`
    : `Recent price from ${formatNumber(first)} to ${formatNumber(last)} across ${series.length} ticks`;

  return (
    <div className={className ?? "max-w-md"}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-16 w-full"
        role="img"
        aria-label={aria}
      >
        <polyline
          fill="none"
          stroke={up ? "oklch(0.45 0.08 185)" : "oklch(0.5 0.1 25)"}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={realCoords.join(" ")}
        />
        {forecastCoords.length >= 2 ? (
          <polyline
            fill="none"
            stroke="oklch(0.55 0.04 250)"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={forecastCoords.join(" ")}
          />
        ) : null}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {series.length} stored ticks · {formatNumber(first)} →{" "}
          {formatNumber(last)}
          {showForecast ? " · dashed = model estimate" : ""}
        </p>
        {canToggle ? (
          <label
            htmlFor={toggleId}
            className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
          >
            <input
              id={toggleId}
              type="checkbox"
              className="size-3.5 rounded border-border"
              checked={showForecast}
              onChange={(e) => setShowForecast(e.target.checked)}
            />
            Show forecast
          </label>
        ) : null}
      </div>
    </div>
  );
}
