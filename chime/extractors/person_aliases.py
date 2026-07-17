"""Familiar public names for well-known CSE directors listed by initials.

CSE ``companyProfile`` often stores only initials (``K. A. D. D. Perera``).
These aliases are for display / soft-merge only — ``name_norm`` stays the
CSE initials form as the stable identity key.

Only high-confidence, widely published mappings. Do not invent names.
"""

from __future__ import annotations

# name_norm → (canonical_merge_key, preferred_display_name)
PERSON_ALIASES: dict[str, tuple[str, str]] = {
    # Vallibel / Hayleys
    "K A D D PERERA": ("dhammika_perera", "Dhammika Perera"),
    # Hayleys — CSE uses M. on HAYL and A.M. on group companies
    "M PANDITHAGE": ("mohan_pandithage", "Mohan Pandithage"),
    "A M PANDITHAGE": ("mohan_pandithage", "Mohan Pandithage"),
    # John Keells
    "K BALENDRA": ("krishan_balendra", "Krishan Balendra"),
    "K N J BALENDRA": ("krishan_balendra", "Krishan Balendra"),
    "J G A COORAY": ("gihan_cooray", "Gihan Cooray"),
    # Distilleries / Melstacorp family
    "D S T JAYAWARDENA": ("harry_jayawardena", "Harry Jayawardena"),
    "DON S T JAYAWARDENA": ("harry_jayawardena", "Harry Jayawardena"),
    "D HASITHA S JAYAWARDENA": ("hasitha_jayawardena", "Hasitha Jayawardena"),
    "D HASITHA STASSEN JAYAWARDENA": (
        "hasitha_jayawardena",
        "Hasitha Jayawardena",
    ),
    # LOLC
    "I C NANAYAKKARA": ("ishara_nanayakkara", "Ishara Nanayakkara"),
    "W D K JAYAWARDENA": ("kapila_jayawardena", "Kapila Jayawardena"),
    # ACL / Lanka Tiles group
    "H A S MADANAYAKE": ("suren_madanayake", "Suren Madanayake"),
    "U G MADANAYAKE": ("udaya_madanayake", "Udaya Madanayake"),
    # Other frequently initials-only chairs
    "S K SHAH": ("suresh_shah", "Suresh Shah"),
    "S H AMARASEKERA": ("harsha_amarasekera", "Harsha Amarasekera"),
    "D A CABRAAL": ("amal_cabraal", "Amal Cabraal"),
}


def preferred_display_name(display_name: str, name_norm: str) -> str:
    key = (name_norm or "").strip().upper()
    hit = PERSON_ALIASES.get(key)
    if hit:
        return hit[1]
    return display_name


def alias_merge_key(name_norm: str) -> str | None:
    key = (name_norm or "").strip().upper()
    hit = PERSON_ALIASES.get(key)
    return hit[0] if hit else None
