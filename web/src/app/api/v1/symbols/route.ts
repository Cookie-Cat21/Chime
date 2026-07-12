import type { NextRequest } from "next/server";

import { toIso } from "@/lib/api/time";
import { jsonError, jsonOk } from "@/lib/auth/errors";
import { requireSession } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/v1/symbols — thin market browse from Postgres (latest snapshots).
 * Query: limit (default 50, max 200), offset, q (symbol/name substring),
 * sort=change_pct|symbol (default change_pct).
 * No cse.lk.
 */
export async function GET(request: NextRequest) {
  const gated = requireSession(request);
  if (!gated.ok) return gated.response;

  const sp = request.nextUrl.searchParams;
  let limit = Number.parseInt(sp.get("limit") ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);
  let offset = Number.parseInt(sp.get("offset") ?? "0", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  const q = (sp.get("q") ?? "").trim();
  const sortRaw = (sp.get("sort") ?? "change_pct").trim().toLowerCase();
  const sort = sortRaw === "symbol" ? "symbol" : "change_pct";

  try {
    const pool = getPool();
    const params: unknown[] = [];
    let where = "";
    if (q) {
      params.push(`%${q.toUpperCase()}%`);
      where = `WHERE s.symbol LIKE $1 OR UPPER(COALESCE(s.name, '')) LIKE $1`;
    }
    const order =
      sort === "symbol"
        ? "s.symbol ASC"
        : "ps.change_pct DESC NULLS LAST, s.symbol ASC";

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const result = await pool.query<{
      symbol: string;
      name: string | null;
      sector: string | null;
      price: number | null;
      change: number | null;
      change_pct: number | null;
      ts: Date | string | null;
    }>(
      // INNER JOIN: browse is poller-persisted snapshots only (not stub stocks).
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
       ORDER BY ${order}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const items = result.rows.map((row) => ({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
      price: row.price == null ? null : Number(row.price),
      change: row.change == null ? null : Number(row.change),
      change_pct: row.change_pct == null ? null : Number(row.change_pct),
      ts: toIso(row.ts),
    }));

    return jsonOk({
      items,
      limit,
      offset,
      sort,
      q: q || null,
    });
  } catch (err) {
    console.error("GET /symbols failed", err);
    return jsonError(503, "degraded", "Database unavailable.");
  }
}
