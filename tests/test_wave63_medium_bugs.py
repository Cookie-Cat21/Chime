"""Wave63: medium+ bugs — sparkline/stale ts range + typeof + attempt cap.

1. ``sanitizeSparklineTs`` must fail-closed on out-of-range Date values via
   ``MAX_DATE_MS`` (parity ``safeToIsoString`` / formatTs) — length-gated ISO
   still admitted extreme timestamps (``+275760-…``) into sparkline points.
2. Symbol-page ``isStaleTs`` must typeof-guard and range-gate — hostile /
   out-of-range stamps used to skew the stale-tick banner.
3. ``isLoopbackHost`` must typeof-guard non-strings (parity ``hostnameOnly``).
4. ``scenariosEnabled`` must typeof-guard env values — non-string mocks used
   to throw on ``.trim``.
5. Fire-history ``attempt_count`` must abs-cap at ``1_000_000`` (parity
   Python dead-letter notify) — 15-digit SafeIntegers ballooned UI copy /
   history JSON.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_sparkline_ts_date_range_gate() -> None:
    source = (WEB / "src" / "lib" / "sparkline.ts").read_text(encoding="utf-8")
    assert "MAX_DATE_MS" in source
    assert "8.64e15" in source
    chunk = source.split("function sanitizeSparklineTs")[1].split(
        "export function finiteSparklinePoints"
    )[0]
    assert "Date.parse(trimmed)" in chunk
    assert "Math.abs(t) > MAX_DATE_MS" in chunk
    assert "!Number.isNaN(t)" in chunk


def test_symbol_is_stale_ts_range_and_typeof() -> None:
    source = (
        WEB / "src" / "app" / "symbols" / "[symbol]" / "page.tsx"
    ).read_text(encoding="utf-8")
    assert "MAX_DATE_MS" in source
    chunk = source.split("function isStaleTs")[1].split(
        "export async function generateMetadata"
    )[0]
    assert 'typeof ts !== "string"' in chunk
    assert "Math.abs(t) > MAX_DATE_MS" in chunk


def test_is_loopback_host_typeof_guard() -> None:
    source = (WEB / "src" / "lib" / "api" / "server-fetch.ts").read_text(
        encoding="utf-8"
    )
    assert "export function isLoopbackHost(host: unknown)" in source
    chunk = source.split("export function isLoopbackHost")[1].split(
        "export function resolveInternalOrigin"
    )[0]
    assert 'typeof host !== "string"' in chunk


def test_scenarios_enabled_typeof_guard() -> None:
    source = (WEB / "src" / "lib" / "scenarios.ts").read_text(encoding="utf-8")
    chunk = source.split("export function scenariosEnabled")[1]
    assert 'typeof raw !== "string"' in chunk
    assert 'raw.trim() === "1"' in chunk


def test_history_attempt_count_display_cap() -> None:
    page = (WEB / "src" / "app" / "alerts" / "history" / "page.tsx").read_text(
        encoding="utf-8"
    )
    assert "MAX_ATTEMPT_COUNT_DISPLAY" in page
    assert "1_000_000" in page
    assert "cappedAttemptCount" in page
    assert "cappedAttemptCount(" in page

    api = (
        WEB / "src" / "app" / "api" / "v1" / "alerts" / "history" / "route.ts"
    ).read_text(encoding="utf-8")
    assert "attempts > 1_000_000" in api
    assert "attempt_count," in api or "attempt_count:" in api
