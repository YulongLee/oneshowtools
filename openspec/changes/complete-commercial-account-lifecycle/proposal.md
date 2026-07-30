## Why

The production site currently supports basic email/password session creation,
but it does not yet provide a commercially safe account lifecycle. Registration
immediately creates a session without verifying email ownership, duplicate
registration reveals account existence, recovery and account-control flows are
missing, Google and billing providers are disabled in production, and payment
events cannot yet reconcile subscriptions or purchased credits.

OneShowTools must close these gaps before paid acquisition or live checkout is
enabled, because identity, account recovery, privacy controls, subscription
ownership, and credit balances are platform-wide responsibilities shared by
every current and future AI tool.

## What Changes

- Replace immediate-login email registration with generic, email-verification-
  required registration, verification resend, expiry, single-use callbacks, and
  localized success and failure states.
- Add enumeration-resistant sign-in and recovery behavior, password reset,
  password change, email change with re-verification, and security-event rate
  limits.
- Add secure session management with session listing, current/other-session
  revocation, credential-change revocation, account-state enforcement, CSRF and
  origin protection, and auditable security events.
- Complete Google OAuth using verified identities, explicit provider-account
  records, safe linking rules, callback replay protection, and production
  configuration checks.
- Expand Account Center so users can edit profile and locale, manage security,
  export their platform data, request account deletion, and view subscription,
  invoices, credit balance, and immutable credit history.
- Complete the commercial payment boundary needed by account management:
  verified Stripe webhooks, idempotent subscription and top-up reconciliation,
  Customer Portal access, payment recovery states, refunds and disputes, and
  credit-ledger compensation.
- Add launch gates so registration, Google authentication, checkout, and account
  deletion can be independently enabled only when required providers, secrets,
  migrations, monitoring, support policy, and legal copy are ready.
- Add bilingual end-to-end and security tests for the complete account and
  payment lifecycle, plus production smoke tests and rollback evidence.
- **Non-goals:** organization/team accounts, enterprise SSO, MFA/passkeys,
  additional social providers, mainland-China payment methods, tax
  registration automation, tool-specific pricing, or moving tool-owned inputs
  and outputs into the platform account record.
- **Backward compatibility:** public tool discovery and existing tool routes
  remain available. Existing users and sessions are migrated without deleting
  balances or history, but unverified legacy email accounts must verify their
  address before beginning new paid activity or changing sensitive account
  data. Tool integration contracts remain versioned and do not receive payment
  credentials or raw session cookies.

## Capabilities

### New Capabilities

- `commercial-account-lifecycle`: Verified registration, recovery, profile and
  credential changes, session control, account export/deletion, account-state
  enforcement, and authentication abuse protection.
- `account-billing-management`: Customer-visible subscription, invoice, payment
  recovery, top-up, refund, dispute, and immutable credit-history behavior,
  backed by verified provider reconciliation.
- `commercial-release-gates`: Provider configuration, feature flags,
  observability, security checks, privacy/support prerequisites, smoke tests,
  and rollback requirements that must pass before commercial features are
  enabled.

### Modified Capabilities

- `platform-shell`: Replace the current minimal profile card and modal-only
  authentication states with complete bilingual verification, recovery,
  security, privacy, billing, and account-management experiences.

## Impact

- **Ownership:** platform-level change owned by OneShowTools, not by any
  individual AI tool.
- **Affected code and data:** React authentication/account/billing UI, API
  middleware and routes, session and security utilities, email delivery,
  database migrations, users/provider accounts/verifications/sessions,
  subscriptions/webhook receipts/ledger entries, audit events, deployment
  configuration, tests, and operational documentation.
- **Affected tools/contracts:** all tools continue to rely on the platform user,
  entitlement, and credit source of truth. Existing tool routes remain
  compatible; the versioned tool entitlement contract gains no payment data and
  continues to use opaque user identifiers.
- **Security and privacy:** passwords and tokens remain hashed or single-use;
  cookies are HTTP-only, Secure in production, and protected by same-origin/CSRF
  checks; auth endpoints are rate-limited; data export and deletion are
  auditable; logs must not contain secrets or raw credentials.
- **Quota and billing:** purchased and subscription credits are granted only
  after verified, idempotent webhook reconciliation. Refunds and disputes append
  compensating ledger entries rather than rewriting balances.
- **External dependencies:** transactional email provider and verified sending
  domain, Google OAuth credentials and consent screen, Stripe test/live
  products and webhook endpoint, production secret storage, monitoring/alerting,
  and approved privacy/refund/retention policies.
