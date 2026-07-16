-- 016_symbol_scores.sql
-- Signal Board research scores (NFA — not invest tips).
-- Computed offline from daily_bars (+ later filings). Flag-gated in app.

CREATE TABLE IF NOT EXISTS symbol_scores (
    symbol TEXT NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    as_of DATE NOT NULL,
    model_version TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    components JSONB NOT NULL DEFAULT '{}'::jsonb,
    reasons TEXT[] NOT NULL DEFAULT '{}',
    bar_count INTEGER NOT NULL DEFAULT 0,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (symbol, as_of, model_version)
);

CREATE INDEX IF NOT EXISTS idx_symbol_scores_as_of_score
    ON symbol_scores (as_of DESC, score DESC);

CREATE INDEX IF NOT EXISTS idx_symbol_scores_score
    ON symbol_scores (score DESC);
