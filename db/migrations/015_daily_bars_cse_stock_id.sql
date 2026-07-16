-- 015_daily_bars_cse_stock_id.sql
-- CSE path history: map tradeSummary/companyInfo id → stocks.cse_stock_id
-- and store daily bars from POST /companyChartDataByStock (period 2–5).
-- Path backfill is flag-gated in app code (PATH_BACKFILL_ENABLED default 0).

ALTER TABLE stocks
    ADD COLUMN IF NOT EXISTS cse_stock_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_cse_stock_id
    ON stocks (cse_stock_id)
    WHERE cse_stock_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS daily_bars (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    open DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    source_period SMALLINT NOT NULL,
    bar_ts TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_bars_symbol_date
    ON daily_bars (symbol, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_bars_trade_date
    ON daily_bars (trade_date DESC);
