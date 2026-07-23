-- Live CSE STOMP/SockJS ticks (koel ws / CSE_WS_ENABLED poller side-car).
-- Distinct from poller HTTP tradeSummary and cse_intraday chart backfill.

ALTER TABLE price_snapshots
    DROP CONSTRAINT IF EXISTS price_snapshots_source_check;
ALTER TABLE price_snapshots
    ADD CONSTRAINT price_snapshots_source_check
    CHECK (source IN ('poller', 'cse_intraday', 'cse_ws'));
