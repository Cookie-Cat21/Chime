/**
 * koel-native chart events — disclosures, Telegram alert fires, armed rules.
 * This is the wedge vs TradingView: their chrome; our CSE truth + Telegram.
 */

export type ChartDisclosureEvent = {
  id: string | number;
  title: string;
  published_at: string | null;
  url?: string | null;
};

export type ChartAlertFireEvent = {
  id: string | number;
  type: string;
  fired_at: string | null;
  message_text?: string | null;
};

export type ChartAlertThreshold = {
  id: string | number;
  type: string;
  threshold: number;
  active: boolean;
};

export type KoelChartMarker = {
  /** ``YYYY-MM-DD`` matching a candle ``trade_date``. */
  time: string;
  kind: "disclosure" | "fire";
  text: string;
  color: string;
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  position: "aboveBar" | "belowBar";
};

export type KoelChartPriceLine = {
  id: string;
  price: number;
  title: string;
  color: string;
  lineStyle: "solid" | "dashed";
};

/** Colombo calendar date from an ISO / date string. */
export function toColomboTradeDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const raw = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(t));
  } catch {
    return null;
  }
}

function truncateLabel(s: string, max = 28): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Snap an event date onto the nearest bar on or before it (CSE calendars skip
 * weekends/holidays). Returns null if outside the loaded window.
 */
export function snapToBarDate(
  eventDate: string,
  barDates: readonly string[],
): string | null {
  if (barDates.length === 0) return null;
  if (barDates.includes(eventDate)) return eventDate;
  let best: string | null = null;
  for (const d of barDates) {
    if (d <= eventDate) best = d;
    else break;
  }
  return best;
}

export function buildDisclosureMarkers(
  items: readonly ChartDisclosureEvent[],
  barDates: readonly string[],
): KoelChartMarker[] {
  const sorted = [...barDates].sort();
  const out: KoelChartMarker[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const d = toColomboTradeDate(item.published_at);
    if (!d) continue;
    const time = snapToBarDate(d, sorted);
    if (!time) continue;
    const key = `d:${time}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      time,
      kind: "disclosure",
      text: truncateLabel(item.title || "Disclosure"),
      color: "#ca8a04",
      shape: "square",
      position: "aboveBar",
    });
  }
  return out;
}

export function buildFireMarkers(
  events: readonly ChartAlertFireEvent[],
  barDates: readonly string[],
): KoelChartMarker[] {
  const sorted = [...barDates].sort();
  const out: KoelChartMarker[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const d = toColomboTradeDate(ev.fired_at);
    if (!d) continue;
    const time = snapToBarDate(d, sorted);
    if (!time) continue;
    const key = `f:${time}:${ev.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const typ = (ev.type || "alert").replace(/_/g, " ");
    out.push({
      time,
      kind: "fire",
      text: truncateLabel(`✉ ${typ}`),
      color: "#7c3aed",
      shape: "arrowUp",
      position: "belowBar",
    });
  }
  return out;
}

export function buildThresholdLines(
  rules: readonly ChartAlertThreshold[],
): KoelChartPriceLine[] {
  const out: KoelChartPriceLine[] = [];
  for (const r of rules) {
    if (!r.active) continue;
    if (!Number.isFinite(r.threshold) || r.threshold <= 0) continue;
    const typ = (r.type || "").toLowerCase();
    if (typ !== "price_above" && typ !== "price_below") continue;
    const above = typ === "price_above";
    out.push({
      id: String(r.id),
      price: r.threshold,
      title: above ? `Alert ≥ ${r.threshold}` : `Alert ≤ ${r.threshold}`,
      color: above ? "#059669" : "#e11d48",
      lineStyle: "dashed",
    });
  }
  return out.slice(0, 8);
}
