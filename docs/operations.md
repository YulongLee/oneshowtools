# OneShowTools account and billing operations

## Environments

Keep development, test, and production databases and provider accounts
separate. Copy `.env.example` locally and supply secrets through the hosting
platform in deployed environments. Never commit `.env` files or provider
credentials.

Registration requires a 32+ character Better Auth secret, an email API key,
and a verified sender. Billing is disabled by default. Enable it only after
Stripe test products, price mappings, webhook signing secret, Customer Portal,
support procedures, and legal review are complete.

Google sign-in is independently controlled by `GOOGLE_AUTH_ENABLED`. Create a
Google OAuth web client and configure these exact callback URLs:

- Local: `http://localhost:5173/api/auth/callback/google`
- Production: `https://oneshowtools.com/api/auth/callback/google`

Store the Client ID and Client Secret as hosted secrets. Google account linking
is allowed only when the provider returns the same verified email; accounts
with different emails are never merged automatically.

## Database

Apply `db/migrations/0001_global_auth_and_billing.sql`, then `db/seed.sql`.
Run `npm run db:check` before release. The matching `.down.sql` is for local or
pre-release rollback only; never erase production financial history. A
production rollback disables registration, billing checkout, and new tool
reservations while retaining all rows for reconciliation.

## Email support

Monitor delivery failures, bounces, verification resend volume, recovery
volume, and authentication rate-limit events. Support must never ask for a
password or verification/reset token. Generic public responses are intentional
and prevent account discovery.

## Billing support and reconciliation

The browser success page is informational. Only verified Stripe webhooks may
change subscription or credit state. Investigate by provider event ID,
customer/subscription ID, internal user ID, and correlation ID. Never paste card
data into logs or support tickets.

Refunds, disputes, expiries, and corrections append compensating ledger
entries; they never update or delete historical entries. If reconciliation
creates a deficit, block further paid usage and escalate for support review.

## New tool onboarding

Create a stable tool ID and one random credential, store only its salted hash,
and grant the smallest operation list required. Integrate
`docs/tool-contract-v1.md`, verify retry behavior, rotate the credential before
production, and confirm that tool inputs/outputs remain outside OneShowTools.

## Live-release gate

Do not enable live payments until launch countries, legal entity, supported
currencies, taxes, privacy/retention, account export/deletion, refund terms,
subscription cancellation policy, support ownership, monitoring, and recovery
procedures have written approval.

## Ubuntu deployment

The production Node process serves both the compiled frontend and `/api`
endpoints on `127.0.0.1:8787`. Nginx terminates HTTP/HTTPS and proxies the
domain to that process.

- Application directory: `/var/www/oneshowtools/app`
- Persistent data: `/var/www/oneshowtools/app/data`
- Environment file: `/etc/oneshowtools/oneshowtools.env`
- Service: `oneshowtools.service`
- Nginx site: `/etc/nginx/sites-available/oneshowtools.conf`

The application and data directory are owned by the unprivileged
`oneshowtools` system user. Deployments must preserve `data/`, install
production dependencies, build the frontend, restart the service, and verify
`/api/health` before switching traffic.
