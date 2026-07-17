"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonNode, PersonRole } from "@/lib/api/people-graph";
import { ROLE_WEIGHT } from "@/lib/api/people-graph";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  chairman: "Chair",
  deputy_chairman: "Deputy",
  ceo: "CEO",
  managing_director: "MD",
  executive_director: "Exec",
  non_executive_director: "NED",
  independent_director: "Indep",
  senior_independent_director: "Sr indep",
  cfo: "CFO",
  company_secretary: "Sec",
  director: "Dir",
  key_management: "Key",
};

const ROLE_SORT = (a: string, b: string) =>
  (ROLE_WEIGHT[b as PersonRole] ?? 0) - (ROLE_WEIGHT[a as PersonRole] ?? 0);

function groupRolesByCompany(person: PersonNode) {
  const bySym = new Map<
    string,
    {
      symbol: string;
      company_name: string | null;
      market_cap: number | null;
      roles: string[];
    }
  >();
  for (const r of person.roles) {
    const prev = bySym.get(r.symbol);
    if (!prev) {
      bySym.set(r.symbol, {
        symbol: r.symbol,
        company_name: r.company_name,
        market_cap: r.market_cap,
        roles: [r.role],
      });
      continue;
    }
    if (!prev.roles.includes(r.role)) prev.roles.push(r.role);
    if ((r.market_cap ?? 0) > (prev.market_cap ?? 0)) {
      prev.market_cap = r.market_cap;
    }
  }
  return Array.from(bySym.values())
    .map((row) => ({
      ...row,
      roles: [...row.roles].sort(ROLE_SORT),
    }))
    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
}

/** Initial canvas budget — denser graphs stay readable. */
const CANVAS_PEOPLE = 18;
const CANVAS_COMPANIES = 22;

type PData = {
  label: string;
  sub: string;
  selected: boolean;
  dimmed: boolean;
};
type CData = {
  label: string;
  sub: string;
  selected: boolean;
  dimmed: boolean;
};

function PersonPill({ data }: NodeProps<Node<PData>>) {
  return (
    <div
      className={cn(
        "flex h-11 w-[148px] cursor-pointer flex-col justify-center rounded-md border border-border bg-card px-2.5 shadow-sm transition-opacity",
        data.selected && "ring-2 ring-ring",
        data.dimmed && "opacity-25",
      )}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!size-1.5 !bg-border"
      />
      <span className="truncate text-[11px] font-semibold leading-tight">
        {data.label}
      </span>
      <span className="truncate font-mono text-[10px] text-muted-foreground">
        {data.sub}
      </span>
    </div>
  );
}

function CompanyPill({ data }: NodeProps<Node<CData>>) {
  return (
    <div
      className={cn(
        "flex h-11 w-[108px] cursor-pointer flex-col justify-center rounded-md border border-border bg-muted/35 px-2.5 transition-opacity",
        data.selected && "ring-2 ring-ring",
        data.dimmed && "opacity-25",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1.5 !bg-border"
      />
      <span className="font-mono text-[11px] font-semibold">{data.label}</span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {data.sub}
      </span>
    </div>
  );
}

const nodeTypes = { person: PersonPill, company: CompanyPill };

function shortName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name;
  // Prefer "K. A. D. D. Perera" → keep first initials + surname
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1);
  if (head.every((p) => p.length <= 2)) {
    return `${head.slice(0, 3).join(" ")}${head.length > 3 ? "…" : ""} ${last}`;
  }
  return `${parts[0]} ${last}`;
}

function ticker(symbol: string): string {
  return symbol.replace(/\.(N|X)0000$/i, "");
}

