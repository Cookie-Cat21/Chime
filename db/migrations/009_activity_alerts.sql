-- 009_activity_alerts.sql
-- Unusual volume, volume+direction, crossing volume, big prints, gap,
-- buy-in board, non-compliance, and market halt/notice alerts.

-- Expand alert_rules.type allowlist (Postgres names CHECK alert_rules_type_check).
ALTER TABLE alert_rules DROP CONSTRAINT IF EXISTS alert_rules_type_check;
ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_type_check CHECK (type IN (
    'price_above',
    'price_below',
    'daily_move',
    'disclosure',
    'volume_spike',
    'volume_up',
    'volume_down',
    'crossing_volume',
    'big_print',
    'gap',
    'buy_in',
    'non_compliance',
    'halt'
));

-- Crossing volume from tradeSummary.crossingVolume (not previously persisted).
ALTER TABLE price_snapshots
    ADD COLUMN IF NOT EXISTS crossing_volume DOUBLE PRECISION;

-- Day-tape big prints (POST /daysTrade) for watched big_print rules.
CREATE TABLE IF NOT EXISTS big_prints (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    symbol TEXT NOT NULL REFERENCES stocks(symbol),
    price DOUBLE PRECISION,
    quantity DOUBLE PRECISION NOT NULL,
    traded_at TIMESTAMPTZ,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (external_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_big_prints_symbol_seen
    ON big_prints (symbol, seen_at DESC);

-- Market notices: buy-in board, non-compliance, halt/system notices.
CREATE TABLE IF NOT EXISTS market_notices (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    notice_type TEXT NOT NULL CHECK (notice_type IN (
        'buy_in', 'non_compliance', 'halt'
    )),
    symbol TEXT REFERENCES stocks(symbol),
    title TEXT NOT NULL,
    body TEXT,
    url TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (external_id, notice_type)
);

CREATE INDEX IF NOT EXISTS idx_market_notices_type_published
    ON market_notices (notice_type, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_notices_symbol
    ON market_notices (symbol) WHERE symbol IS NOT NULL;

-- Synthetic symbol for market-wide halt / notice alerts.
INSERT INTO stocks (symbol, name, sector)
VALUES ('MARKET', 'Colombo Stock Exchange (market-wide)', 'MARKET')
ON CONFLICT (symbol) DO NOTHING;
