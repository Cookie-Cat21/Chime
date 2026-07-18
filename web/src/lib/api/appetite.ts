/**
 * Market Appetite — daily CSE breadth composite (Postgres only).
 * Research score 0–100 — not personal net worth, not a tip.
 */

import type { Pool } from "pg";

import { toFiniteNumber } from "@/lib/api/finite-number";
import { toIso } from "@/lib/api/time";

export const APPETITE_BANDS = [
  "extreme_caution",
  "caution",
  "neutral",
  "appetite",
  "strong_appetite",
] as const;

export type AppetiteBand = (typeof APPETITE_BANDS)[number];

export type AppetiteDay = {
  trade_date: string;
  score: number;
  band: AppetiteBand;
  components: {
    breadth: number | null;
    intensity: number | null;
    index: number | null;
    participation: number | null;
  };
  source: "cse" | "hybrid_research";
  universe_n: number;
  advancers: number | null;
  decliners: number | null;
  unchanged: number | null;
  aspi_change_pct: number | null;
  computed_at: string | null;
};

export const BAND_LABEL: Record<AppetiteBand, string> = {
  extreme_caution: "Extreme Caution",
  caution: "Caution",
  neutral: "Neutral",
  appetite: "Appetite",
  strong_appetite: "Strong Appetite",
};

/** Soft zone fills — muted, not neon. */
export const BAND_ZONE_COLOR: Record<AppetiteBand, string> = {
  extreme_caution: "oklch(0.72 0.06 25)",
  caution: "oklch(0.78 0.05 55)",
  neutral: "oklch(0.82 0.02 250)",
  appetite: "oklch(0.78 0.05 165)",
  strong_appetite: "oklch(0.72 0.07 155)",
};

export function normalizeBand(raw: unknown): AppetiteBand {
  if (typeof raw === "string" && (APPETITE_BANDS as readonly string[]).includes(raw)) {
    return raw as AppetiteBand;
  }
  return "neutral";
}

export function bandForScore(score: number): AppetiteBand {
  if (!Number.isFinite(score)) return "neutral";
  const s = Math.max(0, Math.min(100, score));
  if (s < 20) return "extreme_caution";
  if (s < 40) return "caution";
  if (s < 60) return "neutral";
  if (s < 80) return "appetite";
  return "strong_appetite";
}

function parseComponents(raw: unknown): AppetiteDay["components"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      breadth: null,
      intensity: null,
      index: null,
      participation: null,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    breadth: toFiniteNumber(o.breadth),
    intensity: toFiniteNumber(o.intensity),
    index: toFiniteNumber(o.index),
    participation: toFiniteNumber(o.participation),
  };
}

function asDateIso(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "string") {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1]! : null;
  }
  return null;
}

function rowToDay(row: Record<string, unknown>): AppetiteDay | null {
  const trade_date = asDateIso(row.trade_date);
  const score = toFiniteNumber(row.score);
  if (!trade_date || score == null) return null;
  const source =
    row.source === "hybrid_research" ? "hybrid_research" : "cse";
  return {
    trade_date,
    score: Math.max(0, Math.min(100, score)),
    band: normalizeBand(row.band),
    components: parseComponents(row.components),
    source,
    universe_n: Math.max(0, Math.floor(toFiniteNumber(row.universe_n) ?? 0)),
    advancers:
      row.advancers == null ? null : Math.floor(toFiniteNumber(row.advancers) ?? 0),
    decliners:
      row.decliners == null ? null : Math.floor(toFiniteNumber(row.decliners) ?? 0),
    unchanged:
      row.unchanged == null ? null : Math.floor(toFiniteNumber(row.unchanged) ?? 0),
    aspi_change_pct: toFiniteNumber(row.aspi_change_pct),
    computed_at: toIso(row.computed_at),
  };
}

export async function queryAppetiteHistory(
  pool: Pool,
  opts: { limit?: number; source?: "cse" | "hybrid_research" } = {},
): Promise<AppetiteDay[]> {
  const limit = Math.min(Math.max(opts.limit ?? 252, 1), 2000);
  const source = opts.source ?? "cse";
  const result = await pool.query(
    `
    SELECT
      trade_date, score, band, components, source,
      universe_n, advancers, decliners, unchanged,
      aspi_change_pct, computed_at
    FROM market_appetite_daily
    WHERE source = $1
    ORDER BY trade_date DESC
    LIMIT $2
    `,
    [source, limit],
  );
  const out: AppetiteDay[] = [];
  for (const row of result.rows) {
    const day = rowToDay(row as Record<string, unknown>);
    if (day) out.push(day);
  }
  // Ascending for charts
  return out.reverse();
}

export async function queryLatestAppetite(
  pool: Pool,
  source: "cse" | "hybrid_research" = "cse",
): Promise<AppetiteDay | null> {
  const hist = await queryAppetiteHistory(pool, { limit: 1, source });
  return hist[0] ?? null;
}

export function deltaVs(
  historyAsc: AppetiteDay[],
  daysBack: number,
): number | null {
  if (historyAsc.length < 2) return null;
  const latest = historyAsc[historyAsc.length - 1]!;
  const idx = historyAsc.length - 1 - daysBack;
  if (idx < 0) return null;
  const prev = historyAsc[idx]!;
  const d = latest.score - prev.score;
  return Number.isFinite(d) ? d : null;
}

export function daysInCurrentBand(historyAsc: AppetiteDay[]): number {
  if (historyAsc.length === 0) return 0;
  const band = historyAsc[historyAsc.length - 1]!.band;
  let n = 0;
  for (let i = historyAsc.length - 1; i >= 0; i--) {
    if (historyAsc[i]!.band !== band) break;
    n += 1;
  }
  return n;
}
