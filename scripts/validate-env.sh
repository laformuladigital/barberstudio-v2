#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

missing=0
for key in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_APP_DOMAIN; do
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    echo "Missing $key in $ENV_FILE"
    missing=1
  fi
done

if grep -qi "service_role\|SUPABASE_SERVICE" "$ENV_FILE"; then
  echo "Do not place Supabase service-role secrets in frontend env files."
  missing=1
fi

if ! grep -q "^VITE_APP_DOMAIN=https://barberappstudio.com$" "$ENV_FILE"; then
  echo "VITE_APP_DOMAIN must be https://barberappstudio.com for production."
  missing=1
fi

if grep -q "your-project-ref\|your-public-anon-key" "$ENV_FILE"; then
  echo "Replace placeholder Supabase values before deploy."
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "$ENV_FILE looks good."
