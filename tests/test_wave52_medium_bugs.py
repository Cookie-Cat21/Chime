"""Wave52: medium+ bugs — list LIMIT, toast tone/timers, demo allowlist.

1. GET ``/api/v1/alerts`` must ``LIMIT`` via ``MAX_ALERT_RULES`` — unbounded
   SELECT used to balloon JSON / SSR when ``alert_rules`` grew without cap.
2. GET ``/api/v1/watchlist`` must ``LIMIT`` via ``MAX_WATCHLIST_ITEMS`` —
   same posture for ``watchlist_items``.
3. Alerts / watchlist page parsers must break at 500 (parity with API caps).
4. Toast ``push`` must allowlist tones via ``normalizeToastTone`` and clear
   dismiss timers on overflow (``MAX_VISIBLE_TOASTS``) — slice-only leaked
   timers; unknown tones must not invent role/CSS branches.
5. Demo allowlist parse must cap at ``MAX_DEMO_ALLOWLIST`` so a multi-KB
   comma env cannot balloon the login ``<select>`` / SSR props.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_alerts_route_limits_egress() -> None:
    source = (
        WEB / "src" / "app" / "api" / "v1" / "alerts" / "route.ts"
    ).read_text(encoding="utf-8")
    assert "MAX_ALERT_RULES" in source
    assert "500" in source
    assert "LIMIT $" in source
    assert "[...params, MAX_ALERT_RULES]" in source


def test_watchlist_route_limits_egress() -> None:
    source = (
        WEB / "src" / "app" / "api" / "v1" / "watchlist" / "route.ts"
    ).read_text(encoding="utf-8")
    assert "MAX_WATCHLIST_ITEMS" in source
    assert "LIMIT $2" in source
    assert "[gated.session.user_id, MAX_WATCHLIST_ITEMS]" in source


def test_alerts_watchlist_pages_cap_parsers() -> None:
    alerts = (WEB / "src" / "app" / "alerts" / "page.tsx").read_text(
        encoding="utf-8"
    )
    assert "rules.length >= 500" in alerts

    watch = (WEB / "src" / "app" / "watchlist" / "page.tsx").read_text(
        encoding="utf-8"
    )
    assert "items.length >= 500" in watch


def test_toast_tone_allowlist_and_timer_overflow() -> None:
    source = (WEB / "src" / "components" / "toast.tsx").read_text(
        encoding="utf-8"
    )
    assert "normalizeToastTone" in source
    assert "TOAST_TONES" in source
    assert "normalizeToastTone(tone)" in source
    assert "MAX_VISIBLE_TOASTS" in source
    assert "clearTimeout(t)" in source
    assert "{ id, message: safe, tone }" not in source
    assert "tone: safeTone" in source
    assert "[...prev.slice(-3), { id, message: safe, tone }]" not in source


def test_demo_allowlist_capped() -> None:
    source = (WEB / "src" / "lib" / "auth" / "config.ts").read_text(
        encoding="utf-8"
    )
    assert "MAX_DEMO_ALLOWLIST" in source
    assert "64" in source
    assert "ids.size >= MAX_DEMO_ALLOWLIST" in source
