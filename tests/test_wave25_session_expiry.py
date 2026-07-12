"""Wave25: expired session redirect UX.

1. Shared helper hard-assigns /login?expired=1 and clears CSRF cookie.
2. apiMutate redirects on missing CSRF or HTTP 401 (logout opts out).
3. NavSession /me 401 hard-redirects; logout uses authRedirect: false.
4. requirePageSession sends cookie-present-but-invalid to ?expired=1.
5. Login page surfaces session-expired notice for ?expired=1.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_session_redirect_helper_hard_assigns_expired_login() -> None:
    src = (WEB / "src" / "lib" / "auth" / "session-redirect.ts").read_text(
        encoding="utf-8"
    )
    assert 'LOGIN_EXPIRED_PATH = "/login?expired=1"' in src
    assert "window.location.assign" in src
    assert "clearBrowserCsrfCookie" in src
    assert "Max-Age=0" in src


def test_api_mutate_redirects_on_unauthorized() -> None:
    src = (WEB / "src" / "lib" / "api" / "client-fetch.ts").read_text(
        encoding="utf-8"
    )
    assert "redirectToLogin({ expired: true })" in src
    assert "authRedirect" in src
    assert "res.status === 401" in src
    # Missing CSRF must not look like a CSRF failure when session is gone.
    assert 'code: "unauthorized"' in src
    assert "Session expired. Sign in again." in src
    assert 'code: "csrf_failed"' in src


def test_nav_session_expired_and_logout_paths() -> None:
    src = (WEB / "src" / "components" / "nav-session.tsx").read_text(
        encoding="utf-8"
    )
    assert 'res.status === 401' in src
    assert "redirectToLogin({ expired: true })" in src
    assert "authRedirect: false" in src
    # Explicit logout still hard-navigates without the expired banner.
    assert "redirectToLogin()" in src
    assert "useRouter" not in src


def test_page_session_expired_query_when_cookie_present() -> None:
    src = (WEB / "src" / "lib" / "auth" / "page-session.ts").read_text(
        encoding="utf-8"
    )
    assert "LOGIN_EXPIRED_PATH" in src
    # typeof-guard cookie before treating it as "present" (session harden).
    assert (
        'typeof raw === "string" && raw ? LOGIN_EXPIRED_PATH : "/login"' in src
    )


def test_login_page_shows_expired_notice() -> None:
    src = (WEB / "src" / "app" / "login" / "page.tsx").read_text(
        encoding="utf-8"
    )
    assert "searchParams" in src
    assert 'data-testid="session-expired-notice"' in src
    assert "Your session expired" in src
    assert 'expiredFlag === "1"' in src
