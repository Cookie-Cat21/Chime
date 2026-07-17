import type { Pool } from "pg";

import { toFiniteNumber } from "@/lib/api/finite-number";
import {
  MAX_STOCK_NAME_LENGTH,
  sanitizeDisclosureText,
} from "@/lib/api/disclosure-safe";
import {
  pickInitialsDisplay,
  softPersonKey,
} from "@/lib/api/person-aliases";
import {
  PERSON_ROLES,
  ROLE_WEIGHT,
  type PersonRole,
} from "@/lib/api/people-graph";
import { normalizeSymbol } from "@/lib/api/symbol";

export type DossierSeat = {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  roles: PersonRole[];
  market_cap: number | null;
  influence_share: number;
};

export type DossierCoDirector = {
  id: number;
  name: string;
  shared_symbols: string[];
  shared_count: number;
  top_role: PersonRole | null;
  influence_score: number;
};

export type PersonDossier = {
  id: number;
  name: string;
  merged_ids: number[];
  top_role: PersonRole | null;
  influence_score: number;
  company_count: number;
  seats: DossierSeat[];
  network: DossierCoDirector[];
  disclaimer: string;
};

function asRole(raw: unknown): PersonRole | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return (PERSON_ROLES as readonly string[]).includes(v)
    ? (v as PersonRole)
    : null;
}

function roleRank(role: PersonRole): number {
  return ROLE_WEIGHT[role] ?? 0;
}

/**
 * Load a person dossier. Soft-merges CSE initials variants that share the
 * same softPersonKey so K. Balendra / K. N. J. Balendra land on one page.
 */
