import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

import { isDashSessionRevoked } from "@/lib/db";

import { getDashAuthConfig, SESSION_COOKIE } from "./config";
import { csrfTokensMatch, CSRF_HEADER, readCsrfCookie } from "./csrf";
import { jsonError } from "./errors";
import { type SessionPayload, verifySessionToken } from "./session";

export type SessionOk = { ok: true; session: SessionPayload };
export type GuardFail = { ok: false; response: NextResponse };
export type SessionResult = SessionOk | GuardFail;

/**
 * Resolve signed session from HttpOnly cookie. user_id is the sole trust anchor.
 *
 * Also enforces ``dash_sessions.revoked_at`` (S-01). Pages already check revoke
 * in ``requirePageSession``; API must match so logout-all kills cookie use.
 *
 * Fail closed: DB errors → 503 (prefer brief unavailability over silent bypass).
 * Revoked / missing / invalid → same 401 message (no revoke oracle).
 */
export async function requireSession(
  request: NextRequest,
): Promise<SessionResult> {
  const cfg = getDashAuthConfig();
  if (!cfg.sessionSecret) {
    return {
      ok: false,
      response: jsonError(
        503,
        "degraded",
        "DASH_SESSION_SECRET is not configured.",
      ),
    };
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return {
      ok: false,
      response: jsonError(401, "unauthorized", "Authentication required."),
    };
  }

  const session = verifySessionToken(token, cfg.sessionSecret);
  if (!session) {
    return {
      ok: false,
      response: jsonError(401, "unauthorized", "Authentication required."),
    };
  }

  try {
    if (await isDashSessionRevoked(session.sid)) {
      return {
        ok: false,
        response: jsonError(401, "unauthorized", "Authentication required."),
      };
    }
  } catch (err) {
    console.error("requireSession revoke check failed", err);
    return {
      ok: false,
      response: jsonError(503, "degraded", "Database unavailable."),
    };
  }

  return { ok: true, session };
}

/**
 * Soft session for public GET routes. Missing / invalid / revoked cookie →
 * ``session: null`` (never 401). Missing ``DASH_SESSION_SECRET`` → null.
 * DB errors during revoke check keep the HMAC session (availability parity
 * with ``requirePageSession``) so public market reads still succeed.
 *
 * Use when the payload is public either way; call ``requireSession`` when
 * the route must reject anonymous callers.
 */
export async function optionalSession(
  request: NextRequest,
): Promise<{ session: SessionPayload | null }> {
  const cfg = getDashAuthConfig();
  if (!cfg.sessionSecret) {
    return { session: null };
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { session: null };
  }

  const session = verifySessionToken(token, cfg.sessionSecret);
  if (!session) {
    return { session: null };
  }

  try {
    if (await isDashSessionRevoked(session.sid)) {
      return { session: null };
    }
  } catch (err) {
    console.error("optionalSession revoke check failed", err);
    // Prefer availability for public GETs — keep HMAC session.
  }

  return { session };
}

/**
 * Session + CSRF for POST/PATCH/PUT/DELETE under /api/v1 (including logout).
 * Login (`POST /auth/demo`) is the only CSRF-exempt mutation.
 *
 * Order: session (+ revoke) first, then CSRF. Missing/invalid/revoked session →
 * 401 `unauthorized` even when CSRF would also fail (never `csrf_failed`
 * without a valid session). Header≠cookie CSRF → 400 `csrf_failed`.
 */
export async function requireSessionAndCsrf(
  request: NextRequest,
): Promise<SessionResult> {
  const session = await requireSession(request);
  if (!session.ok) return session;

  const header = request.headers.get(CSRF_HEADER);
  const cookie = readCsrfCookie(request.cookies);
  if (!csrfTokensMatch(header, cookie)) {
    return {
      ok: false,
      response: jsonError(
        400,
        "csrf_failed",
        "Missing or invalid X-CSRF-Token.",
      ),
    };
  }

  return session;
}
