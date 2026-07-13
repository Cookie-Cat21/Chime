"""Wave97 DASH: medium+ web lib fetch hardening."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def test_api_mutate_rejects_redirects() -> None:
    source = (WEB / "src" / "lib" / "api" / "client-fetch.ts").read_text(
        encoding="utf-8"
    )
    chunk = source.split("export async function apiMutate")[1].split(
        "const bounded = await readBoundedResponseText"
    )[0]
    assert 'redirect: "error"' in chunk

