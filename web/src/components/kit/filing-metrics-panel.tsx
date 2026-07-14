import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPct, formatTs } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FilingMetricRow = {
  kind: string | null;
  entity: string | null;
  currency: string | null;
  fiscal_period_end: string | null;
  eps_basic: number | null;
  revenue: number | null;
  profit: number | null;
  extract_ok: boolean;
};

export type FilingMetricComparison = {
  match_quality: "exact_yoy" | "approx_yoy" | null;
  eps_delta_pct: number | null;
  revenue_delta_pct: number | null;
  profit_delta_pct: number | null;
};

export type LatestBrief = {
  title: string;
  text: string;
};

export function FilingMetricsPanel({
  metrics,
  comparison,
  latestBrief,
  className,
}: {
  metrics: FilingMetricRow | null;
  comparison: FilingMetricComparison | null;
  latestBrief: LatestBrief | null;
  className?: string;
}) {
  const comparable =
    comparison?.match_quality === "exact_yoy" ||
    comparison?.match_quality === "approx_yoy";

  return (
    <section
      className={cn("mt-8 border-t border-border/60 pt-6", className)}
      aria-labelledby="filing-metrics-heading"
    >
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <h2
            id="filing-metrics-heading"
            className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
          >
            Filing metrics
          </h2>
          {metrics ? (
            <div className="mt-3 rounded-lg border border-border/70 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {metrics.kind ? <span>{metrics.kind}</span> : null}
                {metrics.entity ? <span>· {metrics.entity}</span> : null}
                {metrics.currency ? <span>· {metrics.currency}</span> : null}
                {metrics.fiscal_period_end ? (
                  <span>
                    · period ended {formatMetricDate(metrics.fiscal_period_end)}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricValue
                  label="Basic EPS"
                  value={formatNumber(metrics.eps_basic, 4)}
                  deltaPct={comparable ? comparison?.eps_delta_pct : null}
                />
                <MetricValue
                  label="Revenue"
                  value={formatNumber(metrics.revenue)}
                  deltaPct={comparable ? comparison?.revenue_delta_pct : null}
                />
                <MetricValue
                  label="Profit"
                  value={formatNumber(metrics.profit)}
                  deltaPct={comparable ? comparison?.profit_delta_pct : null}
                />
              </div>
              {comparable ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  YoY comparison: {comparison?.match_quality}. Extracted
                  numbers need filing verification.
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No exact or approximate YoY comparison for this filing yet.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border/70 p-4">
              <p className="text-sm text-muted-foreground">
                No filing metrics extracted yet.
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Latest brief
          </h3>
          {latestBrief ? (
            <article className="mt-3 rounded-lg border border-border/70 bg-muted/25 p-4">
              <p className="text-sm font-medium">{latestBrief.title}</p>
              <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-muted-foreground">
                {latestBrief.text}
              </p>
            </article>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border/70 p-4">
              <p className="text-sm text-muted-foreground">
                No ready brief yet — AI briefs when enabled.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatMetricDate(value: string | null): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return formatTs(value);
}

function MetricValue({
  label,
  value,
  deltaPct,
}: {
  label: string;
  value: string;
  deltaPct: number | null | undefined;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-lg font-medium tabular-nums">
        {value}
      </p>
      <div className="mt-2">
        <YoyBadge value={deltaPct} />
      </div>
    </div>
  );
}

function YoyBadge({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/50 font-mono text-muted-foreground"
      >
        <Minus className="size-3" aria-hidden />
        YoY —
      </Badge>
    );
  }

  const up = value > 0;
  const down = value < 0;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono tabular-nums",
        up &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        down &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        !up && !down && "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden />
      YoY {formatPct(value)}
    </Badge>
  );
}
