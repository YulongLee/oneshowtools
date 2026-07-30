# OneShowTools Commercial Operations

## Release gates

Commercial features are independently disabled unless their explicit flag and
required provider configuration are present:

| Capability | Flag | Required configuration |
| --- | --- | --- |
| Email registration | `REGISTRATION_ENABLED=true` | configured SMTP or Resend provider, `EMAIL_FROM`, HTTPS `APP_URL` |
| Stripe billing | `BILLING_ENABLED=true` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` |
| Account deletion | `ACCOUNT_DELETION_ENABLED=true` | approved retention and deletion policy |
| Admin RBAC | `ADMIN_RBAC_ENABLED=true` | bootstrapped verified administrator and role migration |
| Admin MFA | `ADMIN_MFA_ENFORCED=true` | `ADMIN_MFA_ENCRYPTION_KEY`, enrolled owner, tested recovery codes |
| Alipay adapter | `ALIPAY_ENABLED=true` | approved Alipay application, signing keys, callback verification |
| WeChat Pay adapter | `WECHAT_PAY_ENABLED=true` | approved merchant account, certificates, callback verification |

Public tool discovery and existing authenticated free use remain available when
commercial features are disabled.

## Email

1. Verify the sending domain with the selected transactional email provider.
2. For Alibaba Cloud DirectMail in Hangzhou, configure
   `EMAIL_PROVIDER=smtp`, `EMAIL_SMTP_HOST=smtpdm.aliyun.com`,
   `EMAIL_SMTP_PORT=465`, `EMAIL_SMTP_SECURE=true`, the verified sender as
   `EMAIL_SMTP_USER`, its dedicated SMTP password as
   `EMAIL_SMTP_PASSWORD`, and the branded From address as `EMAIL_FROM`.
3. Keep SMTP passwords in the root-owned production environment file. Never
   commit or paste them into logs, tickets, screenshots, or source control.
4. Test Chinese and English verification and reset messages.
5. Monitor delivery failures and bounces without logging tokens.
6. Rotate the provider credential if it is exposed and invalidate active
   account tokens.

`ALLOW_DEV_EMAIL_DELIVERY=true` writes messages to the local database outbox and
must never be enabled with an HTTPS production `APP_URL`.

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

Rollback disables registration, billing, account deletion, and new paid
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

## Administrator role ownership

- `super_admin`: owner-only access to administrator identities, roles, and emergency recovery.
- `operations`: customer lifecycle, tools, jobs, and general operating health.
- `support`: customer search, session/account support, notes, and bounded credit requests.
- `finance`: commercial records, high-value credit approvals, refunds, disputes, and reconciliation.
- `tool_manager`: catalog metadata, contract readiness, publishing, maintenance, and retirement.
- `privacy`: policy consent, export, deletion, retention, and legal-hold workflows.
- `read_only`: dashboards and audit views without mutations.

Role changes, MFA recovery, high-value credits, refunds, privacy overrides, and
tool publication must carry an operator reason and immutable audit event.
