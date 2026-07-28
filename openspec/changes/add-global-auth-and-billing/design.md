## Context

OneShowTools is currently a React/Vite frontend prototype with a Sites-compatible
Worker output. Authentication, persistence, email delivery, payments, and
tool-to-platform APIs do not yet exist. This change crosses the portal UI,
server runtime, data model, security boundary, transactional billing, and every
future tool integration.

The platform must remain the source of truth for users, plans, subscriptions,
credits, and usage. Independently deployed AI tools must not receive payment
credentials or own copies of balances. The first deployment is expected to run
outside mainland China and must support Chinese and English users.

## Goals / Non-Goals

**Goals:**

- Deliver verified email/password accounts and secure revocable sessions.
- Support complete Simplified Chinese and English platform experiences.
- Support recurring subscriptions and one-time credit purchases.
- Maintain an auditable, concurrency-safe platform credit ledger.
- Provide a small versioned contract that all tools can use for access and usage.
- Keep payment and email providers replaceable behind platform-owned boundaries.

**Non-Goals:**

- Social login, teams, enterprise SSO, or multi-tenant organizations.
- WeChat Pay, Alipay, cryptocurrency, or multiple live payment providers in the
  first release.
- Tool-specific pricing, prompts, inference, uploads, or model orchestration.
- A custom card-entry UI or storage of sensitive card data.
- Full tax/legal automation; launch-region obligations require separate review.

## Decisions

### 1. Extend the existing Worker into the platform API

The Sites-compatible Worker will serve the frontend and own same-origin API
routes for authentication, account data, billing-session creation, webhooks,
and tool-entitlement operations.

This keeps the initial deployment compact and avoids adding a second application
server before scale requires one. API modules must remain portable and avoid
binding domain logic directly to request handlers.

**Alternatives considered:** a separate Node service would provide a familiar
runtime but adds deployment, CORS, cookie-domain, and operations complexity
before the platform has production traffic.

### 2. Use D1 as the initial relational source of truth

The initial schema will use Cloudflare D1 for users/auth records, profiles,
plans, offers, provider mappings, subscriptions, webhook receipts, credit
ledger entries, usage reservations, and audit events.

All balance-affecting operations will be expressed as atomic database
transactions/batches with unique constraints on provider events and usage
idempotency keys. Repository interfaces will isolate domain logic so a future
move to PostgreSQL does not change public contracts.

**Alternatives considered:** browser storage cannot protect or share accounts;
provider-only subscription state cannot represent internal credits; PostgreSQL
is stronger for advanced transactional workloads but adds infrastructure that
is not yet required.

### 3. Use a maintained authentication framework

Better Auth is the planned authentication layer because it supports
email/password accounts, verification, password reset, session management,
rate limiting, Google OAuth, account linking, and database-backed operation in
a TypeScript runtime.

Configuration will require verified email before session creation, use generic
registration/recovery responses, revoke other sessions after password reset,
and apply secure HTTP-only same-site cookies. Passwords and raw tokens will
never be logged.

Google sign-in is configured as an optional provider. A Google identity may be
linked to an existing account only when the provider supplies the same verified
email. Different-email identities are not implicitly merged. Both email and
Google authentication resolve to the same platform user and session model.

**Alternatives considered:** hand-written authentication creates avoidable
credential, session, recovery, and enumeration risk; a fully hosted identity
provider simplifies operations but increases vendor coupling and can complicate
cross-tool session and pricing integration.

### 4. Separate translation resources from content data

Platform interface strings will use typed translation keys with `zh-CN` and
`en` catalogs. Tool metadata will store localized names and descriptions as
content fields. Locale resolution priority is authenticated profile, visitor
preference, browser language, then `zh-CN`.

Indexable public pages will have language-specific URLs or equivalent
server-resolved variants with language metadata and alternate-language links.
Formatting will use the platform runtime's internationalization APIs.

**Alternatives considered:** duplicating components per language would drift;
automatic machine translation at request time is unpredictable and unsuitable
for authentication, pricing, and legal copy.

### 5. Use Stripe-hosted checkout as the first payment adapter

Stripe Checkout will handle both subscription and one-time top-up payment
collection. Stripe Customer Portal will handle payment methods, invoices, and
subscription management. The platform will store provider customer,
subscription, checkout, payment, price, and event identifiers but no raw card
credentials.

The browser return from checkout is informational only. Verified webhook events
are reconciled into normalized platform subscription and ledger state.

