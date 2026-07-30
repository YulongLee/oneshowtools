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

OneShowTools uses verified email registration and password sign-in as its only
public authentication method. Social sign-in providers are intentionally not
enabled.

## Database

Apply migrations in numeric order through
`db/migrations/0003_commercial_admin_console.sql`, then `db/seed.sql`.
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

## Commercial administrator access

The versioned administration boundary is `/api/admin/v1` and the operator
application is `/admin`. Existing `ADMIN_EMAILS` accounts are bootstrap inputs,
not the long-term authorization source. The first successful access persists a
`super_admin` membership; all subsequent access is checked against stored roles
and permissions.

Set a unique, randomly generated `ADMIN_MFA_ENCRYPTION_KEY` in the production
environment. Enable `ADMIN_MFA_ENFORCED=true` only after the owner is ready to
enroll a TOTP authenticator and securely save the one-time recovery codes.
Never send TOTP secrets or recovery codes through email or support chat.

To add another administrator, the person first registers a normal OneShowTools
account and completes email verification. A super administrator then opens
**Access Control / 权限管理**, enters that registered email, selects the
least-privilege role needed, and records an audit reason. The new administrator
uses their own email and password; no shared administrator password is created.
Role changes and access suspension revoke active administrator sessions. An
administrator cannot change or suspend their own access, and the final active
super administrator is protected from removal.

High-risk operations require a reason, immutable audit record, and—above the
configured `ADMIN_CREDIT_APPROVAL_THRESHOLD`—a distinct finance approver.
Balances are never edited directly; corrections append ledger entries.
