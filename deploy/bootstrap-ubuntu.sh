#!/usr/bin/env bash
set -Eeuo pipefail

# Run once as root on a fresh Ubuntu 24.04 server. This prepares the same paths
# used by production without writing application secrets or replacing an
# existing OneShowTools installation.
[[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo "Run as root" >&2; exit 1; }

APP_ROOT="${DEPLOY_APP_ROOT:-/var/www/oneshowtools}"
NODE_VERSION="${DEPLOY_NODE_VERSION:-22.23.2}"
NODE_ROOT="${DEPLOY_NODE_ROOT:-/opt/node-v22}"
ENV_DIR="/etc/oneshowtools"
SOURCE_DIR="${DEPLOY_SOURCE_DIR:-}"
DOMAIN="${DEPLOY_DOMAIN:-oneshowtools.com}"
LETSENCRYPT_EMAIL="${DEPLOY_LETSENCRYPT_EMAIL:-}"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl nginx rsync xz-utils certbot python3-certbot-nginx fontconfig fonts-noto-cjk

if ! id oneshowtools >/dev/null 2>&1; then
  useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin oneshowtools
fi
install -d -o oneshowtools -g oneshowtools "$APP_ROOT/app/data" "$APP_ROOT/releases" "$APP_ROOT/incoming"
install -d -m 0750 -o root -g oneshowtools "$ENV_DIR"

if [[ ! -x "$NODE_ROOT/bin/node" ]]; then
  case "$(uname -m)" in
    x86_64) node_arch=x64 ;;
    aarch64|arm64) node_arch=arm64 ;;
    *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  temp_dir="$(mktemp -d)"
  trap 'rm -rf "$temp_dir"' EXIT
  curl -fsSLO --output-dir "$temp_dir" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$node_arch.tar.xz"
  curl -fsSLO --output-dir "$temp_dir" "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt"
  (cd "$temp_dir" && grep " node-v$NODE_VERSION-linux-$node_arch.tar.xz\$" SHASUMS256.txt | sha256sum -c -)
  mkdir -p "$NODE_ROOT"
  tar -xJf "$temp_dir/node-v$NODE_VERSION-linux-$node_arch.tar.xz" --strip-components=1 -C "$NODE_ROOT"
fi

if [[ -n "$SOURCE_DIR" ]]; then
  [[ -f "$SOURCE_DIR/.production.env" ]] || { echo "Missing uploaded production environment" >&2; exit 1; }
  [[ -f "$SOURCE_DIR/deploy/systemd/oneshowtools.service" ]] || { echo "Missing systemd template" >&2; exit 1; }
  [[ -f "$SOURCE_DIR/deploy/nginx/oneshowtools.conf" ]] || { echo "Missing Nginx template" >&2; exit 1; }
  [[ -n "$LETSENCRYPT_EMAIL" ]] || { echo "DEPLOY_LETSENCRYPT_EMAIL is required" >&2; exit 1; }

  install -m 0640 -o root -g oneshowtools "$SOURCE_DIR/.production.env" "$ENV_DIR/oneshowtools.env"
  rm -f -- "$SOURCE_DIR/.production.env"

  sed \
    -e "s#/var/www/oneshowtools#$APP_ROOT#g" \
    -e "s#/opt/node-v22#$NODE_ROOT#g" \
    "$SOURCE_DIR/deploy/systemd/oneshowtools.service" > /etc/systemd/system/oneshowtools.service
  systemctl daemon-reload
  systemctl enable oneshowtools

  install -d -m 0755 /var/www/html/.well-known/acme-challenge
  cat > /etc/nginx/sites-available/oneshowtools.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 503; }
}
EOF
  ln -sfn /etc/nginx/sites-available/oneshowtools.conf /etc/nginx/sites-enabled/oneshowtools.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    certbot certonly --webroot -w /var/www/html \
      --non-interactive --agree-tos --email "$LETSENCRYPT_EMAIL" \
      -d "$DOMAIN" -d "www.$DOMAIN"
  fi

  # A certificate issued through the webroot plugin does not always install
  # Certbot's shared Nginx TLS snippets on a fresh Ubuntu host. Install the
  # packaged defaults before enabling the production virtual host.
  if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
    install -m 0644 \
      /usr/lib/python3/dist-packages/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
      /etc/letsencrypt/options-ssl-nginx.conf
  fi
  if [[ ! -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
    install -m 0644 /usr/lib/python3/dist-packages/certbot/ssl-dhparams.pem \
      /etc/letsencrypt/ssl-dhparams.pem
  fi

  sed "s/oneshowtools\.com/$DOMAIN/g" \
    "$SOURCE_DIR/deploy/nginx/oneshowtools.conf" > /etc/nginx/sites-available/oneshowtools.conf
  nginx -t
  systemctl reload nginx
fi

echo "Bootstrap complete."
