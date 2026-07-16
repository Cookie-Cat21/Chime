-- 014_drain_indexes.sql
-- Partial indexes for PDF enrich + filing-metrics backfill drains.
-- (No subquery predicates — Postgres partial indexes forbid them.)

CREATE INDEX IF NOT EXISTS idx_disclosures_missing_pdf
    ON disclosures (symbol, id)
    WHERE pdf_url IS NULL;

CREATE INDEX IF NOT EXISTS idx_disclosures_has_pdf
    ON disclosures (id)
    WHERE pdf_url IS NOT NULL;