/** Barycenter ordering to cut bipartite edge crossings. */
function orderBipartite(
  peopleIds: number[],
  companyIds: string[],
  links: Array<{ personId: number; symbol: string }>,
): { people: number[]; companies: string[] } {
  let people = [...peopleIds];
  let companies = [...companyIds];
  for (let iter = 0; iter < 4; iter++) {
    const pIndex = new Map(people.map((id, i) => [id, i]));
    companies = [...companies].sort((a, b) => {
      const aLinks = links.filter((l) => l.symbol === a);
      const bLinks = links.filter((l) => l.symbol === b);
      const aBar =
        aLinks.reduce((s, l) => s + (pIndex.get(l.personId) ?? 0), 0) /
        Math.max(aLinks.length, 1);
      const bBar =
        bLinks.reduce((s, l) => s + (pIndex.get(l.personId) ?? 0), 0) /
        Math.max(bLinks.length, 1);
      return aBar - bBar;
    });
    const cIndex = new Map(companies.map((id, i) => [id, i]));
    people = [...people].sort((a, b) => {
      const aLinks = links.filter((l) => l.personId === a);
      const bLinks = links.filter((l) => l.personId === b);
      const aBar =
        aLinks.reduce((s, l) => s + (cIndex.get(l.symbol) ?? 0), 0) /
        Math.max(aLinks.length, 1);
      const bBar =
        bLinks.reduce((s, l) => s + (cIndex.get(l.symbol) ?? 0), 0) /
        Math.max(bLinks.length, 1);
      return aBar - bBar;
    });
  }
  return { people, companies };
}

function FitViewOnChange({ nonce }: { nonce: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 220 });
    }, 40);
    return () => window.clearTimeout(t);
  }, [fitView, nonce]);
  return null;
}

