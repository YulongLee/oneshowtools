## Why

The current `/admin` console provides only a minimal user list, account
suspension, manual credit adjustment, task visibility, and a basic audit table.
It is sufficient for an internal prototype, but it does not give OneShowTools
the governed customer support, billing reconciliation, tool operations,
privacy, security, and observability controls required to operate a growing
commercial platform.

This is a platform-level change owned by OneShowTools, not an individual AI
tool. The administration plane must become the shared source of operational
control for every current and future tool before live payments, paid
acquisition, or broader user onboarding are enabled.

## What Changes

- Replace the server-side email allowlist as the sole authorization model with
  persisted administrator identities, roles, scoped permissions, account
  status, mandatory MFA, step-up authentication for high-risk actions, and
  emergency bootstrap/recovery procedures. Existing allowlisted accounts will
  be migrated as initial super administrators.
- Add a commercial operations dashboard with real user growth, verification,
  active-user, task, tool, credit-liability, subscription, payment, email,
  runtime, storage, failure, and support indicators. Metrics will distinguish
  current values from time-windowed trends and will never be mocked.
- Add a customer 360-degree workspace containing profile and verification
  state, sessions, security events, consent versions, subscriptions, invoices,
  credit ledger, tasks, files, exports, deletion state, and support history.
  Authorized operators can resend verification or recovery messages, revoke
  sessions, suspend or restore access, and record internal support notes.
- Replace free-form credit editing with a governed adjustment workflow:
  reason codes, operator notes, idempotency keys, optional approval thresholds,
  immutable compensating ledger entries, before/after balances, and exportable
  reconciliation history.
- Add provider-neutral commercial operations for plans, prices, subscriptions,
  orders, payments, top-ups, invoices, failed renewals, cancellations, refunds,
  reversals, disputes, and reconciliation exceptions. Stripe, Alipay, and
  WeChat Pay remain adapters behind the same platform order and ledger model;
  enabling a live provider remains separately gated.
- Add tool governance for catalog metadata, bilingual content, categories,
  lifecycle state, visibility, pricing/credit cost, versioned launch and usage
  contracts, runtime readiness, health, failure rate, maintenance mode, and
  staged publish/unpublish actions. Tool-owned prompts, models, inference
  pipelines, and file-processing logic remain outside the platform.
- Add privacy and compliance operations for policy/consent versions, data
  export jobs, retention status, deletion queues, legal holds, execution and
  failure handling, and auditable operator decisions.
- Add operational queues and observability for email delivery, webhook
  processing, payment reconciliation, deletion/export jobs, runtime failures,
  stuck tasks, ledger invariants, and security anomalies, including retry,
  quarantine, redacted diagnostics, correlation IDs, and alert status.
- Expand the audit system to capture actor, role, action, target, reason,
  correlation ID, redacted before/after state, approval state, and result.
  Audit records are append-only and exportable; secrets, password hashes, raw
  session tokens, and payment credentials are never exposed.
- Deliver a responsive Simplified Chinese-first admin interface with English
  support, search/filter/sort/pagination, saved filters, empty/error/loading
  states, accessible confirmations, and explicit high-risk action feedback.
- Add schema migrations, authorization tests, commercial lifecycle tests,
  reconciliation/idempotency tests, accessibility checks, production smoke
  tests, backup/restore verification, staged rollout, and rollback evidence.
- **Non-goals:** implementing tool-specific AI workflows; exposing customer
  passwords, raw authentication tokens, payment credentials, or unrestricted
  file contents; enterprise organization accounts or SSO; automated tax filing;
  replacing provider portals for regulated settlement; or enabling live
  charging before legal, refund, privacy, provider, and monitoring gates pass.
- **Backward compatibility:** existing users, sessions, tasks, files,
  subscriptions, and append-only credit history remain intact. Current
  `/admin` accounts are migrated into the new role model, existing public and
  customer APIs remain compatible, and tool contracts evolve through additive
  versioned fields. High-risk legacy admin endpoints may be retained
  temporarily behind the new permission checks before removal.

## Capabilities

### New Capabilities

- `admin-access-governance`: Persisted administrator identities, roles,
  permissions, MFA, step-up authentication, approval thresholds, emergency
  access, and authorization enforcement for every administrative action.
- `admin-customer-operations`: Customer 360-degree search, account support,
  session and security control, support notes, data ownership boundaries, and
  governed lifecycle actions.
- `admin-commercial-operations`: Provider-neutral plans, orders, payments,
  subscriptions, invoices, top-ups, refunds, disputes, immutable credit
  adjustments, reconciliation, and commercial exception handling.
- `admin-tool-governance`: Tool catalog, lifecycle, visibility, bilingual
  metadata, credit pricing, versioned integration contracts, runtime health,
  maintenance state, and staged publishing controls.
- `admin-risk-compliance-operations`: Consent and policy history, export and
  deletion queues, retention and legal-hold controls, security anomaly review,
  and auditable compliance workflows.
- `admin-observability-analytics`: Commercial dashboards, operational job
  queues, redacted diagnostics, correlation and audit trails, alerts, retries,
  reconciliation health, and exportable operational reports.

### Modified Capabilities

- `platform-shell`: Add an explicitly separate, bilingual administration
  application boundary and consistent navigation from authorized platform
  accounts without exposing administrative state to customer-facing pages.

## Impact

- **Ownership:** OneShowTools platform control plane. Individual tools continue
  to own prompts, models, inference, tool-specific uploads, and domain
  workflows.
- **Affected code and data:** React admin application, authentication and
  authorization middleware, database schema and migrations, user/session and
  security services, credit ledger, billing/provider reconciliation, tool
  catalog and integration metadata, privacy jobs, audit events, email delivery,
  deployment configuration, tests, and operational documentation.
- **Affected tools and contracts:** all tools consume the platform's opaque
  user, entitlement, credit, catalog, and usage contracts. The contracts gain
  versioned operational metadata and lifecycle states but never expose payment
  credentials, administrator identity, or raw platform sessions.
- **Security:** deny-by-default permissions, MFA and step-up controls,
  least-privilege roles, session revocation, high-risk confirmations,
  approval/audit requirements, redacted logs, rate limits, and no secret or
  credential exposure.
- **Privacy:** purpose-limited access to customer data, operator accountability,
  consent history, retention/deletion execution, legal holds, data export, and
  no default access to customer file contents.
- **Quota:** all grants, consumption, refunds, reversals, expirations, and
  operator adjustments remain append-only ledger entries. Administrative
  actions cannot directly overwrite a computed balance.
- **Billing:** payment providers are adapters to a provider-neutral order,
  subscription, invoice, and reconciliation model. Live charging remains
  disabled until provider secrets, webhook verification, refund/dispute policy,
  currencies, taxes, monitoring, and rollback gates are approved.
- **Dependencies:** transactional email delivery, MFA secret protection,
  payment provider APIs, scheduled job execution, durable backup and restore,
  monitoring/alerting, approved privacy/refund/retention policies, and a
  production database suitable for the selected launch scale.
