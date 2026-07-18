/**
 * Free-tier create caps (Phase B scaffolding — no plan column yet).
 *
 * Documented constants: FREE_ALERT_CAP=3, FREE_WATCH_CAP=5.
 * Env overrides: DASH_FREE_ALERT_QUOTA, DASH_FREE_WATCH_QUOTA, DASH_ALERT_HARD_CAP.
 *
 * Migration soft-default ``users.alert_quota_max = 100`` is treated as “unset
 * free tier” for create enforcement so demo/new users hit the free cap without
 * a destructive UPDATE. Explicit DB values other than 100 (ops / power users)
 * are honored up to the hard cap.
 */

/** Documented free-tier alert create cap. */
export const FREE_ALERT_CAP = 3;

/** Documented free-tier watchlist create cap. */
export const FREE_WATCH_CAP = 5;

/** Soft ceiling — never allow create above this even for raised DB quotas. */
export const ALERT_HARD_CAP_DEFAULT = 100;

/** Migration DEFAULT on ``users.alert_quota_max`` (012_index_snapshots_and_prefs). */
export const DB_ALERT_QUOTA_SOFT_DEFAULT = 100;

function readEnvPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 1) return fallback;
  return n;
}

export function freeAlertCap(): number {
  return readEnvPositiveInt("DASH_FREE_ALERT_QUOTA", FREE_ALERT_CAP);
}

export function freeWatchCap(): number {
  return readEnvPositiveInt("DASH_FREE_WATCH_QUOTA", FREE_WATCH_CAP);
}

export function alertHardCap(): number {
  return readEnvPositiveInt("DASH_ALERT_HARD_CAP", ALERT_HARD_CAP_DEFAULT);
}

/**
 * Effective max active alerts for POST /api/v1/alerts create.
 * ``const cap = Math.min(quotaFromDb, hard)`` with free-env substitution when
 * the DB still shows the migration soft-default (100).
 */
export function effectiveAlertCreateCap(quotaFromDb: number): number {
  const free = freeAlertCap();
  const hard = alertHardCap();
  if (!Number.isFinite(quotaFromDb) || quotaFromDb < 0) {
    return Math.min(free, hard);
  }
  if (quotaFromDb === DB_ALERT_QUOTA_SOFT_DEFAULT) {
    return Math.min(free, hard);
  }
  return Math.min(quotaFromDb, hard);
}
