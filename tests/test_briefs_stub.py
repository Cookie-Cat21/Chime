"""Phase 1 briefs stub: NFA prompt suffix + skip when disabled."""

from __future__ import annotations

import pytest

from chime.briefs import BriefSettings, BriefStatus, build_brief_prompt, nfa_suffix
from chime.briefs.worker import enqueue_or_skip_brief


def test_build_brief_prompt_includes_nfa_suffix() -> None:
    prompt = build_brief_prompt(
        symbol="JKH.N0000",
        title="Board Meeting",
        extracted_text="The board met on Tuesday.",
    )
    assert nfa_suffix() in prompt
    assert "JKH.N0000" in prompt
    assert "Board Meeting" in prompt
    assert "buy/sell/hold" in prompt.lower() or "Do not give buy/sell/hold" in prompt


@pytest.mark.asyncio
async def test_enqueue_or_skip_brief_skipped_when_disabled() -> None:
    status = await enqueue_or_skip_brief(
        disclosure_id=42,
        settings=BriefSettings(enabled=False, api_key=""),
    )
    assert status is BriefStatus.SKIPPED
