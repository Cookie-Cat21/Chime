"""Disclosure / announcement rule evaluation."""

from __future__ import annotations

from chime.domain import AlertType
from chime.rules import evaluate_disclosure_rules
from tests.conftest import make_disclosure, make_rule


def test_new_disclosure_matching_symbol_fires() -> None:
    rule = make_rule(id=3, type=AlertType.DISCLOSURE, threshold=None)
    disc = make_disclosure(external_id="ext-42", symbol="JKH.N0000", title="AGM Notice")
    events = evaluate_disclosure_rules(disclosure=disc, rules=[rule])
    assert len(events) == 1
    assert events[0].trigger == "new disclosure: AGM Notice"
    assert events[0].disclosure_url == disc.url
    assert events[0].disclosure_title == "AGM Notice"


def test_wrong_symbol_ignored() -> None:
    rule = make_rule(type=AlertType.DISCLOSURE, threshold=None, symbol="COMB.N0000")
    disc = make_disclosure(symbol="JKH.N0000")
    events = evaluate_disclosure_rules(disclosure=disc, rules=[rule])
    assert events == []


def test_inactive_disclosure_rule_ignored() -> None:
    rule = make_rule(type=AlertType.DISCLOSURE, threshold=None, active=False)
    disc = make_disclosure()
    assert evaluate_disclosure_rules(disclosure=disc, rules=[rule]) == []


def test_event_key_includes_external_id() -> None:
    rule = make_rule(id=7, type=AlertType.DISCLOSURE, threshold=None)
    disc = make_disclosure(external_id="ann-12345")
    events = evaluate_disclosure_rules(disclosure=disc, rules=[rule])
    assert len(events) == 1
    assert events[0].event_key == "disclosure:7:ann-12345"


def test_non_disclosure_rule_type_ignored() -> None:
    rule = make_rule(type=AlertType.PRICE_ABOVE, threshold=100.0)
    disc = make_disclosure()
    assert evaluate_disclosure_rules(disclosure=disc, rules=[rule]) == []
