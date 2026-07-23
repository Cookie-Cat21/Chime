/**
 * Detect pytest / integration fixture stocks that leaked into shared Postgres.
 *
 * Real CSE equity roots are alphabetic (e.g. JKH.N0000). Integration tests use
 * `_uniq("X")` → `X{hex}.N0000` named "TEST CO" / "KILL CO", or `{ROOT} CO`.
 * The dash should not surface those as listed companies.
 */

const EXPLICIT_FIXTURE_NAMES = new Set(["TEST CO", "KILL CO"]);

/** Postgres predicate (alias `s` = stocks). Safe to AND into browse WHERE. */
export const SQL_EXCLUDE_FIXTURE_STOCKS = `(
  UPPER(TRIM(COALESCE(s.name, ''))) NOT IN ('TEST CO', 'KILL CO')
  AND split_part(s.symbol, '.', 1) !~ '[0-9]'
  AND UPPER(TRIM(COALESCE(s.name, '')))
        IS DISTINCT FROM (split_part(UPPER(s.symbol), '.', 1) || ' CO')
)`;

/**
 * True when this row looks like a leaked integration fixture, not a CSE listing.
 * `name` optional — digit-in-root symbols are fixture even without a name.
 */
export function isFixtureStock(
  symbol: string,
  name?: string | null,
): boolean {
  if (typeof symbol !== "string" || !symbol) return false;
  const sym = symbol.trim().toUpperCase();
  const root = sym.split(".")[0] ?? "";
  if (!root) return false;

  // uuid-hex style roots from tests._uniq — real CSE roots are alphabetic.
  if (/[0-9]/.test(root)) return true;

  const n =
    typeof name === "string" ? name.trim().toUpperCase() : "";
  if (!n) return false;
  if (EXPLICIT_FIXTURE_NAMES.has(n)) return true;
  // "UNSA CO" / "DPOL CO" style short fixture names matching the ticker root.
  if (/^[A-Z0-9]{2,12} CO$/.test(n) && n === `${root} CO`) return true;
  return false;
}
