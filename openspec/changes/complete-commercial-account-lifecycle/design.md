## Context

The deployed Node/SQLite service currently has real persistence and hashed
cookie sessions, but its commercial account lifecycle is incomplete:

- `POST /api/auth/register` returns a session immediately, even though the new
  database user defaults to `email_verified = 0`.
- Duplicate registration returns `EMAIL_ALREADY_REGISTERED`, exposing whether
  an address has an account.
- Login does not require email verification.
- Verification, resend, password recovery, password change, email change,
  session listing/revocation, export, deletion, CSRF/origin checks, and auth rate
  limits are absent.
- Google OAuth code exists, but production credentials are not configured and
  provider identities are not stored separately.
- Stripe Checkout creation exists, but production billing is disabled and there
  is no webhook, Customer Portal, top-up, invoice, refund, dispute, or
  reconciliation implementation.
- The current `credit_ledger` records welcome grants and tool charges, but does
  not yet provide a complete payment-derived immutable ledger lifecycle.

Existing users, task/file metadata, sessions, and credits must be preserved.
OneShowTools is the source of truth for identity, entitlements, and credits.
Individual tools remain the source of truth for their prompts, models, inputs,
outputs, and inference workflows.

## Goals / Non-Goals

**Goals:**

- Make email and Google authentication safe for a public commercial service.
- Give customers complete bilingual profile, security, privacy, subscription,
  invoice, and credit controls.
- Reconcile Stripe events into normalized platform subscription and ledger
  state without trusting browser redirects.
- Preserve existing accounts, balances, public discovery, and tool routes.
- Establish feature gates and recorded acceptance evidence before enabling live
  registration or payment.

**Non-Goals:**

- Teams, organizations, enterprise SSO, MFA/passkeys, or additional social
  providers.
- Mainland-China payment methods or automated tax/legal registration.
- Tool-specific pricing or moving tool-owned AI workflows into the platform.
- A custom card-entry surface or storage of sensitive payment credentials.

## Decisions

### 1. Use the maintained authentication framework already declared by the project

The platform will integrate Better Auth through a repository adapter backed by
the production SQLite database, rather than extending the current hand-written
session code. The adapter boundary will keep the domain model portable to
PostgreSQL.

Better Auth will own credential verification, verification/reset tokens,
provider accounts, and session lifecycle. OneShowTools middleware will still
enforce platform account states, commercial release gates, audit policy, and
user-scoped authorization.

**Alternative considered:** hardening the custom scrypt/session implementation
would avoid migration work, but would require maintaining verification,
recovery, OAuth linking, replay protection, and session-management security
that a maintained framework already provides.

### 2. Separate auth identity from platform profile and commercial state

Auth tables own credentials, sessions, provider accounts, and verification
tokens. Platform tables own display name, locale, account status, deletion
state, plan, subscriptions, credits, usage, and audit records. Stable opaque
user IDs join these domains.

Google linking requires a stored provider-account row and the same verified
email. The callback must validate state and identity claims; a Google callback
never implicitly overwrites a platform email or merges different users.

### 3. Introduce explicit one-time token and security-event storage

Verification and reset tokens are stored only as hashes with purpose, user,
expiry, and consumption time. Rate limits apply by normalized email hash and
network identity. Security events store action, result, correlation ID, coarse
client metadata, and timestamps, never raw passwords, tokens, OAuth codes, or
payment credentials.

All cookie-authenticated mutation routes require an allowed origin and CSRF
token. Production cookies are HTTP-only, Secure, SameSite=Lax, scoped to the
platform host, and rotated after authentication or credential changes.

### 4. Use provider adapters for email and billing

`EmailProvider` owns localized verification, reset, security-notice, export,
and deletion-notice delivery. A production provider and verified sending domain
are required before registration can be enabled.

`BillingProvider` owns hosted checkout, Customer Portal creation, raw webhook
verification, and normalized event parsing. Stripe is the first adapter.
Provider object shapes remain outside frontend and tool contracts.

### 5. Reconcile billing asynchronously and idempotently

The raw Stripe webhook route reads the unmodified request body, verifies
signature and recency, persists each provider event ID once, acknowledges
quickly, and applies normalized mutations transactionally.

Checkout returns show only pending/cancelled status. Subscription entitlement,
periodic grants, top-ups, refunds, reversals, and disputes are derived from
verified events. Every balance change appends an immutable ledger entry with a
unique idempotency identity; balances are never overwritten.

### 6. Keep account operations same-origin and user-scoped

The frontend uses versioned same-origin endpoints for:

- registration, verification, resend, sign-in, recovery, reset, Google start
  and callback, and sign-out;
