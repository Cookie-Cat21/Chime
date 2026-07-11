#!/usr/bin/env python3
"""Print agentic factory loop status and next-wave hints."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOARD = ROOT / "docs" / "factory" / "EPOCH2_BOARD.md"
SCORE = ROOT / "docs" / "factory" / "SCOREBOARD.json"


def parse_board(text: str) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for line in text.splitlines():
        if not line.startswith("| E2-"):
            continue
        parts = [p.strip() for p in line.strip("|").split("|")]
        if len(parts) < 3:
            continue
        rows.append((parts[0], parts[1], parts[2]))
    return rows


def main() -> int:
    if not BOARD.exists():
        print("NO_BOARD", file=sys.stderr)
        return 1
    rows = parse_board(BOARD.read_text())
    open_items = [r for r in rows if r[2] == "OPEN"]
    done = [r for r in rows if r[2] == "DONE"]
    prog = [r for r in rows if r[2] == "IN_PROGRESS"]
    score = json.loads(SCORE.read_text()) if SCORE.exists() else {}
    print("=== Chime Agentic Factory Status ===")
    print(f"epoch={score.get('epoch')} branch={score.get('branch')}")
    print(f"lifetime_factory_score={score.get('lifetime_factory_score', 0)}")
    print(f"clean_streak={score.get('clean_streak', 0)}")
    print(f"OPEN={len(open_items)} IN_PROGRESS={len(prog)} DONE={len(done)}")
    print("--- OPEN (next wave fuel) ---")
    for i, (eid, title, _) in enumerate(open_items[:8], 1):
        print(f"  {i}. {eid}: {title[:72]}")
    if not open_items and score.get("clean_streak", 0) >= 2:
        print("GLOBAL_STOP_CANDIDATE: board empty + CLEAN×2")
    elif not open_items:
        print("BOARD_EMPTY: run adversarial CLEAN passes or open Epoch 3")
    else:
        print("CONTINUE: spawn ≤8 agents on OPEN items (disjoint OWNED_FILES)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
