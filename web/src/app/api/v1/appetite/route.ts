import type { NextRequest } from "next/server";

import {
  daysInCurrentBand,
  deltaVs,
  queryAppetiteHistory,
} from "@/lib/api/appetite";
import { toSafePositiveInt } from "@/lib/api/safe-int";
import { jsonError, jsonOk } from "@/lib/auth/errors";
import { requireSession } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 252;
const MAX_LIMIT_CSE = 2000;
const MAX_LIMIT_HYBRID = 8000;

/**
 * GET /api/v1/appetite — Market Appetite history (Postgres only).
 * Research composite 0–100 — not financial advice.
 * ``source=hybrid_research`` is Yahoo+CSE reconstruction (not CSE official).
 */
export async function GET(request: NextRequest) {
  const gated = await requireSession(request);
  if (!gated.ok) return gated.response;

  const sp = request.nextUrl.searchParams;
  const source =
    sp.get("source") === "hybrid_research" ? "hybrid_research" : "cse";
  const limitParsed = toSafePositiveInt(
    sp.get("limit") ?? String(DEFAULT_LIMIT),
  );
  let limit = limitParsed == null ? DEFAULT_LIMIT : limitParsed;
  const hardCap = source === "hybrid_research" ? MAX_LIMIT_HYBRID : MAX_LIMIT_CSE;
  limit = Math.min(limit, hardCap);

  try {
    const pool = getPool();
    const history = await queryAppetiteHistory(pool, { limit, source });
    const latest = history.length ? history[history.length - 1]! : null;
    return jsonOk({
      latest,
      history,
      deltas: {
        d1: deltaVs(history, 1),
        d5: deltaVs(history, 5),
        d21: deltaVs(history, 21),
      },
      days_in_band: daysInCurrentBand(history),
      limit,
      source,
      disclaimer:
        "Market Appetite is a research composite from CSE breadth, move intensity, ASPI day change, and participation. It is not financial advice and not a buy/sell signal.",
    });
  } catch (err) {
    console.error("GET /appetite failed", err);
    return jsonError(503, "degraded", "Database unavailable.");
  }
}
