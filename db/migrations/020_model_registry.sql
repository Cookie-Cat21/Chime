-- 020_model_registry.sql
-- Champion / challenger registry for ML serve path.

CREATE TABLE IF NOT EXISTS model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    algo TEXT NOT NULL,
    feature_set_hash TEXT,
    feature_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    train_start DATE,
    train_end DATE,
    horizons SMALLINT[] NOT NULL DEFAULT '{1}',
    cv_protocol TEXT NOT NULL DEFAULT 'purged_panel_v1',
    oos_rankic DOUBLE PRECISION,
    oos_hit DOUBLE PRECISION,
    oos_gated_hit DOUBLE PRECISION,
    oos_coverage DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'candidate'
        CHECK (status IN (
            'candidate', 'challenger', 'champion', 'retired', 'rolled_back'
        )),
    degraded BOOLEAN NOT NULL DEFAULT FALSE,
    promoted_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    parent_model_id TEXT,
    artifact_path TEXT,
    notes TEXT
);

-- At most one champion whose horizons include 1d (primary serve horizon).
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_registry_champion_h1
    ON model_registry ((1))
    WHERE status = 'champion' AND 1 = ANY (horizons);

CREATE INDEX IF NOT EXISTS idx_model_registry_status
    ON model_registry (status, created_at DESC);
