"""Sparkline tick-depth control pins (absolute max + query wiring)."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_sparkline_ticks_control_options_and_absolute_max() -> None:
    ctrl = (WEB / "src" / "components" / "kit" / "sparkline-ticks-control.tsx").read_text(
        encoding="utf-8"
    )
    assert "ABSOLUTE_MAX_SPARKLINE_TICKS = 500" in ctrl
    assert "60, 120, 200, 500" in ctrl
    assert 'params.set("ticks"' in ctrl

    api = (
        WEB / "src" / "app" / "api" / "v1" / "symbols" / "[symbol]" / "snapshots" / "route.ts"
    ).read_text(encoding="utf-8")
    assert "ABSOLUTE_MAX_SNAPSHOT_LIMIT = 500" in api

    spark = (WEB / "src" / "lib" / "sparkline.ts").read_text(encoding="utf-8")
    assert "MAX_SPARKLINE_POINTS = 500" in spark

    page = (WEB / "src" / "app" / "symbols" / "[symbol]" / "page.tsx").read_text(
        encoding="utf-8"
    )
    assert "parseSparklineTicks" in page
    assert "SparklineTicksControl" in page
    assert "snapshots?limit=${tickLimit}" in page
    assert "MAX_PAGE_SNAPSHOT_POINTS = 500" in page
