#!/usr/bin/env bash
# Canonical factory verify — cite output + git rev-parse HEAD in pass reports.
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "HEAD=$(git rev-parse HEAD)"
ruff check chime tests
mypy chime
if [[ -d web ]]; then
  if [[ -f web/package.json ]]; then
    echo "web/ present — run dash smoke separately if configured"
  fi
fi
DATABASE_URL="${DATABASE_URL:-}" pytest -q --tb=line
echo "VERIFY_OK HEAD=$(git rev-parse HEAD)"