- profile and locale updates, password/email changes, session listing and
  revocation;
- export request/status/download and deletion request/confirmation/cancellation;
- commercial summary, checkout, portal creation, invoices, and ledger history.

Authorization resolves user identity from the server session on every request.
Tool service credentials and versioned entitlement APIs remain separate; tools
never receive browser cookies, password data, provider tokens, or full billing
history.

### 7. Migrate legacy accounts without destroying access or balances

Existing users retain their opaque IDs, tasks, files, subscriptions, audit
history, and `credit_ledger` amounts. Migration adds framework identity/session,
provider-account, verification, security, webhook, export, and deletion tables.

Existing password hashes are either supported by a one-time compatibility
verifier and rehashed after successful login, or migrated through password
reset. Existing unverified email users may continue limited free access during
the transition, but must verify before checkout, credential changes, export,
deletion, or new paid usage. Existing sessions receive a bounded migration
window and are then revoked.

### 8. Gate commercial capabilities independently

Registration, Google sign-in, Stripe checkout, and destructive account actions
have separate flags. Startup configuration validates provider secrets,
production HTTPS, cookie settings, migrations, webhook secret, price mappings,
and callback URLs.

No live flag is enabled until bilingual end-to-end, authorization, session,
abuse, provider test-mode, webhook replay, ledger concurrency, migration,
accessibility, privacy, support, and rollback checks have recorded passing
evidence.

## Data Ownership and Source of Truth

- **OneShowTools:** user ID, authentication linkages, profile, locale, account
  state, sessions, subscriptions, entitlements, credits, platform usage, export
  and deletion state, security and audit events.
- **Email provider:** delivery execution and delivery telemetry only.
- **Google:** external identity assertion only; it does not own platform
  entitlement or profile truth.
- **Stripe:** payment execution and sensitive payment credentials; the platform
  stores only identifiers and normalized reconciliation state.
- **Individual AI tools:** tool inputs, outputs, prompts, models, and inference
  history. They consume only the versioned minimal entitlement contract.

## Risks / Trade-offs

- **Legacy password/session incompatibility** → add a bounded compatibility
  login path, rehash on success, test migration copies, and revoke remaining
  legacy sessions after the announced window.
- **Email delivery blocks account access** → configure a verified provider,
  monitor bounces, provide rate-limited resend, and keep generic responses.
- **OAuth account takeover through unsafe linking** → require verified matching
  email, explicit provider rows, full callback claim validation, and security
  notifications.
- **Webhook duplication or reordering corrupts commercial state** → persist
  event IDs, normalize events, use unique mutation keys and transactions, and
  run provider-to-platform reconciliation jobs.
- **Refund creates a negative balance** → append a compensating deficit,
  preserve history, block additional paid usage under policy, and alert support.
- **Account deletion conflicts with financial retention** → separate access
  revocation from deletion/anonymization and document retained categories and
  deadlines in policy and export output.
- **SQLite contention grows with commercial usage** → use short transactions,
  WAL and invariant tests, monitor lock latency, and define a PostgreSQL
  migration threshold.

## Migration Plan

1. Back up the production database and uploads, record schema and balance
   invariants, and deploy additive migrations with all new flags disabled.
2. Add provider adapters, configuration validation, security middleware,
   framework auth tables, and legacy compatibility without changing public UX.
3. Deploy bilingual verification, recovery, profile, security, export, deletion,
   and Account Center UI behind flags.
4. Configure and verify transactional email and Google in a staging/test
   environment; run callback, replay, enumeration, expiry, and revocation tests.
5. Configure Stripe test products, prices, webhook, and portal; reconcile
   subscription, top-up, duplicate, delayed, refund, dispute, and failure cases.
6. Migrate legacy identities and sessions, verify every user balance and
   ownership relation, then enable email verification for new registration.
7. Enable Google, checkout, and destructive account controls independently only
   after their acceptance gates pass.
8. Run production smoke tests with synthetic accounts and test-mode payments,
   verify monitoring, record rollback evidence, and then deliberately enable
   approved live capabilities.

Rollback disables new registration, Google sign-in, checkout, and new credit
reservations while leaving public discovery available. It does not delete
users, provider events, subscriptions, ledger entries, or audit records.

## Open Questions

- Which transactional email provider and verified sending domain will be used?
- What legal entity, launch countries, currencies, tax treatment, refund policy,
  privacy policy, retention periods, and support contact apply?
- What are the approved subscription prices, recurring credits, top-up
  packages, expiry policy, grace period, and negative-balance policy?
- Should legacy unverified users retain limited free tool access until they
  verify, or should all protected access require verification immediately?
- What retention obligations apply to tasks and uploaded files after account
  deletion?
