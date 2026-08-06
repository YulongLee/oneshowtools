#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$1"
STAGE="$2"
RELEASE_ID="$3"
SERVICE_NAME="$4"
NODE_ROOT="$5"
HEALTH_URL="$6"
KEEP_RELEASES="$7"
KEEP_DB_BACKUPS="$8"
APP_DIR="$APP_ROOT/app"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_ID"
PREVIOUS_MODULES="$APP_ROOT/incoming/.previous-node-modules-$RELEASE_ID"

export PATH="$NODE_ROOT/bin:$PATH"
mkdir -p "$APP_DIR" "$RELEASE_DIR/app" "$APP_ROOT/releases" "$APP_ROOT/incoming"

if [[ -d "$APP_DIR/data" && -f "$APP_DIR/data/oneshowtools.sqlite" ]]; then
  (cd "$APP_DIR" && npm run db:backup)
fi

rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='data/' \
  --exclude='.env' \
  "$APP_DIR/" "$RELEASE_DIR/app/"

cat > "$RELEASE_DIR/release.json" <<EOF
{"release":"$RELEASE_ID","createdAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF

rollback() {
  trap - ERR
  echo "Deployment failed; restoring $RELEASE_ID snapshot." >&2
  systemctl stop "$SERVICE_NAME" || true
  rm -rf -- "$APP_DIR/node_modules"
  if [[ -d "$PREVIOUS_MODULES" ]]; then
    mv "$PREVIOUS_MODULES" "$APP_DIR/node_modules"
  fi
  rsync -a --delete \
    --exclude='node_modules/' \
    --exclude='data/' \
    --exclude='.env' \
    "$RELEASE_DIR/app/" "$APP_DIR/"
  chown -R oneshowtools:oneshowtools "$APP_DIR"
  systemctl restart "$SERVICE_NAME"
}
trap rollback ERR

systemctl stop "$SERVICE_NAME"
if [[ -d "$APP_DIR/node_modules" ]]; then
  rm -rf -- "$PREVIOUS_MODULES"
  mv "$APP_DIR/node_modules" "$PREVIOUS_MODULES"
fi
rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='data/' \
  --exclude='.env' \
  "$STAGE/" "$APP_DIR/"
mv "$STAGE/node_modules" "$APP_DIR/node_modules"
(cd "$APP_DIR" && npm run db:check)
chown -R oneshowtools:oneshowtools "$APP_DIR"
systemctl restart "$SERVICE_NAME"

healthy=false
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "$HEALTH_URL" | grep -q '"ok":true'; then
    healthy=true
    break
  fi
  sleep 2
done
[[ "$healthy" == "true" ]]
trap - ERR

rm -rf -- "$PREVIOUS_MODULES"
rm -rf -- "$STAGE"

mapfile -t old_releases < <(find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | awk -v keep="$KEEP_RELEASES" 'NR > keep {sub(/^[^ ]+ /, ""); print}')
for release_path in "${old_releases[@]}"; do
  [[ "$release_path" == "$APP_ROOT/releases/"* ]] && rm -rf -- "$release_path"
done

find "$APP_ROOT/incoming" -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf -- {} +

if [[ -d "$APP_DIR/data/backups" ]]; then
  mapfile -t old_backups < <(find "$APP_DIR/data/backups" -maxdepth 1 -type f -name 'oneshowtools-*.sqlite' -printf '%T@ %p\n' | sort -rn | awk -v keep="$KEEP_DB_BACKUPS" 'NR > keep {sub(/^[^ ]+ /, ""); print}')
  for backup_path in "${old_backups[@]}"; do
    [[ "$backup_path" == "$APP_DIR/data/backups/"* ]] && rm -f -- "$backup_path"
  done
fi

systemctl is-active --quiet "$SERVICE_NAME"