export async function queryPersonDossier(
  pool: Pool,
  personId: number,
): Promise<PersonDossier | null> {
  if (!Number.isFinite(personId) || personId <= 0) return null;

  const seed = await pool.query(
    `SELECT id, display_name, name_norm FROM people WHERE id = $1`,
    [personId],
  );
  if (seed.rows.length === 0) return null;

  const seedName = String(seed.rows[0].display_name ?? "");
  const mergeKey = softPersonKey(seedName);

  // Pull a bounded candidate set that might soft-merge with this person
  const candidates = await pool.query(
    `
    SELECT DISTINCT p.id, p.display_name, p.name_norm
    FROM people p
    JOIN person_company_roles r ON r.person_id = p.id AND r.active
    WHERE r.extract_notes->>'source' = 'cse_company_profile'
       OR r.extract_notes->>'source' IS NULL
    LIMIT 4000
    `,
  );

  const mergedIds: number[] = [];
  let displayName = seedName;
  for (const row of candidates.rows) {
    const id = Number(row.id);
    const name = String(row.display_name ?? "");
    if (!Number.isFinite(id)) continue;
    if (softPersonKey(name) !== mergeKey) continue;
    mergedIds.push(id);
    displayName = pickInitialsDisplay(displayName, name);
  }
  if (!mergedIds.includes(personId)) mergedIds.push(personId);

  const rolesRes = await pool.query(
    `
    SELECT
      r.person_id,
      r.symbol,
      r.role,
      r.confidence,
      s.name AS company_name,
      s.sector,
      ps.market_cap
    FROM person_company_roles r
    LEFT JOIN stocks s ON s.symbol = r.symbol
    LEFT JOIN LATERAL (
      SELECT market_cap
      FROM price_snapshots x
      WHERE x.symbol = r.symbol AND x.market_cap IS NOT NULL
      ORDER BY x.ts DESC
      LIMIT 1
    ) ps ON TRUE
    WHERE r.person_id = ANY($1::bigint[])
      AND r.active
    ORDER BY r.symbol ASC
    `,
    [mergedIds],
  );

  type SeatAcc = {
    symbol: string;
    company_name: string | null;
    sector: string | null;
    roles: PersonRole[];
    market_cap: number | null;
    bestWeight: number;
  };
  const bySym = new Map<string, SeatAcc>();
  let topRole: PersonRole | null = null;
  let topWeight = -1;

  for (const row of rolesRes.rows) {
    const symbol = normalizeSymbol(row.symbol);
    if (!symbol) continue;
    const role = asRole(row.role);
    if (!role) continue;
    const mcap = toFiniteNumber(row.market_cap);
    const w = roleRank(role);
    if (w > topWeight) {
      topWeight = w;
      topRole = role;
    }
    const prev = bySym.get(symbol);
    if (!prev) {
      bySym.set(symbol, {
        symbol,
        company_name:
          typeof row.company_name === "string"
            ? sanitizeDisclosureText(row.company_name, MAX_STOCK_NAME_LENGTH)
            : null,
        sector:
          typeof row.sector === "string"
            ? sanitizeDisclosureText(row.sector, 80)
            : null,
        roles: [role],
        market_cap: mcap,
        bestWeight: w,
      });
      continue;
    }
    if (!prev.roles.includes(role)) prev.roles.push(role);
    if (w > prev.bestWeight) prev.bestWeight = w;
    if ((mcap ?? 0) > (prev.market_cap ?? 0)) prev.market_cap = mcap;
  }

  const seatsRaw = Array.from(bySym.values()).map((s) => ({
    ...s,
    roles: [...s.roles].sort((a, b) => roleRank(b) - roleRank(a)),
  }));

  let influence = 0;
  for (const s of seatsRaw) {
    influence += (s.market_cap ?? 0) * s.bestWeight;
  }

  const seats: DossierSeat[] = seatsRaw
    .map((s) => ({
      symbol: s.symbol,
      company_name: s.company_name,
      sector: s.sector,
      roles: s.roles,
      market_cap: s.market_cap,
      influence_share:
        influence > 0 ? ((s.market_cap ?? 0) * s.bestWeight) / influence : 0,
    }))
    .sort(
      (a, b) =>
        b.influence_share - a.influence_share ||
        (b.market_cap ?? 0) - (a.market_cap ?? 0),
    );

  const symbols = seats.map((s) => s.symbol);
  const network: DossierCoDirector[] = [];

  if (symbols.length > 0) {
    const netRes = await pool.query(
      `
      SELECT
        p.id AS person_id,
        p.display_name,
        r.symbol,
        r.role,
        ps.market_cap
      FROM person_company_roles r
      JOIN people p ON p.id = r.person_id
      LEFT JOIN LATERAL (
        SELECT market_cap
        FROM price_snapshots x
        WHERE x.symbol = r.symbol AND x.market_cap IS NOT NULL
        ORDER BY x.ts DESC
        LIMIT 1
      ) ps ON TRUE
      WHERE r.active
        AND r.symbol = ANY($1::text[])
        AND NOT (r.person_id = ANY($2::bigint[]))
      `,
      [symbols, mergedIds],
    );

    type NetAcc = {
      id: number;
      name: string;
      symbols: Set<string>;
      topRole: PersonRole | null;
      topWeight: number;
      influence: number;
      perSym: Map<string, number>;
    };
    const byPerson = new Map<number, NetAcc>();
    for (const row of netRes.rows) {
      const id = Number(row.person_id);
      if (!Number.isFinite(id)) continue;
      const symbol = normalizeSymbol(row.symbol);
      if (!symbol) continue;
      const role = asRole(row.role);
      if (!role) continue;
      const name = sanitizeDisclosureText(
        String(row.display_name ?? ""),
        MAX_STOCK_NAME_LENGTH,
      );
      if (!name) continue;
      let acc = byPerson.get(id);
      if (!acc) {
        acc = {
          id,
          name,
          symbols: new Set(),
          topRole: null,
          topWeight: -1,
          influence: 0,
          perSym: new Map(),
        };
        byPerson.set(id, acc);
      }
      acc.name = pickInitialsDisplay(acc.name, name);
      acc.symbols.add(symbol);
      const w = roleRank(role);
      if (w > acc.topWeight) {
        acc.topWeight = w;
        acc.topRole = role;
      }
      const mcap = toFiniteNumber(row.market_cap) ?? 0;
      const score = mcap * w;
      const prev = acc.perSym.get(symbol) ?? 0;
      if (score > prev) acc.perSym.set(symbol, score);
    }

    // Soft-merge network peers
    const peerMerged = new Map<string, NetAcc>();
    for (const acc of byPerson.values()) {
      const key = softPersonKey(acc.name);
      const prev = peerMerged.get(key);
      if (!prev) {
        peerMerged.set(key, acc);
        continue;
      }
      prev.name = pickInitialsDisplay(prev.name, acc.name);
      for (const s of acc.symbols) prev.symbols.add(s);
      for (const [sym, score] of acc.perSym) {
        const p = prev.perSym.get(sym) ?? 0;
        if (score > p) prev.perSym.set(sym, score);
      }
      if (acc.topWeight > prev.topWeight) {
        prev.topWeight = acc.topWeight;
        prev.topRole = acc.topRole;
      }
    }

    for (const acc of peerMerged.values()) {
      let inf = 0;
      for (const v of acc.perSym.values()) inf += v;
      network.push({
        id: acc.id,
        name: acc.name,
        shared_symbols: Array.from(acc.symbols).sort(),
        shared_count: acc.symbols.size,
        top_role: acc.topRole,
        influence_score: inf,
      });
    }
    network.sort(
      (a, b) =>
        b.shared_count - a.shared_count ||
        b.influence_score - a.influence_score,
    );
  }

  return {
    id: personId,
    name:
      sanitizeDisclosureText(displayName, MAX_STOCK_NAME_LENGTH) || "—",
    merged_ids: mergedIds,
    top_role: topRole,
    influence_score: influence,
    company_count: seats.length,
    seats,
    network: network.slice(0, 40),
    disclaimer:
      "Board seats from official CSE companyProfile. Influence = linked company market cap × role weight — not personal net worth. Not financial advice. Year-by-year history will grow from future sync snapshots.",
  };
}
