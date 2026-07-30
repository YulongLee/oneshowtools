# OneShowTools Commercial Operations

## Release gates

Commercial features are independently disabled unless their explicit flag and
required provider configuration are present:

| Capability | Flag | Required configuration |
| --- | --- | --- |
| Email registration | `REGISTRATION_ENABLED=true` | `EMAIL_API_KEY`, `EMAIL_FROM`, HTTPS `APP_URL` |
| Google sign-in | `GOOGLE_AUTH_ENABLED=true` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Stripe billing | `BILLING_ENABLED=true` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` |
| Account deletion | `ACCOUNT_DELETION_ENABLED=true` | approved retention and deletion policy |

Public tool discovery and existing authenticated free use remain available when
commercial features are disabled.

## Email

1. Verify the sending domain with the selected transactional email provider.
2. Configure the API URL, key, and From address in the server-only environment.
3. Test Chinese and English verification and reset messages.
4. Monitor delivery failures and bounces without logging tokens.
5. Rotate the provider key if it is exposed and invalidate active account tokens.

`ALLOW_DEV_EMAIL_DELIVERY=true` writes messages to the local database outbox and
must never be enabled with an HTTPS production `APP_URL`.

## Google OAuth

Configure the production callback as:

`https://oneshowtools.com/api/auth/google/callback`

The consent screen and verified domain must match OneShowTools. Test new-user,
existing verified-email linking, cancellation, invalid state, replay, suspended
account, and provider outage behavior before enabling the flag.

## Stripe

1. Create approved test and live products/prices.
2. Configure the webhook endpoint:
   `https://oneshowtools.com/api/billing/webhook`.
3. Subscribe to checkout, customer subscription, invoice, refund, reversal, and
   dispute events required by the reconciliation policy.
4. Verify duplicate, delayed, and out-of-order delivery in test mode.
5. Confirm Customer Portal invoice, payment-method, and cancellation behavior.
6. Enable live billing only after refund, dispute, grace-period, credit-expiry,
   and negative-balance policies are approved.

Browser checkout returns are informational. Only verified webhook reconciliation
changes subscriptions or credits.

## Backup, deployment, and rollback

Before every schema or commercial release:

1. Run `npm run db:backup` against the production data directory.
2. Record user, ownership, and total-credit invariants from its output.
3. Deploy additive migrations with all new feature flags disabled.
4. Run `npm test`, `npm run db:check`, health checks, and production smoke tests.
5. Enable one approved feature at a time.

Rollback disables registration, Google, billing, account deletion, and new paid
credit reservations. Never delete users, webhook receipts, subscriptions,
ledger entries, or audit records during rollback.

## Incident handling

- Revoke exposed provider credentials and sessions.
- Disable the affected feature flag.
- Preserve database, webhook, ledger, and audit evidence.
- Reconcile provider events by their immutable event IDs.
- Notify affected users according to the approved incident and privacy policy.

## Pending business approvals

Live billing and account deletion must remain disabled until the business records:

- legal entity and launch countries;
- currencies and tax treatment;
- subscription prices, top-up packages, recurring credits, and expiry policy;
- grace period, refund, dispute, and negative-balance policy;
- privacy policy, retention schedule, deletion/anonymization rules;
- support contact and response process.
