"""Wave47: medium+ bugs — client Content-Length early-reject.

Browser mutation / login / NavSession ``/me`` must early-reject oversize
claimed ``Content-Length`` before allocating the body buffer (parity with
``serverApiGet`` / HEALTH_URL proxy from w46). Without the header gate, a
hostile response could still force a full read up to the body cap.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_api_mutate_content_length_early_reject() -> None:
    source = (WEB / "src" / "lib" / "api" / "client-fetch.ts").read_text(
        encoding="utf-8"
    )
    assert "toNonNegativeSafeInt" in source
    assert 'res.headers.get("content-length")' in source
    assert "claimed > CLIENT_API_BODY_MAX_CHARS" in source
    cl_idx = source.index('res.headers.get("content-length")')
    text_idx = source.index("await res.text()")
    assert cl_idx < text_idx
    assert "Response too large." in source
    # Body length gate retained after CL early-reject.
    assert "rawText.length > CLIENT_API_BODY_MAX_CHARS" in source


def test_login_content_length_early_reject() -> None:
    login = (WEB / "src" / "components" / "login-form.tsx").read_text(
        encoding="utf-8"
    )
    assert 'res.headers.get("content-length")' in login
    assert "CLIENT_API_BODY_MAX_CHARS" in login
    assert "toNonNegativeSafeInt" in login
    cl_idx = login.index('res.headers.get("content-length")')
    text_idx = login.index("await res.text()")
    assert cl_idx < text_idx
    assert "response too large" in login


def test_nav_session_content_length_early_reject() -> None:
    nav = (WEB / "src" / "components" / "nav-session.tsx").read_text(
        encoding="utf-8"
    )
    assert 'res.headers.get("content-length")' in nav
    assert "MAX_ME_BODY_CHARS" in nav
    assert "toNonNegativeSafeInt" in nav
    cl_idx = nav.index('res.headers.get("content-length")')
    text_idx = nav.index("await res.text()")
    assert cl_idx < text_idx
    assert "claimed > MAX_ME_BODY_CHARS" in nav
