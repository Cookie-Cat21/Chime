#!/usr/bin/env bash
# Tijori smoke — import chime.briefs + chime.scenarios, and migrate --help.
#
# Usage:
#   ./scripts/tijori_smoke.sh
#   PYTHON=python3.12 ./scripts/tijori_smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${PYTHON:-python3}"

echo "tijori_smoke: checking chime.briefs / chime.scenarios imports…"
"${PYTHON}" -c "
from chime.briefs import briefs_enabled
from chime.scenarios import scenarios_enabled
print('imports_ok', 'briefs', briefs_enabled(), 'scenarios', scenarios_enabled())
"

echo "tijori_smoke: checking python -m chime migrate --help…"
"${PYTHON}" -m chime migrate --help >/dev/null

echo "TIJORI_SMOKE_OK HEAD=$(git rev-parse HEAD)"
