-- Wave5: optional CSE sector index board (POST /allSectors).
-- Poller writes only when SECTORS_INGEST=1 (default off). Thin GET
-- /api/v1/sectors reads latest upserted rows from Postgres (no cse.lk).

CREATE TABLE IF NOT EXISTS sectors (
    sector_id INTEGER PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    index_code TEXT,
    index_code_sp TEXT,
    index_name TEXT,
    index_value DOUBLE PRECISION,
    change DOUBLE PRECISION,
    change_pct DOUBLE PRECISION,
    trade_today DOUBLE PRECISION,
    volume_today DOUBLE PRECISION,
    turnover_today DOUBLE PRECISION,
    previous_close DOUBLE PRECISION,
    ts TIMESTAMPTZ NOT NULL,
    cse_row_id BIGINT,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sectors_symbol
    ON sectors (symbol);

CREATE INDEX IF NOT EXISTS idx_sectors_change_pct
    ON sectors (change_pct DESC NULLS LAST);
