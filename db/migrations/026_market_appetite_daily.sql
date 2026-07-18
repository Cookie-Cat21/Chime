-- 026_market_appetite_daily.sql
-- CSE Market Appetite meter — one composite score per trade date (Phase 0–1).

CREATE TABLE IF NOT EXISTS market_appetite_daily (
  trade_date date PRIMARY KEY,
  score double precision NOT NULL,
  band text NOT NULL,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'cse',
  universe_n int NOT NULL,
  advancers int,
  decliners int,
  unchanged int,
  aspi_change_pct double precision,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_appetite_daily_score_check CHECK (score >= 0 AND score <= 100),
  CONSTRAINT market_appetite_daily_band_check CHECK (band = ANY (ARRAY[
    'extreme_caution','caution','neutral','appetite','strong_appetite'
  ])),
  CONSTRAINT market_appetite_daily_source_check CHECK (source = ANY (ARRAY['cse','hybrid_research']))
);
CREATE INDEX IF NOT EXISTS idx_market_appetite_daily_source_date
  ON market_appetite_daily (source, trade_date DESC);