function PeopleFlow({
  people,
  selectedId,
  onSelect,
  searching,
}: {
  people: PersonNode[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  searching: boolean;
}) {
  const { nodes, edges, layoutKey } = useMemo(() => {
    // When searching, show matches; otherwise top influencers only.
    const ranked = [...people].sort(
      (a, b) => b.influence_score - a.influence_score,
    );
    const budget = searching
      ? Math.min(ranked.length, 24)
      : Math.min(ranked.length, CANVAS_PEOPLE);
    const visiblePeople = ranked.slice(0, budget);

    const companyMeta = new Map<
      string,
      { mcap: number | null; name: string | null; degree: number }
    >();
    const links: Array<{
      personId: number;
      symbol: string;
      role: string;
    }> = [];
    for (const p of visiblePeople) {
      const seen = new Set<string>();
      for (const r of p.roles) {
        if (seen.has(r.symbol)) continue;
        seen.add(r.symbol);
        links.push({ personId: p.id, symbol: r.symbol, role: r.role });
        const prev = companyMeta.get(r.symbol);
        companyMeta.set(r.symbol, {
          mcap: Math.max(prev?.mcap ?? 0, r.market_cap ?? 0) || r.market_cap,
          name: r.company_name ?? prev?.name ?? null,
          degree: (prev?.degree ?? 0) + 1,
        });
      }
    }

    // Prefer companies that connect multiple visible people, then by mcap
    const companyIds = Array.from(companyMeta.entries())
      .sort((a, b) => {
        if (b[1].degree !== a[1].degree) return b[1].degree - a[1].degree;
        return (b[1].mcap ?? 0) - (a[1].mcap ?? 0);
      })
      .slice(0, CANVAS_COMPANIES)
      .map(([sym]) => sym);
    const companySet = new Set(companyIds);
    const visibleLinks = links.filter((l) => companySet.has(l.symbol));

    const ordered = orderBipartite(
      visiblePeople.map((p) => p.id),
      companyIds,
      visibleLinks,
    );
    const byId = new Map(visiblePeople.map((p) => [p.id, p]));

    const selectedCompanies = new Set<string>();
    if (selectedId != null) {
      for (const l of visibleLinks) {
        if (l.personId === selectedId) selectedCompanies.add(l.symbol);
      }
    }
    const focusActive = selectedId != null;

    const personYGap = 56;
    const companyYGap = 52;
    const leftX = 24;
    const rightX = 360;

    const flowNodes: Node[] = [];
    ordered.people.forEach((id, i) => {
      const p = byId.get(id);
      if (!p) return;
      const dimmed = focusActive && id !== selectedId;
      flowNodes.push({
        id: `p-${id}`,
        type: "person",
        position: { x: leftX, y: 16 + i * personYGap },
        data: {
          label: shortName(p.name),
          sub: formatCompactNumber(p.influence_score, 1),
          selected: id === selectedId,
          dimmed,
        },
        zIndex: id === selectedId ? 4 : 1,
      });
    });
    ordered.companies.forEach((sym, i) => {
      const meta = companyMeta.get(sym);
      const dimmed = focusActive && !selectedCompanies.has(sym);
      flowNodes.push({
        id: `c-${sym}`,
        type: "company",
        position: { x: rightX, y: 16 + i * companyYGap },
        data: {
          label: ticker(sym),
          sub: formatCompactNumber(meta?.mcap ?? null, 1),
          selected: selectedCompanies.has(sym),
          dimmed,
        },
        zIndex: selectedCompanies.has(sym) ? 3 : 1,
      });
    });

    // One edge per person→company; label only when that person is selected
    const flowEdges: Edge[] = [];
    const edgeSeen = new Set<string>();
    for (const l of visibleLinks) {
      const key = `${l.personId}:${l.symbol}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      const focused = selectedId != null && l.personId === selectedId;
      const faded = focusActive && !focused;
      // Best role label for this seat (highest weight already in person.roles order)
      const person = byId.get(l.personId);
      const role =
        person?.roles.find((r) => r.symbol === l.symbol)?.role ?? l.role;
      flowEdges.push({
        id: `e-${key}`,
        source: `p-${l.personId}`,
        target: `c-${l.symbol}`,
        type: "smoothstep",
        label: focused ? (ROLE_LABEL[role] ?? role) : undefined,
        animated: focused,
        style: {
          stroke: focused ? "var(--chart-1)" : "var(--border)",
          strokeWidth: focused ? 2.2 : 1,
          opacity: faded ? 0.08 : focused ? 0.95 : 0.35,
        },
        markerEnd: focused
          ? {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: "var(--chart-1)",
            }
          : undefined,
        labelStyle: {
          fontSize: 10,
          fill: "var(--foreground)",
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "var(--background)",
          fillOpacity: 0.92,
        },
        labelBgPadding: [4, 6] as [number, number],
        zIndex: focused ? 5 : 0,
      });
    }

    return {
      nodes: flowNodes,
      edges: flowEdges,
      layoutKey: `${ordered.people.join(",")}|${ordered.companies.join(",")}|${selectedId ?? "x"}|${searching}`,
    };
  }, [people, selectedId, searching]);

  if (people.length === 0) {
    return (
      <div className="flex h-[min(70vh,560px)] items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
        No people match this filter.
      </div>
    );
  }

  return (
    <div className="relative h-[min(72vh,640px)] w-full overflow-hidden rounded-xl border border-border bg-background/60">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border/80 bg-background/90 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
        People → companies · click a person to highlight seats
        {!searching ? ` · showing top ${Math.min(people.length, CANVAS_PEOPLE)}` : null}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.35}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => {
          if (node.id.startsWith("p-")) {
            const id = Number(node.id.slice(2));
            onSelect(Number.isFinite(id) ? id : null);
          } else if (node.id.startsWith("c-")) {
            // Selecting a company: pick its strongest linked person if any
            const sym = node.id.slice(2);
            const linked = people
              .filter((p) => p.roles.some((r) => r.symbol === sym))
              .sort((a, b) => b.influence_score - a.influence_score);
            if (linked[0]) onSelect(linked[0].id);
          }
        }}
        onPaneClick={() => onSelect(null)}
      >
        <Background gap={20} size={1} color="var(--border)" />
        <Controls showInteractive={false} />
        <FitViewOnChange nonce={layoutKey} />
      </ReactFlow>
    </div>
  );
}

export function PeopleGraphClient({ people }: { people: PersonNode[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(
    people[0]?.id ?? null,
  );
  // Default leadership-only so the first paint is chairs/CEOs/MDs, not every NED
  const [leadershipOnly, setLeadershipOnly] = useState(true);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const lead = new Set([
      "chairman",
      "ceo",
      "managing_director",
      "deputy_chairman",
      "executive_director",
      "cfo",
    ]);
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (leadershipOnly && !p.roles.some((r) => lead.has(r.role))) return false;
      if (!q) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      return p.roles.some(
        (r) =>
          r.symbol.toLowerCase().includes(q) ||
          (r.company_name?.toLowerCase().includes(q) ?? false),
      );
    });
  }, [people, leadershipOnly, query]);

  // Keep selection valid when filters change
  useEffect(() => {
    if (selectedId != null && filtered.some((p) => p.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((p) => p.id === selectedId) ?? null;
  const searching = query.trim().length > 0;

  if (people.length === 0) {
    return (
      <EmptyState
        title="No people extracted yet"
        description="Run directors-backfill to pull official CSE companyProfile boards into the map."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people or symbols…"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search people or symbols"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={leadershipOnly}
            onChange={(e) => setLeadershipOnly(e.target.checked)}
            className="size-4 rounded border-border"
          />
          Leadership seats only
        </label>
        <Badge variant="outline" className="tabular-nums">
          {filtered.length} people
        </Badge>
        <p className="text-xs text-muted-foreground">
          Canvas shows top influencers; full list is in the ranking. Bubble
          values are linked company market value × role — not personal net
          worth.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ReactFlowProvider>
          <PeopleFlow
            people={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            searching={searching}
          />
        </ReactFlowProvider>

        <aside className="flex min-h-[min(72vh,640px)] flex-col overflow-hidden rounded-xl border border-border bg-card/40">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Influence ranking
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Board seats × company market cap (LKR). Not personal net worth.
            </p>
          </div>

          <ol className="max-h-[42%] min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
            {filtered.slice(0, 80).map((p, i) => {
              const topLabel = p.top_role
                ? ROLE_LABEL[p.top_role] ?? p.top_role
                : null;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    title={p.name}
                    className={cn(
                      "grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/80",
                      selected?.id === p.id && "bg-muted",
                    )}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium leading-tight">
                        {p.name}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {topLabel ?? "—"} · {p.company_count} co
                        {p.company_count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">
                      {formatCompactNumber(p.influence_score, 1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {selected ? (
            <div className="flex min-h-0 flex-[1.15] flex-col border-t border-border bg-background/50">
              <div className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2
                      className="truncate font-display text-[15px] font-semibold leading-snug"
                      title={selected.name}
                    >
                      {selected.name}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {selected.top_role
                        ? ROLE_LABEL[selected.top_role]
                        : "—"}{" "}
                      · {selected.company_count} compan
                      {selected.company_count === 1 ? "y" : "ies"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Influence
                    </p>
                    <p className="font-mono text-base font-semibold tabular-nums leading-none">
                      {formatCompactNumber(selected.influence_score, 1)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Seats
                </p>
                <ul className="space-y-1">
                  {groupRolesByCompany(selected).map((row) => (
                    <li
                      key={row.symbol}
                      className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                    >
                      <Link
                        href={`/symbols/${encodeURIComponent(row.symbol)}`}
                        className="font-mono text-[12px] font-semibold underline-offset-2 hover:underline"
                        title={row.company_name ?? row.symbol}
                      >
                        {ticker(row.symbol)}
                      </Link>
                      <div className="flex min-w-0 flex-wrap gap-1">
                        {row.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded border border-border/80 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {ROLE_LABEL[role] ?? role}
                          </span>
                        ))}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatCompactNumber(row.market_cap, 1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-border p-3">
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link href="/graph">Company ownership map</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
