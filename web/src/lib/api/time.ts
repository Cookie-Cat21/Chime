/** Cap hostile timestamp strings before Date parse / egress. */
export const MAX_ISO_INPUT_LENGTH = 64;

const CTRL_RE = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * Normalize Postgres timestamptz / Date / string to ISO-8601 UTC.
 *
 * Medium fix: never raw-egress an unparseable string (poisoned DB / proxy
 * text used to balloon JSON and leak C0 into dash timestamps).
 */
export function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_ISO_INPUT_LENGTH) return null;
    if (CTRL_RE.test(trimmed)) return null;
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  return null;
}
