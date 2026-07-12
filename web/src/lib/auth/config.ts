/**
 * Dashboard auth env (ADR 001). Fail closed on empty secret when dash APIs run.
 */

import { toSafePositiveInt } from "@/lib/api/safe-int";

export const SESSION_COOKIE = "chime_session";
export const CSRF_COOKIE = "chime_csrf";
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h

export type DashAuthConfig = {
  demoAuthEnabled: boolean;
  allowlist: ReadonlySet<number>;
  defaultTelegramId: number | null;
  sessionSecret: string;
};

function parseAllowlist(raw: string | undefined): Set<number> {
  if (!raw || !raw.trim()) return new Set();
  const ids = new Set<number>();
  for (const part of raw.split(",")) {
    // Digits-only ≤15 via toSafePositiveInt — bare Number()+isSafeInteger
    // can alias oversized env tokens onto MAX_SAFE_INTEGER.
    const n = toSafePositiveInt(part.trim());
    if (n == null) continue;
    ids.add(n);
  }
  return ids;
}

export function getDashAuthConfig(): DashAuthConfig {
  const secret = (process.env.DASH_SESSION_SECRET ?? "").trim();
  const defaultTelegramId = toSafePositiveInt(
    (process.env.DASH_DEFAULT_TELEGRAM_ID ?? "").trim(),
  );

  return {
    demoAuthEnabled: process.env.DASH_DEMO_AUTH === "1",
    allowlist: parseAllowlist(process.env.DASH_DEMO_TELEGRAM_IDS),
    defaultTelegramId,
    sessionSecret: secret,
  };
}

/** Public allowlist for /login UI only — never trust client for authz. */
export function publicDemoAllowlist(cfg: DashAuthConfig): number[] {
  return Array.from(cfg.allowlist).sort((a, b) => a - b);
}
