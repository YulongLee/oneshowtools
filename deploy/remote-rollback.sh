#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$1"
RELEASE_ID="$2"
SERVICE_NAME="$3"
NODE_ROOT="$4"
HEALTH_URL="$5"
APP_DIR="$APP_ROOT/app"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_ID/app"
WORK_DIR="$APP_ROOT/incoming/.rollback-$RELEASE_ID-$$"
CURRENT_SNAPSHOT="$APP_ROOT/incoming/.rollback-current-$RELEASE_ID-$$"
PREVIOUS_MODULES="$APP_ROOT/incoming/.rollback-modules-$RELEASE_ID-$$"

[[ -d "$RELEASE_DIR" ]] || { echo "Release not found: $RELEASE_ID" >&2; exit 1; }
export PATH="$NODE_ROOT/bin:$PATH"

mkdir -p "$WORK_DIR" "$CURRENT_SNAPSHOT"
rsync -a "$RELEASE_DIR/" "$WORK_DIR/"
(cd "$WORK_DIR" && npm ci --omit=dev --no-audit --no-fund && npm run db:check)

if [[ -d "$APP_DIR/data" && -f "$APP_DIR/data/oneshowtools.sqlite" ]]; then
  (cd "$APP_DIR" && npm run db:backup)
fi

rsync -a --delete --exclude='node_modules/' --exclude='data/' --exclude='.env' "$APP_DIR/" "$CURRENT_SNAPSHOT/"

restore_current() {
  trap - ERR
  systemctl stop "$SERVICE_NAME" || true
  rm -rf -- "$APP_DIR/node_modules"
  [[ -d "$PREVIOUS_MODULES" ]] && mv "$PREVIOUS_MODULES" "$APP_DIR/node_modules"
  rsync -a --delete --exclude='node_modules/' --exclude='data/' --exclude='.env' "$CURRENT_SNAPSHOT/" "$APP_DIR/"
  chown -R oneshowtools:oneshowtools "$APP_DIR"
  systemctl restart "$SERVICE_NAME"
}
trap restore_current ERR

systemctl stop "$SERVICE_NAME"
if [[ -d "$APP_DIR/node_modules" ]]; then
  mv "$APP_DIR/node_modules" "$PREVIOUS_MODULES"
fi
rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='data/' \
  --exclude='.env' \
  "$WORK_DIR/" "$APP_DIR/"
mv "$WORK_DIR/node_modules" "$APP_DIR/node_modules"
chown -R oneshowtools:oneshowtools "$APP_DIR"
systemctl restart "$SERVICE_NAME"

for _ in $(seq 1 30); do
  curl -fsS --max-time 5 "$HEALTH_URL" | grep -q '"ok":true' && {
    trap - ERR
    rm -rf -- "$PREVIOUS_MODULES" "$WORK_DIR" "$CURRENT_SNAPSHOT"
    echo "Rolled back to $RELEASE_ID"
    exit 0
  }
  sleep 2
done
echo "Rollback health check failed" >&2
restore_current
exit 1
