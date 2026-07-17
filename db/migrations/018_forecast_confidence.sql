-- 018_forecast_confidence.sql
-- Confidence / gate metadata for sparkline forecast overlay (NFA).

ALTER TABLE forecast_points
    ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS confidence_band TEXT,
    ADD COLUMN IF NOT EXISTS gate TEXT,
    ADD COLUMN IF NOT EXISTS reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE forecast_points
    DROP CONSTRAINT IF EXISTS forecast_points_confidence_check;

ALTER TABLE forecast_points
    ADD CONSTRAINT forecast_points_confidence_check
    CHECK (
        confidence IS NULL
        OR (confidence >= 0 AND confidence <= 1)
    );

ALTER TABLE forecast_points
    DROP CONSTRAINT IF EXISTS forecast_points_confidence_band_check;

ALTER TABLE forecast_points
    ADD CONSTRAINT forecast_points_confidence_band_check
    CHECK (
        confidence_band IS NULL
        OR confidence_band IN ('high', 'medium', 'low', 'none')
    );
