#!/usr/bin/env bash
# =============================================================
# migrate.sh — Run all DDL migrations against void_db
#
# Usage:
#   ./scripts/migrate.sh
#
# Override any variable via environment:
#   DB_HOST=127.0.0.1 DB_PORT=5433 ./scripts/migrate.sh
# =============================================================

set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-void_db}"
DB_USER="${DB_USER:-void_user}"
PGPASSWORD="${DB_PASSWORD:-change_me}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/migrate.sql"

export PGPASSWORD

echo "→ Connecting to $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
echo "→ Ensuring schema void_app exists..."

psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --command="CREATE SCHEMA IF NOT EXISTS void_app AUTHORIZATION $DB_USER;"

echo "→ Running migrations from $MIGRATION_FILE..."

psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --file="$MIGRATION_FILE"

echo "✓ Migrations complete."
