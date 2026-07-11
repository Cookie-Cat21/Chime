import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  __chimePgPool?: Pool;
};

export function getPool(): Pool {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForPg.__chimePgPool) {
    globalForPg.__chimePgPool = new Pool({
      connectionString: url,
      max: 5,
    });
  }
  return globalForPg.__chimePgPool;
}

/** ensure_user for allowlisted demo IDs only (caller must gate allowlist). */
export async function ensureUser(telegramId: number): Promise<number> {
  const pool = getPool();
  const result = await pool.query<{ id: string | number }>(
    `INSERT INTO users (telegram_id)
     VALUES ($1)
     ON CONFLICT (telegram_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id
     RETURNING id`,
    [telegramId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("ensure_user returned no row");
  return Number(row.id);
}
