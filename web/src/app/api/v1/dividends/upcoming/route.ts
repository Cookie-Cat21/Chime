import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/auth/errors";
import { requireSession } from "@/lib/auth/guard";
import { loadUpcomingDividendEvents } from "@/lib/db/dividend-events";

export const runtime = "nodejs";

const DEFAULT_HORIZON_DAYS = 14;
const MAX_HORIZON_DAYS = 90;

function parseHorizon(raw: string | null): number {
  if (raw == null || raw.trim() === "") return DEFAULT_HORIZON_DAYS;
  if (!/^\d+$/.test(raw.trim())) return DEFAULT_HORIZON_DAYS;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return DEFAULT_HORIZON_DAYS;
  return Math.min(parsed, MAX_HORIZON_DAYS);
}

/**
 * GET /api/v1/dividends/upcoming — upcoming dividend calendar from Postgres.
 * Query: horizon=<days> (default 14, max 90), watchlist=1 for session user's list.
 */
export async function GET(request: NextRequest) {
  const gated = await requireSession(request);
  if (!gated.ok) return gated.response;

  const horizon = parseHorizon(request.nextUrl.searchParams.get("horizon"));
  const watchlist = request.nextUrl.searchParams.get("watchlist") === "1";

  try {
    const items = await loadUpcomingDividendEvents({
      horizonDays: horizon,
      userId: gated.session.user_id,
      watchlistOnly: watchlist,
    });
    return jsonOk({ items });
  } catch (err) {
    console.error("GET /dividends/upcoming failed", err);
    return jsonError(503, "degraded", "Database unavailable.");
  }
}
