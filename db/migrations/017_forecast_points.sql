-- 017_forecast_points.sql
-- Model path estimates for sparkline overlay (NFA — not price targets).

CREATE TABLE IF NOT EXISTS forecast_points (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    model_version TEXT NOT NULL,
    horizon_i SMALLINT NOT NULL CHECK (horizon_i >= 1 AND horizon_i <= 30),
    as_of DATE NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    yhat DOUBLE PRECISION NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (symbol, model_version, as_of, horizon_i)
);

CREATE INDEX IF NOT EXISTS idx_forecast_points_symbol_as_of
    ON forecast_points (symbol, as_of DESC, horizon_i ASC);
