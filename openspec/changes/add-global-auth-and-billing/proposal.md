## Why

OneShowTools needs a real shared account layer before multiple AI tools can
reliably share users, permissions, usage records, and paid entitlements. The
platform also needs Chinese and English support plus an international-ready
billing foundation so it can serve users from overseas without rebuilding
identity and monetization inside every tool.

## What Changes

- Add email-based registration and sign-in with email verification, password
  reset, secure sessions, sign-out, and basic account state handling.
- Add Google OAuth sign-in alongside email registration, with verified-email
  account linking and the same platform-owned session lifecycle.
- Add Simplified Chinese and English interfaces with a user-selectable,
  persisted locale and locale-aware user-facing messages.
- Replace prototype quota data with a platform-owned credit ledger.
- Add subscription plans and one-time credit top-ups.
- Add a provider-neutral billing boundary with Stripe as the first planned
  international payment provider, including hosted checkout, customer account
  management, webhook reconciliation, refunds, and idempotency.
- Define a versioned platform-to-tool entitlement contract so individual tools
  can verify access and consume credits without owning authentication or
  payment data.
- Update the portal account, workspace, pricing, and quota surfaces to reflect
  real authenticated and billing states.
- Protect user and payment-related data through least-privilege access,
  verified webhook processing, auditable ledger entries, and minimal storage of
  payment data.
- Preserve anonymous access to public tool discovery. Existing prototype tools
  remain discoverable and require no immediate internal rewrite until they
  adopt the shared entitlement contract.
- **Non-goals:** social providers other than Google, organization/team accounts, domestic payment
  providers, cryptocurrency payments, tax automation beyond provider-supported
  collection, and tool-specific pricing rules are deferred.
- **Backward compatibility:** the existing portal routes and public discovery
  behavior remain available; authenticated tool launches may progressively
  adopt the new versioned contract.

## Capabilities

### New Capabilities

- `user-auth`: Email registration, verification, sign-in, password recovery,
  secure sessions, sign-out, and account state behavior.
- `localization`: Simplified Chinese and English locale selection, persistence,
  fallback behavior, and locale-aware presentation.
- `billing-credits`: Subscription plans, credit top-ups, payment lifecycle,
  entitlement state, immutable credit ledger, and customer billing management.
- `tool-entitlements`: Versioned authorization and credit-consumption contract
  between OneShowTools and independently deployed AI tools.

### Modified Capabilities

- `platform-shell`: Replace prototype-only account and quota displays with real
  authentication, locale, pricing, subscription, and credit states.

## Impact

- **Platform ownership:** this is a platform-level change shared by all current
  and future AI tools; individual tools retain ownership of prompts, models,
  uploads, and inference workflows.
- **Affected code:** portal navigation, authentication screens, account
  workspace, pricing UI, locale resources, server routes, session middleware,
  data persistence, and payment webhook handling.
- **Affected contracts:** new versioned APIs for session/identity context,
  entitlement checks, usage authorization, credit reservation/consumption, and
  usage reconciliation.
- **Dependencies and systems:** transactional database, email delivery service,
  secure secret management, Stripe test/live environments, and production
  observability.
- **Security and privacy:** verified email ownership, hashed credentials,
  secure cookies, rate limiting, CSRF protections, webhook signature
  verification, payment-data minimization, account deletion/export planning,
  and auditability are required.
- **Quota and billing:** OneShowTools becomes the source of truth for plans,
  subscription status, purchased credits, grants, consumption, refunds, and
  adjustments. Payment-provider events do not directly mutate balances without
  idempotent reconciliation.
