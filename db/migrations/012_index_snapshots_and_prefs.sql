-- Wave 3-5: market index snapshots, dashboard preferences, sessions, and mutes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS index_snapshots (
    code TEXT,
    name TEXT,
    value DOUBLE PRECISION,
    change DOUBLE PRECISION,
    change_pct DOUBLE PRECISION,
    ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_index_snapshots_code_ts
    ON index_snapshots (code, ts DESC);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS quiet_hours_start SMALLINT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS quiet_hours_end SMALLINT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS alert_quota_max INT NOT NULL DEFAULT 100;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_quiet_hours_start_check'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_quiet_hours_start_check
            CHECK (
                quiet_hours_start IS NULL
                OR (quiet_hours_start >= 0 AND quiet_hours_start <= 23)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_quiet_hours_end_check'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_quiet_hours_end_check
            CHECK (
                quiet_hours_end IS NULL
                OR (quiet_hours_end >= 0 AND quiet_hours_end <= 23)
            );
    END IF;
END $$;

ALTER TABLE alert_rules
    ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS dash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dash_sessions_user_id
    ON dash_sessions (user_id);
