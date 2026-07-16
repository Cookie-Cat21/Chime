"""Transparent Signal Board path scores — unit only."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from chime.domain import DailyBar
from chime.scenarios.guardrails import contains_buy_sell_language
from chime.signals.score import score_symbol_path


def _bars(prices: list[float], *, start: date | None = None) -> list[DailyBar]:
    day0 = start or date(2025, 8, 1)
    out: list[DailyBar] = []
    for i, price in enumerate(prices):
        d = day0 + timedelta(days=i)
        out.append(
            DailyBar(
                symbol="JKH.N0000",
                trade_date=d,
                price=price,
                high=price * 1.01,
                low=price * 0.99,
                open=None,
                volume=100_000.0 + i,
                source_period=5,
                bar_ts=datetime(d.year, d.month, d.day, 18, 30, tzinfo=UTC),
            )
        )
    return out


def test_score_uptrend_positive() -> None:
    prices = [10.0 + i * 0.2 for i in range(40)]
    result = score_symbol_path(_bars(prices))
    assert result is not None
    assert result.score > 0
    assert result.bar_count == 40
    assert result.reasons
    for reason in result.reasons:
        assert not contains_buy_sell_language(reason)


def test_score_downtrend_negative() -> None:
    # Steep decline so momentum dominates the liquidity tilt.
    prices = [40.0 - i * 0.8 for i in range(40)]
    result = score_symbol_path(_bars(prices))
    assert result is not None
    assert result.score < 0


def test_score_too_few_bars() -> None:
    assert score_symbol_path(_bars([10.0, 10.1, 10.2])) is None


def test_reasons_never_invest_tips() -> None:
    result = score_symbol_path(_bars([10.0 + i * 0.1 for i in range(25)]))
    assert result is not None
    blob = " ".join(result.reasons).lower()
    assert "buy" not in blob
    assert "sell" not in blob
    assert "invest" not in blob
