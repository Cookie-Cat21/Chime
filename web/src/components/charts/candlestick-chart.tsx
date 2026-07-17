"use client";

import { candleBodyOpen, type DailyBarPoint } from "@/lib/api/daily-bars";
import { formatNumber } from "@/lib/format";

/**
 * Lightweight SVG daily candlestick chart (green up / red down).
 * When CSE omits open, body/color use previous close so down days show red.
 * Research display only — not a trading terminal.
 */
export function CandlestickChart({
  bars,
  className,
}: {
  bars: DailyBarPoint[];
  className?: string;
}) {
  if (bars.length < 2) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Need at least two daily bars for a candlestick chart.
      </p>
    );
  }

  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const w = 720;
  const h = 320;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  let min = Infinity;
  let max = -Infinity;
  for (const b of bars) {
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  const span = max > min ? max - min : 1;
  const n = bars.length;
  const slot = plotW / n;
  const bodyW = Math.max(1.5, Math.min(8, slot * 0.55));

  const yFor = (price: number) =>
    padT + (1 - (price - min) / span) * plotH;

  const first = bars[0]!;
  const last = bars[n - 1]!;
  const aria = `Daily candles from ${first.trade_date} to ${last.trade_date}, close ${formatNumber(last.close)}`;

  const gridYs = [0.25, 0.5, 0.75].map((t) => padT + t * plotH);

  let upN = 0;
  let downN = 0;
  let flatN = 0;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full max-h-[360px]"
        role="img"
        aria-label={aria}
      >
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          className="fill-muted/20"
          rx={8}
        />
        {gridYs.map((gy) => (
          <line
            key={gy}
            x1={padL}
            x2={w - padR}
            y1={gy}
            y2={gy}
            className="stroke-border/60"
            strokeWidth={1}
          />
        ))}
        {bars.map((b, i) => {
          const bodyOpen = candleBodyOpen(bars, i);
          const cx = padL + slot * i + slot / 2;
          const yH = yFor(b.high);
          const yL = yFor(b.low);
          const yO = yFor(bodyOpen);
          const yC = yFor(b.close);
          const up = b.close > bodyOpen;
          const down = b.close < bodyOpen;
          if (up) upN += 1;
          else if (down) downN += 1;
          else flatN += 1;
          const bodyTop = Math.min(yO, yC);
          const bodyH = Math.max(1, Math.abs(yC - yO));
          const stroke = up
            ? "stroke-emerald-600 dark:stroke-emerald-400"
            : down
              ? "stroke-rose-600 dark:stroke-rose-400"
              : "stroke-muted-foreground";
          const fill = up
            ? "fill-emerald-500/90 dark:fill-emerald-400/90"
            : down
              ? "fill-rose-500/90 dark:fill-rose-400/90"
              : "fill-muted-foreground/50";
          return (
            <g key={b.trade_date}>
              <line
                x1={cx}
                x2={cx}
                y1={yH}
                y2={yL}
                className={stroke}
                strokeWidth={1}
              />
              <rect
                x={cx - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
                className={`${fill} ${stroke}`}
                strokeWidth={0.5}
              />
            </g>
          );
        })}
        <text
          x={padL}
          y={h - 10}
          className="fill-muted-foreground"
          fontSize={10}
        >
          {first.trade_date}
        </text>
        <text
          x={w - padR}
          y={h - 10}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {last.trade_date}
        </text>
        <text
          x={w - padR}
          y={padT + 10}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {formatNumber(max)}
        </text>
        <text
          x={w - padR}
          y={h - padB}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {formatNumber(min)}
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        {n} sessions · close {formatNumber(first.close)} →{" "}
        {formatNumber(last.close)} · {upN} up / {downN} down
        {flatN ? ` / ${flatN} flat` : ""} · vs prior close when open missing ·
        research only
      </p>
    </div>
  );
}
