"""Wave64: medium+ bugs — health age range, dash auth env, alert code typeof.

1. Health ``timestampAge`` must typeof-guard + range-gate via ``MAX_DATE_MS``
   — hostile / out-of-range stamps used to skew stale ops banners before the
   day-cap (parity formatTs / isStaleTs).
2. ``getDashAuthConfig`` / ``cookieSecure`` must typeof-guard env values —
   non-string mocks used to throw on ``.trim`` or soft-match Secure cookies.
3. Alert create form must typeof-guard API ``error.code`` — ``String()`` coerce
   used to turn objects into ``[object Object]`` and mis-route field errors.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_health_timestamp_age_range_and_typeof() -> None:
    source = (WEB / "src" / "app" / "health" / "page.tsx").read_text(
        encoding="utf-8"
    )
    assert "MAX_DATE_MS" in source
    chunk = source.split("function timestampAge")[1].split(
        "function formatAge"
    )[0]
    assert 'typeof iso !== "string"' in chunk
    assert "Math.abs(ts) > MAX_DATE_MS" in chunk
    assert "Number.isNaN(ts)" in chunk


def test_dash_auth_config_env_typeof_guard() -> None:
    source = (WEB / "src" / "lib" / "auth" / "config.ts").read_text(
        encoding="utf-8"
    )
    chunk = source.split("export function getDashAuthConfig")[1].split(
        "export function publicDemoAllowlist"
    )[0]
    assert 'typeof secretRaw === "string"' in chunk
    assert 'typeof defaultRaw === "string"' in chunk
    assert 'typeof demoRaw === "string"' in chunk
    assert 'typeof allowRaw === "string"' in chunk

    cookie = source.split("export function cookieSecure")[1].split(
        "export type DashAuthConfig"
    )[0]
    assert 'typeof raw === "string"' in cookie
    assert 'raw === "production"' in cookie


def test_alert_create_error_code_typeof_guard() -> None:
    source = (WEB / "src" / "components" / "alert-controls.tsx").read_text(
        encoding="utf-8"
    )
    assert "const codeRaw =" in source
    assert 'typeof codeRaw === "string"' in source
    assert 'String((data.error as { code?: string }).code ?? "")' not in source
