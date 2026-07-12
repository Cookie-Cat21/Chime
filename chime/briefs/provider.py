"""LLM brief providers (Gemini HTTP stub).

``summarize(text) -> str`` is the only Phase-2 surface. Default off:
``AI_BRIEFS_ENABLED`` must be ``1`` and ``AI_API_KEY`` set, or
``summarize`` raises ``RuntimeError`` (never silently invents text).
"""

from __future__ import annotations

from typing import Any, Protocol

import httpx
import structlog

from chime.briefs import BriefSettings, briefs_enabled

log = structlog.get_logger("chime.briefs.provider")

GEMINI_GENERATE_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)


class BriefProvider(Protocol):
    async def summarize(self, text: str) -> str:
        """Return a short plain-language filing brief for ``text``."""


class BriefsDisabledError(RuntimeError):
    """Raised when summarize is called while AI briefs are off / unkeyed."""


class GeminiBriefProvider:
    """Gemini ``generateContent`` via httpx (no official SDK)."""

    def __init__(
        self,
        settings: BriefSettings | None = None,
        *,
        client: httpx.AsyncClient | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._settings = settings or BriefSettings.from_env()
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(timeout=timeout)

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> GeminiBriefProvider:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()

    def _require_enabled(self) -> None:
        if not briefs_enabled(self._settings):
            raise BriefsDisabledError(
                "AI briefs disabled: set AI_BRIEFS_ENABLED=1 and AI_API_KEY"
            )

    async def summarize(self, text: str) -> str:
        self._require_enabled()
        body = (text or "").strip()
        if not body:
            raise ValueError("summarize requires non-empty text")
        max_chars = max(1, int(self._settings.max_input_chars))
        if len(body) > max_chars:
            body = body[:max_chars]

        url = GEMINI_GENERATE_URL.format(model=self._settings.model)
        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": body}]}],
        }
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self._settings.api_key,
        }
        log.info(
            "gemini_summarize_request",
            model=self._settings.model,
            input_chars=len(body),
        )
        response = await self._client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        brief = _extract_gemini_text(data)
        if not brief:
            raise RuntimeError("Gemini response missing candidates text")
        return brief


def _extract_gemini_text(data: Any) -> str:
    if not isinstance(data, dict):
        return ""
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return ""
    first = candidates[0]
    if not isinstance(first, dict):
        return ""
    content = first.get("content")
    if not isinstance(content, dict):
        return ""
    parts = content.get("parts")
    if not isinstance(parts, list):
        return ""
    chunks: list[str] = []
    for part in parts:
        if isinstance(part, dict):
            piece = part.get("text")
            if isinstance(piece, str) and piece.strip():
                chunks.append(piece.strip())
    return "\n".join(chunks).strip()


def make_brief_provider(
    settings: BriefSettings | None = None,
    *,
    client: httpx.AsyncClient | None = None,
) -> BriefProvider:
    """Build a provider. Disabled settings still return Gemini provider that raises."""
    cfg = settings or BriefSettings.from_env()
    if cfg.provider and cfg.provider != "gemini":
        raise RuntimeError(f"Unsupported AI_PROVIDER={cfg.provider!r} (only gemini)")
    return GeminiBriefProvider(cfg, client=client)
