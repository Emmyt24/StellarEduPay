#!/usr/bin/env bash
# backup.sh — Create a compressed mongodump of the StellarEduPay database.
#
# Usage:
#   MONGO_URI=mongodb://localhost:27017/stellaredupay \
#   BACKUP_DIR=/backups \
#   ./scripts/backup.sh
#
# Environment variables:
#   MONGO_URI    — MongoDB connection string (required)
#   BACKUP_DIR   — Directory to store backups (default: ./backups)
#   RETAIN_DAYS  — Days to keep old backups (default: 7)

set -euo pipefail

MONGO_URI="${MONGO_URI:?MONGO_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting backup → ${BACKUP_PATH}.gz"
mongodump --uri="${MONGO_URI}" --archive="${BACKUP_PATH}.gz" --gzip

echo "[backup] Backup complete: ${BACKUP_PATH}.gz ($(du -sh "${BACKUP_PATH}.gz" | cut -f1))"

# Remove backups older than RETAIN_DAYS
find "${BACKUP_DIR}" -name "*.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[backup] Pruned backups older than ${RETAIN_DAYS} days"
