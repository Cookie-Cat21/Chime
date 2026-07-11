"""CSE adapter circuit-open must propagate, not look like empty success."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from chime.adapters.cse import CSEClient
from chime.circuit import CircuitOpenError


@pytest.mark.asyncio
async def test_fetch_announcements_for_symbol_reraises_circuit_open() -> None:
    """WS-017: CircuitOpenError must not become [] (poller treats [] as success)."""
    client = CSEClient(fail_max=1, reset_timeout=60.0, client=AsyncMock())
    breaker = client._breaker("getAnnouncementByCompany")
    breaker.record_failure()  # open the circuit (fail_max=1)

    with pytest.raises(CircuitOpenError, match="circuit open"):
        await client.fetch_announcements_for_symbol("JKH.N0000")


@pytest.mark.asyncio
async def test_fetch_approved_announcements_reraises_circuit_open() -> None:
    """WS-017: CircuitOpenError must not become [] on approvedAnnouncement."""
    client = CSEClient(fail_max=1, reset_timeout=60.0, client=AsyncMock())
    breaker = client._breaker("approvedAnnouncement")
    breaker.record_failure()

    with pytest.raises(CircuitOpenError, match="circuit open"):
        await client.fetch_approved_announcements()
