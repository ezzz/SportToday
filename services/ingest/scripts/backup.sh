#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runtime/data runtime/reports runtime/backups
docker compose run --rm --no-deps sporttoday node scripts/deploy/backup.mjs
