"""Wave31: medium+ bugs — session exp/sid, market numbers, health timeout, labels.

1. Session verify must require SafeInteger ``exp`` and hex-only ``sid`` (no
   float expiry skew / control-laden forged sid bodies).
2. Market page ``finiteOrNull`` must accept number primitives only — no
   ``Number(string)`` coercion (sci-notation / precision-loss quotes).
3. ``healthProxyTimeoutMs`` must parse via digits-only ``toSafePositiveInt``
   (not ``Number("3e3")`` soft-accept).
4. ``alertTypeLabel`` must fail-closed on unknown types (no raw echo).
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_session_exp_safe_integer_and_hex_sid() -> None:
    source = (WEB / "src" / "lib" / "auth" / "session.ts").read_text(
        encoding="utf-8"
    )
    assert "Number.isSafeInteger(json.exp)" in source
    assert "Number.isFinite(json.exp)" not in source
    assert "a-f0-9" in source
    assert "MAX_SESSION_SID_LENGTH" in source


def test_market_finite_or_null_numbers_only() -> None:
    page = WEB / "src" / "app" / "market" / "page.tsx"
    source = page.read_text(encoding="utf-8")
    assert "typeof value === \"number\" && Number.isFinite(value)" in source
    assert "Number(value)" not in source


def test_health_proxy_timeout_digits_only() -> None:
    route = WEB / "src" / "app" / "api" / "v1" / "health" / "route.ts"
    source = route.read_text(encoding="utf-8")
    assert "toSafePositiveInt(raw)" in source
    assert "const n = Number(raw);" not in source


def test_alert_type_label_fail_closed() -> None:
    source = (WEB / "src" / "lib" / "format.ts").read_text(encoding="utf-8")
    assert 'return "Unknown"' in source
    assert "return type;" not in source