An internal `BillingProvider` boundary will define checkout creation, portal
creation, event verification, and event normalization so another international
or domestic provider can be added later.

**Alternatives considered:** a custom Elements integration offers more visual
control but increases PCI-sensitive surface and implementation work; Payment
Links lack sufficient user and package binding for reliable automated credits.

### 6. Treat the credit ledger as financial-like immutable history

Balances are derived from immutable signed ledger amounts, including grants,
purchases, reservations, consumption, releases, expiries, refunds, and
adjustments. No endpoint directly overwrites a balance.

Each provider event and tool usage operation has a unique idempotency identity.
Reservations prevent concurrent requests from overspending. Expired
reservations are released by a scheduled reconciliation job.

### 7. Keep subscription entitlements and credits distinct

A subscription grants named plan features and can also create periodic credit
grants. One-time top-ups create separate ledger grants. Cancellation ends
recurring benefits at the effective policy boundary but does not erase valid
top-up credits. Refunds and disputes create compensating entries.

This avoids treating a provider subscription status as the user's complete
balance and allows future plans to mix features and credits safely.

### 8. Use a server-to-server tool contract

Tools authenticate with revocable service credentials. A versioned API returns
minimal user/entitlement context and supports reserve, commit, and release
operations. End-user browser cookies are not forwarded as tool credentials.

Requests include a tool-scoped idempotency key and correlation ID. Tools never
receive password hashes, payment details, the entire ledger, or unrelated
profile data.

### 9. Separate ownership of data

- OneShowTools owns user identity, locale, plans, subscriptions, credits,
  payment mappings, usage ledger, and platform audit history.
- Stripe owns sensitive payment credentials and payment execution.
- The email provider owns message delivery telemetry, not account truth.
- Individual tools own their inputs, outputs, and tool-specific history.
- Cross-system links use stable opaque identifiers rather than copied records.

## Risks / Trade-offs

- **D1 transaction or concurrency limits become insufficient** → Keep repository
  boundaries portable, load-test reservation contention, and define a
  PostgreSQL migration threshold before launch.
- **Payment events arrive late, duplicated, or out of order** → Verify
  signatures, persist every required event ID, reconcile idempotently, and run
  periodic provider-to-platform repair jobs.
- **Email delivery fails or is abused** → Use a transactional provider, queue
  sending, rate-limit attempts, monitor bounces, and allow safe resend.
- **Translation drift exposes mixed-language security or pricing copy** → Make
  locale catalogs type-checked and block release when required keys are absent.
- **Tools bypass the platform contract** → Require service authentication,
  centralize usage authorization, and audit all balance-affecting calls.
- **A refund creates a negative balance after credits were consumed** → Record a
  compensating deficit, block further paid usage according to policy, and
  expose the case for support review.
- **Stripe is unavailable in a future operating region** → Keep normalized
  billing state and provider adapters; do not expose Stripe object shapes in
  tool contracts.
- **Security scope delays delivery** → Ship in phases, but do not relax email
  verification, secure sessions, webhook verification, ledger idempotency, or
  authorization checks.

## Migration Plan

1. Add runtime bindings, migrations, secrets, local test fixtures, and
   environment separation for development, test, and production.
2. Deploy authentication tables and email flows behind a disabled registration
   flag; test verification, recovery, revocation, rate limits, and localization.
3. Enable accounts while keeping public tool discovery anonymous.
4. Deploy localized portal routes and migrate all platform copy into catalogs.
5. Create test-mode Stripe products/prices, checkout endpoints, customer portal,
   webhook processing, normalized subscription state, and ledger tables.
6. Reconcile test payments and verify duplicate, delayed, refund, dispute, and
   failed-payment cases.
7. Publish tool entitlement contract v1 and integrate one low-risk tool as the
   reference implementation.
8. Enable live subscriptions and top-ups only after production webhook,
   observability, support, privacy, refund, and regional compliance checks pass.

Rollback keeps public discovery available, disables new registration and
checkout creation, stops new tool reservations, and preserves all account,
provider-event, subscription, and ledger records for reconciliation.

## Open Questions

- Which transactional email provider and sending domain will be used?
- Which countries, currencies, tax registrations, refund terms, and legal entity
  apply to the first paid launch?
- What are the initial subscription plans, included recurring credits, top-up
  packages, expiry policy, and overdraft policy?
- Should authenticated sessions be shared across tool subdomains or should
  tools always use short-lived launch assertions plus the server contract?
- What data export, account deletion, retention, and support workflows are
  required before accepting paid users?
