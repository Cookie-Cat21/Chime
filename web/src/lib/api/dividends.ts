/**
 * Dividend API types + client loader (Postgres via /api/v1 — never cse.lk).
 */

import { CLIENT_API_TIMEOUT_MS } from "@/lib/api/client-fetch";
import { toFiniteNumber } from "@/lib/api/finite-number";
import { readBoundedResponseText } from "@/lib/api/read-bounded-text";
import { normalizeSymbol } from "@/lib/api/symbol";
import type { ParsedDividendHints } from "@/lib/dividends";

export type DividendEventItem = {
  id: number;
  title: string;
  category: string | null;
  url: string | null;
  pdf_url: string | null;
  published_at: string | null;
  brief: string | null;
  parsed: ParsedDividendHints;
};

export type DividendSymbolPayload = {
  symbol: string;
  name: string | null;
  last_price: number | null;
  last_ts: string | null;
  suggested_dps: number | null;
  items: DividendEventItem[];
};

function asParsed(raw: unknown): ParsedDividendHints {
  if (!raw || typeof raw !== "object") {
    return { dps: null, xd: null, payment: null, dates_tbd: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    dps: toFiniteNumber(o.dps),
    xd: typeof o.xd === "string" && o.xd.trim() ? o.xd.trim().slice(0, 40) : null,
    payment:
      typeof o.payment === "string" && o.payment.trim()
        ? o.payment.trim().slice(0, 40)
        : null,
    dates_tbd: o.dates_tbd === true,
  };
}

/** Normalize API JSON; drop hostile / malformed rows. */
export function normalizeDividendPayload(
  data: unknown,
): DividendSymbolPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const symbol = normalizeSymbol(o.symbol);
  if (!symbol) return null;
  const name =
    typeof o.name === "string" && o.name.trim()
      ? o.name.trim().slice(0, 200)
      : null;
  const itemsRaw = Array.isArray(o.items) ? o.items : [];
  const items: DividendEventItem[] = [];
  for (const row of itemsRaw.slice(0, 50)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = toFiniteNumber(r.id);
    if (id == null || id <= 0 || !Number.isInteger(id)) continue;
    const title = typeof r.title === "string" ? r.title.trim().slice(0, 500) : "";
    if (!title) continue;
    items.push({
      id,
      title,
      category:
        typeof r.category === "string" && r.category.trim()
          ? r.category.trim().slice(0, 120)
          : null,
      url: typeof r.url === "string" ? r.url : null,
      pdf_url: typeof r.pdf_url === "string" ? r.pdf_url : null,
      published_at:
        typeof r.published_at === "string" ? r.published_at : null,
      brief: typeof r.brief === "string" ? r.brief : null,
      parsed: asParsed(r.parsed),
    });
  }
  return {
    symbol,
    name,
    last_price: toFiniteNumber(o.last_price),
    last_ts: typeof o.last_ts === "string" ? o.last_ts : null,
    suggested_dps: toFiniteNumber(o.suggested_dps),
    items,
  };
}

/**
 * Browser GET for dividend calculator — session cookie, no CSRF.
 */
export async function fetchDividendSymbol(
  symbol: string,
): Promise<
  | { ok: true; data: DividendSymbolPayload }
  | { ok: false; status: number; message: string }
> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return { ok: false, status: 400, message: "Enter a CSE symbol (e.g. JKH.N0000)." };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_API_TIMEOUT_MS);
  try {
    const res = await fetch(
      `/api/v1/symbols/${encodeURIComponent(normalized)}/dividends`,
      {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
        redirect: "error",
      },
    );
    const bounded = await readBoundedResponseText(res, 1_048_576);
    if (!bounded.ok) {
      return {
        ok: false,
        status: res.status || 502,
        message: "Dividend response too large or unreadable.",
      };
    }
    let json: unknown = null;
    try {
      json = bounded.text ? JSON.parse(bounded.text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const err =
        json &&
        typeof json === "object" &&
        "error" in json &&
        json.error &&
        typeof (json as { error: { message?: unknown } }).error === "object"
          ? (json as { error: { message?: unknown } }).error.message
          : null;
      const message =
        typeof err === "string" && err.trim()
          ? err.trim().slice(0, 300)
          : res.status === 404
            ? "Unknown symbol."
            : `Could not load dividends (${res.status}).`;
      return { ok: false, status: res.status, message };
    }
    const data = normalizeDividendPayload(json);
    if (!data) {
      return { ok: false, status: 502, message: "Unexpected dividend response." };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, message: "Network error. Try again." };
  } finally {
    clearTimeout(timer);
  }
}
