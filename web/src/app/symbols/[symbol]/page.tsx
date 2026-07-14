import Link from "next/link";
import { notFound } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { EmptyState } from "@/components/empty-state";
import { ChangeBadge } from "@/components/kit/change-badge";
import {
  DisclosureCategoryHint,
  DisclosureTimeline,
} from "@/components/kit/disclosure-timeline";
import { NfaFooter } from "@/components/nfa-footer";
import { NfaInline } from "@/components/nfa-inline";
import { OptionalLwcNote } from "@/components/optional-lwc-note";
import { PageHeader } from "@/components/page-header";
import { PriceRefresh } from "@/components/price-refresh";
import { Sparkline } from "@/components/sparkline";
import { finiteSparklinePoints } from "@/lib/sparkline";
import { Button } from "@/components/ui/button";
import {
  WatchButton,
} from "@/components/watchlist-controls";
import {
  MAX_DISCLOSURE_CATEGORY_LENGTH,
  MAX_DISCLOSURE_COMPANY_LENGTH,
  MAX_DISCLOSURE_EXTERNAL_ID_LENGTH,
  MAX_DISCLOSURE_TITLE_LENGTH,
  MAX_STOCK_NAME_LENGTH,
  MAX_STOCK_SECTOR_LENGTH,
  normalizeBriefStatus,
  safeAnnouncementUrl,
  safeFilingHref,
  safePdfUrl,
  sanitizeBriefText,
  sanitizeDisclosureCategory,
  sanitizeDisclosureText,
} from "@/lib/api/disclosure-safe";
import { toFiniteNumber } from "@/lib/api/finite-number";
import { toSafePositiveInt } from "@/lib/api/safe-int";
import { serverApiGet } from "@/lib/api/server-fetch";
import { normalizeSymbol, normalizeSymbolParam } from "@/lib/api/symbol";
import { toIso } from "@/lib/api/time";
import { requirePageSession } from "@/lib/auth/page-session";
import { formatNumber, formatTs } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Snapshots older than this are treated as stale for empty-copy (E11-D02). */
const STALE_MS = 24 * 60 * 60 * 1000;
/** Cap sparkline points parse — parity with snapshots API max / sparkline bound. */
const MAX_PAGE_SNAPSHOT_POINTS = 200;
/** Cap disclosures parse — parity with disclosures API max 100. */
const MAX_PAGE_DISCLOSURES = 100;

/** ECMAScript Date absolute millisecond bound (parity sparkline / toIso). */
const MAX_DATE_MS = 8.64e15;

function isStaleTs(ts: string | null | undefined): boolean {
  // Fail closed — non-strings / out-of-range must not skew the stale banner.
  if (typeof ts !== "string" || !ts) return false;
  const t = Date.parse(ts);
  if (Number.isNaN(t) || Math.abs(t) > MAX_DATE_MS) return false;
  return Date.now() - t > STALE_MS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  // Fail closed — never echo hostile / undecodable raw into <title>.
  const symbol = normalizeSymbolParam(raw) ?? "Symbol";
  return {
    title: `${symbol} · Chime`,
    description: `Last price and disclosures for ${symbol}.`,
  };
}

type SymbolPayload = {
  symbol: string;
  name: string | null;
  sector: string | null;
  market_cap: number | null;
  last: {
    price: number;
    change: number | null;
    change_pct: number | null;
    volume: number | null;
    ts: string | null;
  } | null;
};

type SnapshotsPayload = {
  points: { ts: string | null; price: number | null; change_pct: number | null }[];
};

type DisclosuresPayload = {
  items: {
    id: number;
    external_id: string;
    title: string;
    category: string | null;
    url: string | null;
    published_at: string | null;
    company_name: string | null;
    pdf_url: string | null;
    brief: string | null;
    brief_status:
      | "pending"
      | "processing"
      | "ready"
      | "failed"
      | "skipped"
      | null;
  }[];
};

