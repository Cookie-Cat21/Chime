"""Contract mirror for web daily-bars OHLC normalize (flat candle fill)."""


def normalize_daily_bar(row: dict) -> dict | None:
    trade_date = row.get("trade_date")
    if not isinstance(trade_date, str) or len(trade_date) < 10:
        return None
    close = row.get("close", row.get("price"))
    if not isinstance(close, (int, float)) or isinstance(close, bool):
        return None
    close_f = float(close)
    if close_f <= 0:
        return None
    open_v = row.get("open")
    high_v = row.get("high")
    low_v = row.get("low")
    open_f = (
        float(open_v)
        if isinstance(open_v, (int, float))
        and not isinstance(open_v, bool)
        and float(open_v) > 0
        else None
    )
    high_f = (
        float(high_v)
        if isinstance(high_v, (int, float)) and not isinstance(high_v, bool)
        else close_f
    )
    low_f = (
        float(low_v)
        if isinstance(low_v, (int, float)) and not isinstance(low_v, bool)
        else close_f
    )
    bound = open_f if open_f is not None else close_f
    high_f = max(high_f, bound, close_f)
    low_f = min(low_f, bound, close_f)
    return {
        "trade_date": trade_date[:10],
        "open": open_f,
        "high": high_f,
        "low": low_f,
        "close": close_f,
    }


def test_missing_open_stays_null() -> None:
    b = normalize_daily_bar({"trade_date": "2026-07-16", "price": 17.3, "high": 18, "low": 17})
    assert b is not None
    assert b["open"] is None
    assert b["close"] == 17.3
    assert b["high"] == 18.0


def test_rejects_zero_close() -> None:
    assert normalize_daily_bar({"trade_date": "2026-07-16", "price": 0}) is None


def test_full_ohlc() -> None:
    b = normalize_daily_bar(
        {
            "trade_date": "2026-07-16",
            "open": 10,
            "high": 12,
            "low": 9,
            "price": 11,
        }
    )
    assert b == {
        "trade_date": "2026-07-16",
        "open": 10.0,
        "high": 12.0,
        "low": 9.0,
        "close": 11.0,
    }


def test_body_open_uses_prior_close() -> None:
    bars = [
        {"open": None, "close": 20.0},
        {"open": None, "close": 19.0},
    ]
    # mirror candleBodyOpen
    def body_open(i: int) -> float:
        o = bars[i]["open"]
        if o is not None:
            return float(o)
        if i > 0:
            return float(bars[i - 1]["close"])
        return float(bars[i]["close"])

    assert body_open(1) == 20.0
    assert bars[1]["close"] < body_open(1)  # down day → red


def _is_close_only_bars(bars: list[dict]) -> bool:
    """Mirror web ``isCloseOnlyBars`` (index CSE path = H=L=C, no open)."""
    if len(bars) < 2:
        return False
    for b in bars:
        o = b.get("open")
        if isinstance(o, (int, float)) and not isinstance(o, bool) and float(o) > 0:
            return False
        close = float(b["close"])
        eps = max(abs(close) * 1e-9, 1e-9)
        if abs(float(b["high"]) - close) > eps or abs(float(b["low"]) - close) > eps:
            return False
    return True


def test_index_close_only_series_detected() -> None:
    """ASPI / SNP_SL20 daily_bars are close-only — must not look like OHLC candles."""
    bars = [
        {"open": None, "high": 21000.0, "low": 21000.0, "close": 21000.0},
        {"open": None, "high": 21100.0, "low": 21100.0, "close": 21100.0},
        {"open": None, "high": 20950.0, "low": 20950.0, "close": 20950.0},
    ]
    assert _is_close_only_bars(bars) is True
    assert (
        _is_close_only_bars(
            [
                {"open": 100.0, "high": 105.0, "low": 99.0, "close": 102.0},
                {"open": 102.0, "high": 106.0, "low": 101.0, "close": 104.0},
            ]
        )
        is False
    )
