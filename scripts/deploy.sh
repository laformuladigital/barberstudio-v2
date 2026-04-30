#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/barberstudio-v2}"

cd "$APP_DIR/apps/web"

if [[ ! -f "$APP_DIR/.env.production" ]]; then
  echo "Missing $APP_DIR/.env.production"
  exit 1
fi

"$APP_DIR/scripts/validate-env.sh" "$APP_DIR/.env.production"
cp "$APP_DIR/.env.production" .env.production
npm ci
npm run build

cp "$APP_DIR/infra/nginx/barberappstudio.conf" /etc/nginx/sites-available/barberappstudio.conf
ln -sfn /etc/nginx/sites-available/barberappstudio.conf /etc/nginx/sites-enabled/barberappstudio.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

URL="https://barberappstudio.com/" "$APP_DIR/scripts/healthcheck.sh"