/** Fail-closed symbol JSON — never cast the body to SymbolPayload. */
function parseSymbolPayload(body: unknown): SymbolPayload | null {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const r = body as Record<string, unknown>;
  // Fail closed — only CSE SYMBOL_RE (no sanitize length-cap fallback).
  const symbol = normalizeSymbol(r.symbol);
  if (!symbol) return null;
  let last: SymbolPayload["last"] = null;
  if (r.last != null && typeof r.last === "object" && !Array.isArray(r.last)) {
    const L = r.last as Record<string, unknown>;
    const price = toFiniteNumber(L.price);
    // Require a finite price — null-only last stubs confuse the quote strip.
    if (price != null) {
      last = {
        price,
        change: toFiniteNumber(L.change),
        change_pct: toFiniteNumber(L.change_pct),
        volume: toFiniteNumber(L.volume),
        // Fail-closed ISO — no raw overlong / control-laden ts echo.
        ts: toIso(L.ts),
      };
    }
  }
  return {
    symbol,
    name: sanitizeDisclosureText(
      typeof r.name === "string" ? r.name : null,
      MAX_STOCK_NAME_LENGTH,
    ),
    sector: sanitizeDisclosureText(
      typeof r.sector === "string" ? r.sector : null,
      MAX_STOCK_SECTOR_LENGTH,
    ),
    market_cap: toFiniteNumber(r.market_cap),
    last,
  };
}

/** Fail-closed snapshots JSON — missing/hostile ``points`` must not 500. */
function parseSnapshotsPayload(body: unknown): SnapshotsPayload {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { points: [] };
  }
  const pointsRaw = (body as { points?: unknown }).points;
  if (!Array.isArray(pointsRaw)) return { points: [] };
  const points: SnapshotsPayload["points"] = [];
  for (const row of pointsRaw) {
    // Cap at API / sparkline max — unbounded points used to allocate before SVG.
    if (points.length >= MAX_PAGE_SNAPSHOT_POINTS) break;
    if (row == null || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    points.push({
      // Fail-closed ISO — no raw overlong / control-laden ts echo.
      ts: toIso(r.ts),
      price: toFiniteNumber(r.price),
      change_pct: toFiniteNumber(r.change_pct),
    });
  }
  return { points };
}

/** Fail-closed disclosures JSON — SafeInteger ids + sanitized text/urls. */
function parseDisclosuresPayload(body: unknown): DisclosuresPayload {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { items: [] };
  }
  const itemsRaw = (body as { items?: unknown }).items;
  if (!Array.isArray(itemsRaw)) return { items: [] };
  const items: DisclosuresPayload["items"] = [];
  for (const row of itemsRaw) {
    if (items.length >= MAX_PAGE_DISCLOSURES) break;
    if (row == null || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const id = toSafePositiveInt(r.id);
    if (id == null) continue;
    const title =
      sanitizeDisclosureText(
        typeof r.title === "string" ? r.title : null,
        MAX_DISCLOSURE_TITLE_LENGTH,
      ) ?? "";
    if (!title) continue;
    const external_id =
      sanitizeDisclosureText(
        typeof r.external_id === "string" ? r.external_id : null,
        MAX_DISCLOSURE_EXTERNAL_ID_LENGTH,
      ) ?? "";
    const brief_status = normalizeBriefStatus(
      typeof r.brief_status === "string" ? r.brief_status : null,
    );
    const publishedRaw = r.published_at;
    // Parse-time allowlist — never soft-accept raw javascript:/data: hrefs
    // or brief text before render (defense in depth vs API shape drift).
    const url =
      typeof r.url === "string" ? safeAnnouncementUrl(r.url) : null;
    const pdf_url =
      typeof r.pdf_url === "string" ? safePdfUrl(r.pdf_url) : null;
    const briefRaw = typeof r.brief === "string" ? r.brief : null;
    items.push({
      id,
      external_id,
      title,
      category: sanitizeDisclosureText(
        typeof r.category === "string" ? r.category : null,
        MAX_DISCLOSURE_CATEGORY_LENGTH,
      ),
      url,
      // Fail-closed ISO — no raw overlong / control-laden ts echo.
      published_at: toIso(publishedRaw),
      company_name: sanitizeDisclosureText(
        typeof r.company_name === "string" ? r.company_name : null,
        MAX_DISCLOSURE_COMPANY_LENGTH,
      ),
      pdf_url,
      brief: sanitizeBriefText(briefRaw, brief_status),
      brief_status,
    });
  }
  return { items };
}

