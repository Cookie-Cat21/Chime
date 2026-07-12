"""Phase 1 stub worker — no LLM calls until AI_BRIEFS_ENABLED=1 (Phase 2)."""

from __future__ import annotations

import structlog

from chime.briefs import BriefSettings, BriefStatus, briefs_enabled

log = structlog.get_logger("chime.briefs")


async def enqueue_or_skip_brief(
    *,
    disclosure_id: int,
    settings: BriefSettings | None = None,
) -> BriefStatus:
    """Return skipped when disabled; pending when enabled (Phase 2 persists).

    Phase 1 does not write to Postgres — callers can ignore the status until
    the Phase 2 worker lands. Kept async for poller integration symmetry.
    """
    cfg = settings or BriefSettings.from_env()
    if not briefs_enabled(cfg):
        log.debug("brief_skipped_disabled", disclosure_id=disclosure_id)
        return BriefStatus.SKIPPED
    log.info(
        "brief_enqueue_stub",
        disclosure_id=disclosure_id,
        provider=cfg.provider,
        model=cfg.model,
    )
    return BriefStatus.PENDING
