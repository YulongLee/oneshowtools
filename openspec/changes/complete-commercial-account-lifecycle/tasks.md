## 1. Baseline, Schema, and Migration Safety

- [ ] 1.1 Add a failing baseline test that proves current registration creates an unverified session and exposes duplicate email registration
- [x] 1.2 Add additive migrations for auth identities, provider accounts, verification/reset tokens, session metadata, security events, rate limits, export jobs, deletion jobs, webhook receipts, provider mappings, and ledger idempotency keys
- [x] 1.3 Add a production database backup and invariant script covering users, ownership relations, sessions, subscriptions, tasks, files, and per-user credit balances
- [ ] 1.4 Implement legacy password/session compatibility and rehash or reset migration without changing stable user IDs
- [ ] 1.5 Add migration tests proving existing accounts, tasks, files, subscriptions, audit events, and credit balances survive upgrade and rollback

## 2. Authentication Framework and Security Boundary

- [ ] 2.1 Integrate Better Auth with the SQLite repository while keeping platform account-state authorization in OneShowTools middleware
- [x] 2.2 Replace immediate-login registration with generic verification-pending behavior and no pre-verification session
- [x] 2.3 Implement hashed, expiring, single-use email verification plus safe resend and localized callback states
- [x] 2.4 Require verified active accounts for password sign-in and sensitive or paid actions
- [x] 2.5 Implement generic password recovery, single-use reset, password validation, token consumption, and all-session revocation
- [x] 2.6 Implement production cookie hardening, session rotation, origin validation, CSRF protection, and redacted request correlation
- [x] 2.7 Implement IP and account-scoped rate limits plus security-event audit records for registration, resend, sign-in, recovery, reset, and sensitive account mutations

## 3. Google OAuth and Provider Identity

- [x] 3.1 Store Google identities as explicit provider-account records linked to stable platform user IDs
- [ ] 3.2 Validate OAuth state, nonce, issuer, audience, expiry, verified email, and callback replay before creating a session
- [x] 3.3 Implement safe verified-email linking and deny implicit merge for different or unverified addresses
- [ ] 3.4 Add localized Google denial, cancellation, unavailable, and callback-error states
- [ ] 3.5 Add integration tests for new-user creation, existing-user linking, duplicate prevention, invalid claims, replay, denial, suspended users, and callback failure

## 4. Account Center Backend

- [x] 4.1 Add user-scoped profile and locale read/update endpoints with field validation and audit records
- [x] 4.2 Add guarded password-change and email-change endpoints with re-authentication, re-verification, notification, and session policy
- [x] 4.3 Add active-session listing and current, selected, and all-other-session revocation endpoints without exposing raw tokens
- [x] 4.4 Add asynchronous data-export request, status, expiry, and user-scoped download behavior
- [ ] 4.5 Add re-authenticated account-deletion request, confirmation, cancellation window, access revocation, retention-aware anonymization, and audit behavior
- [ ] 4.6 Add authorization tests proving no user can read or mutate another user's profile, credentials, sessions, export, deletion, subscription, invoices, or ledger

## 5. Billing Reconciliation and Commercial Account State

- [ ] 5.1 Define approved subscription and top-up offers, currencies, recurring credits, expiry, grace-period, refund, dispute, and negative-balance policies in test fixtures
- [x] 5.2 Add Stripe customer/provider mappings and bind checkout sessions to verified authenticated users and active offers
- [x] 5.3 Implement raw-body Stripe webhook signature/recency verification, required-event filtering, receipt persistence, and fast acknowledgement
- [ ] 5.4 Implement idempotent normalized subscription, invoice, top-up, failed-payment, cancellation, refund, reversal, and dispute reconciliation
- [ ] 5.5 Implement immutable ledger grants and compensating entries with unique provider and usage idempotency keys and transactional balance invariants
- [x] 5.6 Implement Stripe Customer Portal creation plus Account Center subscription, invoice, recovery, and credit-history endpoints
- [ ] 5.7 Add tests for duplicate and out-of-order webhooks, asynchronous payments, 3DS, failed renewal, cancellation, refund deficits, disputes, concurrent credit use, and provider outage

## 6. Bilingual Frontend Account Experience

- [x] 6.1 Replace the modal-only auth flow with accessible bilingual sign-in, registration, verification-pending/result, resend, recovery, and reset states
- [ ] 6.2 Preserve intended tool destinations and safe form state through authentication and language changes
- [x] 6.3 Add Account Center sections for profile, locale, password/email changes, sessions, privacy export, and account deletion
- [x] 6.4 Add Account Center commercial summary, subscription state, invoices, Customer Portal, credit balance, ledger history, checkout pending, and payment recovery states
- [x] 6.5 Add honest unavailable states driven by independent registration, Google, billing, and deletion feature flags
- [ ] 6.6 Validate keyboard, focus, screen-reader names, live validation, loading, error, success, reduced-motion, narrow-screen, and Chinese/English behavior

## 7. Commercial Release Gates and Operations

- [x] 7.1 Add independent server-controlled flags for registration, Google sign-in, checkout, and account deletion while preserving public discovery
- [x] 7.2 Add production startup validation for HTTPS app URL, secure cookies, auth secret, email provider, Google callbacks, Stripe keys, webhook secret, price mappings, and required migrations
- [ ] 7.3 Add redacted metrics and alerts for auth abuse, email delivery, OAuth callbacks, session anomalies, webhook failures, reconciliation delay, ledger invariants, export jobs, and deletion jobs
- [x] 7.4 Document email, Google, Stripe test/live, secret rotation, support, refund, dispute, reconciliation, privacy, retention, export, deletion, and incident procedures
- [ ] 7.5 Record approved launch countries, legal entity, currencies, tax treatment, privacy terms, refund terms, support contact, and retention policy before enabling live billing

## 8. End-to-End Acceptance and Deployment

- [ ] 8.1 Run unit and integration suites for enumeration resistance, verification, recovery, session expiry/revocation, account states, CSRF/origin checks, rate limits, OAuth, ownership, webhooks, ledger, export, and deletion
- [ ] 8.2 Run bilingual browser acceptance for registration through verification, sign-in, recovery, profile/security management, subscription checkout, top-up, portal, invoices, export, and deletion
- [ ] 8.3 Run contract tests proving every AI tool receives only minimal versioned identity/entitlement context and cannot access payment credentials or unrelated user data
- [x] 8.4 Deploy migrations and code with all new commercial flags disabled, then verify public discovery, existing login, tools, tasks, files, and balances remain backward compatible
- [ ] 8.5 Configure providers in staging/test mode and run production-domain smoke tests with synthetic accounts and Stripe test transactions
- [x] 8.6 Record database backup, migration invariants, health checks, monitoring signals, feature-flag state, and rollback evidence
- [ ] 8.7 Enable each approved commercial capability independently and verify the live domain before declaring commercial readiness
