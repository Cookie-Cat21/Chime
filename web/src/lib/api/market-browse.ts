/**
 * Shared Postgres browse for GET /api/v1/symbols and /api/v1/market/movers.
 * Latest price_snapshots via INNER JOIN — thin discovery, not a screener.
 */

import type { Pool } from "pg";

import {
  MAX_HISTORY_SYMBOL_LENGTH,
  MAX_STOCK_NAME_LENGTH,
  MAX_STOCK_SECTOR_LENGTH,
  sanitizeDisclosureText,
} from "@/lib/api/disclosure-safe";
import { escapeLikePattern } from "@/lib/api/market-query";
import { toIso } from "@/lib/api/time";

export type MarketBrowseSort = "change_pct" | "change_pct_asc" | "symbol";

/** Movers sign filter: only strictly positive (up) or negative (down) %. */
export type MarketBrowseDirection = "up" | "down";

export type MarketBrowseRow = {
  symbol: string;
  name: string | null;
  sector: string | null;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  ts: string | null;
};

export type MarketBrowseQuery = {
  limit: number;
  offset: number;
  /** Already normalized (or empty). */
  q?: string;
  sort: MarketBrowseSort;
  /**
   * Optional movers fence: `up` ⇒ change_pct > 0, `down` ⇒ change_pct < 0.
   * Excludes flats/nulls so "gainers"/"losers" cannot mislabel opposite moves.
   */
  direction?: MarketBrowseDirection;
};

function orderClause(sort: MarketBrowseSort): string {
  if (sort === "symbol") return "s.symbol ASC";
  if (sort === "change_pct_asc") {
    return "ps.change_pct ASC NULLS LAST, s.symbol ASC";
  }
  return "ps.change_pct DESC NULLS LAST, s.symbol ASC";
}

/** Cap hostile numeric strings before Number() (CSE quotes never need more). */
export const MAX_FINITE_NUMBER_STRING_LENGTH = 32;

/** Decimal only — reject sci-notation / hex / empty (Number("")===0 footgun). */
const FINITE_DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/**
 * Coerce PG numerics to finite numbers; NaN/±Infinity → null (safe JSON egress).
 *
 * Medium: bare Number() on any unknown soft-accepted ""→0, true→1, []→0,
 * and "1e2" sci-notation. Only number primitives or plain decimal strings.
 */
export function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed.length > MAX_FINITE_NUMBER_STRING_LENGTH ||
      !FINITE_DECIMAL_RE.test(trimmed)
    ) {
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Latest snapshot per stock (INNER JOIN). Optional `q` substring on symbol/name.
 * Optional `direction` sign filter for thin movers (not a screener).
 */
export async function queryMarketBrowse(
  pool: Pool,
  opts: MarketBrowseQuery,
): Promise<MarketBrowseRow[]> {
  const params: unknown[] = [];
  const whereParts: string[] = [];
  const q = opts.q?.trim() ?? "";
  if (q) {
    params.push(`%${escapeLikePattern(q.toUpperCase())}%`);
    whereParts.push(
      `(UPPER(s.symbol) LIKE $${params.length} ESCAPE '\\' OR UPPER(COALESCE(s.name, '')) LIKE $${params.length} ESCAPE '\\')`,
    );
  }
  if (opts.direction === "up") {
    whereParts.push("ps.change_pct > 0");
  } else if (opts.direction === "down") {
    whereParts.push("ps.change_pct < 0");
  }

  params.push(opts.limit);
  const limitIdx = params.length;
  params.push(opts.offset);
  const offsetIdx = params.length;

  const where =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const result = await pool.query<{
    symbol: string;
    name: string | null;
    sector: string | null;
    price: number | null;
    change: number | null;
    change_pct: number | null;
    ts: Date | string | null;
  }>(
    `SELECT
       s.symbol,
       s.name,
       s.sector,
       ps.price,
       ps.change,
       ps.change_pct,
       ps.ts
     FROM stocks s
     INNER JOIN LATERAL (
       SELECT price, change, change_pct, ts
       FROM price_snapshots
       WHERE symbol = s.symbol
       ORDER BY ts DESC, id DESC
       LIMIT 1
     ) ps ON TRUE
     ${where}
     ORDER BY ${orderClause(opts.sort)}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );

  return result.rows.flatMap((row) => {
    const symbol =
      sanitizeDisclosureText(row.symbol, MAX_HISTORY_SYMBOL_LENGTH) ?? "";
    if (!symbol) return [];
    return [
      {
        symbol,
        name: sanitizeDisclosureText(row.name, MAX_STOCK_NAME_LENGTH),
        sector: sanitizeDisclosureText(row.sector, MAX_STOCK_SECTOR_LENGTH),
        price: toFiniteNumber(row.price),
        change: toFiniteNumber(row.change),
        change_pct: toFiniteNumber(row.change_pct),
        ts: toIso(row.ts),
      },
    ];
  });
}
