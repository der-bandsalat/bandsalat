#!/usr/bin/env bash
# bandsalat-Backup: kopiert SQLite (via WAL-Checkpoint) + uploads/ in ein Zielverzeichnis.
# Geeignet für cron, z.B.:
#   0 3 * * *  /opt/bandsalat/scripts/backup.sh /var/backups/bandsalat
#
# Optional via Docker:
#   /opt/bandsalat/scripts/backup.sh /var/backups/bandsalat --container bandsalat
#
set -euo pipefail

TARGET_DIR="${1:-}"
if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: $0 <backup-dir> [--container <name>] [--data-dir <path>]" >&2
  exit 2
fi
shift

CONTAINER=""
DATA_DIR="${DATA_DIR:-/data}"

while (( "$#" )); do
  case "$1" in
    --container) CONTAINER="$2"; shift 2;;
    --data-dir)  DATA_DIR="$2"; shift 2;;
    *) echo "Unbekanntes Argument: $1" >&2; exit 2;;
  esac
done

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$TARGET_DIR/$TS"
mkdir -p "$OUT_DIR"

run_inside() {
  if [[ -n "$CONTAINER" ]]; then
    docker exec "$CONTAINER" "$@"
  else
    "$@"
  fi
}

copy_out() {
  local src="$1"
  local dst="$2"
  if [[ -n "$CONTAINER" ]]; then
    docker cp "$CONTAINER:$src" "$dst"
  else
    cp -a "$src" "$dst"
  fi
}

# WAL-Checkpoint, damit die .sqlite-Datei alleine konsistent ist
run_inside sqlite3 "$DATA_DIR/bandsalat.sqlite" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null || true

copy_out "$DATA_DIR/bandsalat.sqlite" "$OUT_DIR/bandsalat.sqlite"
copy_out "$DATA_DIR/uploads"          "$OUT_DIR/uploads"

# alte Backups (>30 Tage) löschen
find "$TARGET_DIR" -maxdepth 1 -type d -name '20*' -mtime +30 -print -exec rm -rf {} \;

echo "Backup geschrieben nach: $OUT_DIR"
