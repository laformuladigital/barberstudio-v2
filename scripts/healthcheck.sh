#!/usr/bin/env bash
set -euo pipefail

URL="${URL:-https://barberappstudio.com/}"
status="$(curl -k -s -o /dev/null -w "%{http_code}" "$URL")"

if [[ "$status" != "200" ]]; then
  echo "Healthcheck failed for $URL with status $status"
  exit 1
fi

echo "Healthcheck OK for $URL"

