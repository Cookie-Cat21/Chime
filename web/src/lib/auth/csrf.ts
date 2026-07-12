import { timingSafeEqual } from "node:crypto";

import { CSRF_COOKIE } from "./config";

/** Header clients must send on mutating /api/v1 requests (except login). */
export const CSRF_HEADER = "x-csrf-token";

/**
 * Cap hostile CSRF header/cookie before Buffer alloc / timingSafeEqual.
 * Mint emits 32-byte base64url (~43 chars).
 */
export const MAX_CSRF_TOKEN_LENGTH = 128;

/**
 * Double-submit CSRF: `X-CSRF-Token` must equal the non-HttpOnly `chime_csrf` cookie.
 * Login (`POST /auth/demo`) is exempt; logout and all other mutations are not.
 * Returns false when either side is missing or when header ≠ cookie (length or value).
 */
export function csrfTokensMatch(
  headerToken: string | null,
  cookieToken: string | undefined,
): boolean {
  if (!headerToken || !cookieToken) return false;
  // Fail closed — multi-MB forged tokens must not allocate / compare.
  if (
    headerToken.length > MAX_CSRF_TOKEN_LENGTH ||
    cookieToken.length > MAX_CSRF_TOKEN_LENGTH
  ) {
    return false;
  }
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function readCsrfCookie(
  cookies: { get: (name: string) => { value: string } | undefined },
): string | undefined {
  return cookies.get(CSRF_COOKIE)?.value;
}
