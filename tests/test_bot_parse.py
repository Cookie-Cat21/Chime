"""Bot parse helpers — normalize_symbol and START_TEXT."""

from __future__ import annotations

from chime.bot import START_TEXT, normalize_symbol
from chime.domain import disclaimer


def test_normalize_symbol_accepts_jkh() -> None:
    assert normalize_symbol("JKH.N0000") == "JKH.N0000"
    assert normalize_symbol("  jkh.n0000  ") == "JKH.N0000"
    assert normalize_symbol("COMB") == "COMB"


def test_normalize_symbol_rejects_empty_and_junk() -> None:
    assert normalize_symbol("") is None
    assert normalize_symbol("   ") is None
    assert normalize_symbol("!!!") is None
    assert normalize_symbol("this-is-not-a-symbol") is None
    assert normalize_symbol("A" * 20) is None


def test_start_text_is_short_and_mentions_colombo_disclaimer() -> None:
    # Roughly ≤ 3 conceptual paragraphs / blocks (split on blank lines)
    blocks = [b for b in START_TEXT.strip().split("\n\n") if b.strip()]
    assert len(blocks) <= 3
    assert "Colombo" in START_TEXT
    assert disclaimer() in START_TEXT or "Not financial advice" in START_TEXT
