"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { CompanyGraphCanvas } from "@/components/company-graph/graph-canvas";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GraphEdge, GraphNode } from "@/lib/api/graph";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function scaleEquity(node: GraphNode): number | null {
  if (node.equity == null) return null;
  const mult =
    node.equity_scale === "millions"
      ? 1e6
      : node.equity_scale === "thousands"
        ? 1e3
        : 1;
  const scaled = node.equity * mult;
  // Guard %-like / stub extracts that slipped through
  if (scaled < 10_000) return null;
  return scaled;
}

const RELATION_LABEL: Record<string, string> = {
  subsidiary: "Subsidiary",
  associate: "Associate",
  joint_venture: "Joint venture",
  related_party: "Related party",
  group_mention: "Group mention",
};

function shortSymbol(symbol: string | null): string {
  if (!symbol) return "";
  return symbol.replace(/\.(N|X)0000$/i, "");
}

export function CompanyGraphClient({
  nodes,
  edges,
  initialFocus,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  initialFocus?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const initialSelected =
    nodes.find((n) => n.symbol === initialFocus)?.id ??
    nodes.find((n) => n.node_kind === "listed")?.id ??
    null;

  const [selectedId, setSelectedId] = useState<number | null>(initialSelected);
  const [query, setQuery] = useState(
    initialFocus ? shortSymbol(initialFocus) : "",
  );
  const [minConf, setMinConf] = useState<"medium" | "high" | "low">(
    (searchParams.get("confidence") as "medium" | "high" | "low") || "medium",
  );
  const [holdingsOnly, setHoldingsOnly] = useState(
    searchParams.get("hubs") === "1",
  );
  const [showHints, setShowHints] = useState(true);

  // "/" focuses the symbol search (power-user shortcut)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      document.getElementById("graph-symbol-search")?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Persist filters in URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (minConf === "medium") params.delete("confidence");
    else params.set("confidence", minConf);
    if (holdingsOnly) params.set("hubs", "1");
    else params.delete("hubs");
    const sel = nodes.find((n) => n.id === selectedId);
    if (sel?.symbol) params.set("symbol", sel.symbol);
    const next = params.toString();
    const cur = searchParams.toString();
    if (next !== cur) {
      startTransition(() => {
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync filters only
  }, [minConf, holdingsOnly, selectedId]);

  const filteredEdges = useMemo(() => {
    const rank = { low: 1, medium: 2, high: 3 } as const;
    return edges.filter((e) => rank[e.confidence] >= rank[minConf]);
  }, [edges, minConf]);

  const activeNodeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const e of filteredEdges) {
      ids.add(e.src_node_id);
      ids.add(e.dst_node_id);
    }
    if (ids.size === 0) {
      for (const n of nodes) {
        if (n.equity != null) ids.add(n.id);
      }
    }
    return ids;
  }, [filteredEdges, nodes]);

  const visibleNodes = useMemo(() => {
    let list = nodes.filter((n) => activeNodeIds.has(n.id));
    if (holdingsOnly) {
      const hubIds = new Set(
        filteredEdges
          .filter(
            (e) => e.relation === "subsidiary" || e.relation === "associate",
          )
          .map((e) => e.src_node_id),
      );
      const keep = new Set(
        list
          .filter(
            (n) =>
              hubIds.has(n.id) ||
              (n.name.toLowerCase().includes("holdings") &&
                n.node_kind === "listed"),
          )
          .map((n) => n.id),
      );
      for (const e of filteredEdges) {
        if (keep.has(e.src_node_id)) keep.add(e.dst_node_id);
      }
      list = nodes.filter((n) => keep.has(n.id) && activeNodeIds.has(n.id));
    }
    return list;
  }, [nodes, activeNodeIds, holdingsOnly, filteredEdges]);

  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id));
    return filteredEdges.filter(
      (e) => ids.has(e.src_node_id) && ids.has(e.dst_node_id),
    );
  }, [filteredEdges, visibleNodes]);

  const selected =
    visibleNodes.find((n) => n.id === selectedId) ??
    visibleNodes[0] ??
    null;
  const effectiveSelectedId = selected?.id ?? null;

  const selectedEdges = useMemo(() => {
    const raw = visibleEdges.filter(
      (e) =>
        e.src_node_id === effectiveSelectedId ||
        e.dst_node_id === effectiveSelectedId,
    );
    const rank: Record<string, number> = {
      subsidiary: 4,
      associate: 3,
      joint_venture: 3,
      related_party: 2,
      group_mention: 1,
    };
    const best = new Map<string, GraphEdge>();
    for (const e of raw) {
      const a = Math.min(e.src_node_id, e.dst_node_id);
      const b = Math.max(e.src_node_id, e.dst_node_id);
      const key = `${a}:${b}:${e.src_node_id === effectiveSelectedId ? "out" : "in"}`;
      const prev = best.get(key);
      if (!prev || (rank[e.relation] ?? 0) > (rank[prev.relation] ?? 0)) {
        best.set(key, e);
      }
    }
    return Array.from(best.values());
  }, [visibleEdges, effectiveSelectedId]);

  const suggestions = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 1) return [];
    return visibleNodes
      .filter(
        (n) =>
          (n.symbol && n.symbol.toUpperCase().includes(q)) ||
          n.name.toUpperCase().includes(q) ||
          shortSymbol(n.symbol).includes(q),
      )
      .slice(0, 6);
  }, [query, visibleNodes]);

  function focusNode(node: GraphNode) {
    setSelectedId(node.id);
    setQuery(shortSymbol(node.symbol) || node.name.slice(0, 12));
    setShowHints(false);
  }

  function focusSearch() {
    const q = query.trim().toUpperCase();
    if (!q) return;
    const hit =
      suggestions[0] ||
      visibleNodes.find(
        (n) =>
          (n.symbol && n.symbol.includes(q)) ||
          n.name.toUpperCase().includes(q) ||
          shortSymbol(n.symbol) === q,
      );
    if (hit) focusNode(hit);
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        title="No graph data yet"
        description="Run financials backfill + drain-graph on annual PDFs to populate ownership links and equity."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex min-w-0 flex-1 gap-2">
          <div className="relative min-w-0 flex-1 max-w-xs">
            <Input
              id="graph-symbol-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") focusSearch();
              }}
              placeholder="Focus symbol (e.g. JKH)"
              className="w-full"
              aria-label="Focus symbol"
              aria-autocomplete="list"
            />
            {suggestions.length > 0 && query.trim().length > 0 ? (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background py-1 text-sm shadow-sm">
                {suggestions.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted"
                      onClick={() => focusNode(n)}
                    >
                      <span className="font-mono text-foreground">
                        {shortSymbol(n.symbol) || "—"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {n.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Button type="button" variant="secondary" onClick={focusSearch}>
            Focus
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={holdingsOnly}
            onChange={(e) => setHoldingsOnly(e.target.checked)}
            className="size-4 rounded border-border"
          />
          Holdings hubs
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Min confidence
          <select
            value={minConf}
            onChange={(e) =>
              setMinConf(e.target.value as "low" | "medium" | "high")
            }
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <Badge variant="outline" className="tabular-nums">
          {visibleNodes.length} companies · {visibleEdges.length} links
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {Object.entries(RELATION_LABEL).map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{
                background:
                  key === "subsidiary"
                    ? "var(--chart-1)"
                    : key === "associate"
                      ? "var(--chart-2)"
                      : key === "joint_venture"
                        ? "var(--chart-3)"
                        : key === "related_party"
                          ? "var(--chart-4)"
                          : "var(--chart-5)",
              }}
            />
            {label}
          </span>
        ))}
        {showHints ? (
          <span className="ml-auto text-[11px] text-muted-foreground/80">
            Scroll to zoom · drag to pan · click a node for details
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <CompanyGraphCanvas
          nodes={visibleNodes}
          edges={visibleEdges}
          selectedId={effectiveSelectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setShowHints(false);
          }}
        />

        <aside className="rounded-xl border border-border bg-card/40 p-4">
          {selected ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {selected.node_kind === "listed" ? "Listed" : "Unlisted"}
                </p>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {selected.symbol ?? selected.name}
                </h2>
                <p className="text-sm text-muted-foreground">{selected.name}</p>
                {selected.sector ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.sector}
                  </p>
                ) : null}
              </div>

              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div className="rounded-lg border border-border/70 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Market cap (LKR)
                  </dt>
                  <dd className="font-mono tabular-nums">
                    {formatCompactNumber(selected.market_cap, 1)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/70 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Equity / net assets (LKR)
                  </dt>
                  <dd className="font-mono tabular-nums">
                    {formatCompactNumber(scaleEquity(selected), 1)}
                    {selected.equity_as_of ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        as of {selected.equity_as_of}
                      </span>
                    ) : null}
                  </dd>
                  <dd className="text-[11px] text-muted-foreground">
                    conf {selected.equity_confidence} · scale{" "}
                    {selected.equity_scale}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Links ({selectedEdges.length})
                </p>
                <ul className="relative max-h-48 space-y-1.5 overflow-y-auto text-sm after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-6 after:bg-gradient-to-t after:from-card after:to-transparent">
                  {selectedEdges.slice(0, 24).map((e) => {
                    const outbound = e.src_node_id === selected.id;
                    const other = outbound ? e.dst_name : e.src_name;
                    const otherSym = outbound ? e.dst_symbol : e.src_symbol;
                    return (
                      <li
                        key={e.id}
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        <Badge variant="outline" className="text-[10px]">
                          {outbound ? "→" : "←"} {RELATION_LABEL[e.relation]}
                        </Badge>
                        <button
                          type="button"
                          className="truncate text-left text-foreground underline-offset-2 hover:underline"
                          onClick={() => {
                            const id = outbound
                              ? e.dst_node_id
                              : e.src_node_id;
                            const n = visibleNodes.find((x) => x.id === id);
                            if (n) focusNode(n);
                          }}
                        >
                          {otherSym ?? other}
                        </button>
                        {e.ownership_pct != null ? (
                          <span className="text-xs text-muted-foreground">
                            {e.ownership_pct}%
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {selected.symbol ? (
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link
                    href={`/symbols/${encodeURIComponent(selected.symbol)}`}
                  >
                    Open symbol
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <p className={cn("text-sm text-muted-foreground")}>
              Click a company node or search for a symbol to see equity, market
              cap, and linked entities.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
