"use client";

import { useEffect, useRef, useState } from "react";

import {
  aggregateBarsForDisplay,
  candleBodyOpen,
  type DailyBarPoint,
} from "@/lib/api/daily-bars";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Native SVG hover tooltip text — date + OHLC (+ volume when stored). */
function barTooltip(b: DailyBarPoint, bodyOpen: number): string {
  const vol =
    b.volume != null && Number.isFinite(b.volume)
      ? ` · Vol ${formatNumber(Math.round(b.volume), 0)}`
      : "";
  return `${b.trade_date} · O ${formatNumber(b.open ?? bodyOpen)} H ${formatNumber(
    b.high,
  )} L ${formatNumber(b.low)} C ${formatNumber(b.close)}${vol}`;
}

/**
 * Readable SVG candlestick chart.
 * ``fitWidth`` sizes slots from the container (ResizeObserver) so the plot
 * fills width without scroll and without non-uniform stretch.
 * Dense inputs are aggregated. Missing open → vs prior close.
 */
export function CandlestickChart({
  bars: rawBars,
  className,
  forecastPrices,
  showForecast = false,
  fill = false,
  /** Fit chart to container width (no horizontal scrollbar). Hero/symbol page. */
  fitWidth = false,
  /** SVG render height in px when not filling a flex parent. */
  chartHeight,
  footnote,
  maxCandles = 72,
}: {
  bars: DailyBarPoint[];
  className?: string;
  forecastPrices?: number[];
  showForecast?: boolean;
  fill?: boolean;
  fitWidth?: boolean;
  chartHeight?: number;
  footnote?: string;
  maxCandles?: number;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState({ w: 720, h: chartHeight ?? 280 });

  useEffect(() => {
    if (!fitWidth) return;
    const el = frameRef.current;
    if (!el) return;
    const apply = (width: number, height: number) => {
      if (width < 2) return;
      const nextH = fill
        ? Math.max(160, Math.floor(height))
        : (chartHeight ?? 280);
      setFrame((prev) => {
        const w = Math.floor(width);
        const h = nextH;
        if (prev.w === w && prev.h === h) return prev;
        return { w, h };
      });
    };
    apply(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      apply(cr.width, cr.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWidth, fill, chartHeight]);

  const priceMax = Math.max(...rawBars.map((b) => b.close), 0);
  // Scroll mode may keep a dense 1Y series; fit-width always respects
  // maxCandles so the plot can scale into the container without overflow.
  const adaptiveMax =
    maxCandles >= 200 && !fitWidth
      ? maxCandles
      : priceMax > 0 && priceMax < 2
        ? Math.min(maxCandles, 40)
        : maxCandles;
  const bars = aggregateBarsForDisplay(rawBars, adaptiveMax);

  if (bars.length < 2) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Need at least two bars for a candlestick chart.
      </p>
    );
  }

  // Pre-count flats — penny CSE names (0.10 tick) are mostly dojis; candles
  // look like noise, so we prefer a step close chart with move markers.
  let preFlat = 0;
  for (let i = 0; i < bars.length; i++) {
    const o = candleBodyOpen(bars, i);
    if (Math.abs(bars[i]!.close - o) < 1e-12) preFlat += 1;
  }
  const lineMode = priceMax < 3 && preFlat / bars.length >= 0.4;

  const padL = fitWidth ? 12 : 14;
  const padR = 56;
  const padT = fitWidth ? 18 : 20;
  const padB = fitWidth ? 36 : 40;

  const fc =
    showForecast && forecastPrices
      ? forecastPrices.filter((p) => Number.isFinite(p) && p > 0)
      : [];

  const n = bars.length;
  const totalSlots = Math.max(1, n + (fc.length > 0 ? fc.length : 0));

  // Fit-width: viewBox == container pixels → no stretch. Slot from width.
  // Scroll mode: fixed pitch (may overflow-x).
  const h = fitWidth ? frame.h : 520;
  const slot = fitWidth
    ? Math.max(4, (Math.max(frame.w, padL + padR + 40) - padL - padR) / totalSlots)
    : 18;
  const bodyW = fitWidth
    ? Math.max(3, Math.min(slot * 0.72, slot - 1.5))
    : 13;
  const wickW = fitWidth ? Math.max(1, Math.min(2.25, slot * 0.14)) : 2;
  const plotW = totalSlots * slot;
  const w = fitWidth
    ? Math.max(padL + padR + 40, frame.w)
    : padL + padR + plotW;
  const plotH = Math.max(40, h - padT - padB);
  const displayH = chartHeight ?? 280;

  let barMin = Infinity;
  let barMax = -Infinity;
  for (const b of bars) {
    if (Number.isFinite(b.low)) barMin = Math.min(barMin, b.low);
    if (Number.isFinite(b.high)) barMax = Math.max(barMax, b.high);
    barMin = Math.min(barMin, b.close);
    barMax = Math.max(barMax, b.close);
    if (b.open != null) {
      barMin = Math.min(barMin, b.open);
      barMax = Math.max(barMax, b.open);
    }
  }
  if (!Number.isFinite(barMin) || !Number.isFinite(barMax)) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Invalid price range for chart.
      </p>
    );
  }

  const barSpan =
    barMax > barMin
      ? barMax - barMin
      : Math.max(Math.abs(barMax) * 0.02, 0.02);
  let min = Math.max(0, barMin - barSpan * 0.12);
  let max = barMax + barSpan * 0.12;
  const fcLo = barMin - barSpan * 0.35;
  const fcHi = barMax + barSpan * 0.35;
  for (const p of fc) {
    if (p < min) min = Math.max(p, Math.max(0, fcLo));
    if (p > max) max = Math.min(p, fcHi);
  }
  const span = max > min ? max - min : 1;

  const yFor = (price: number) =>
    padT + (1 - (price - min) / span) * plotH;

  const first = bars[0]!;
  const last = bars[n - 1]!;
  const aria = `Candles from ${first.trade_date} to ${last.trade_date}, close ${formatNumber(last.close)}`;
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + t * plotH);

  // Pre-pass direction counts — mutating during the JSX map breaks React
  // render purity (react-hooks/immutability). Same epsilon per mode.
  let upN = 0;
  let downN = 0;
  let flatN = 0;
  const dirEps = lineMode ? 0 : span * 1e-6;
  for (let i = 0; i < n; i++) {
    const bodyOpen = candleBodyOpen(bars, i);
    const close = bars[i]!.close;
    if (close > bodyOpen + dirEps) upN += 1;
    else if (close < bodyOpen - dirEps) downN += 1;
    else flatN += 1;
  }
  const aggregated = rawBars.length > bars.length;

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        fill ? "h-full min-h-0" : fitWidth ? "min-h-0" : "min-h-[320px]",
        className,
      )}
    >
      <div
        ref={(el) => {
          frameRef.current = el;
          // Pin scroll to most recent candles (scroll mode only).
          if (!el || fitWidth) return;
          requestAnimationFrame(() => {
            el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
          });
        }}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-muted/25 to-muted/10",
          fitWidth ? "overflow-x-hidden" : "overflow-x-auto overflow-y-hidden",
          fill ? "min-h-0 flex-1" : "",
        )}
        style={fitWidth && !fill ? { height: displayH } : undefined}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          // Fit-width: viewBox matches measured frame pixels → none ≠ stretch.
          preserveAspectRatio={fitWidth ? "none" : "xMinYMid meet"}
          style={
            fitWidth
              ? { width: "100%", height: "100%", display: "block" }
              : {
                  width: w,
                  height: 460,
                  maxWidth: "none",
                  display: "block",
                }
          }
          className={fitWidth ? "h-full w-full" : "max-w-none"}
          role="img"
          aria-label={aria}
        >
          {gridYs.map((gy, gi) => (
            <g key={gy}>
              <line
                x1={padL}
                x2={w - padR}
                y1={gy}
                y2={gy}
                className="stroke-border/55"
                strokeWidth={1}
              />
              <text
                x={w - 12}
                y={gy}
                textAnchor="end"
                dominantBaseline={
                  gi === 0 ? "hanging" : gi === gridYs.length - 1 ? "auto" : "middle"
                }
                className="fill-muted-foreground"
                fontSize={13}
              >
                {formatNumber(max - (gi / (gridYs.length - 1)) * span)}
              </text>
            </g>
          ))}
          {lineMode ? (
            <>
              <path
                fill="none"
                className="stroke-foreground/70"
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                d={bars
                  .map((b, i) => {
                    const x = padL + slot * i + slot / 2;
                    const y = yFor(b.close);
                    return i === 0 ? `M ${x} ${y}` : `H ${x} V ${y}`;
                  })
                  .join(" ")}
              />
              {bars.map((b, i) => {
                const bodyOpen = candleBodyOpen(bars, i);
                const cx = padL + slot * i + slot / 2;
                const yC = yFor(b.close);
                const up = b.close > bodyOpen;
                const down = b.close < bodyOpen;
                return (
                  <g key={`${b.trade_date}-${i}`}>
                    <title>{barTooltip(b, bodyOpen)}</title>
                    <rect
                      x={cx - slot / 2}
                      y={padT}
                      width={slot}
                      height={plotH}
                      fill="transparent"
                    />
                    {up || down ? (
                      <circle
                        cx={cx}
                        cy={yC}
                        r={3.5}
                        className={
                          up
                            ? "fill-emerald-500 dark:fill-emerald-400"
                            : "fill-rose-500 dark:fill-rose-400"
                        }
                      />
                    ) : null}
                  </g>
                );
              })}
            </>
          ) : (
            bars.map((b, i) => {
              const bodyOpen = candleBodyOpen(bars, i);
              const cx = padL + slot * i + slot / 2;
              const yH = yFor(b.high);
              const yL = yFor(b.low);
              const yO = yFor(bodyOpen);
              const yC = yFor(b.close);
              const eps = span * 1e-6;
              const up = b.close > bodyOpen + eps;
              const down = b.close < bodyOpen - eps;

              const stroke = up
                ? "stroke-emerald-700 dark:stroke-emerald-400"
                : down
                  ? "stroke-rose-700 dark:stroke-rose-400"
                  : "stroke-zinc-500 dark:stroke-zinc-400";
              const fillCls = up
                ? "fill-emerald-500 dark:fill-emerald-400"
                : down
                  ? "fill-rose-500 dark:fill-rose-400"
                  : "fill-zinc-500 dark:fill-zinc-400";

              // Flat / doji (incl. CSE null-open when close ≈ prior close):
              // real high–low wick + thin body — never a fake "+" cross.
              const naturalH = Math.abs(yC - yO);
              const bodyH = up || down ? Math.max(naturalH, 5) : Math.max(2, slot * 0.08);
              const bodyTop =
                up || down
                  ? Math.min(yO, yC) - (bodyH - naturalH) / 2
                  : yC - bodyH / 2;

              return (
                <g key={`${b.trade_date}-${i}`}>
                  <title>{barTooltip(b, bodyOpen)}</title>
                  <rect
                    x={cx - slot / 2}
                    y={padT}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                  />
                  <line
                    x1={cx}
                    x2={cx}
                    y1={yH}
                    y2={yL}
                    className={stroke}
                    strokeWidth={wickW}
                    strokeLinecap="round"
                  />
                  <rect
                    x={cx - bodyW / 2}
                    y={bodyTop}
                    width={bodyW}
                    height={bodyH}
                    rx={1.25}
                    className={fillCls}
                  />
                </g>
              );
            })
          )}
          {/* Last-close reference line + axis tag (TradingView convention) */}
          <g aria-hidden>
            <line
              x1={padL}
              x2={w - padR}
              y1={yFor(last.close)}
              y2={yFor(last.close)}
              strokeDasharray="3 3"
              strokeWidth={1}
              className={
                last.close > candleBodyOpen(bars, n - 1)
                  ? "stroke-emerald-600/60 dark:stroke-emerald-400/60"
                  : last.close < candleBodyOpen(bars, n - 1)
                    ? "stroke-rose-600/60 dark:stroke-rose-400/60"
                    : "stroke-muted-foreground/50"
              }
            />
            <rect
              x={w - padR + 2}
              y={yFor(last.close) - 10}
              width={padR - 6}
              height={20}
              rx={5}
              className={
                last.close > candleBodyOpen(bars, n - 1)
                  ? "fill-emerald-500/15"
                  : last.close < candleBodyOpen(bars, n - 1)
                    ? "fill-rose-500/15"
                    : "fill-muted"
              }
            />
            <text
              x={w - 12}
              y={yFor(last.close)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={600}
              className={
                last.close > candleBodyOpen(bars, n - 1)
                  ? "fill-emerald-700 dark:fill-emerald-300"
                  : last.close < candleBodyOpen(bars, n - 1)
                    ? "fill-rose-700 dark:fill-rose-300"
                    : "fill-muted-foreground"
              }
            >
              {formatNumber(last.close)}
            </text>
          </g>
          {fc.length > 0 ? (
            <polyline
              fill="none"
              className="stroke-sky-600 dark:stroke-sky-400"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={[
                `${padL + slot * (n - 1) + slot / 2},${yFor(last.close)}`,
                ...fc.map(
                  (p, i) =>
                    `${padL + slot * (n + i) + slot / 2},${yFor(p)}`,
                ),
              ].join(" ")}
            />
          ) : null}
          <text
            x={padL}
            y={h - 14}
            className="fill-muted-foreground"
            fontSize={13}
          >
            {first.trade_date}
          </text>
          <text
            x={w - padR}
            y={h - 14}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={13}
          >
            {last.trade_date}
          </text>
        </svg>
      </div>
      <p className="mt-2.5 shrink-0 text-xs leading-relaxed text-muted-foreground">
        {footnote ??
          `${rawBars.length} sessions${aggregated ? ` → ${n} ${lineMode ? "points" : "candles"}` : ""}${lineMode ? " · step path (tick-size name)" : ""} · close ${formatNumber(first.close)} → ${formatNumber(last.close)} · ${upN} up / ${downN} down${flatN ? ` / ${flatN} flat` : ""}${fc.length > 0 ? " · dashed = model forecast" : ""} · research only`}
      </p>
    </div>
  );
}
