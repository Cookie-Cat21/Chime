import Link from "next/link";

import { AppetiteMeter } from "@/components/appetite/appetite-meter";
import {
  BAND_LABEL,
  type AppetiteDay,
} from "@/lib/api/appetite";
import { NfaInline } from "@/components/nfa-inline";
import { cn } from "@/lib/utils";

function AppetiteMiniSpark({ historyAsc }: { historyAsc: AppetiteDay[] }) {
  const series = historyAsc.slice(-60);
  if (series.length < 2) return null;
  const scores = series.map((d) => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max !== min ? max - min : 1;
  const w = 160;
  const h = 40;
  const pad = 3;
  const pts = series
    .map((d, i) => {
      const x = pad + (i / (series.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (d.score - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = scores[scores.length - 1]! >= scores[0]!;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-10 w-full"
      role="img"
      aria-label={`Appetite spark, ${series.length} sessions`}
    >
      <polyline
        fill="none"
        stroke={up ? "oklch(0.45 0.08 185)" : "oklch(0.5 0.1 25)"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

function fmtDelta(d: number | null): string {
  if (d == null || !Number.isFinite(d)) return "—";
  const r = Math.round(d * 10) / 10;
  return `${r > 0 ? "+" : ""}${r.toFixed(1)}`;
}

/**
 * Overview strip — score + spectrum + spark + link (not a StatCard wall).
 */
export function AppetiteStrip({
  latest,
  historyAsc,
  delta1,
  className,
}: {
  latest: AppetiteDay | null;
  historyAsc: AppetiteDay[];
  delta1: number | null;
  className?: string;
}) {
  if (!latest) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border/80 bg-muted/10 px-3 py-3",
          className,
        )}
        role="status"
      >
        <p className="text-sm text-muted-foreground">
          Market Appetite not computed yet. Run{" "}
          <span className="font-mono text-xs">appetite-backfill</span>.
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-border/80 bg-muted/15 px-3 py-3 sm:px-4",
        className,
      )}
      aria-labelledby="appetite-strip-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            id="appetite-strip-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Market Appetite
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
              {Math.round(latest.score)}
            </span>
            <span className="text-sm font-medium text-foreground">
              {BAND_LABEL[latest.band]}
            </span>
            <span
              className={cn(
                "font-mono text-xs tabular-nums",
                (delta1 ?? 0) > 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : (delta1 ?? 0) < 0
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-muted-foreground",
              )}
            >
              {fmtDelta(delta1)} vs prior session
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
            {latest.trade_date}
            {latest.advancers != null && latest.decliners != null
              ? ` · ${latest.advancers}↑ ${latest.decliners}↓`
              : null}
            {` · n=${latest.universe_n}`}
          </p>
        </div>
        <div className="w-full max-w-[11rem] sm:w-40">
          <AppetiteMiniSpark historyAsc={historyAsc} />
        </div>
      </div>
      <AppetiteMeter
        score={latest.score}
        band={latest.band}
        size="md"
        className="mt-3"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <NfaInline />
        <Link
          href="/appetite"
          className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
        >
          Full history →
        </Link>
      </div>
    </section>
  );
}
