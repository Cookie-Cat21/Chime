"""PDF text extraction for filing briefs (optional ``pypdf``).

``extract_pdf_text`` is soft-fail: missing ``pypdf`` or corrupt bytes yield
``""`` and a log line — briefs still fall back to title-only input.
CDN fetch is size-capped via ``PDF_MAX_BYTES`` / ``BriefSettings.pdf_max_bytes``.
"""

from __future__ import annotations

from io import BytesIO

import httpx
import structlog

from chime.adapters.cse import allowed_cdn_pdf_url

log = structlog.get_logger("chime.briefs.extract")


def extract_pdf_text(data: bytes) -> str:
    """Extract plain text from PDF bytes.

    Uses ``pypdf`` when installed (``pip install 'chime[briefs]'``). Without
    it, returns ``""`` and logs once per call so the worker can fall back.
    """
    if not data:
        return ""
    try:
        from pypdf import PdfReader
    except ImportError:
        log.warning(
            "pypdf_unavailable",
            hint="pip install 'chime[briefs]' for PDF text extraction",
        )
        return ""

    try:
        reader = PdfReader(BytesIO(data))
        chunks: list[str] = []
        for page in reader.pages:
            piece = page.extract_text()
            if piece and piece.strip():
                chunks.append(piece.strip())
        return "\n".join(chunks).strip()
    except Exception as exc:
        log.warning("pdf_extract_failed", error=str(exc))
        return ""


async def fetch_cdn_pdf(
    pdf_url: str,
    *,
    max_bytes: int,
    client: httpx.AsyncClient,
) -> bytes | None:
    """GET a CSE CDN PDF with host allowlist + byte cap.

    Returns ``None`` when the URL fails the CDN SSRF check, the response is
    oversized (Content-Length or streamed body), or the request errors.
    """
    allowed = allowed_cdn_pdf_url(pdf_url)
    if allowed is None:
        log.warning("pdf_fetch_rejected_host", pdf_url=pdf_url)
        return None

    cap = max(1, int(max_bytes))
    try:
        async with client.stream("GET", allowed) as response:
            response.raise_for_status()
            content_length = response.headers.get("content-length")
            if content_length is not None:
                try:
                    if int(content_length) > cap:
                        log.warning(
                            "pdf_fetch_too_large",
                            pdf_url=allowed,
                            content_length=int(content_length),
                            max_bytes=cap,
                        )
                        return None
                except ValueError:
                    pass

            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes():
                if not chunk:
                    continue
                total += len(chunk)
                if total > cap:
                    log.warning(
                        "pdf_fetch_too_large",
                        pdf_url=allowed,
                        bytes_read=total,
                        max_bytes=cap,
                    )
                    return None
                chunks.append(chunk)
            return b"".join(chunks)
    except Exception as exc:
        log.warning("pdf_fetch_failed", pdf_url=allowed, error=str(exc))
        return None
