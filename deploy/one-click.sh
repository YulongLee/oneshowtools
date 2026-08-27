#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -f .deploy.env ]]; then
  # shellcheck disable=SC1091
  source .deploy.env
fi

DEPLOY_HOST="${DEPLOY_HOST:-47.84.65.103}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_oneshowtools_server}"
DEPLOY_APP_ROOT="${DEPLOY_APP_ROOT:-/var/www/oneshowtools}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-oneshowtools}"
DEPLOY_NODE_ROOT="${DEPLOY_NODE_ROOT:-/opt/node-v22}"
DEPLOY_HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:8787/api/health}"
DEPLOY_KEEP_RELEASES="${DEPLOY_KEEP_RELEASES:-3}"
DEPLOY_KEEP_DB_BACKUPS="${DEPLOY_KEEP_DB_BACKUPS:-3}"
DEPLOY_SKIP_LOCAL_VERIFY="${DEPLOY_SKIP_LOCAL_VERIFY:-false}"
DEPLOY_BOOTSTRAP="${DEPLOY_BOOTSTRAP:-false}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-oneshowtools.com}"
DEPLOY_LETSENCRYPT_EMAIL="${DEPLOY_LETSENCRYPT_EMAIL:-}"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-}"

for command_name in git npm rsync ssh; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 1
  }
done

[[ -f "$DEPLOY_SSH_KEY" ]] || {
  echo "SSH key not found: $DEPLOY_SSH_KEY" >&2
  echo "Copy deploy/deploy.env.example to .deploy.env and set DEPLOY_SSH_KEY." >&2
  exit 1
}

[[ "$DEPLOY_KEEP_RELEASES" =~ ^[1-9][0-9]*$ ]] || { echo "DEPLOY_KEEP_RELEASES must be positive" >&2; exit 1; }
[[ "$DEPLOY_KEEP_DB_BACKUPS" =~ ^[1-9][0-9]*$ ]] || { echo "DEPLOY_KEEP_DB_BACKUPS must be positive" >&2; exit 1; }
[[ "$DEPLOY_APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo "Invalid DEPLOY_APP_ROOT" >&2; exit 1; }
[[ "$DEPLOY_NODE_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo "Invalid DEPLOY_NODE_ROOT" >&2; exit 1; }
[[ "$DEPLOY_SERVICE" =~ ^[A-Za-z0-9_.@-]+$ ]] || { echo "Invalid DEPLOY_SERVICE" >&2; exit 1; }
[[ "$DEPLOY_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "Invalid DEPLOY_DOMAIN" >&2; exit 1; }

if [[ "${DEPLOY_ALLOW_DIRTY:-false}" != "true" ]] && [[ -n "$(git status --porcelain)" ]]; then
  echo "The Git working tree is not clean. Commit the release before deploying." >&2
  exit 1
fi

if [[ "$DEPLOY_SKIP_LOCAL_VERIFY" != "true" ]]; then
  npm run build
  npm test
  npm run db:check
fi

GIT_SHA="$(git rev-parse --short=12 HEAD)"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$GIT_SHA"
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH=(ssh -i "$DEPLOY_SSH_KEY" -p "$DEPLOY_PORT" -o BatchMode=yes -o ConnectTimeout=15)
RSYNC_SSH="ssh -i $DEPLOY_SSH_KEY -p $DEPLOY_PORT -o BatchMode=yes -o ConnectTimeout=15"
REMOTE_STAGE="$DEPLOY_APP_ROOT/incoming/$RELEASE_ID"

echo "Preparing release $RELEASE_ID"
if [[ "$DEPLOY_BOOTSTRAP" == "true" ]]; then
  [[ "$DEPLOY_USER" == "root" ]] || { echo "Fresh-server bootstrap requires DEPLOY_USER=root" >&2; exit 1; }
  [[ "$DEPLOY_LETSENCRYPT_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ ]] || { echo "Invalid DEPLOY_LETSENCRYPT_EMAIL" >&2; exit 1; }
  [[ -f "$DEPLOY_ENV_FILE" ]] || { echo "DEPLOY_ENV_FILE not found: $DEPLOY_ENV_FILE" >&2; exit 1; }
  "${SSH[@]}" "$REMOTE" "apt-get update >/dev/null && DEBIAN_FRONTEND=noninteractive apt-get install -y rsync >/dev/null"
fi
"${SSH[@]}" "$REMOTE" "mkdir -p '$REMOTE_STAGE' '$DEPLOY_APP_ROOT/releases'"

rsync -az --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.deploy.env' \
  --exclude='node_modules/' \
  --exclude='data/' \
  --exclude='dist/' \
  --exclude='apps/' \
  --exclude='packages/' \
  --exclude='qa/' \
  --exclude='artifacts/' \
  --exclude='qa-*' \
  --exclude='*.log' \
  -e "$RSYNC_SSH" ./ "$REMOTE:$REMOTE_STAGE/"

if [[ "$DEPLOY_BOOTSTRAP" == "true" ]]; then
  rsync -az -e "$RSYNC_SSH" "$DEPLOY_ENV_FILE" "$REMOTE:$REMOTE_STAGE/.production.env"
  "${SSH[@]}" "$REMOTE" "chmod 600 '$REMOTE_STAGE/.production.env'"
  "${SSH[@]}" "$REMOTE" \
    "DEPLOY_APP_ROOT='$DEPLOY_APP_ROOT' DEPLOY_NODE_ROOT='$DEPLOY_NODE_ROOT' DEPLOY_SOURCE_DIR='$REMOTE_STAGE' DEPLOY_DOMAIN='$DEPLOY_DOMAIN' DEPLOY_LETSENCRYPT_EMAIL='$DEPLOY_LETSENCRYPT_EMAIL' bash '$REMOTE_STAGE/deploy/bootstrap-ubuntu.sh'"
fi

"${SSH[@]}" "$REMOTE" \
  "export PATH='$DEPLOY_NODE_ROOT/bin':\$PATH; cd '$REMOTE_STAGE'; npm ci --no-audit --no-fund; npm run build; npm run db:check"

"${SSH[@]}" "$REMOTE" bash -s -- \
  "$DEPLOY_APP_ROOT" "$REMOTE_STAGE" "$RELEASE_ID" "$DEPLOY_SERVICE" \
  "$DEPLOY_NODE_ROOT" "$DEPLOY_HEALTH_URL" "$DEPLOY_KEEP_RELEASES" \
  "$DEPLOY_KEEP_DB_BACKUPS" < "$SCRIPT_DIR/remote-release.sh"

echo "Release $RELEASE_ID is healthy and active."
