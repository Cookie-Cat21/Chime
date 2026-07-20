"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, useTransition } from "react";
import { Banknote, CalendarDays, Percent, Search } from "lucide-react";

import { InlineError } from "@/components/inline-error";
import {
  EventTimeline,
  type EventTimelineItem,
} from "@/components/kit/event-timeline";
import { StatCard } from "@/components/kit/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchDividendSymbol,
  type DividendSymbolPayload,
} from "@/lib/api/dividends";
import { normalizeSymbol } from "@/lib/api/symbol";
import {
  estimateDividend,
  MAX_DIVIDEND_DPS,
  MAX_DIVIDEND_SHARES,
} from "@/lib/dividends";
import { formatNumber, formatPct, formatTs } from "@/lib/format";
import { cn } from "@/lib/utils";

function parsePositiveInput(
  raw: string,
  max: number,
): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  return n;
}

/**
 * HyperUI-style KPI strip + Watermelon FAQ sibling page inputs.
 * Session-only shares — never persisted as portfolio holdings.
 */
export function DividendCalculator({
  initialSymbol = "",
  className,
}: {
  initialSymbol?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [shares, setShares] = useState("1000");
  const [dps, setDps] = useState("");
  const [payload, setPayload] = useState<DividendSymbolPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const seed = normalizeSymbol(initialSymbol);
    if (!seed) return;
    let cancelled = false;
    startTransition(async () => {
      setError(null);
      const res = await fetchDividendSymbol(seed);
      if (cancelled) return;
      if (!res.ok) {
        setPayload(null);
        setError(res.message);
        return;
      }
      setPayload(res.data);
      if (res.data.suggested_dps != null) {
        setDps(String(res.data.suggested_dps));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialSymbol]);

  function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeSymbol(symbol);
    if (!normalized) {
      setError("Enter a CSE symbol (e.g. JKH.N0000).");
      setPayload(null);
      return;
    }
    startTransition(async () => {
      const res = await fetchDividendSymbol(normalized);
      if (!res.ok) {
        setPayload(null);
        setError(res.message);
        return;
      }
      setPayload(res.data);
      setSymbol(res.data.symbol);
      if (res.data.suggested_dps != null) {
        setDps(String(res.data.suggested_dps));
      }
    });
  }

  const sharesN = parsePositiveInput(shares, MAX_DIVIDEND_SHARES);
  const dpsN = parsePositiveInput(dps, MAX_DIVIDEND_DPS);
  const estimate = estimateDividend(sharesN, dpsN, payload?.last_price ?? null);

  const timeline: EventTimelineItem[] =
    payload?.items.map((item) => {
      const bits: string[] = [];
      if (item.parsed.dps != null) {
        bits.push(`DPS ${formatNumber(item.parsed.dps)} LKR`);
      }
      if (item.parsed.xd) bits.push(`XD ${item.parsed.xd}`);
      if (item.parsed.payment) bits.push(`Pay ${item.parsed.payment}`);
      if (item.parsed.dates_tbd) bits.push("Dates TBD");
      return {
        id: String(item.id),
        at: item.published_at ? formatTs(item.published_at) : null,
        title: item.title,
        href: item.pdf_url || item.url,
        external: true,
        badge: item.category,
        meta: bits.length > 0 ? bits.join(" · ") : null,
        emphasis: item.parsed.dates_tbd ? "empty" : "default",
      };
    }) ?? [];

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <form
        onSubmit={onLookup}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
        noValidate
        aria-labelledby={`${formId}-lookup`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${formId}-symbol`} id={`${formId}-lookup`}>
            Symbol
          </Label>
          <Input
            id={`${formId}-symbol`}
            name="symbol"
            className="h-10 font-mono"
            placeholder="e.g. JKH.N0000"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${formId}-error` : undefined}
            required
          />
        </div>
        <Button
          type="submit"
          className="h-10 shrink-0"
          disabled={pending}
          aria-busy={pending}
        >
          <Search className="size-4" aria-hidden />
          {pending ? "Loading…" : "Look up"}
        </Button>
      </form>

      {error ? (
        <InlineError id={`${formId}-error`} message={error} />
      ) : null}

      {payload ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/symbols/${encodeURIComponent(payload.symbol)}`}
              className="font-mono text-lg font-semibold tracking-tight text-foreground underline-offset-2 hover:underline"
            >
              {payload.symbol}
            </Link>
            {payload.name ? (
              <span className="text-sm text-muted-foreground">
                {payload.name}
              </span>
            ) : null}
            {payload.last_price != null ? (
              <Badge variant="outline" className="font-mono tabular-nums">
                Last {formatNumber(payload.last_price)} LKR
                {payload.last_ts ? (
                  <span className="ml-1 font-sans text-muted-foreground">
                    · {formatTs(payload.last_ts)}
                  </span>
                ) : null}
              </Badge>
            ) : (
              <Badge variant="outline">No snapshot yet</Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-shares`}>Shares (session only)</Label>
              <Input
                id={`${formId}-shares`}
                inputMode="decimal"
                className="h-10 font-mono tabular-nums"
                placeholder="1000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                aria-describedby={`${formId}-shares-hint`}
              />
              <p
                id={`${formId}-shares-hint`}
                className="text-xs text-muted-foreground"
              >
                Not saved to a portfolio — estimate only.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-dps`}>DPS (LKR / share)</Label>
              <Input
                id={`${formId}-dps`}
                inputMode="decimal"
                className="h-10 font-mono tabular-nums"
                placeholder={
                  payload.suggested_dps != null
                    ? String(payload.suggested_dps)
                    : "e.g. 1.50"
                }
                value={dps}
                onChange={(e) => setDps(e.target.value)}
                aria-describedby={`${formId}-dps-hint`}
              />
              <p
                id={`${formId}-dps-hint`}
                className="text-xs text-muted-foreground"
              >
                Prefills from filings when parseable; you can override.
              </p>
            </div>
          </div>

          <motion.div
            key={`${estimate.cash ?? "x"}-${estimate.yield_pct ?? "y"}`}
            initial={reduceMotion ? false : { opacity: 0.55 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <StatCard
              label="Estimated cash"
              value={
                estimate.cash != null
                  ? `${formatNumber(estimate.cash)} LKR`
                  : "—"
              }
              hint={
                sharesN != null && dpsN != null
                  ? `${formatNumber(sharesN, 0)} × ${formatNumber(dpsN)} DPS`
                  : "Enter shares and DPS"
              }
              icon={Banknote}
            />
            <StatCard
              label="Event yield"
              value={
                estimate.yield_pct != null
                  ? formatPct(estimate.yield_pct)
                  : "—"
              }
              hint={
                payload.last_price != null
                  ? "DPS ÷ last price"
                  : "Needs a last price"
              }
              icon={Percent}
            />
            <StatCard
              label="Filings on file"
              value={String(payload.items.length)}
              hint="Dividend-labelled disclosures"
              icon={CalendarDays}
            />
          </motion.div>

          <section aria-labelledby={`${formId}-timeline`}>
            <h2
              id={`${formId}-timeline`}
              className="font-display text-lg font-semibold tracking-tight"
            >
              Dividend timeline
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From CSE disclosures koel already stored. XD and payment show when
              the filing text includes them — the market stays open on XD day.
            </p>
            <div className="mt-4">
              <EventTimeline
                items={timeline}
                empty={
                  <p className="text-sm text-muted-foreground">
                    No dividend disclosures stored for this symbol yet. Run the
                    poller, or set a disclosure alert for category Dividend on{" "}
                    <Link
                      href="/alerts"
                      className="underline-offset-2 hover:underline"
                    >
                      Alerts
                    </Link>
                    .
                  </p>
                }
              />
            </div>
          </section>
        </motion.div>
      ) : null}
    </div>
  );
}
