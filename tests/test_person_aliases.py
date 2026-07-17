"""Well-known CSE director display aliases + merge keys."""

from __future__ import annotations

from chime.extractors.person_aliases import alias_merge_key, preferred_display_name
from chime.extractors.cse_directors import parse_cse_director_row


def test_known_public_names() -> None:
    assert preferred_display_name("M. Pandithage", "M PANDITHAGE") == "Mohan Pandithage"
    assert preferred_display_name("K. Balendra", "K BALENDRA") == "Krishan Balendra"
    assert preferred_display_name("J. G. A. Cooray", "J G A COORAY") == "Gihan Cooray"
    assert (
        preferred_display_name("I. C. Nanayakkara", "I C NANAYAKKARA")
        == "Ishara Nanayakkara"
    )


def test_pandithage_and_balendra_merge_keys() -> None:
    assert alias_merge_key("M PANDITHAGE") == alias_merge_key("A M PANDITHAGE")
    assert alias_merge_key("K BALENDRA") == alias_merge_key("K N J BALENDRA")
    assert alias_merge_key("D S T JAYAWARDENA") == alias_merge_key(
        "DON S T JAYAWARDENA"
    )
    # Do not merge Dhammika with K.A.D.B.
    assert alias_merge_key("K A D B PERERA") is None
    assert alias_merge_key("K A D D PERERA") == "dhammika_perera"


def test_parse_applies_alias_without_changing_norm() -> None:
    seat = parse_cse_director_row(
        {
            "directorId": 5824,
            "firstName": "M.",
            "lastName": "Pandithage",
            "designationOther": "Executive Chairman / CEO",
        },
        source_bucket="top_posts",
    )
    assert seat is not None
    assert seat.display_name == "Mohan Pandithage"
    assert seat.name_norm == "M PANDITHAGE"
