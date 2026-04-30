#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/barberstudio-v2}"
N8N_ENV_DIR="/etc/barberstudio"
N8N_ENV_FILE="$N8N_ENV_DIR/n8n.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the VPS."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Run scripts/vps-provision.sh first."
  exit 1
fi

if ! id n8n >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/n8n --shell /usr/sbin/nologin n8n
fi

mkdir -p "$N8N_ENV_DIR" /var/lib/n8n
chown -R n8n:n8n /var/lib/n8n

if [[ ! -f "$N8N_ENV_FILE" ]]; then
  cp "$APP_DIR/n8n/.env.example" "$N8N_ENV_FILE"
  chmod 600 "$N8N_ENV_FILE"
  echo "Created $N8N_ENV_FILE. Edit N8N_ENCRYPTION_KEY before starting n8n."
fi

npm install -g n8n

cp "$APP_DIR/infra/systemd/n8n.service" /etc/systemd/system/n8n.service
systemctl daemon-reload
systemctl enable n8n

echo "n8n service installed. After editing $N8N_ENV_FILE, run: systemctl start n8n"

