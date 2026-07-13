import {
  COOKIE_SAME_SITE,
  CSRF_COOKIE,
  cookieSecure,
} from "@/lib/auth/config";

/** Login path when the signed session is missing or past `exp`. */
export const LOGIN_EXPIRED_PATH = "/login?expired=1";

/**
 * Drop the readable CSRF cookie client-side (session is HttpOnly).
 * Must include the same Path / SameSite / Secure used at set time —
 * otherwise production Secure cookies survive Max-Age=0 clears.
 */
export function clearBrowserCsrfCookie(): void {
  if (typeof document === "undefined") return;
  const sameSite =
    COOKIE_SAME_SITE === "lax"
      ? "Lax"
      : COOKIE_SAME_SITE === "strict"
        ? "Strict"
        : "None";
  const parts = [
    `${CSRF_COOKIE}=`,
    "Max-Age=0",
    "Path=/",
    `SameSite=${sameSite}`,
  ];
  if (cookieSecure()) parts.push("Secure");
  document.cookie = parts.join("; ");
}

/**
 * Full navigation so Set-Cookie + RSC cache cannot keep an authenticated shell.
 * Use `expired: true` when the session is gone mid-use (401 / missing CSRF).
 */
export function redirectToLogin(opts?: { expired?: boolean }): void {
  if (typeof window === "undefined") return;
  clearBrowserCsrfCookie();
  window.location.assign(opts?.expired ? LOGIN_EXPIRED_PATH : "/login");
}
