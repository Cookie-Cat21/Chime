#!/usr/bin/env python3
"""Print agentic factory loop status and next-wave hints."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCORE = ROOT / "docs" / "factory" / "SCOREBOARD.json"
BOARDS = [
    ROOT / "docs" / "factory" / "EPOCH3_BOARD.md",
    ROOT / "docs" / "factory" / "EPOCH2_BOARD.md",
]


def parse_board(text: str) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for line in text.splitlines():
        if not (line.startswith("| E2-") or line.startswith("| E3-")):
            continue
        parts = [p.strip() for p in line.strip("|").split("|")]
        if len(parts) < 3:
            continue
        rows.append((parts[0], parts[1], parts[2]))
    return rows


def main() -> int:
    score = json.loads(SCORE.read_text()) if SCORE.exists() else {}
    board_path = next((b for b in BOARDS if b.exists()), None)
    if board_path is None:
        print("NO_BOARD", file=sys.stderr)
        return 1
    # Prefer board with OPEN items
    chosen = board_path
    rows: list[tuple[str, str, str]] = []
    for b in BOARDS:
        if not b.exists():
            continue
        r = parse_board(b.read_text())
        if any(x[2] == "OPEN" for x in r):
            chosen = b
            rows = r
            break
        rows = r
        chosen = b
    open_items = [r for r in rows if r[2] == "OPEN"]
    done = [r for r in rows if r[2] == "DONE"]
    prog = [r for r in rows if r[2] == "IN_PROGRESS"]
    print("=== Chime Agentic Factory Status ===")
    print(f"epoch={score.get('epoch')} branch={score.get('branch')}")
    print(f"board={chosen.relative_to(ROOT)}")
    print(f"lifetime_factory_score={score.get('lifetime_factory_score', 0)}")
    print(f"clean_streak={score.get('clean_streak', 0)}")
    print(f"OPEN={len(open_items)} IN_PROGRESS={len(prog)} DONE={len(done)}")
    print("--- OPEN (next wave fuel) ---")
    for i, (eid, title, _) in enumerate(open_items[:8], 1):
        print(f"  {i}. {eid}: {title[:72]}")
    if not open_items and score.get("clean_streak", 0) >= 2:
        print("GLOBAL_STOP_CANDIDATE: board empty + CLEAN×2")
    elif not open_items:
        print("BOARD_EMPTY: run adversarial CLEAN passes or open next epoch")
    else:
        print("CONTINUE: spawn ≤8 agents on OPEN items (disjoint OWNED_FILES)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
