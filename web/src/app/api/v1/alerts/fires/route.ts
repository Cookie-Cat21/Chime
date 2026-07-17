import type { NextRequest } from "next/server";

import { GET as historyGet } from "../history/route";

export const runtime = "nodejs";

/**
 * GET /api/v1/alerts/fires — Ceyfi Market naming alias for alert fire history.
 * Same payload as GET /api/v1/alerts/history.
 */
export async function GET(request: NextRequest) {
  return historyGet(request);
}
