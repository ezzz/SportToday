#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 runtime/backups/sporttoday-YYYYMMDDhhmmss" >&2
  exit 2
fi
backup_path="$1"
backup_name="${backup_path##*/}"
if [[ -z "$backup_name" || "$backup_path" != runtime/backups/* ]]; then
  echo "Indiquez un dossier situé sous runtime/backups/." >&2
  exit 2
fi

cd "$(dirname "$0")/.."
if [[ -n "$(docker compose ps -q sporttoday 2>/dev/null)" ]]; then
  echo "Arrêtez d'abord le service : docker compose stop sporttoday" >&2
  exit 1
fi
docker compose run --rm --no-deps -u root sporttoday node scripts/deploy/restore.mjs --from "/app/backups/$backup_name" --confirm
