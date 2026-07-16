"""Ingest CSE announcements → disclosures → pdf_url → metrics (optional briefs).

Market-wide scale-up helper used by ``python -m chime ingest-filings``.
Dash still reads Postgres only; this talks to cse.lk from the worker side.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass

import httpx
import structlog

from chime.adapters.cse import CSEClient, legacy_pdf_urls_by_id
from chime.briefs import BriefSettings, briefs_enabled, build_brief_prompt
from chime.briefs.extract import extract_pdf_text, fetch_cdn_pdf
from chime.briefs.provider import make_brief_provider
from chime.config import Settings
from chime.extractors.financial_pdf import is_financial_filing
from chime.metrics import MetricsSettings, metrics_enabled
from chime.metrics.worker import process_disclosure_metrics
from chime.storage import Storage

log = structlog.get_logger("chime.ingest_filings")


@dataclass(frozen=True, slots=True)
class IngestSymbolResult:
    symbol: str
    announcements: int
    upserted: int
    pdfs_set: int
    metrics_ok: int
    briefs_ready: int
    errors: int


async def ingest_symbol(
    *,
    symbol: str,
    storage: Storage,
    cse: CSEClient,
    settings: Settings,
    metrics_cfg: MetricsSettings,
    brief_cfg: BriefSettings,
    limit: int = 8,
    run_metrics: bool = True,
    run_briefs: bool = False,
    pdf_max_bytes: int = 25_000_000,
) -> IngestSymbolResult:
    symbol = symbol.strip().upper()
    await storage.upsert_stock(symbol)

    announcements = 0
    upserted = 0
    pdfs_set = 0
    metrics_ok = 0
    briefs_ready = 0
    errors = 0

    try:
        discs = await cse.fetch_announcements_for_symbol(symbol)
    except Exception as exc:  # noqa: BLE001
        log.warning("ingest_announcements_failed", symbol=symbol, error=str(exc)[:200])
        return IngestSymbolResult(symbol, 0, 0, 0, 0, 0, 1)

    announcements = len(discs)
    # Prefer financial-looking titles first, then newest-ish order as returned.
    financial = [d for d in discs if is_financial_filing(title=d.title, category=d.category)]
    ordered = financial + [d for d in discs if d not in financial]
    ordered = ordered[: max(1, limit)]

    stored_ids: list[tuple[int, str | None, str]] = []
    for disc in ordered:
        try:
            stored = await storage.upsert_disclosure(disc)
            if stored.id is None:
                continue
            upserted += 1
            stored_ids.append((stored.id, stored.external_id, stored.title or ""))
        except Exception as exc:  # noqa: BLE001
            log.warning("ingest_upsert_failed", symbol=symbol, error=str(exc)[:200])
            errors += 1

    # PDF enrich via legacy archive
    sleep_s = max(0.0, float(settings.pdf_enrich_sleep_seconds))
    if sleep_s:
        await asyncio.sleep(sleep_s)
    pdf_map: dict[str, str] = {}
    try:
        legacy = await cse.fetch_legacy_announcements(symbol)
        pdf_map = legacy_pdf_urls_by_id(legacy)
    except Exception as exc:  # noqa: BLE001
        log.warning("ingest_legacy_failed", symbol=symbol, error=str(exc)[:200])
        errors += 1

    for did, external_id, _title in stored_ids:
        if not external_id:
            continue
        pdf_url = pdf_map.get(external_id)
        if not pdf_url:
            continue
        try:
            if await storage.set_disclosure_pdf_url(did, pdf_url):
                pdfs_set += 1
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "ingest_pdf_set_failed",
                symbol=symbol,
                disclosure_id=did,
                error=str(exc)[:200],
            )
            errors += 1

    if run_metrics and metrics_enabled(metrics_cfg):
        for did, _eid, _title in stored_ids:
            disc = await storage.get_disclosure_by_id(did)
            if disc is None or not disc.pdf_url:
                continue
            if not is_financial_filing(title=disc.title, category=disc.category):
                continue
            try:
                result = await process_disclosure_metrics(
                    storage=storage,
                    disclosure=disc,
                    rules=[],
                    settings=metrics_cfg,
                )
                if result and result.extract_ok:
                    metrics_ok += 1
            except Exception as exc:  # noqa: BLE001
                log.warning(
                    "ingest_metrics_failed",
                    symbol=symbol,
                    disclosure_id=did,
                    error=str(exc)[:200],
                )
                errors += 1

    if run_briefs and briefs_enabled(brief_cfg):
        import os

        import psycopg

        db_url = os.environ.get("DATABASE_URL") or settings.database_url
        prov = make_brief_provider(brief_cfg)
        try:
            async with httpx.AsyncClient(timeout=90.0, follow_redirects=False) as client:
                for did, _eid, title in stored_ids:
                    disc = await storage.get_disclosure_by_id(did)
                    if disc is None:
                        continue
                    await storage.enqueue_disclosure_brief(did, status="pending")
                    with psycopg.connect(db_url) as conn:
                        conn.execute(
                            """
                            UPDATE disclosure_briefs
                            SET status='processing', error=NULL, updated_at=now()
                            WHERE disclosure_id=%s
                            """,
                            (did,),
                        )
                        conn.commit()
                    try:
                        text = title or symbol
                        if disc.pdf_url:
                            try:
                                data = await fetch_cdn_pdf(
                                    disc.pdf_url,
                                    max_bytes=pdf_max_bytes,
                                    client=client,
                                )
                                extracted = extract_pdf_text(data)
                                if extracted and extracted.strip():
                                    text = extracted
                            except Exception:  # noqa: BLE001
                                pass
                        prompt = build_brief_prompt(
                            symbol=symbol,
                            title=title or "",
                            extracted_text=text,
                            max_chars=min(brief_cfg.max_input_chars, 8000),
                        )
                        brief = await prov.summarize(prompt)
                        if await storage.mark_brief_ready(
                            did, brief=brief, model=brief_cfg.model
                        ):
                            briefs_ready += 1
                    except Exception as exc:  # noqa: BLE001
                        log.warning(
                            "ingest_brief_failed",
                            symbol=symbol,
                            disclosure_id=did,
                            error=str(exc)[:200],
                        )
                        try:
                            await storage.mark_brief_failed(did, error=str(exc)[:500])
                        except Exception:  # noqa: BLE001
                            pass
                        errors += 1
                    await asyncio.sleep(max(2.0, float(brief_cfg.sleep_seconds)))
        finally:
            aclose = getattr(prov, "aclose", None)
            if callable(aclose):
                await aclose()

    return IngestSymbolResult(
        symbol=symbol,
        announcements=announcements,
        upserted=upserted,
        pdfs_set=pdfs_set,
        metrics_ok=metrics_ok,
        briefs_ready=briefs_ready,
        errors=errors,
    )


async def ingest_symbols(
    symbols: list[str],
    *,
    limit_per_symbol: int = 8,
    run_metrics: bool = True,
    run_briefs: bool = False,
) -> list[IngestSymbolResult]:
    settings = Settings.from_env(require_token=False)
    metrics_cfg = MetricsSettings.from_env()
    brief_cfg = BriefSettings.from_env()
    storage = Storage(settings.database_url)
    await storage.open()
    cse = CSEClient(
        base_url=settings.cse_base_url,
        timeout=settings.http_timeout_seconds,
        fail_max=settings.circuit_fail_max,
        reset_timeout=settings.circuit_reset_seconds,
        min_interval_seconds=max(0.15, float(settings.cse_min_interval_seconds or 0)),
    )
    results: list[IngestSymbolResult] = []
    try:
        for sym in symbols:
            if not sym or not str(sym).strip():
                continue
            res = await ingest_symbol(
                symbol=str(sym),
                storage=storage,
                cse=cse,
                settings=settings,
                metrics_cfg=metrics_cfg,
                brief_cfg=brief_cfg,
                limit=limit_per_symbol,
                run_metrics=run_metrics,
                run_briefs=run_briefs,
            )
            results.append(res)
            log.info("ingest_symbol_done", **asdict(res))
            await asyncio.sleep(0.3)
    finally:
        await cse.aclose()
        await storage.close()
    return results
