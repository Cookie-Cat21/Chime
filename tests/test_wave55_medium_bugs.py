"""Wave55: medium+ bugs — format abs-cap + alertTypeLabel typeof.

1. ``formatNumber`` / ``formatPct`` must fail-closed on absurd finite
   magnitudes (``MAX_FORMAT_ABS_VALUE``) — hostile ``1e308`` used to balloon
   ``toLocaleString`` / ``toFixed`` into multi-hundred-char price/pct labels.
2. ``alertTypeLabel`` must typeof-guard non-strings (never echo hostile
   non-string types into the UI via switch fallthrough).
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_format_number_and_pct_abs_cap() -> None:
    source = (WEB / "src" / "lib" / "format.ts").read_text(encoding="utf-8")
    assert "MAX_FORMAT_ABS_VALUE" in source
    assert "Math.abs(value) > MAX_FORMAT_ABS_VALUE" in source
    # Both formatters must gate before locale / toFixed.
    assert source.count("Math.abs(value) > MAX_FORMAT_ABS_VALUE") >= 2
    assert "1e15" in source


def test_alert_type_label_typeof_guard() -> None:
    source = (WEB / "src" / "lib" / "format.ts").read_text(encoding="utf-8")
    assert "export function alertTypeLabel(type: unknown)" in source
    assert 'typeof type !== "string"' in source
    chunk = source.split("export function alertTypeLabel")[1]
    assert 'typeof type !== "string"' in chunk
    assert 'return "Unknown"' in chunk
