import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isDashSessionRevoked } from "@/lib/db";

import { getDashAuthConfig, SESSION_COOKIE } from "./config";
import { LOGIN_EXPIRED_PATH } from "./session-redirect";
import { type SessionPayload, verifySessionToken } from "./session";

/**
 * Resolve a signed page session without redirecting.
 * Missing / invalid / revoked → null. DB blip keeps HMAC session.
 */
export async function optionalPageSession(): Promise<SessionPayload | null> {
  const cfg = getDashAuthConfig();
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  // Fail closed — non-string cookie mocks used to reach verify with junk
  // (parity verifySessionToken typeof guard; soft-truthy objects must not).
  const session =
    typeof raw === "string" && raw && cfg.sessionSecret
      ? verifySessionToken(raw, cfg.sessionSecret)
      : null;
  if (!session) return null;
  try {
    if (await isDashSessionRevoked(session.sid)) {
      return null;
    }
  } catch {
    // DB blip — keep HMAC session (availability over revoke check).
  }
  return session;
}

/** Require a signed session for App Router pages; redirect to /login if missing. */
export async function requirePageSession(): Promise<SessionPayload> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const session = await optionalPageSession();
  if (!session) {
    // Cookie present but invalid/expired → tell login why; bare miss → /login.
    // Fail closed — only a real string cookie counts as "present".
    redirect(
      typeof raw === "string" && raw ? LOGIN_EXPIRED_PATH : "/login",
    );
  }
  return session;
}
