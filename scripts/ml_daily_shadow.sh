#!/usr/bin/env bash
# Daily Loop-0 shadow ops for E7/E8 accumulation.
# Research/ledger only — never writes forecast_points or Telegram.
#
# Requires ambient env:
#   DATABASE_URL or ML_DATABASE_URL
#   KOEL_SECTOR_MAP (optional; defaults /tmp/koel-sector-map.json if present)
#
# Usage:
#   bash scripts/ml_daily_shadow.sh            # run now (post-close)
#   bash scripts/ml_daily_shadow.sh --wait     # sleep until 14:40 Asia/Colombo today/next
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONUNBUFFERED=1
export ML_DATABASE_URL="${ML_DATABASE_URL:-${DATABASE_URL:-}}"
if [ -z "${ML_DATABASE_URL}" ]; then
  echo "ML_DATABASE_URL or DATABASE_URL required" >&2
  exit 1
fi
export DATABASE_URL="${DATABASE_URL:-$ML_DATABASE_URL}"
if [ -z "${KOEL_SECTOR_MAP:-}" ] && [ -f /tmp/koel-sector-map.json ]; then
  export KOEL_SECTOR_MAP=/tmp/koel-sector-map.json
fi

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

if [ "${1:-}" = "--wait" ]; then
  SECS=$(python3 - <<'PY'
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
now = datetime.now(ZoneInfo("Asia/Colombo"))
target = now.replace(hour=14, minute=40, second=0, microsecond=0)
if now >= target:
    target = target + timedelta(days=1)
# skip weekends (CSE closed Sat/Sun)
while target.weekday() >= 5:
    target += timedelta(days=1)
print(max(0, int((target - now).total_seconds())))
PY
)
  log "sleeping ${SECS}s until next 14:40 Asia/Colombo weekday"
  sleep "$SECS"
fi

SNAP=/tmp/koel-live-final-snapshot-split
LOG_DIR=/tmp/koel-daily-shadow
mkdir -p "$LOG_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

log "export hybrid split snapshot"
rm -rf "$SNAP"
nice -n 10 python3 -m koel.ml.snapshot export \
  --dataset hybrid --output "$SNAP" --price-adjustment split \
  2>&1 | tee "$LOG_DIR/export-$STAMP.log"

log "live_shadow emit"
nice -n 10 python3 -m koel.ml.live_shadow --snapshot "$SNAP" \
  2>&1 | tee "$LOG_DIR/shadow-$STAMP.log"

log "path-backfill recent CSE bars (period=2, force)"
nice -n 15 python3 -m koel path-backfill --force --period 2 --limit 0 --no-seed \
  2>&1 | tee "$LOG_DIR/pathbf-$STAMP.log" || true

log "score shadow outcomes first"
nice -n 10 python3 -m koel ml-score-outcomes --model-prefix shadow --limit 20000 \
  2>&1 | tee "$LOG_DIR/score-$STAMP.log" || true

log "live_shadow_report"
nice -n 10 python3 -m koel.ml.live_shadow_report \
  2>&1 | tee "$LOG_DIR/report-$STAMP.log" || true

log "DONE $STAMP"
echo EXIT:0
