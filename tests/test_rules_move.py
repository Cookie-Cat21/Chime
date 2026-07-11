"""Daily % move rule evaluation — crossing semantics on |change_pct|."""

from __future__ import annotations

from datetime import UTC, datetime

from chime.domain import AlertType
from chime.rules import evaluate_price_rules, filter_fireable
from tests.conftest import make_previous, make_rule, make_snapshot


def test_cross_above_threshold_fires() -> None:
    """prev |pct| below thr, curr at/above thr → fire."""
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=3.0)
    snap = make_snapshot(price=103.0, change_pct=3.0)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=2.0),
        rules=[rule],
    )
    fireable = filter_fireable(events)
    assert len(fireable) == 1
    assert "up" in fireable[0].trigger
    assert fireable[0].event_key == f"move:{rule.id}:{snap.ts.date().isoformat()}"


def test_cross_below_threshold_down_fires() -> None:
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=2.5)
    snap = make_snapshot(price=95.0, change_pct=-2.5)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=-2.0),
        rules=[rule],
    )
    fireable = filter_fireable(events)
    assert len(fireable) == 1
    assert "down" in fireable[0].trigger


def test_already_exceeded_with_prev_above_no_fire() -> None:
    """Already over threshold on previous tick — no re-fire."""
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=3.0)
    snap = make_snapshot(price=110.0, change_pct=8.0)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=105.0, change_pct=5.0),
        rules=[rule],
    )
    assert filter_fireable(events) == []


def test_prev_change_pct_none_no_fire() -> None:
    """First observation / no previous pct — baseline only, no fire."""
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=3.0)
    snap = make_snapshot(price=110.0, change_pct=8.0)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=None),
        rules=[rule],
    )
    assert filter_fireable(events) == []


def test_computes_pct_from_previous_close_when_change_pct_none() -> None:
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=5.0)
    # (110 - 100) / 100 * 100 = 10%
    snap = make_snapshot(price=110.0, previous_close=100.0, change_pct=None)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=4.0),
        rules=[rule],
    )
    fireable = filter_fireable(events)
    assert len(fireable) == 1
    assert "10.00%" in fireable[0].trigger


def test_does_not_fire_when_move_fired_keys_has_day_key() -> None:
    rule = make_rule(id=9, type=AlertType.DAILY_MOVE, threshold=3.0)
    ts = datetime(2026, 7, 11, 8, 0, 0, tzinfo=UTC)
    day_key = f"move:9:{ts.date().isoformat()}"
    snap = make_snapshot(price=110.0, change_pct=8.0, ts=ts)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=2.0, move_fired_keys={day_key}),
        rules=[rule],
    )
    assert filter_fireable(events) == []


def test_missing_change_pct_and_previous_close_no_fire() -> None:
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=3.0)
    snap = make_snapshot(price=110.0, previous_close=None, change_pct=None)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=1.0),
        rules=[rule],
    )
    assert events == []


def test_previous_close_zero_treated_as_missing() -> None:
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=3.0)
    snap = make_snapshot(price=110.0, previous_close=0.0, change_pct=None)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=1.0),
        rules=[rule],
    )
    assert events == []


def test_daily_move_missing_threshold_skipped() -> None:
    rule = make_rule(type=AlertType.DAILY_MOVE, threshold=None)
    snap = make_snapshot(price=110.0, change_pct=8.0)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=1.0),
        rules=[rule],
    )
    assert events == []


def test_event_key_pattern_once_per_day() -> None:
    rule = make_rule(id=5, type=AlertType.DAILY_MOVE, threshold=1.0)
    ts = datetime(2026, 7, 11, 10, 30, 0, tzinfo=UTC)
    snap = make_snapshot(price=101.0, change_pct=1.5, ts=ts, id=99)
    events = evaluate_price_rules(
        snapshot=snap,
        previous=make_previous(price=100.0, change_pct=0.5),
        rules=[rule],
    )
    assert len(events) == 1
    assert events[0].event_key == "move:5:2026-07-11"
