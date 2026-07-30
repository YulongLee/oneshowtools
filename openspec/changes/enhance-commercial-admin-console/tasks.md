## 1. Baseline, schema, and migration safety

- [ ] 1.1 Record the production feature flags, database invariants, current admin accounts, API smoke results, and rollback version
- [x] 1.2 Add numbered migrations for administrator identities, roles, permissions, memberships, MFA factors, recovery codes, step-up challenges, and approvals
- [x] 1.3 Add numbered migrations for support cases/notes, policy versions/consents, operational jobs, alerts, reconciliation exceptions, and expanded audit envelopes
- [x] 1.4 Add additive migrations for provider-neutral orders, order lines, payment attempts/events, refunds, disputes, and commercial idempotency keys
- [x] 1.5 Add additive migrations for tool metadata versions, lifecycle history, integration credentials/contract versions, and runtime health summaries
- [x] 1.6 Extend backup and invariant tooling to cover all new ownership, role, ledger, payment, job, tool, consent, and audit relations
- [ ] 1.7 Test forward migration on a production-data copy and test application rollback while additive tables remain present

## 2. Administrator access governance

- [x] 2.1 Implement deny-by-default `/api/admin/v1` authentication and permission middleware with stable error responses
- [x] 2.2 Seed least-privilege roles and permission mappings for super administrator, operations, support, finance, tool manager, privacy, and read-only users
- [x] 2.3 Migrate active verified `ADMIN_EMAILS` users into initial super-administrator memberships with an audit record
- [x] 2.4 Implement administrator listing, invitation/activation, role assignment, suspension, and session-revocation commands
- [x] 2.5 Implement TOTP enrollment, verification, encrypted secret storage, hashed recovery codes, reset, and recovery workflows
- [ ] 2.6 Require MFA for admin sessions and implement expiring step-up authorization for high-risk permissions
- [ ] 2.7 Implement maker-checker approval records and configurable thresholds for credits, refunds, role changes, privacy overrides, and publishing
- [ ] 2.8 Add emergency bootstrap and recovery commands with explicit audit, documentation, and a switch to disable allowlist authorization
- [x] 2.9 Add authorization matrix tests proving each role can access only its permitted resources and actions

## 3. Administrative API and audit foundation

- [x] 3.1 Add validated pagination, search, filter, sort, date-window, timezone, and bounded export utilities for admin APIs
- [x] 3.2 Add idempotency-key and optimistic-version helpers for administrative commands
- [x] 3.3 Implement correlation IDs and a redacted structured error envelope across admin APIs and jobs
- [x] 3.4 Expand audit writes with actor, role, permission, reason, target, before/after state, approval, result, and correlation ID
- [x] 3.5 Audit sensitive customer-detail reads and ensure audit rows cannot be modified or deleted through application APIs
- [ ] 3.6 Implement permission-scoped audit search and integrity-verifiable bounded export
- [x] 3.7 Add serializer tests proving password hashes, raw tokens, MFA secrets, provider credentials, and unrestricted file contents never leave admin APIs

## 4. Admin shell and commercial dashboard

- [x] 4.1 Refactor `/admin` into a modular Chinese-first bilingual application using `/api/admin/v1`
- [x] 4.2 Add permission-driven navigation, administrator profile, MFA/step-up status, safe logout, and responsive desktop/tablet layouts
- [x] 4.3 Implement reusable table, filter, pagination, date-range, currency, status, reason, confirmation, approval, and detail-drawer components
- [x] 4.4 Implement real user, verification, active-user, task, tool, credit-liability, subscription, payment, email, runtime, storage, queue, and failure metrics
- [x] 4.5 Add time-window trends, metric definitions, timezone/currency labels, empty states, unavailable-data states, and drill-down filters
- [x] 4.6 Add accessible loading, error, retry, success, high-risk confirmation, and step-up experiences with no mocked operational values

## 5. Customer operations

- [x] 5.1 Implement paginated customer search by ID, email, name, status, verification, plan, registration date, and activity
- [x] 5.2 Implement the permission-scoped customer 360 API and UI for profile, account state, sessions, security, tasks, files metadata, credits, subscriptions, invoices, privacy, and support history
- [x] 5.3 Implement idempotent verification-email and password-recovery resend commands with abuse limits and delivery audit
- [x] 5.4 Implement governed session revocation, account suspension/restoration, and session invalidation with reasons and before/after audit
- [x] 5.5 Implement append-only internal support cases and categorized notes with author, timestamps, status, and access permissions
- [x] 5.6 Add user-visible acceptance tests for search, customer details, resend, revocation, suspension, restoration, and support notes

## 6. Credits and commercial operations

