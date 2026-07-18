"""Illiquid print debounce — skip thin volume price crosses (Phase A)."""

from __future__ import annotations

import math

import pytest

from chime.domain import AlertType
from chime.rules import (
    _illiquid_min_volume,
    _is_illiquid_print,
    evaluate_price_rules,
    filter_fireable,
)
from tests.conftest import make_previous, make_rule, make_snapshot


class TestIlliquidMinVolumeEnv:
    def test_default_floor_is_one(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CHIME_ILLIQUID_MIN_VOLUME", raising=False)
        assert _illiquid_min_volume() == 1.0

    def test_zero_disables_floor(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "0")
        assert _illiquid_min_volume() == 0.0

    def test_invalid_env_falls_back(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "nope")
        assert _illiquid_min_volume() == 1.0


class TestIsIlliquidPrint:
    def test_known_thin_volume_is_illiquid(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "100")
        snap = make_snapshot(volume=10.0)
        assert _is_illiquid_print(snap) is True

    def test_unknown_volume_fail_open(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "100")
        snap = make_snapshot(volume=None)
        assert _is_illiquid_print(snap) is False

    def test_nan_volume_fail_open(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "100")
        snap = make_snapshot(volume=math.nan)
        assert _is_illiquid_print(snap) is False

    def test_floor_disabled_never_illiquid(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "0")
        snap = make_snapshot(volume=0.0)
        assert _is_illiquid_print(snap) is False


class TestIlliquidDebounceOnCross:
    def test_thin_print_skips_price_above(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "100")
        rule = make_rule(type=AlertType.PRICE_ABOVE, threshold=100.0, armed=True)
        snap = make_snapshot(price=105.0, volume=5.0, id=91)
        events = evaluate_price_rules(
            snapshot=snap,
            previous=make_previous(price=95.0),
            rules=[rule],
        )
        assert filter_fireable(events) == []

    def test_liquid_print_fires_price_above(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "100")
        rule = make_rule(type=AlertType.PRICE_ABOVE, threshold=100.0, armed=True)
        snap = make_snapshot(price=105.0, volume=500.0, id=92)
        events = evaluate_price_rules(
            snapshot=snap,
            previous=make_previous(price=95.0),
            rules=[rule],
        )
        fireable = filter_fireable(events)
        assert len(fireable) == 1
        assert fireable[0].set_armed is False

    def test_thin_print_skips_price_below(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CHIME_ILLIQUID_MIN_VOLUME", "50")
        rule = make_rule(type=AlertType.PRICE_BELOW, threshold=100.0, armed=True)
        snap = make_snapshot(price=90.0, volume=1.0, id=93)
        events = evaluate_price_rules(
            snapshot=snap,
            previous=make_previous(price=110.0),
            rules=[rule],
        )
        assert filter_fireable(events) == []
