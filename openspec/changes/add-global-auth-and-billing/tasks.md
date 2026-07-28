## 1. Runtime and Data Foundation

- [x] 1.1 Add platform API routing to the existing Worker while preserving static asset and SPA fallback behavior
- [x] 1.2 Add environment bindings and typed configuration for database, auth secrets, email, Stripe test mode, and public application URLs
- [x] 1.3 Define D1 migrations for auth records, profiles, plans, offers, provider mappings, subscriptions, webhook receipts, ledger entries, reservations, and audit events
- [x] 1.4 Add unique constraints for normalized email, provider event IDs, provider object IDs, and tool-scoped usage idempotency keys
- [x] 1.5 Implement repository boundaries for identity, billing, ledger, and tool integration domains
- [x] 1.6 Add migration, rollback, seed, and database consistency checks for local and hosted environments

## 2. Localization

- [x] 2.1 Add typed `zh-CN` and `en` translation catalogs for navigation, discovery, authentication, account, pricing, billing, errors, and emails
- [x] 2.2 Implement locale resolution from profile, visitor preference, browser language, and `zh-CN` fallback
- [x] 2.3 Add a persistent language control that preserves the current route and safe form state
- [x] 2.4 Localize dates, numbers, currencies, credit quantities, and subscription periods
- [x] 2.5 Add localized public metadata and alternate-language references for indexable pages
- [x] 2.6 Add automated checks that required keys exist in both catalogs and raw translation keys never render

## 3. Email Authentication Backend

- [x] 3.1 Add and configure Better Auth for D1-backed email and password accounts
- [x] 3.2 Require email verification before session creation and implement generic duplicate-registration responses
- [x] 3.3 Integrate a transactional email adapter with localized verification and password-reset templates
- [ ] 3.4 Implement verification resend, token expiry, single-use validation, and localized callback states
- [x] 3.5 Implement sign-in, server-side session resolution, secure cookie settings, sign-out, expiry, and revocation
- [x] 3.6 Implement password recovery with generic responses, expiring single-use tokens, password validation, and other-session revocation
- [x] 3.7 Enforce active, suspended, and deleted account states on every protected platform route
- [ ] 3.8 Add rate limits and security event logging for registration, verification, sign-in, and recovery flows
- [ ] 3.9 Add tests for email enumeration resistance, credential validation, verification, recovery, session expiry, revocation, and account-state enforcement
- [x] 3.10 Configure optional Google OAuth with verified-email account linking and shared platform sessions
- [ ] 3.11 Add integration tests for Google callback validation, new-user creation, existing-account linking, denial, and replay/error states

## 4. Authentication and Account Experience

- [x] 4.1 Replace the prototype login dialog with localized registration and sign-in screens
- [ ] 4.2 Add localized verification-pending, verification-result, forgot-password, and reset-password screens
- [x] 4.3 Add authenticated header state, account workspace navigation, and sign-out behavior
- [x] 4.4 Replace visitor mock activity and credits with an honest sign-in prompt
- [x] 4.5 Connect authenticated recent activity, subscription summary, and available credit balance to platform data
- [ ] 4.6 Validate keyboard, focus, screen-reader, loading, error, success, narrow-screen, and language-switch states
- [x] 4.7 Add localized Google sign-in entry, email separator, loading state, and safe fallback message

## 5. Billing and Credit Ledger

- [ ] 5.1 Define seeded subscription plans, provider price mappings, and one-time credit packages for the test environment
- [x] 5.2 Implement localized pricing and account billing surfaces with clear currency, interval, credits, renewal, and limitation copy
- [x] 5.3 Implement the provider-neutral billing interface and Stripe test-mode adapter
- [x] 5.4 Implement authenticated Stripe Checkout session creation for subscriptions and credit top-ups
- [x] 5.5 Implement Stripe Customer Portal session creation and localized return routing
- [ ] 5.6 Implement raw-body webhook handling, Stripe signature and recency verification, required event filtering, and fast acknowledgement
- [ ] 5.7 Persist webhook receipts and reconcile subscription and payment events idempotently
- [ ] 5.8 Implement immutable ledger operations for grants, purchases, reservations, consumption, releases, expiry, refunds, and adjustments
- [x] 5.9 Implement atomic available-balance checks and prevent concurrent reservations from producing a negative balance
- [ ] 5.10 Implement reservation expiry reconciliation and operational alerts for stuck or inconsistent records
- [ ] 5.11 Implement refund, reversal, dispute, cancellation, failed-renewal, and subscription-end policies with compensating entries
- [ ] 5.12 Add user-visible localized subscription status, balance, ledger history, invoice access, and payment recovery states
- [ ] 5.13 Test duplicate and out-of-order events, failed payments, 3DS/async completion, cancellation, refund deficits, and concurrent consumption

## 6. Tool Entitlement Contract

- [x] 6.1 Define and document the version 1 tool identity, access decision, reserve, commit, release, and error contracts
- [x] 6.2 Implement revocable service credentials and tool-scoped authorization policies
- [x] 6.3 Implement minimal user access decisions without exposing passwords, payment data, full profiles, or unrelated ledger history
- [ ] 6.4 Implement idempotent reserve, commit, release, retry, conflict, and expiry behavior
- [x] 6.5 Add correlation IDs and audit events for security and credit-affecting tool operations
- [ ] 6.6 Build a reference integration for one low-risk AI tool and verify that tool-specific inference logic remains outside the platform
- [ ] 6.7 Add contract tests for supported/unsupported versions, invalid tool identity, suspended users, insufficient credits, retries, and conflicting keys

## 7. Security, Acceptance, and Release

- [ ] 7.1 Run authorization tests proving users cannot read or mutate another user's profile, subscription, credits, ledger, or recent activity
- [ ] 7.2 Verify CSRF, cookie, origin, content-security, secret-handling, log-redaction, webhook replay, and rate-limit protections
- [ ] 7.3 Verify that OneShowTools stores no full card number, verification value, raw payment credential, plaintext password, or raw auth token
- [ ] 7.4 Complete end-to-end acceptance in `zh-CN` and `en` for registration, verification, sign-in, recovery, subscription checkout, top-up, billing management, and tool credit consumption
- [x] 7.5 Run schema migration and backward-compatibility tests against the existing public discovery and tool-search behavior
- [ ] 7.6 Add dashboards and alerts for authentication failures, email delivery, webhook errors, payment reconciliation, ledger invariants, and reservation timeouts
- [x] 7.7 Document environment setup, provider configuration, support procedures, refunds, reconciliation, rollback, and contract onboarding for new tools
- [ ] 7.8 Complete privacy, retention, account deletion/export, launch-country, currency, tax, and refund-policy review before enabling live payments
- [ ] 7.9 Deploy behind registration and billing feature flags, verify test-mode production behavior, and record rollback evidence
