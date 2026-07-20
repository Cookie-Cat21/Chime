import type { NextRequest } from "next/server";

import {
  MAX_DISCLOSURE_CATEGORY_LENGTH,
  MAX_DISCLOSURE_TITLE_LENGTH,
  MAX_STOCK_NAME_LENGTH,
  normalizeBriefStatus,
  safeAnnouncementUrl,
  safePdfUrl,
  sanitizeBriefText,
  sanitizeDisclosureText,
} from "@/lib/api/disclosure-safe";
import { toFiniteNumber } from "@/lib/api/market-browse";
import { toSafePositiveInt } from "@/lib/api/safe-int";
import { normalizeSymbol, normalizeSymbolParam } from "@/lib/api/symbol";
import { toIso } from "@/lib/api/time";
import { jsonError, jsonOk } from "@/lib/auth/errors";
import { requireSession } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";
import {
  isDividendDisclosure,
  mergeDividendHints,
} from "@/lib/dividends";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ symbol: string }> };

/**
 * GET /api/v1/symbols/{symbol}/dividends — dividend-ish disclosures + last price.
 * Postgres only; never cse.lk. Parses DPS / XD / payment hints from title+brief.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const gated = await requireSession(_request);
  if (!gated.ok) return gated.response;

  const { symbol: raw } = await context.params;
  const symbol = normalizeSymbolParam(raw);
  if (!symbol) {
    return jsonError(400, "invalid_symbol", "Invalid symbol.");
  }

  try {
    const pool = getPool();
    const stock = await pool.query<{
      symbol: string;
      name: string | null;
    }>(`SELECT symbol, name FROM stocks WHERE symbol = $1`, [symbol]);
    if (stock.rows.length === 0) {
      return jsonError(404, "not_found", "Unknown symbol.");
    }

    const snap = await pool.query<{
      price: number;
      ts: Date | string;
    }>(
      `SELECT price, ts
       FROM price_snapshots
       WHERE symbol = $1
       ORDER BY ts DESC
       LIMIT 1`,
      [symbol],
    );

    // Prefer category/title match; widen scan then filter in app so ILIKE
    // does not miss odd CSE labels (e.g. "CASH DIVIDEND (DATES…)").
    const result = await pool.query<{
      id: string | number;
      title: string;
      category: string | null;
      url: string;
      published_at: Date | string;
      pdf_url: string | null;
      brief: string | null;
      brief_status: string | null;
    }>(
      `SELECT d.id, d.title, d.category, d.url, d.published_at, d.pdf_url,
              b.brief, b.status AS brief_status
       FROM disclosures d
       LEFT JOIN disclosure_briefs b ON b.disclosure_id = d.id
       WHERE d.symbol = $1
         AND (
           d.category ILIKE '%dividend%'
           OR d.title ILIKE '%dividend%'
           OR d.category ILIKE '%cash div%'
           OR d.title ILIKE '%cash div%'
         )
       ORDER BY d.published_at DESC, d.id DESC
       LIMIT 40`,
      [symbol],
    );

    let suggested_dps: number | null = null;
    const items = result.rows.flatMap((row) => {
      const id = toSafePositiveInt(row.id);
      if (id == null) return [];
      const title =
        sanitizeDisclosureText(row.title, MAX_DISCLOSURE_TITLE_LENGTH) ?? "";
      if (!title) return [];
      const category = sanitizeDisclosureText(
        row.category,
        MAX_DISCLOSURE_CATEGORY_LENGTH,
      );
      if (!isDividendDisclosure(category, title)) return [];

      const brief_status = normalizeBriefStatus(row.brief_status);
      const brief = sanitizeBriefText(row.brief, brief_status);
      const parsed = mergeDividendHints([title, category, brief]);
      if (suggested_dps == null && parsed.dps != null) {
        suggested_dps = parsed.dps;
      }

      return [
        {
          id,
          title,
          category,
          url: safeAnnouncementUrl(row.url),
          pdf_url: safePdfUrl(row.pdf_url),
          published_at: toIso(row.published_at),
          brief,
          parsed,
        },
      ];
    });

    const last = snap.rows[0];
    return jsonOk({
      symbol: normalizeSymbol(stock.rows[0].symbol) ?? symbol,
      name: sanitizeDisclosureText(stock.rows[0].name, MAX_STOCK_NAME_LENGTH),
      last_price: last ? toFiniteNumber(last.price) : null,
      last_ts: last ? toIso(last.ts) : null,
      suggested_dps,
      items,
    });
  } catch (err) {
    console.error("GET /symbols/:symbol/dividends failed", err);
    return jsonError(503, "degraded", "Database unavailable.");
  }
}
