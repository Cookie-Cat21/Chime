-- 021_market_daily_summary.sql
-- CSE POST /dailyMarketSummery — market-wide turnover / foreign flow history.

CREATE TABLE IF NOT EXISTS market_daily_summary (
    trade_date DATE PRIMARY KEY,
    market_turnover DOUBLE PRECISION,
    market_trades DOUBLE PRECISION,
    equity_foreign_purchase DOUBLE PRECISION,
    equity_foreign_sales DOUBLE PRECISION,
    foreign_net DOUBLE PRECISION,
    volume_of_turnover DOUBLE PRECISION,
    market_cap DOUBLE PRECISION,
    asi DOUBLE PRECISION,
    raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_daily_summary_asi
    ON market_daily_summary (trade_date DESC);
