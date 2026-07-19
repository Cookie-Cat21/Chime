/**
 * Multi-horizon returns from daily close series (Postgres ``daily_bars``).
 * Research / NFA — null when history is too short.
 *
 * CSE public path tops out at ~1 calendar year (~240 sessions via period=5).
 * Do not require NYSE-style 252 sessions for ``1Y`` — that zeroed the board.
 */

import { toFiniteNumber } from "@/lib/api/finite-number";

export type PeriodReturnKey = "1W" | "1M" | "3M" | "1Y";

export type PeriodReturns = Record<PeriodReturnKey, number | null>;

/** Approximate CSE trading sessions per short horizon (~5/week). */
const SESSIONS: Record<Exclude<PeriodReturnKey, "1Y">, number> = {
  "1W": 5,
  "1M": 22,
  "3M": 66,
};

/** CSE ~1y path depth; public JSON rarely exceeds ~242 sessions. */
const SESSIONS_1Y_FALLBACK = 220;

/** Calendar days for ``1Y`` when ``trade_date`` is available. */
const CALENDAR_DAYS_1Y = 365;

/**
 * ``closes`` oldest → newest. Returns % change vs close ``sessions`` ago.
 */
export function returnPctAtHorizon(
  closes: number[],
  sessions: number,
): number | null {
  if (!Array.isArray(closes) || closes.length < 2) return null;
  const n = Math.max(1, Math.floor(sessions));
  if (closes.length <= n) return null;
  const latest = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - n];
  if (
    latest == null ||
    prior == null ||
    !Number.isFinite(latest) ||
    !Number.isFinite(prior) ||
    prior === 0
  ) {
    return null;
  }
  const pct = ((latest - prior) / Math.abs(prior)) * 100;
  return Number.isFinite(pct) ? pct : null;
}

function parseTradeDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/**
 * % change vs the close on/before ``latestDate - calendarDays``.
 * Bars oldest → newest with ``trade_date`` YYYY-MM-DD.
 */
export function returnPctAtCalendarDays(
  barsAsc: { trade_date?: unknown; close?: unknown; price?: unknown }[],
  calendarDays: number,
): number | null {
  if (!Array.isArray(barsAsc) || barsAsc.length < 2) return null;
  const days = Math.max(1, Math.floor(calendarDays));
  const points: { date: string; close: number }[] = [];
  for (const b of barsAsc) {
    const date = parseTradeDate(b.trade_date);
    const close = toFiniteNumber(b.close ?? b.price);
    if (!date || close == null || close <= 0) continue;
    points.push({ date, close });
  }
  if (points.length < 2) return null;
  const latest = points[points.length - 1]!;
  const latestMs = Date.parse(`${latest.date}T00:00:00Z`);
  if (Number.isNaN(latestMs)) return null;
  const targetMs = latestMs - days * 86_400_000;
  // Prefer last bar on/before target; CSE period=5 often starts ~1 day after
  // the exact anniversary, so allow a short after-target window.
  const AFTER_SLACK_MS = 14 * 86_400_000;
  const BEFORE_SLACK_MS = 40 * 86_400_000;
  let prior: { date: string; close: number; ms: number } | null = null;
  for (let i = points.length - 2; i >= 0; i--) {
    const p = points[i]!;
    const ms = Date.parse(`${p.date}T00:00:00Z`);
    if (Number.isNaN(ms)) continue;
    if (ms <= targetMs) {
      prior = { ...p, ms };
      break;
    }
    // Keep the earliest bar in the after-target slack as a fallback.
    if (ms - targetMs <= AFTER_SLACK_MS) {
      prior = { ...p, ms };
    }
  }
  if (!prior || prior.close === 0) return null;
  if (targetMs - prior.ms > BEFORE_SLACK_MS) return null;
  const pct = ((latest.close - prior.close) / Math.abs(prior.close)) * 100;
  return Number.isFinite(pct) ? pct : null;
}

/** Extract ascending closes from daily-bar-like rows. */
export function closesFromBars(
  bars: { close?: unknown; price?: unknown }[],
): number[] {
  const out: number[] = [];
  for (const b of bars) {
    const c = toFiniteNumber(b.close ?? b.price);
    if (c != null && c > 0) out.push(c);
  }
  return out;
}

/**
 * Prefer calendar ``1Y`` when trade dates exist; else CSE session fallback.
 */
export function computePeriodReturns(
  closesAsc: number[],
  barsAsc?: { trade_date?: unknown; close?: unknown; price?: unknown }[],
): PeriodReturns {
  const oneY =
    barsAsc != null && barsAsc.length > 0
      ? returnPctAtCalendarDays(barsAsc, CALENDAR_DAYS_1Y)
      : null;
  return {
    "1W": returnPctAtHorizon(closesAsc, SESSIONS["1W"]),
    "1M": returnPctAtHorizon(closesAsc, SESSIONS["1M"]),
    "3M": returnPctAtHorizon(closesAsc, SESSIONS["3M"]),
    "1Y":
      oneY ??
      returnPctAtHorizon(closesAsc, SESSIONS_1Y_FALLBACK),
  };
}