- [x] 6.1 Replace free-form credit editing with governed reason codes, operator notes, idempotency, before/after balances, step-up, and approval thresholds
- [x] 6.2 Add immutable ledger commands for grant, deduction, expiry, refund, reversal, dispute, and corrective adjustment without direct balance updates
- [x] 6.3 Implement ledger invariant checks for duplicate references, orphaned events, unexpected negative balances, and entitlement mismatches
- [x] 6.4 Implement provider-neutral plan, price, order, payment, subscription, invoice, top-up, refund, dispute, and reconciliation read APIs
- [ ] 6.5 Implement provider adapter contracts and normalized event validation for Stripe, Alipay, and WeChat Pay behind independent feature flags
- [ ] 6.6 Migrate/link existing Stripe mappings, subscriptions, invoices, receipts, and ledger references without changing historical balances
- [ ] 6.7 Implement idempotent duplicate, delayed, out-of-order, failed-renewal, cancellation, refund, reversal, dispute, and reconciliation-exception processing
- [x] 6.8 Implement commercial admin pages for plans, orders, payments, subscriptions, invoices, top-ups, refunds, disputes, and exceptions
- [ ] 6.9 Add sandbox contract tests for each configured provider adapter and keep all live charging disabled until release gates pass
- [x] 6.10 Add concurrency tests proving repeated admin commands and payment events cannot double-grant or double-deduct credits

## 7. Tool governance and integration contracts

- [x] 7.1 Implement versioned bilingual tool metadata, categories, visibility, credit cost, ownership, and draft history
- [x] 7.2 Implement draft, staged, published, maintenance, and retired lifecycle transitions with readiness validation and audit
- [x] 7.3 Implement tool catalog create/edit/preview/publish/unpublish/maintenance/retire UI with rollback to prior metadata versions
- [ ] 7.4 Define and document versioned launch-context, entitlement, usage-reporting, and runtime-health contracts using opaque identifiers and scoped credentials
- [ ] 7.5 Implement authenticated idempotent tool usage and health-reporting endpoints with authorization, ownership, schema, and quota checks
- [x] 7.6 Add runtime readiness, last success, latency, failure-rate, integration-error, and maintenance summaries without exposing tool prompts or secrets
- [x] 7.7 Add compatibility and migration tests proving existing tool URLs and usage history remain valid

## 8. Privacy, jobs, and observability

- [ ] 8.1 Implement versioned policy documents and customer consent recording with locale, purpose, source, and timestamp
- [ ] 8.2 Convert export and deletion requests into durable leased jobs with waiting periods, retries, cancellation, execution results, and failure states
- [x] 8.3 Implement privacy-operator views and commands for export, deletion, retention status, legal holds, execution, and resolution notes
- [ ] 8.4 Implement durable job infrastructure for email, webhook, reconciliation, export, deletion, alert, and integration work with bounded backoff and quarantine
- [x] 8.5 Add queue inspection, retry, quarantine, and resolution UI with permission checks and idempotent side effects
- [x] 8.6 Add redacted metrics and alerts for authentication abuse, administrator anomalies, email failures, webhook lag, payment reconciliation, ledger invariants, stuck tasks, runtime failures, storage, export, and deletion
- [ ] 8.7 Add scheduled off-host audit/backup export and verify restore procedures without exporting application secrets

## 9. Security, quality, and acceptance validation

- [ ] 9.1 Add CSRF/origin, session, MFA, step-up, permission, rate-limit, enumeration, and high-risk action security tests
- [ ] 9.2 Add end-to-end tests for every role, customer operation, credit approval, commercial exception, tool lifecycle, privacy job, and operational retry
- [x] 9.3 Add bilingual catalog parity and critical admin-flow tests for Simplified Chinese and English
- [ ] 9.4 Run keyboard, focus, screen-reader label, contrast, responsive layout, and reduced-motion accessibility checks
- [ ] 9.5 Add performance tests for paginated customer, audit, task, payment, ledger, and metric queries at the approved launch dataset size
- [ ] 9.6 Add backup/restore, migration, invariant, provider outage, worker restart, and application rollback tests
- [ ] 9.7 Run production-like smoke tests confirming customer APIs and existing tool routes remain backward compatible

## 10. Staged release and production deployment

- [x] 10.1 Add independent feature flags for admin RBAC, MFA enforcement, customer operations, governed credits, commercial operations, tool governance, privacy jobs, and observability
- [x] 10.2 Document role ownership, MFA recovery, approval thresholds, support procedures, privacy/retention, refund/dispute handling, incident response, and provider reconciliation
- [ ] 10.3 Record approved legal entity, launch countries, currencies, taxes, privacy terms, refund policy, retention periods, support contact, and live-payment provider decisions
- [ ] 10.4 Back up production data, deploy additive migrations, verify invariants, and bootstrap existing administrators without enabling new write capabilities
- [ ] 10.5 Enable and verify read-only dashboard and customer search, then progressively enable governed write modules by feature flag
- [ ] 10.6 Run production smoke, permission, MFA, email, queue, audit, tool-contract, ledger, and rollback checks
- [ ] 10.7 Push the validated implementation to Git and record the commit, migration, backup, health, monitoring, and rollback evidence
- [ ] 10.8 Deploy the validated release to `oneshowtools.com`, verify `/admin` and customer flows, and keep live payments disabled until every commercial release gate is approved
