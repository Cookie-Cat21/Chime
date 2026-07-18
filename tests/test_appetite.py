"""Market Appetite meter — pure scoring helpers (no DB)."""

from __future__ import annotations

import math
from datetime import date

from chime.appetite import (
    band_for_score,
    build_day_result,
    component_scores,
    composite_score,
    map_breadth_score,
    map_index_score,
    map_intensity_score,
    map_participation_volume_share,
    map_participation_z_score,
    turnover_zscore,
)


def test_band_for_score_boundaries() -> None:
    assert band_for_score(0) == "extreme_caution"
    assert band_for_score(19.99) == "extreme_caution"
    assert band_for_score(20) == "caution"
    assert band_for_score(39.99) == "caution"
    assert band_for_score(40) == "neutral"
    assert band_for_score(59.99) == "neutral"
    assert band_for_score(60) == "appetite"
    assert band_for_score(79.99) == "appetite"
    assert band_for_score(80) == "strong_appetite"
    assert band_for_score(100) == "strong_appetite"


def test_band_for_score_clamps_out_of_range() -> None:
    assert band_for_score(-10) == "extreme_caution"
    assert band_for_score(150) == "strong_appetite"
    assert band_for_score(float("nan")) == "neutral"


def test_map_breadth_identity() -> None:
    assert map_breadth_score(0) == 0.0
    assert map_breadth_score(50) == 50.0
    assert map_breadth_score(100) == 100.0
    assert map_breadth_score(-5) == 0.0
    assert map_breadth_score(120) == 100.0


def test_map_index_linear_through_zero() -> None:
    assert map_index_score(-3.0) == 0.0
    assert map_index_score(0.0) == 50.0
    assert map_index_score(3.0) == 100.0
    assert map_index_score(-6.0) == 0.0
    assert map_index_score(6.0) == 100.0
    assert map_index_score(None) == 50.0
    assert abs(map_index_score(1.5) - 75.0) < 1e-9


def test_map_intensity_none_is_neutral() -> None:
    assert map_intensity_score(None) == 50.0
    assert map_intensity_score(0) == 0.0
    assert map_intensity_score(100) == 100.0


def test_map_participation_z() -> None:
    assert map_participation_z_score(-2.0) == 0.0
    assert map_participation_z_score(0.0) == 50.0
    assert map_participation_z_score(2.0) == 100.0
    assert map_participation_z_score(None) == 50.0
    assert map_participation_z_score(-4.0) == 0.0


def test_map_participation_volume_share() -> None:
    assert map_participation_volume_share(0) == 0.0
    assert map_participation_volume_share(100) == 100.0
    assert map_participation_volume_share(37.5) == 37.5


def test_turnover_zscore_basic() -> None:
    hist = [10.0, 10.0, 10.0, 10.0, 20.0]
    z = turnover_zscore(20.0, hist)
    assert z is not None
    assert z > 0
    assert turnover_zscore(10.0, [10.0]) is None
    assert turnover_zscore(10.0, [10.0, 10.0]) == 0.0


def test_component_scores_all_advancers() -> None:
    comps = component_scores(
        change_pcts=[1.0, 2.0, 3.0, 0.5],
        volumes=[100.0, 200.0, 0.0, 50.0],
        aspi_change_pct=0.0,
    )
    assert comps["breadth"] == 100.0
    # 2 of 4 have |chg|>=2%, both up → intensity 100
    assert comps["intensity"] == 100.0
    assert comps["index"] == 50.0
    # 3/4 with volume>0
    assert comps["participation"] == 75.0


def test_component_scores_all_decliners_no_movers() -> None:
    comps = component_scores(
        change_pcts=[-0.5, -0.2, -1.0],
        aspi_change_pct=-3.0,
    )
    assert comps["breadth"] == 0.0
    # no |chg|>=2% → intensity neutral
    assert comps["intensity"] == 50.0
    assert comps["index"] == 0.0


def test_component_scores_intensity_mixed_movers() -> None:
    # movers at ±2%: two up, one down → 2/3
    comps = component_scores(change_pcts=[2.0, 3.0, -2.5, 0.1])
    assert abs(comps["intensity"] - (2 / 3) * 100.0) < 1e-9
    assert abs(comps["breadth"] - 75.0) < 1e-9


def test_component_scores_uses_turnover_z_when_history() -> None:
    hist = [100.0, 100.0, 100.0, 100.0, 100.0, 200.0]
    comps = component_scores(
        change_pcts=[1.0, -1.0],
        volumes=[0.0, 0.0],  # would be 0% if used
        turnover=200.0,
        turnover_history=hist,
    )
    # z positive → participation > 50; volume share would be 0
    assert comps["participation"] > 50.0


def test_composite_score_weights() -> None:
    comps = {
        "breadth": 100.0,
        "intensity": 0.0,
        "index": 50.0,
        "participation": 0.0,
    }
    # 0.40*100 + 0.25*0 + 0.20*50 + 0.15*0 = 40 + 10 = 50
    assert abs(composite_score(comps) - 50.0) < 1e-9


def test_build_day_result_empty_returns_none() -> None:
    assert build_day_result(trade_date=date(2026, 7, 1), change_pcts=[]) is None


def test_build_day_result_happy_path() -> None:
    result = build_day_result(
        trade_date=date(2026, 7, 16),
        change_pcts=[1.0, 2.0, -1.0, 0.0],
        volumes=[10.0, 20.0, 30.0, 0.0],
        aspi_change_pct=1.5,
        source="cse",
    )
    assert result is not None
    assert result.universe_n == 4
    assert result.advancers == 2
    assert result.decliners == 1
    assert result.unchanged == 1
    assert 0.0 <= result.score <= 100.0
    assert result.band == band_for_score(result.score)
    assert set(result.components) == {"breadth", "intensity", "index", "participation"}
    assert math.isfinite(result.score)
