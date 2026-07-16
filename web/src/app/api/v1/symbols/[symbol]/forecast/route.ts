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
      confidence: number | null;
      confidence_band: string | null;
      gate: string | null;
      reasons: unknown;
    }>(
      `
      SELECT ts, yhat, horizon_i, confidence, confidence_band, gate, reasons
      FROM forecast_points
      WHERE symbol = $1 AND model_version = $2 AND as_of = $3
      ORDER BY horizon_i ASC
      LIMIT $4
      `,
      [symbol, modelVersion, asOf, MAX_FORECAST_POINTS],
    );

    const points: {
      ts: string | null;
      price: number | null;
      horizon_i: number;
      confidence: number | null;
      confidence_band: string | null;
    }[] = [];
    let gate: string | null = null;
    let confidenceBand: string | null = null;
    let confidence: number | null = null;
    const reasons: string[] = [];
    for (const row of rows.rows) {
      const price = toFiniteNumber(row.yhat);
      if (price == null) continue;
      const conf = toFiniteNumber(row.confidence);
      points.push({
        ts: toIso(row.ts),
        price,
        horizon_i: row.horizon_i,
        confidence: conf,
        confidence_band:
          typeof row.confidence_band === "string" ? row.confidence_band : null,
      });
      if (gate == null && typeof row.gate === "string") gate = row.gate;
      if (confidenceBand == null && typeof row.confidence_band === "string") {
        confidenceBand = row.confidence_band;
      }
      if (confidence == null && conf != null) confidence = conf;
      if (Array.isArray(row.reasons)) {
        for (const r of row.reasons) {
          if (typeof r === "string" && r.trim() && reasons.length < 6) {
            reasons.push(r.trim());
          }
        }
      }
    }

    let asOfOut: string | null = null;
    if (asOf instanceof Date) asOfOut = asOf.toISOString().slice(0, 10);
    else if (typeof asOf === "string") asOfOut = asOf.slice(0, 10);

    return jsonOk({
      symbol,
      points,
      model_version: typeof modelVersion === "string" ? modelVersion : null,
      as_of: asOfOut,
      gate,
      confidence,
      confidence_band: confidenceBand,
      reasons,
      disclaimer:
        "Dashed forecast is a model estimate — research only, not financial advice. Confidence is historical OOS calibration, not a guarantee.",
    });
  } catch (err) {
    console.error("GET /symbols/forecast failed", err);
    return jsonError(503, "degraded", "Database unavailable.");
  }
}