export default async function SymbolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  await requirePageSession();

  const { symbol: raw } = await params;
  const sp = await searchParams;
  // safeDecode — malformed % sequences → notFound (not URIError 500).
  const symbol = normalizeSymbolParam(raw);
  if (!symbol) {
    notFound();
  }
  const categoryRaw = Array.isArray(sp.category)
    ? sp.category[0]
    : sp.category;
  const categoryFilter = sanitizeDisclosureCategory(categoryRaw);

  const encoded = encodeURIComponent(symbol);
  const [symRes, snapRes, discRes] = await Promise.all([
    serverApiGet(`/api/v1/symbols/${encoded}`),
    serverApiGet(`/api/v1/symbols/${encoded}/snapshots?limit=60`),
    serverApiGet(`/api/v1/symbols/${encoded}/disclosures?limit=20`),
  ]);

  if (symRes.status === 404) {
    notFound();
  }
  if (!symRes.ok) {
    return (
      <Shell>
        <EmptyState
          title={`Couldn’t load ${symbol}`}
          description={
            <>
              Chime couldn’t fetch this symbol from Postgres just now. Check
              your connection, then try again — or open it from your{" "}
              <Link href="/watchlist" className="underline underline-offset-4">
                watchlist
              </Link>
              .
            </>
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/symbols/${encoded}`}>Try again</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/watchlist">← Watchlist</Link>
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  let data: SymbolPayload | null = null;
  try {
    data = parseSymbolPayload(await symRes.json());
  } catch {
    data = null;
  }
  if (!data) {
    return (
      <Shell>
        <EmptyState
          title={`Couldn’t load ${symbol}`}
          description="Chime got an unexpected symbol payload. Retry in a moment."
          action={
            <Button asChild variant="outline">
              <Link href={`/symbols/${encoded}`}>Try again</Link>
            </Button>
          }
        />
      </Shell>
    );
  }

  let snaps: SnapshotsPayload = { points: [] };
  let discs: DisclosuresPayload = { items: [] };
  if (snapRes.ok) {
    try {
      snaps = parseSnapshotsPayload(await snapRes.json());
    } catch {
      snaps = { points: [] };
    }
  }
  if (discRes.ok) {
    try {
      discs = parseDisclosuresPayload(await discRes.json());
    } catch {
      discs = { items: [] };
    }
  }

  const snapsFailed = !snapRes.ok;
  const discsFailed = !discRes.ok;

  const sparkPoints = finiteSparklinePoints(snaps.points);
  const disclosureCategories = Array.from(
    new Set(
      discs.items
        .map((item) => item.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const visibleDisclosures = categoryFilter
    ? discs.items.filter((item) => item.category === categoryFilter)
    : discs.items;

  return (
    <Shell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <PageHeader
          className="min-w-0 flex-1"
          eyebrow="Symbol"
          title={data.symbol}
          description={
            data.name
              ? `${data.name}${data.sector ? ` · ${data.sector}` : ""}`
              : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <PriceRefresh lastSnapshotAt={data.last?.ts ?? null} />
          <WatchButton symbol={data.symbol} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/alerts?symbol=${encoded}`}>New alert</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/watchlist">← Watchlist</Link>
          </Button>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-border/70 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Last price
            </p>
            {data.last ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
                  {formatNumber(data.last.price)}
                </span>
                <ChangeBadge changePct={data.last.change_pct} />
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                No stored price yet.
              </p>
            )}
            {data.last?.ts ? (
              <p className="mt-1 text-xs text-muted-foreground">
                As of {formatTs(data.last.ts)} (SLT)
              </p>
            ) : null}
          </div>
          <div className="min-h-20 min-w-0 flex-1 md:max-w-sm">
            {snapsFailed ? (
              <p className="text-sm text-muted-foreground" role="status">
                Couldn’t load recent ticks right now.
              </p>
            ) : sparkPoints.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Need two stored ticks for a sparkline.
              </p>
            ) : (
              <Sparkline points={snaps.points} />
            )}
            <OptionalLwcNote
              enabled={process.env.NEXT_PUBLIC_CHIME_LWC === "1"}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-border/60 pt-6">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Last snapshot
        </h2>
        {data.last ? (
          <div
            className={`mt-3 grid grid-cols-2 gap-4 ${
              data.market_cap != null ? "sm:grid-cols-5" : "sm:grid-cols-4"
            }`}
          >
            <Stat label="Price" value={formatNumber(data.last.price)} mono />
            <Stat
              label="Change"
              value={formatNumber(data.last.change)}
              mono
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Change %</p>
              <div className="mt-1">
                <ChangeBadge changePct={data.last.change_pct} />
              </div>
            </div>
            <Stat
              label="Volume"
              value={
                data.last.volume == null
                  ? "—"
                  : formatNumber(Math.round(data.last.volume), 0)
              }
              mono
            />
            {data.market_cap != null ? (
              <Stat
                label="Market cap"
                value={formatNumber(data.market_cap)}
                mono
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            title="No snapshot yet"
            description={
              <>
                Chime hasn’t stored a price tick for {data.symbol}. During
                market hours (09:30–14:30 SLT, weekdays) the poller writes
                snapshots here. Outside those hours this stays empty until the
                next session. Not financial advice.
              </>
            }
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/alerts">Set an alert</Link>
              </Button>
            }
          />
        )}
        {data.last && isStaleTs(data.last.ts) ? (
          <EmptyState
            className="mt-4"
            title="Snapshot looks stale"
            description={
              <>
                Last tick was {formatTs(data.last.ts)} (SLT) — more than a day
                ago. If market hours have passed without a refresh, the poller
                may be paused or this symbol wasn’t watched. Not financial
                advice.
              </>
            }
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/watchlist">Back to watchlist</Link>
              </Button>
            }
          />
        ) : null}
        {data.last?.ts && !isStaleTs(data.last.ts) ? (
          <p className="mt-3 text-xs text-muted-foreground">
            As of {formatTs(data.last.ts)} (SLT)
          </p>
        ) : null}
        <NfaInline className="mt-2" />
      </section>

      <section
        className="mt-8 border-t border-border/60 pt-6"
        aria-labelledby="disclosures-heading"
      >
        <h2
          id="disclosures-heading"
          className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
        >
          Disclosures
        </h2>
        {!discsFailed && disclosureCategories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <DisclosureCategoryHint
              href={`/symbols/${encoded}`}
              label={categoryFilter ? "All disclosures" : "All"}
            />
            {disclosureCategories.map((category) => (
              <DisclosureCategoryHint
                key={category}
                href={`/symbols/${encoded}?category=${encodeURIComponent(category)}`}
                label={categoryFilter === category ? `${category} (selected)` : category}
              />
            ))}
          </div>
        ) : null}
        {discsFailed ? (
          <EmptyState
            className="mt-4"
            title="Couldn’t load disclosures"
            description={
              <>
                Chime couldn’t read stored filings for{" "}
                <code className="font-mono text-xs">{data.symbol}</code> just
                now. Check your connection, then try again — this is not an
                empty list.
              </>
            }
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={`/symbols/${encoded}`}>Try again</Link>
              </Button>
            }
          />
        ) : visibleDisclosures.length === 0 ? (
          <EmptyState
            className="mt-4"
            title={categoryFilter ? `No ${categoryFilter} disclosures` : "No disclosures yet"}
            description={
              <>
                Nothing stored for{" "}
                <code className="font-mono text-xs">{data.symbol}</code>. When
                the poller sees a new CSE announcement, it lists here with a
                link to the source. Or set{" "}
                <code className="font-mono text-xs">
                  /alert {data.symbol} disclosure
                </code>{" "}
                in Telegram to get pinged.
              </>
            }
            action={
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/alerts?symbol=${encodeURIComponent(data.symbol)}`}
                >
                  Alert on disclosures
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <DisclosureTimeline
              items={visibleDisclosures.map((item) => ({
                id: item.id,
                title: item.title,
                published_at: item.published_at,
                url: safeFilingHref(item.pdf_url, item.url),
                category: item.category,
                brief: item.brief,
                brief_status: item.brief_status,
              }))}
              className="mt-5"
            />
            <NfaInline className="mt-3" />
          </>
        )}
      </section>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 p-3 shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <WatchButton symbol={data.symbol} />
          <Button asChild className="flex-1" size="sm">
            <Link href={`/alerts?symbol=${encoded}`}>New alert</Link>
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppNav />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-24 sm:px-6 sm:pt-10 md:pb-10"
      >
        {children}
      </main>
      <NfaFooter />
    </div>
  );
}

function Stat({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 truncate text-lg font-medium sm:text-xl ${mono ? "font-mono" : ""} ${className ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}
