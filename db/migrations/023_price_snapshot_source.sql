-- Tag CSE chart backfill ticks so alert previous_snapshot ignores them.
-- Poller / tradeSummary rows stay source='poller' (default).

ALTER TABLE price_snapshots
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'poller';

ALTER TABLE price_snapshots
    DROP CONSTRAINT IF EXISTS price_snapshots_source_check;
ALTER TABLE price_snapshots
    ADD CONSTRAINT price_snapshots_source_check
    CHECK (source IN ('poller', 'cse_intraday'));

-- Collapse duplicate (symbol, ts) before unique index (keep lowest id).
DELETE FROM price_snapshots a
    USING price_snapshots b
    WHERE a.symbol = b.symbol
      AND a.ts = b.ts
      AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_symbol_ts_uid
    ON price_snapshots (symbol, ts);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_source_ts
    ON price_snapshots (symbol, source, ts DESC);
