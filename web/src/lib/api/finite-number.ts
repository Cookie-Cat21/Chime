/**
 * Client-safe finite number coerce (no ``pg`` import).
 *
 * Used by dash API egress and the alert create form. Keep this module free of
 * Node-only deps so ``"use client"`` can import it without pulling Postgres.
 */

/** Cap hostile numeric strings before Number() (CSE quotes never need more). */
export const MAX_FINITE_NUMBER_STRING_LENGTH = 32;

/**
 * Cap absolute magnitude for market / quote coerce.
 * Hostile finite extremes (e.g. ``1e308``) used to pass ``Number.isFinite``
 * into API JSON and page parsers — formatters/sparkline already fail-closed,
 * but browse/watchlist a11y compare paths still saw the raw absurd.
 * CSE quotes never need more than this; fail closed to null.
 */
export const MAX_FINITE_ABS_VALUE = 1e15;

/**
 * Upper bound for alert thresholds (price / daily-move %).
 * Hostile ``Number.MAX_VALUE`` used to persist useless rules and balloon JSON.
 */
export const MAX_ALERT_THRESHOLD = 1_000_000_000;


/** Decimal only — reject sci-notation / hex / empty (Number("")===0 footgun). */
const FINITE_DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/**
 * Coerce PG numerics / form strings to finite numbers; NaN/±Infinity /
 * absurd magnitudes → null.
 *
 * Medium: bare Number() on any unknown soft-accepted ""→0, true→1, []→0,
 * and "1e2" sci-notation. Only number primitives or plain decimal strings.
 * Medium (w60): ``Number.isFinite(1e308)`` is true — abs-cap so hostile
 * quotes cannot reach market JSON / page a11y compare paths.
 */
export function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) > MAX_FINITE_ABS_VALUE) return null;
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed.length > MAX_FINITE_NUMBER_STRING_LENGTH ||
      !FINITE_DECIMAL_RE.test(trimmed)
    ) {
      return null;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    if (Math.abs(n) > MAX_FINITE_ABS_VALUE) return null;
    return n;
  }
  return null;
}

/**
 * Fail-closed alert threshold for egress / create-return.
 *
 * Medium: upper-bound-only ``n <= MAX_ALERT_THRESHOLD`` used to let hostile
 * finite negatives (``-1e308`` / ``-Number.MAX_VALUE``) through mapRule /
 * GET ``/alerts`` / page parsers into dash JSON.
 */
export function cappedAlertThreshold(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (Math.abs(n) > MAX_ALERT_THRESHOLD) return null;
  return n;
}
