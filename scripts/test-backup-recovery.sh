#!/usr/bin/env bash
# test-backup-recovery.sh — Smoke-test the full backup → restore cycle.
#
# Requires: mongodump, mongorestore, mongosh (or mongo) on PATH.
# Spins up nothing — runs against an already-running MongoDB instance.
#
# Usage:
#   MONGO_URI=mongodb://localhost:27017/stellaredupay \
#   ./scripts/test-backup-recovery.sh

set -euo pipefail

MONGO_URI="${MONGO_URI:?MONGO_URI is required}"
TEST_BACKUP_DIR="$(mktemp -d)"
BACKUP_FILE="${TEST_BACKUP_DIR}/test-backup.gz"

cleanup() { rm -rf "${TEST_BACKUP_DIR}"; }
trap cleanup EXIT

echo "=== [1/4] Counting documents before backup ==="
BEFORE=$(mongosh --quiet --eval \
  "db.getSiblingDB('stellaredupay').getCollectionNames()
     .reduce((n,c) => n + db.getSiblingDB('stellaredupay').getCollection(c).countDocuments(), 0)" \
  "${MONGO_URI}" 2>/dev/null || echo "0")
echo "    Documents before: ${BEFORE}"

echo "=== [2/4] Running backup ==="
MONGO_URI="${MONGO_URI}" BACKUP_DIR="${TEST_BACKUP_DIR}" \
  bash "$(dirname "$0")/backup.sh"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  # backup.sh names the file with a timestamp — find it
  BACKUP_FILE=$(ls -t "${TEST_BACKUP_DIR}"/*.gz | head -1)
fi
echo "    Archive: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

echo "=== [3/4] Running restore (drop + reimport) ==="
MONGO_URI="${MONGO_URI}" BACKUP_FILE="${BACKUP_FILE}" DROP="true" \
  bash "$(dirname "$0")/restore.sh"

echo "=== [4/4] Verifying document count after restore ==="
AFTER=$(mongosh --quiet --eval \
  "db.getSiblingDB('stellaredupay').getCollectionNames()
     .reduce((n,c) => n + db.getSiblingDB('stellaredupay').getCollection(c).countDocuments(), 0)" \
  "${MONGO_URI}" 2>/dev/null || echo "0")
echo "    Documents after:  ${AFTER}"

if [[ "${BEFORE}" == "${AFTER}" ]]; then
  echo ""
  echo "✅  PASS — document count matches (${AFTER}). Data can be restored successfully."
  exit 0
else
  echo ""
  echo "❌  FAIL — before=${BEFORE}, after=${AFTER}. Counts do not match." >&2
  exit 1
fi
