## Context

OneShowTools is the shared control plane for independent AI tools. The live
platform already has verified email/password accounts, sessions, an append-only
credit ledger, tasks, files, preliminary billing records, audit events, and a
small `/admin` application. Administration is currently authorized by an
environment-variable email allowlist and exposes only user status, manual
credits, tasks, and a basic audit list.

The new administration plane crosses identity, customer support, payments,
credits, tool governance, privacy jobs, analytics, and operations. It must
remain usable on the current single-server deployment while establishing
boundaries that can move to PostgreSQL, background workers, and additional
payment providers as commercial traffic grows.

Stakeholders are the owner/super administrator, customer support, operations,
finance, security/privacy operators, tool developers, and end users whose data
and balances are being managed.

## Goals / Non-Goals

**Goals:**

- Provide a deny-by-default, role-based and MFA-protected admin boundary.
- Give authorized operators a complete, auditable customer and commercial view.
- Make every balance and payment correction idempotent and append-only.
- Govern tool metadata and integration health without moving tool-owned AI
  workflows into the platform.
- Operate export, deletion, email, webhook, reconciliation, and runtime queues
  with observable retries and alerts.
- Preserve current data and APIs through additive migrations and staged rollout.
- Keep the administration UI Chinese-first, bilingual, accessible, responsive,
  and optimized for dense operational work.

**Non-Goals:**

- Tool-specific prompts, inference pipelines, models, or content-processing
  logic.
- Exposure of passwords, raw tokens, provider credentials, or unrestricted
  customer file contents.
- Enterprise organizations/SSO, tax filing automation, or automatic activation
  of live payment providers.
- Replacing regulated provider portals for settlement and identity checks.

## Decisions

### 1. Separate admin application and versioned API boundary

Keep `/admin` as a separately bootstrapped React application and introduce
`/api/admin/v1/*` as the stable administrative API. Customer APIs remain
unchanged. Every admin route passes authentication, administrator status,
permission, optional step-up, and audit middleware.

This is preferred over mixing admin components into the customer dashboard
because it reduces accidental data exposure and allows independent navigation,
authorization, caching, testing, and future deployment. A fully separate domain
was considered, but the same-origin path is simpler for the current deployment;
the boundary remains compatible with a future `admin.oneshowtools.com`.

### 2. Persist roles and permissions; retain allowlist only for bootstrap

Add administrator, role, permission, role-permission, MFA factor, recovery code,
step-up challenge, and approval records. Seed roles for `super_admin`,
`operations`, `support`, `finance`, `tool_manager`, `privacy`, and `read_only`.
Permissions are checked server-side on resources and actions; the UI uses them
only to hide unavailable controls.

Existing `ADMIN_EMAILS` entries bootstrap initial super administrators during
migration and remain emergency recovery inputs until explicitly disabled. This
is preferred over keeping role logic in configuration because role changes,
revocation, provenance, and audit history must be durable.

### 3. MFA and high-risk action policy

Use TOTP plus one-time recovery codes initially, encrypting MFA secrets with a
server-managed key. Require MFA for all administrators and a recent step-up
challenge for credit adjustments above threshold, refunds, permission changes,
privacy overrides, tool publication, and emergency access. Approval records
support maker-checker workflows for configurable thresholds.

Passkeys were considered and remain a future additive factor; TOTP has lower
initial operational dependency. Email codes are not accepted as the only admin
second factor because the account email is also the recovery channel.

### 4. Customer 360 read model with explicit command services

Build a paginated customer search/read model from existing platform sources and
use separate command handlers for session revocation, email resend, account
status, support notes, credit adjustments, export/deletion controls, and
commercial actions. Commands accept idempotency keys, reason codes, operator
notes, and expected version where concurrency matters.

This separates broad read access from high-risk writes and avoids a generic
database editor. Raw password hashes, tokens, payment credentials, and file
contents are excluded from serializers by construction.

### 5. Provider-neutral commercial model

Introduce platform orders, order lines, payment attempts, payment events,
refunds, disputes, and reconciliation exceptions. Provider adapters translate
Stripe, Alipay, and WeChat Pay callbacks into normalized events. Existing
subscriptions/invoices/provider mappings remain sources during migration and
are linked rather than rewritten.

Verified provider events are recorded before processing. Event, order, refund,
and ledger idempotency keys are unique. Provider state and internal entitlement
state are shown separately when reconciliation is pending. This prevents any
provider from becoming the source of truth for credits.

### 6. Append-only ledger and governed adjustments

