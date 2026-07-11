"""format_alert_message / disclaimer formatting."""

from __future__ import annotations

from chime.domain import AlertEvent, AlertType, disclaimer, format_alert_message


def test_format_alert_message_includes_symbol_trigger_price_disclaimer() -> None:
    event = AlertEvent(
        rule_id=1,
        user_id=2,
        telegram_id=3,
        symbol="JKH.N0000",
        type=AlertType.PRICE_ABOVE,
        threshold=100.0,
        trigger="price crossed above 100.00",
        current_price=105.5,
        event_key="price:1:42",
    )
    msg = format_alert_message(event)
    assert "JKH.N0000" in msg
    assert "price crossed above 100.00" in msg
    assert "105.50 LKR" in msg
    assert disclaimer() in msg
    assert "Not financial advice" in msg


def test_disclosure_message_includes_url() -> None:
    url = "https://www.cse.lk/announcements?id=99"
    event = AlertEvent(
        rule_id=1,
        user_id=2,
        telegram_id=3,
        symbol="JKH.N0000",
        type=AlertType.DISCLOSURE,
        threshold=None,
        trigger="new disclosure: AGM Notice",
        current_price=None,
        disclosure_title="AGM Notice",
        disclosure_url=url,
        event_key="disclosure:1:99",
    )
    msg = format_alert_message(event)
    assert url in msg
    assert "AGM Notice" in msg
    assert "JKH.N0000" in msg
    assert disclaimer() in msg
