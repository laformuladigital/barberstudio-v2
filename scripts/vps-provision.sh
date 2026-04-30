#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/barberstudio-v2}"
DOMAIN="${DOMAIN:-barberappstudio.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.barberappstudio.com}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the VPS."
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx rsync

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v${NODE_MAJOR}\\."; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi

mkdir -p "$APP_DIR"
chown -R root:root "$APP_DIR"

cp "$APP_DIR/infra/nginx/barberappstudio.conf" /etc/nginx/sites-available/barberappstudio.conf
ln -sfn /etc/nginx/sites-available/barberappstudio.conf /etc/nginx/sites-enabled/barberappstudio.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

if [[ "${ENABLE_SSL:-0}" == "1" ]]; then
  certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos -m "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL before enabling SSL}"
fi

echo "VPS base ready. Place .env.production in $APP_DIR and run: bash $APP_DIR/scripts/deploy.sh"

