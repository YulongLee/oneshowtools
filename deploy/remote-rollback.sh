#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$1"
RELEASE_ID="$2"
SERVICE_NAME="$3"
NODE_ROOT="$4"
HEALTH_URL="$5"
APP_DIR="$APP_ROOT/app"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_ID/app"

[[ -d "$RELEASE_DIR" ]] || { echo "Release not found: $RELEASE_ID" >&2; exit 1; }
export PATH="$NODE_ROOT/bin:$PATH"

if [[ -d "$APP_DIR/data" && -f "$APP_DIR/data/oneshowtools.sqlite" ]]; then
  (cd "$APP_DIR" && npm run db:backup)
fi

systemctl stop "$SERVICE_NAME"
rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='data/' \
  --exclude='.env' \
  "$RELEASE_DIR/" "$APP_DIR/"
(cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund && npm run db:check)
chown -R oneshowtools:oneshowtools "$APP_DIR"
systemctl restart "$SERVICE_NAME"

for _ in $(seq 1 30); do
  curl -fsS --max-time 5 "$HEALTH_URL" | grep -q '"ok":true' && {
    echo "Rolled back to $RELEASE_ID"
    exit 0
  }
  sleep 2
done
echo "Rollback health check failed" >&2
exit 1