The computed credit balance continues to be the sum of immutable ledger
entries. Administrative grants, deductions, refunds, reversals, expirations,
and corrections append compensating entries with reason, actor, approval,
reference, and before/after balance snapshots. No endpoint directly sets a
balance.

Large or negative-result adjustments require step-up and optionally a second
approver. Invariant checks detect duplicate references, orphaned commercial
events, unexpected negative balances, and mismatched entitlements.

### 7. Tool governance stays metadata- and contract-focused

The platform stores tool catalog metadata, lifecycle/visibility state,
credit cost, contract version, runtime endpoint identity, health summaries, and
publish history. Tool runtimes receive versioned opaque user/entitlement/usage
contracts and report status through authenticated integration endpoints.

Prompts, models, raw tool inputs, inference logic, and tool-specific files stay
with each tool. Publication uses draft, staged, published, maintenance, and
retired states, with audit and rollback to the previous metadata version.

### 8. Durable operational jobs and redacted observability

Model email, export, deletion, webhook, reconciliation, alert, and integration
work as durable jobs with state, attempts, next-attempt time, correlation ID,
redacted error code, and quarantine state. A scheduled worker claims jobs with
leases so retries are safe after process restarts.

The admin UI shows queue health and permits authorized retry/quarantine
resolution without exposing secrets. Metrics aggregate authentication abuse,
email delivery, task/runtime failure, webhook lag, ledger invariants, storage,
and commercial KPIs.

### 9. Append-only audit envelope

Every administrative read of sensitive customer detail and every mutation emits
an audit envelope containing actor, role, permission, action, target, reason,
correlation ID, redacted before/after fields, approval, result, and timestamp.
Audit rows cannot be updated or deleted through application APIs and are
periodically exported to off-host storage.

### 10. Additive migration and storage evolution

Use explicit numbered SQL migrations and backup/invariant checks. SQLite remains
supported for the first staged release, with WAL, bounded pagination, short
transactions, and a single job worker. Repositories and SQL avoid SQLite-only
business semantics so a measured PostgreSQL migration can occur before scale or
availability requirements exceed a single node.

## Risks / Trade-offs

- **[Role misconfiguration grants excessive access]** → Seed least-privilege
  roles, deny by default, test every permission, require step-up/approval for
  high-risk actions, and retain audited emergency recovery.
- **[MFA loss locks out the owner]** → Issue hashed recovery codes, require
  secure bootstrap documentation, and audit emergency recovery.
- **[Concurrent payment and credit events drift balances]** → Use unique
  idempotency keys, immediate transactions, append-only compensations, and
  scheduled invariant reconciliation.
- **[SQLite limits writes and availability]** → Keep transactions short, run a
  single worker, add off-host backups/restore tests, and define PostgreSQL
  migration thresholds.
- **[Customer 360 exposes too much data]** → Permission-scoped sections,
  purpose-based access, sensitive-read audits, redaction, and no default file
  content access.
- **[Provider-neutral payments add complexity]** → Start with normalized domain
  events and one provider in sandbox, then add adapters only after contract
  tests pass.
- **[Large admin scope delays value]** → Deliver vertical increments behind
  feature flags: access control, customer operations, credits, tools,
  commercial operations, then compliance/observability expansion.

## Migration Plan

1. Back up the production database and file metadata; run current invariants.
2. Apply additive tables, indexes, audit fields, job schema, and commercial
   normalization schema without removing legacy columns or endpoints.
3. Convert configured admin emails into active `super_admin` memberships and
   require MFA enrollment before high-risk actions.
4. Deploy read-only dashboard and customer search behind an admin feature flag.
5. Enable permission-scoped customer commands and governed credit adjustments;
   retain legacy endpoints behind the same authorization temporarily.
6. Enable tool governance, job queues, privacy operations, and observability.
7. Run payment adapters only in sandbox; enable a live provider only after
   reconciliation, refund/dispute, legal, monitoring, and rollback gates pass.
8. Remove legacy admin endpoints and emergency allowlist authorization after
   role/MFA recovery has been verified.

Rollback disables new feature flags, restores the prior application release,
and leaves additive tables intact. Because ledger and audit data are append-only,
commercial mutations are reversed with compensating entries rather than
database rollback. A database restore is reserved for migration failure before
new writes are accepted.

## Open Questions

- Which payment provider and currency should be the first live launch target?
- Should the first MFA release use TOTP only, or TOTP plus passkeys?
- What credit-adjustment and refund amounts require a second approver?
- Which roles will exist at launch, and which people receive each role?
- What are the approved retention periods, deletion exceptions, legal entity,
  support contact, launch countries, tax treatment, and refund policy?
- At what user, task, or payment volume must production move from SQLite to
  PostgreSQL?
