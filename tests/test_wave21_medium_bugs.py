"""Wave21: medium+ bugs — alerts history symbol filter validation.

1. History GET must reject non-CSE symbols via normalizeSymbol (400
   invalid_symbol), matching alerts list — not bare trim/uppercase.
2. History UI must not forward hostile symbol query params to the API.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_history_route_validates_symbol_filter() -> None:
    route = WEB / "src" / "app" / "api" / "v1" / "alerts" / "history" / "route.ts"
    source = route.read_text(encoding="utf-8")
    assert "normalizeSymbol" in source
    assert 'jsonError(400, "invalid_symbol"' in source
    # Ban unvalidated trim/uppercase filter push into SQL params.
    assert "symbolRaw.trim().toUpperCase()" not in source
    assert "symbolRaw && symbolRaw.trim() ? symbolRaw.trim().toUpperCase()" not in source


def test_history_page_normalizes_symbol_filter() -> None:
    page = WEB / "src" / "app" / "alerts" / "history" / "page.tsx"
    source = page.read_text(encoding="utf-8")
    assert "normalizeSymbol" in source
    assert "sp.symbol?.trim().toUpperCase()" not in source
