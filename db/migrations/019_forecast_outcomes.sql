-- 019_forecast_outcomes.sql
-- Ground-truth ledger for every forecast emit (gated + shadow).

CREATE TABLE IF NOT EXISTS forecast_outcomes (
    id BIGSERIAL PRIMARY KEY,
    model_id TEXT NOT NULL,
    model_version TEXT NOT NULL,
    symbol TEXT NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    issued_at DATE NOT NULL,
    horizon_days SMALLINT NOT NULL CHECK (horizon_days >= 1 AND horizon_days <= 30),
    y_pred DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION,
    gate TEXT,
    realized_at DATE,
    y_real DOUBLE PRECISION,
    hit BOOLEAN,
    regime_tag TEXT,
    scored BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    scored_at TIMESTAMPTZ,
    UNIQUE (model_version, symbol, issued_at, horizon_days)
);

CREATE INDEX IF NOT EXISTS idx_forecast_outcomes_unscored
    ON forecast_outcomes (realized_at ASC)
    WHERE scored = FALSE;

CREATE INDEX IF NOT EXISTS idx_forecast_outcomes_live
    ON forecast_outcomes (issued_at DESC, model_version);

CREATE INDEX IF NOT EXISTS idx_forecast_outcomes_regime
    ON forecast_outcomes (regime_tag, issued_at DESC)
    WHERE scored = TRUE;
