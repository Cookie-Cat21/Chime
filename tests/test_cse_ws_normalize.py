"""Unit tests for CSE STOMP/SockJS price normalize (no live socket)."""

from __future__ import annotations

from datetime import UTC, datetime

from koel.adapters.cse_ws import (
    parse_ws_index_payload,
    parse_ws_price_payload,
    ws_price_row_to_snapshot,
    WsPriceRow,
)


def test_ws_daytrade_row_to_snapshot() -> None:
    row = WsPriceRow.model_validate(
        {
            "symbol": "sltl.n0000",
            "price": 87.0,
            "change": 0.0,
            "changePercentage": 0.0,
        }
    )
    snap = ws_price_row_to_snapshot(
        row, now=datetime(2026, 7, 23, 5, 0, tzinfo=UTC)
    )
    assert snap is not None
    assert snap.symbol == "SLTL.N0000"
    assert snap.price == 87.0
    assert snap.change == 0.0
    assert snap.change_pct == 0.0
    assert snap.previous_close == 87.0


def test_parse_ws_price_payload_list() -> None:
    snaps = parse_ws_price_payload(
        [
            {"symbol": "RFL.N0000", "price": 24.3, "change": 1.8, "changePercentage": 8.0},
            {"symbol": "", "price": 1.0},
            {"symbol": "BAD", "price": "nope"},
        ],
        now=datetime(2026, 7, 23, 5, 0, tzinfo=UTC),
    )
    assert len(snaps) == 1
    assert snaps[0].symbol == "RFL.N0000"
    assert snaps[0].price == 24.3


def test_parse_ws_index_aspi() -> None:
    idx = parse_ws_index_payload(
        {
            "value": 21230.2,
            "change": 80.64,
            "percentage": 0.38,
            "timestamp": "2026-07-23T05:10:38.886+0000",
        },
        code="ASPI",
    )
    assert idx is not None
    assert idx.code == "ASPI"
    assert idx.value == 21230.2
    assert idx.change == 80.64
