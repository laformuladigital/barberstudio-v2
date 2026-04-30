#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/barberstudio-v2}"
ENV_FILE="$APP_DIR/.env.production"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the VPS."
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE already exists. Edit it manually if values changed."
  exit 0
fi

cp "$APP_DIR/.env.production.example" "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "Created $ENV_FILE from example."
echo "Edit VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before deploy."

