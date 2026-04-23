#!/usr/bin/env bash
# restore.sh — Restore a StellarEduPay database from a compressed mongodump archive.
#
# Usage:
#   MONGO_URI=mongodb://localhost:27017/stellaredupay \
#   BACKUP_FILE=./backups/20260326T120000Z.gz \
#   ./scripts/restore.sh
#
# Environment variables:
#   MONGO_URI    — MongoDB connection string (required)
#   BACKUP_FILE  — Path to the .gz backup archive (required)
#   DROP         — Set to "true" to drop existing collections before restore (default: true)

set -euo pipefail

MONGO_URI="${MONGO_URI:?MONGO_URI is required}"
BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE is required}"
DROP="${DROP:-true}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "[restore] ERROR: Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

DROP_FLAG=""
if [[ "${DROP}" == "true" ]]; then
  DROP_FLAG="--drop"
fi

echo "[restore] Restoring from ${BACKUP_FILE} into ${MONGO_URI} (drop=${DROP})"
mongorestore --uri="${MONGO_URI}" --archive="${BACKUP_FILE}" --gzip ${DROP_FLAG}
echo "[restore] Restore complete"
