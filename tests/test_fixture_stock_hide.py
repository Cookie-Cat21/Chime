"""Hide pytest fixture stocks (TEST CO / digit-root) from dash surfaces."""

from __future__ import annotations

from pathlib import Path

WEB = Path(__file__).resolve().parents[1] / "web"


def test_fixture_stock_helper_covers_integration_shapes() -> None:
    helper = WEB / "src" / "lib" / "api" / "fixture-stock.ts"
    assert helper.is_file()
    src = helper.read_text(encoding="utf-8")
    assert "export function isFixtureStock" in src
    assert "SQL_EXCLUDE_FIXTURE_STOCKS" in src
    assert "TEST CO" in src
    assert "KILL CO" in src
    assert "[0-9]" in src
    assert "|| ' CO'" in src


def test_market_browse_excludes_fixture_stocks_in_sql() -> None:
    browse = WEB / "src" / "lib" / "api" / "market-browse.ts"
    src = browse.read_text(encoding="utf-8")
    assert "SQL_EXCLUDE_FIXTURE_STOCKS" in src
    assert 'from "@/lib/api/fixture-stock"' in src
    # Predicate is always present (not only when q/sector set).
    chunk = src.split("function browseFromWhere")[1].split("export async function")[0]
    assert "SQL_EXCLUDE_FIXTURE_STOCKS" in chunk


def test_watchlist_hides_and_rejects_fixture_stocks() -> None:
    route = WEB / "src" / "app" / "api" / "v1" / "watchlist" / "route.ts"
    src = route.read_text(encoding="utf-8")
    assert "isFixtureStock" in src
    assert "Synthetic test fixtures" in src


def test_symbol_page_and_detail_api_404_fixtures() -> None:
    page = WEB / "src" / "app" / "symbols" / "[symbol]" / "page.tsx"
    api = WEB / "src" / "app" / "api" / "v1" / "symbols" / "[symbol]" / "route.ts"
    page_src = page.read_text(encoding="utf-8")
    api_src = api.read_text(encoding="utf-8")
    assert "isFixtureStock" in page_src
    assert "notFound()" in page_src
    assert "isFixtureStock" in api_src


def test_alerts_hide_and_reject_fixture_stocks() -> None:
    route = WEB / "src" / "app" / "api" / "v1" / "alerts" / "route.ts"
    src = route.read_text(encoding="utf-8")
    assert "isFixtureStock" in src
    assert src.count("isFixtureStock") >= 2
