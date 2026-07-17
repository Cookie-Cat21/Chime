"""Extract directors / CEOs / key officers from CSE annual report PDFs.

Fail-closed: only emit people with a recognizable role near the name.
Does NOT extract personal net worth (not disclosed as such in filings).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from io import BytesIO
from typing import Any

from chime.extractors.financial_pdf import (
    infer_filing_kind,
    is_financial_filing,
)

_BOARD_SECTION = re.compile(
    r"(?i)\b(board\s+of\s+directors|directors['’]?\s+profiles?|"
    r"corporate\s+information)\b"
)

# ALL CAPS name line (common in Hayleys / CTC board pages)
_CAPS_NAME = re.compile(
    r"^(?:(?:MR|MRS|MS|DR|PROF)\.?\s+)?"
    r"([A-Z][A-Z .'\-]{2,60}[A-Z])\s*$"
)

# Role line after a name
_ROLE_LINE = re.compile(
    r"(?i)^\s*("
    r"chairman(?:\s*&\s*chief\s+executive)?|"
    r"chairperson(?:[- ]ceo)?|"
    r"co[- ]?chairman|"
    r"deputy\s+chairman|"
    r"managing\s+director(?:\s*&\s*chief\s+executive\s+officer)?|"
    r"chief\s+executive(?:\s+officer)?|"
    r"ceo|"
    r"senior\s+independent(?:\s+non[- ]executive)?\s+director|"
    r"independent(?:\s+non[- ]executive)?\s+director|"
    r"non[- ]executive\s+director|"
    r"executive\s+director|"
    r"group\s+chief\s+financial\s+officer|"
    r"chief\s+financial\s+officer|"
    r"company\s+secretary|"
    r"director"
    r")\b"
)

# Caption style: Mr. Name - Role, Mr. Name - Role
_CAPTION = re.compile(
    r"(?i)((?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][A-Za-z .'\-]{2,50}?)"
    r"\s*[-–—:]\s*"
    r"("
    r"Chairman|Chairperson|Co[- ]?Chairman|Deputy\s+Chairman|"
    r"Managing\s+Director|Chief\s+Executive(?:\s+Officer)?|CEO|"
    r"Senior\s+Independent(?:\s+Non[- ]Executive)?\s+Director|"
    r"Independent(?:\s+Non[- ]Executive)?\s+Director|"
    r"Non[- ]Executive\s+Director|Executive\s+Director|"
    r"Director"
    r")"
)

_PROFILE_HEADER = re.compile(
    r"(?im)^(?:(?:MR|MRS|MS|DR|PROF)\.?\s+)?"
    r"([A-Z][A-Z .'\-]{2,60}[A-Z])\s*\n"
    r"([^\n]{3,80})"
)

_NOISE_NAME = re.compile(
    r"(?i)^(BOARD|DIRECTORS?|CONTENTS|ANNUAL|REPORT|PAGE|COMMITTEE|"
    r"AUDIT|LEFT|RIGHT|THE|AND|PLC|LIMITED|GROUP|HAYLEYS|JOHN|KEELLS|"
    r"CEYLON|TOBACCO|COMPANY|OVERVIEW|FINANCIAL|STATEMENTS|"
    r"CHAIRMAN|CHAIRPERSON|MANAGING DIRECTOR|CHIEF EXECUTIVE|"
    r"EXECUTIVE DIRECTOR|INDEPENDENT|NON.?EXECUTIVE|CORPORATE|"
    r"GOVERNANCE|INFORMATION|RESPONSIBILITIES|COMPLIANT|"
    r"APPLICABLE|MESSAGE|REVIEW|ROLE OF.+|MEMBERS OF.+)$"
)

_STOP_WORDS = {
    "THE",
    "AND",
    "OF",
    "AS",
    "IS",
    "WAS",
    "WERE",
    "HE",
    "SHE",
    "HIS",
    "HER",
    "HAS",
    "HAD",
    "BEEN",
    "ALSO",
    "WITH",
    "FROM",
    "FOR",
    "TO",
    "IN",
    "ON",
    "AT",
    "BY",
    "OR",
    "AN",
    "A",
    "THIS",
    "THAT",
    "WHICH",
    "WHO",
    "WHOM",
    "THEIR",
    "THEY",
    "ONE",
    "HIGHER",
    "SHALL",
    "APPOINTED",
    "FORMER",
    "PAST",
    "LATER",
    "POSITIONS",
    "BOARD",
    "DIRECTORS",
    "DIRECTOR",
    "CHAIRMAN",
    "MANAGING",
    "EXECUTIVE",
    "INDEPENDENT",
    "NON",
    "SERVICE",
    "LEADERSHIP",
    "MESSAGE",
    "REVIEW",
    "REPORT",
    "CONTENT",
    "CONTENTS",
    "INFORMATION",
    "GOVERNANCE",
    "CORPORATE",
    "COMMITTEE",
    "MEMBERS",
    "ROLE",
    "SPECIAL",
    "NOTE",
    "APPRECIATION",
    "WHICHEVER",
    "FITNESS",
    "FUTURE",
    "DEVELOPMENTS",
    "RESPONSIBILITIES",
    "COMPLIANT",
    "APPLICABLE",
    "LISTED",
    "BANK",
    "SRI",
    "LANKA",
    "PLC",
    "LTD",
    "LIMITED",
    "COMPANY",
    "GROUP",
    "ACKNOWLEDGEMENTS",
    "ACKNOWLEDGEMENT",
    "LANGUAGE",
    "CONTENT",
    "INFORMATION",
}

_TITLE_PREFIX = re.compile(r"^(?:MR|MRS|MS|DR|PROF)\.?\s+", re.I)


@dataclass
class PersonRoleCandidate:
    display_name: str
    role: str
    confidence: str
    evidence_page: int | None = None
    evidence_snippet: str = ""


@dataclass
class PeopleExtractResult:
    kind: str
    people_ok: bool = False
    extract_ok: bool = False
    people: list[PersonRoleCandidate] = field(default_factory=list)
    notes: dict[str, Any] = field(default_factory=dict)


def normalize_person_name(raw: str) -> str:
    if not isinstance(raw, str):
        return ""
    s = re.sub(r"\s+", " ", raw).strip()
    s = _TITLE_PREFIX.sub("", s)
    s = s.replace(".", " ")
    s = re.sub(r"\s+", " ", s).strip().upper()
    # Drop trailing junk
    s = re.sub(r"[^A-Z0-9 '\-]", "", s).strip()
    return s


def _clean_display(raw: str) -> str | None:
    if not isinstance(raw, str):
        return None
    s = re.sub(r"\s+", " ", raw).strip(" ,;·•\t")
    s = _TITLE_PREFIX.sub("", s).strip()
    if len(s) < 3 or len(s) > 48:
        return None
    if _NOISE_NAME.match(s):
        return None
    # Reject sentence fragments / narrative glue
    if re.search(
        r"\b(the|and|as|of|is|was|been|also|with|from|shall|who|which|"
        r"whichever|served|appointed|relinquished|presence|duties)\b",
        s,
        re.I,
    ):
        return None
    if re.search(r"[,:;]", s):
        return None
    letters = [c for c in s if c.isalpha()]
    if len(letters) < 4:
        return None
    tokens = [t for t in re.split(r"[\s.]+", s) if t]
    if not tokens or len(tokens) > 5:
        return None
    # At least one token length >= 3 that is not a stop word
    meaningful = [
        t
        for t in tokens
        if len(t) >= 3 and t.upper() not in _STOP_WORDS
    ]
    if not meaningful:
        return None
    stop_hits = sum(1 for t in tokens if t.upper() in _STOP_WORDS)
    if stop_hits >= 2:
        return None
    # Reject if mostly stop / role words
    if stop_hits / max(len(tokens), 1) > 0.4:
        return None
    # Person-like: ALL CAPS, Title Case words, or initials + surname
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    title_words = sum(1 for t in tokens if t[:1].isupper())
    if upper_ratio < 0.08 and title_words < max(1, len(tokens) // 2):
        return None
    # Reject role titles used as "names"
    joined = " ".join(tokens).lower()
    if joined in {
        "managing director",
        "executive director",
        "independent director",
        "non executive director",
        "board of directors",
        "audit committee",
        "corporate governance",
        "current appointments",
        "other appointments",
        "diversity of expertise",
        "balance of power",
        "acknowledgements",
    }:
        return None
    if "board of director" in joined or "committee" in joined:
        return None
    # Strip trailing role leakage stuck onto names ("… Jayawardena Non")
    s = re.sub(
        r"(?i)\s+(non|independent|executive|director|chairman|ceo)$",
        "",
        s,
    ).strip()
    tokens = [t for t in re.split(r"[\s.]+", s) if t]
    if len(tokens) > 5 or len(tokens) < 1:
        return None
    if len(tokens) == 1 and len(tokens[0]) < 5:
        return None
    return s.title() if s.isupper() else s


def map_role(raw: str) -> str | None:
    if not isinstance(raw, str):
        return None
    t = re.sub(r"\s+", " ", raw).strip().lower()
    if not t:
        return None
    if "senior independent" in t:
        return "senior_independent_director"
    if "independent" in t and "director" in t:
        return "independent_director"
    if "non-executive" in t or "non executive" in t:
        return "non_executive_director"
    if "managing director" in t:
        return "managing_director"
    if "chief executive" in t or t == "ceo" or "chairperson-ceo" in t:
        # Chairman & Chief Executive → both roles handled by caller sometimes;
        # prefer ceo when CE mentioned with chairman unless only chairman
        if "chairman" in t or "chairperson" in t:
            return "chairman"  # combined chair+CE stored as chairman; also emit ceo below
        return "ceo"
    if "deputy chairman" in t or "co-chairman" in t or "co chairman" in t:
        return "deputy_chairman"
    if "chairman" in t or "chairperson" in t:
        return "chairman"
    if "chief financial" in t or t == "cfo":
        return "cfo"
    if "company secretary" in t:
        return "company_secretary"
    if "executive director" in t:
        return "executive_director"
    if t == "director" or t.endswith(" director"):
        return "director"
    return None


def _roles_from_blob(role_blob: str) -> list[str]:
    """A line may encode multiple roles (Chairman & Chief Executive)."""
    roles: list[str] = []
    low = role_blob.lower()
    if re.search(r"chairman|chairperson", low) and re.search(
        r"chief executive|\bceo\b", low
    ):
        roles.extend(["chairman", "ceo"])
    elif re.search(r"managing director", low) and re.search(
        r"chief executive|\bceo\b", low
    ):
        roles.extend(["managing_director", "ceo"])
    else:
        one = map_role(role_blob)
        if one:
            roles.append(one)
    # de-dupe preserve order
    out: list[str] = []
    for r in roles:
        if r not in out:
            out.append(r)
    return out


def extract_pdf_pages(data: bytes, *, max_pages: int = 80) -> list[tuple[int, str]]:
    try:
        from pypdf import PdfReader
    except ImportError:
        return []
    try:
        reader = PdfReader(BytesIO(data))
    except Exception:
        return []
    out: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages[: max(1, max_pages)]):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        out.append((i + 1, text))
    return out


def _board_pages(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    hits = [p for p in pages if _BOARD_SECTION.search(p[1])]
    if hits:
        # Include next page after each hit for multi-page boards
        idxs = {p[0] for p in hits}
        for pno, _ in hits:
            idxs.add(pno + 1)
        return [p for p in pages if p[0] in idxs]
    # Fallback: pages with many director role labels
    scored = []
    for pno, text in pages:
        n = len(re.findall(r"(?i)\b(chairman|managing director|non-executive director)\b", text))
        if n >= 3:
            scored.append((n, pno, text))
    scored.sort(reverse=True)
    return [(pno, text) for _, pno, text in scored[:8]]


def extract_people_from_bytes(
    data: bytes,
    *,
    title: str | None = None,
    category: str | None = None,
    max_pages: int = 80,
) -> PeopleExtractResult:
    kind = infer_filing_kind(title=title, category=category)
    if not is_financial_filing(title=title, category=category):
        return PeopleExtractResult(kind=kind, notes={"skip": "not_financial"})
    if kind != "annual":
        return PeopleExtractResult(kind=kind, notes={"skip": "not_annual"})

    pages = extract_pdf_pages(data, max_pages=max_pages)
    if not pages:
        return PeopleExtractResult(kind=kind, notes={"error": "no_text"})

    board = _board_pages(pages)
    notes: dict[str, Any] = {"board_pages": [p for p, _ in board], "pages": len(pages)}
    if not board:
        return PeopleExtractResult(kind=kind, notes={**notes, "skip": "no_board_section"})

    found: dict[tuple[str, str], PersonRoleCandidate] = {}

    def add(name_raw: str, role_blob: str, page_no: int, snippet: str, conf: str) -> None:
        display = _clean_display(name_raw)
        if not display:
            return
        norm = normalize_person_name(display)
        if len(norm) < 4:
            return
        for role in _roles_from_blob(role_blob):
            key = (norm, role)
            prev = found.get(key)
            cand = PersonRoleCandidate(
                display_name=display,
                role=role,
                confidence=conf,
                evidence_page=page_no,
                evidence_snippet=re.sub(r"\s+", " ", snippet).strip()[:240],
            )
            if prev is None or {"low": 1, "medium": 2, "high": 3}[conf] > {
                "low": 1,
                "medium": 2,
                "high": 3,
            }[prev.confidence]:
                found[key] = cand

    for page_no, text in board:
        # Caption: Mr. X - Role
        for m in _CAPTION.finditer(text):
            add(m.group(1), m.group(2), page_no, m.group(0), "high")

        # Profile header: NAME\nRole
        for m in _PROFILE_HEADER.finditer(text):
            name, role_line = m.group(1), m.group(2)
            if _ROLE_LINE.match(role_line.strip()):
                add(name, role_line, page_no, f"{name} {role_line}", "high")

        # Line-pair scan (ALL CAPS name then role)
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        for i, line in enumerate(lines[:-1]):
            cm = _CAPS_NAME.match(line)
            if not cm:
                continue
            nxt = lines[i + 1]
            # Role may span 2 short lines
            role_blob = nxt
            if i + 2 < len(lines) and len(nxt) < 40 and not _CAPS_NAME.match(lines[i + 2]):
                if _ROLE_LINE.match(lines[i + 2]) or re.search(
                    r"(?i)director|chairman|executive|ceo", lines[i + 2]
                ):
                    role_blob = nxt + " " + lines[i + 2]
            if _ROLE_LINE.match(role_blob) or map_role(role_blob):
                add(cm.group(1), role_blob, page_no, f"{line} / {role_blob}", "medium")

    people = list(found.values())
    strong = [p for p in people if p.confidence in {"medium", "high"}]
    # One high-confidence chair/CEO is enough (image-heavy boards)
    lead = {
        "chairman",
        "ceo",
        "managing_director",
        "deputy_chairman",
    }
    lead_hits = [p for p in strong if p.role in lead]
    people_ok = len(strong) >= 2 or (
        len(lead_hits) >= 1 and any(p.confidence == "high" for p in lead_hits)
    )
    return PeopleExtractResult(
        kind=kind,
        people_ok=people_ok,
        extract_ok=bool(people),
        people=people,
        notes={**notes, "candidates": len(people), "strong": len(strong)},
    )
