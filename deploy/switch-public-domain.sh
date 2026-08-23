#!/usr/bin/env bash
set -Eeuo pipefail

# Run as root on the OneShowTools server after the target domain's apex and
# www records point at the server. Existing virtual hosts are left untouched,
# so switching back only requires running this script with the original domain.

[[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo "Run as root" >&2; exit 1; }

DOMAIN="${1:-}"
CANONICAL_HOST="${2:-www.$DOMAIN}"
APP_ENV_FILE="${APP_ENV_FILE:-/etc/oneshowtools/oneshowtools.env}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/oneshowtools-testing.conf}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/oneshowtools-testing.conf}"
ACME_ROOT="${ACME_ROOT:-/var/www/html}"

[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "Invalid domain" >&2; exit 1; }
[[ "$CANONICAL_HOST" == "$DOMAIN" || "$CANONICAL_HOST" == "www.$DOMAIN" ]] || {
  echo "Canonical host must be $DOMAIN or www.$DOMAIN" >&2
  exit 1
}
[[ -f "$APP_ENV_FILE" ]] || { echo "Missing environment file: $APP_ENV_FILE" >&2; exit 1; }

NON_CANONICAL_HOST="$DOMAIN"
if [[ "$CANONICAL_HOST" == "$DOMAIN" ]]; then
  NON_CANONICAL_HOST="www.$DOMAIN"
fi

install -d -m 0755 "$ACME_ROOT/.well-known/acme-challenge"

# First expose only the ACME challenge and an HTTP redirect. This allows a new
# certificate to be issued without changing or disabling the current domain.
cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root $ACME_ROOT;
    }

    location / {
        return 301 https://$CANONICAL_HOST\$request_uri;
    }
}
EOF

ln -sfn "$NGINX_SITE" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx

if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  certbot certonly --webroot -w "$ACME_ROOT" \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --cert-name "$DOMAIN" -d "$DOMAIN" -d "www.$DOMAIN"
fi

cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root $ACME_ROOT;
    }

    location / {
        return 301 https://$CANONICAL_HOST\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $NON_CANONICAL_HOST;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 308 https://$CANONICAL_HOST\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $CANONICAL_HOST;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 240s;
        proxy_send_timeout 240s;
        client_max_body_size 55m;
    }

    location ^~ /assets/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)\$ {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host \$host;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy "microphone=(self), camera=(), geolocation=(), payment=(), usb=()" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'" always;
}
EOF

nginx -t
systemctl reload nginx

APP_URL="https://$CANONICAL_HOST"
if grep -q '^APP_URL=' "$APP_ENV_FILE"; then
  sed -i "s#^APP_URL=.*#APP_URL=$APP_URL#" "$APP_ENV_FILE"
else
  printf '\nAPP_URL=%s\n' "$APP_URL" >> "$APP_ENV_FILE"
fi

systemctl restart oneshowtools
systemctl is-active --quiet oneshowtools

health_ready=false
for _attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:8787/api/health >/dev/null 2>&1; then
    health_ready=true
    break
  fi
  sleep 1
done
[[ "$health_ready" == "true" ]] || { echo "Application health check failed" >&2; exit 1; }

echo "OneShowTools public URL is now $APP_URL"
