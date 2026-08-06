#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
[[ -f .deploy.env ]] && source .deploy.env

DEPLOY_HOST="${DEPLOY_HOST:-47.84.65.103}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_oneshowtools_server}"
DEPLOY_APP_ROOT="${DEPLOY_APP_ROOT:-/var/www/oneshowtools}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-oneshowtools}"
DEPLOY_NODE_ROOT="${DEPLOY_NODE_ROOT:-/opt/node-v22}"
DEPLOY_HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:8787/api/health}"
RELEASE_ID="${1:-}"

[[ -n "$RELEASE_ID" ]] || {
  echo "Usage: npm run deploy:rollback -- <release-id>" >&2
  exit 1
}
[[ "$RELEASE_ID" =~ ^[A-Za-z0-9._:-]+$ ]] || { echo "Invalid release id" >&2; exit 1; }

ssh -i "$DEPLOY_SSH_KEY" -p "$DEPLOY_PORT" -o BatchMode=yes -o ConnectTimeout=15 \
  "$DEPLOY_USER@$DEPLOY_HOST" bash -s -- \
  "$DEPLOY_APP_ROOT" "$RELEASE_ID" "$DEPLOY_SERVICE" "$DEPLOY_NODE_ROOT" \
  "$DEPLOY_HEALTH_URL" < "$SCRIPT_DIR/remote-rollback.sh"

