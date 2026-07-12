"""Minimal unofficial cse.lk HTTP client (educational / polite use)."""

from __future__ import annotations

from typing import Any

import httpx

BASE = "https://www.cse.lk/api"
DEFAULT_HEADERS = {
    "Origin": "https://www.cse.lk",
    "Referer": "https://www.cse.lk/",
    "Accept": "application/json",
    "User-Agent": "cse-lk-unofficial/0.1 (+https://github.com/Cookie-Cat21/Chime; educational)",
}


class CSEClient:
    def __init__(
        self,
        *,
        base_url: str = BASE,
        timeout: float = 45.0,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            timeout=timeout,
            headers={**DEFAULT_HEADERS, **(headers or {})},
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> CSEClient:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _post_json(self, path: str, body: dict[str, Any] | None = None) -> Any:
        r = self._client.post(f"{self.base_url}{path}", json=body or {})
        r.raise_for_status()
        return r.json()

    def _post_form(self, path: str, data: dict[str, str]) -> Any:
        r = self._client.post(f"{self.base_url}{path}", data=data)
        r.raise_for_status()
        if r.status_code == 204 or not r.content:
            return None
        return r.json()

    def _get(self, path: str, params: dict[str, str] | None = None) -> Any:
        r = self._client.get(f"{self.base_url}{path}", params=params or {})
        r.raise_for_status()
        return r.json()

    def market_status(self) -> dict[str, Any]:
        return self._post_json("/marketStatus")

    def company_info(self, symbol: str) -> dict[str, Any]:
        return self._post_form("/companyInfoSummery", {"symbol": symbol})

    def trade_summary(self) -> dict[str, Any]:
        return self._post_json("/tradeSummary")

    def company_profile(self, symbol: str) -> dict[str, Any]:
        return self._post_form("/companyProfile", {"symbol": symbol})

    def announcements_for_company(
        self,
        symbol: str,
        *,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        data = {"symbol": symbol}
        if from_date:
            data["fromDate"] = from_date
        if to_date:
            data["toDate"] = to_date
        return self._post_form("/getAnnouncementByCompany", data)

    def news_web(self, **params: str) -> Any:
        return self._get("/news/web", params)
