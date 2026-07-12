import { CSRF_COOKIE } from "@/lib/auth/config";

/** Login path when the signed session is missing or past `exp`. */
export const LOGIN_EXPIRED_PATH = "/login?expired=1";

/** Drop the readable CSRF cookie client-side (session is HttpOnly). */
export function clearBrowserCsrfCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CSRF_COOKIE}=; Max-Age=0; Path=/`;
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
