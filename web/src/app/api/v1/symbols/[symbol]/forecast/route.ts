import type { NextRequest } from "next/server";

import { toFiniteNumber } from "@/lib/api/finite-number";
import { normalizeSymbolParam } from "@/lib/api/symbol";
import { toIso } from "@/lib/api/time";
import { jsonError, jsonOk } from "@/lib/auth/errors";
import { requireSession } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

const MAX_FORECAST_POINTS = 30;

/**
 * GET /api/v1/symbols/{symbol}/forecast — latest model path estimates.
 * Overlay-only; not a price target. Session required. Postgres only.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const gated = requireSession(request);
  if (!gated.ok) return gated.response;

  const { symbol: raw } = await ctx.params;
  const symbol = normalizeSymbolParam(raw);
  if (!symbol) {
    return jsonError(400, "validation_error", "Invalid symbol.");
  }

  try {
    const pool = getPool();
    const latest = await pool.query<{ as_of: Date | string; model_version: string }>(
      `
      SELECT as_of, model_version
      FROM forecast_points
      WHERE symbol = $1
      ORDER BY as_of DESC, computed_at DESC
      LIMIT 1
      `,
      [symbol],
    );
    if (latest.rowCount === 0) {
      return jsonOk({
        symbol,
        points: [],
        model_version: null,
        as_of: null,
        disclaimer: "Model estimate when available — not financial advice.",
      });
    }
    const asOf = latest.rows[0]!.as_of;
    const modelVersion = latest.rows[0]!.model_version;
    const rows = await pool.query<{
      ts: Date | string;
      yhat: number;
      horizon_i: number;
    }>(
      `
      SELECT ts, yhat, horizon_i
      FROM forecast_points
      WHERE symbol = $1 AND model_version = $2 AND as_of = $3
      ORDER BY horizon_i ASC
      LIMIT $4
      `,
      [symbol, modelVersion, asOf, MAX_FORECAST_POINTS],
    );

    const points: { ts: string | null; price: number | null; horizon_i: number }[] =
      [];
    for (const row of rows.rows) {
      const price = toFiniteNumber(row.yhat);
      if (price == null) continue;
      points.push({
        ts: toIso(row.ts),
        price,
        horizon_i: row.horizon_i,
      });
    }

    let asOfOut: string | null = null;
    if (asOf instanceof Date) asOfOut = asOf.toISOString().slice(0, 10);
    else if (typeof asOf === "string") asOfOut = asOf.slice(0, 10);

    return jsonOk({
      symbol,
      points,
      model_version: typeof modelVersion === "string" ? modelVersion : null,
      as_of: asOfOut,
      disclaimer:
        "Dashed forecast is a model estimate from recent path returns — not financial advice.",
    });
  } catch (err) {
    console.error("GET /symbols/forecast failed", err);
    return jsonError(503, "degraded", "Database unavailable.");
  }
}
