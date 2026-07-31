## Context

OneShowTools is the shared control plane for a growing set of independently
developed AI tools. The live platform already has verified users, sessions,
persisted administrator memberships and roles, an immutable credit ledger,
tasks, files, model invocations, preliminary commercial records, operational
jobs, alerts, tool health reports, and a Chinese-first `/admin` application.

The current admin overview presents a small set of aggregate counts. Credit
adjustments are governed, but there is no dedicated ledger workspace or
financial journal. Tool activity is visible only through task records and does
not produce a complete usage/cost funnel. Server health is checked manually
through system tools and is not retained or visible to authorized
administrators.

The first production topology is one Alibaba Cloud Ubuntu server, Nginx, one
Node.js service, SQLite in WAL mode, local uploads, Alibaba Cloud SMTP, and a
managed OneShowModel gateway. The design must be useful and safe on this
topology while preserving a migration path to PostgreSQL, multiple application
instances, object storage, and an external metrics backend.

Stakeholders are the owner/super administrator, finance, operations, support,
tool managers, privacy/audit operators, and tool developers. End users are data
subjects but do not access administrative telemetry.

## Goals / Non-Goals

**Goals:**

- Turn `/admin` into one permission-scoped operating console for users, credits,
  internal financial records, tools, infrastructure, alerts, and audit.
- Preserve one authoritative credit balance and introduce a balanced internal
  financial subledger linked to commercial source events.
- Measure adoption, reliability, quota usage, token usage, estimated cost, and
  unit economics for each tool without collecting customer content.
- Continuously collect low-overhead server, application, database, queue, email,
  model, tool runtime, backup, and TLS health metrics.
- Produce actionable alerts with ownership, acknowledgement, resolution, and
  auditable operator actions.
- Keep writes idempotent, append-only where required, reasoned, permission
  checked, and compatible with maker-checker approval.
- Run on the existing single server and SQLite safely with bounded retention,
  aggregation, and a documented externalization threshold.

**Non-Goals:**

- Tool prompts, models, inference logic, raw inputs/outputs, or tool-owned files.
- Tax filing, statutory accounts, payroll, banking, or replacement of licensed
  accounting software and payment-provider portals.
- Enabling live payment providers or changing the current billing feature
  flags.
- Full distributed tracing of arbitrary third-party infrastructure.
- A PostgreSQL or multi-server migration in this change.
- Storing raw secrets, API keys, tokens, email bodies, prompts, outputs, or file
  contents in analytics or metrics.

## Decisions

### 1. Organize the admin application around operating domains

Use a stable navigation model:

1. Command Center
2. Customers
3. Credits & Ledger
4. Finance & Reconciliation
5. Tool Analytics
6. System Health
7. Jobs & Alerts
8. Tool Governance
9. Access Control
10. Audit & Exports

Navigation and API access are driven by persisted permissions, not frontend
role names. Add `credits.read`, `credits.manage`, `finance.read`,
`finance.manage`, `finance.close`, `analytics.read`, `infrastructure.read`,
`alerts.manage`, and `metrics.export`. Existing broad permissions are migrated
to equivalent grants.

This is preferred over one universal dashboard because operational users need
different density, filters, and write controls. Separate applications per role
were rejected because they duplicate components and complicate authorization.

### 2. Keep domain sources authoritative and build explicit read models

The credit ledger, orders/payments/refunds, usage events, metric samples, and
alerts remain separate sources of truth. Dashboard endpoints query bounded
read models and rollups; they never mutate domain records.

Admin dashboard responses include the selected window, timezone, currency,
metric definition, data freshness, comparison window, and unavailable reason.
This prevents totals with different meanings from appearing equivalent.

Materialized SQLite rollup tables are updated by one scheduled worker. Fully
dynamic joins across all raw history were rejected because they will eventually
block customer writes on the single database.

### 3. Preserve the credit ledger and add a separate balanced financial journal

`credit_ledger` remains append-only and its sum remains the only user balance.
Add:

- `finance_accounts`
- `finance_journal_entries`
- `finance_postings`
- `finance_periods`
- `finance_source_links`
- `cost_rate_versions`
- `finance_reconciliation_runs`
- `finance_reconciliation_items`

Every posted journal entry has at least two postings and total debit equals
total credit in one currency. Posted entries cannot be edited or deleted;
corrections use reversing and replacement entries. Source links connect journal
entries to orders, payments, refunds, disputes, provider fees, credit grants,
credit consumption, and provider/model costs without changing those sources.

The journal is an internal management subledger. CSV exports are designed for
handoff to external bookkeeping. A single combined money-and-credit ledger was
rejected because platform credits are quota units, not necessarily money or
legal tender.

### 4. Use one privacy-safe versioned usage event contract

Add `/api/integrations/v1/tools/:toolId/usage-events` with scoped tool
credentials, request signing, idempotency keys, timestamps, correlation IDs,
contract versions, opaque platform user IDs, tool version, runtime identity,
status, latency, credit reservation/commit/refund amounts, token counts, and
provider-cost metadata.

Allowed event types are `accepted`, `started`, `completed`, `failed`,
`cancelled`, and `refunded`. Each execution uses one stable `usageId`; the
platform validates legal state transitions and tolerates safe duplicate and
out-of-order delivery. Platform-hosted tools emit the same events internally.

The contract rejects arbitrary labels and customer content. Tool names,
prompts, responses, filenames, URLs with query strings, raw error messages,
emails, IPs, tokens, and API keys are prohibited. This is preferred over
deriving all analytics from tasks because future tools may execute outside the
main Node process.

### 5. Separate raw events from bounded analytics rollups

Store recent raw `tool_usage_events` for forensic correlation and aggregate
them into hourly/daily `tool_usage_rollups`. Initial retention:

- raw usage events: 30 days
- hourly tool rollups: 90 days
- daily tool rollups: 25 months
- raw one-minute infrastructure samples: 7 days
- five-minute infrastructure rollups: 30 days
- hourly infrastructure rollups: 13 months
- alerts, incidents, journal, credit, and audit records: governed separately
  and not removed by metric-retention jobs

Retention values are configuration backed and surfaced in admin metadata.
Aggregation jobs are idempotent by bucket and dimension. A generic
high-cardinality time-series schema was rejected for SQLite; allowed metrics
and label dimensions are registered centrally.

### 6. Collect infrastructure metrics out of the customer request path

Add a low-privilege collector invoked every minute by the existing job worker
or a systemd timer. It reads:

- operating-system CPU/load, memory, uptime, and disk capacity/pressure
- OneShowTools process uptime, RSS, heap, event-loop lag, and restart count
- HTTP request count, status class, latency histogram, and in-flight requests
- SQLite size, WAL size, busy errors, query/invariant duration, and backup age
- operational job counts, oldest age, failures, retries, and quarantine
- SMTP, OneShowModel, external runtime, and tool health-check results
- TLS certificate expiry and Nginx/service reachability

Collection failure never blocks a customer request. Collector freshness is
itself monitored. The collector has no write access outside the application
metric tables and no access to environment-secret values.

An external Prometheus/OpenTelemetry stack was considered. It remains a future
export target; a local bounded collector provides immediate value without
introducing another production service.

### 7. Build alerts from rules, deduplication keys, and incident state

Add `metric_alert_rules`, `metric_alert_evaluations`, and `operational_incidents`
while reusing `operational_alerts` as the visible alert envelope. Each rule has
metric, scope, window, warning/critical thresholds, minimum samples, cooldown,
owner role, and enabled state.

Alerts use a stable deduplication key so repeated evaluations update one open
alert rather than creating noise. Operators can acknowledge, assign, suppress
for a bounded time, add notes, and resolve. Threshold edits and suppression are
audited. Critical rules cover disk exhaustion, service unavailability,
database/backup staleness, abnormal failure rate, stuck jobs, ledger/journal
invariants, and missing collector data.

Direct email/SMS escalation is deferred until notification ownership is
approved; the first release records alerts in the console and can reuse the
existing email job infrastructure for explicitly configured recipients.

### 8. Make cost and margin explicit estimates

Model and provider cost rates are versioned by provider, model/tool, unit,
currency, effective time, and source. Usage events retain measured units and
reference the applicable cost-rate version. Revenue allocation is derived from
normalized paid orders or configured management rules and is always labeled
estimated until reconciled.

Dashboards distinguish actual payment amounts, provider fees, estimated model
cost, issued credit liability, consumed credits, refunded credits, and
estimated gross margin. Missing cost rates produce `cost unavailable`, not
zero. Retroactive recalculation creates a new rollup version.

### 9. Use bounded query and export APIs

Add versioned endpoints under `/api/admin/v1`:

- `/command-center`
- `/credits/ledger`, `/credits/reconciliation`, `/credits/adjustments`
- `/finance/journals`, `/finance/periods`, `/finance/reconciliation`
- `/analytics/tools`, `/analytics/tools/:toolId`
- `/infrastructure/overview`, `/infrastructure/metrics`
- `/alerts`, `/incidents`
- `/exports`

Every list is paginated, date bounded, filtered, sorted through an allowlist,
timezone aware, and permission checked. Large exports are durable jobs with an
expiry and audit record; synchronous CSV is limited to small result sets.

### 10. Preserve privacy and administrative accountability

Admin serializers use explicit allowlists. Metrics and usage tables cannot
accept arbitrary JSON from tools. Sensitive customer drill-down and every
mutation emit rich audit records. Exports are permission scoped, watermarked
with actor/time/filter metadata, short-lived, and excluded from public file
serving.

The UI never displays raw authentication/session tokens, credentials, prompt or
output content, customer file contents, full tool error payloads, or server
environment variables. Diagnostic codes and correlation IDs are allowed.

### 11. Define scale thresholds before externalization

SQLite remains supported while all of these remain true:

- raw metric/event storage stays below configured size limits
- aggregation completes within its schedule
- p95 admin analytics queries remain below the approved budget
- write-busy errors remain below threshold
- one worker can keep queue lag bounded

Crossing a threshold raises an alert and creates a migration recommendation.
The repositories and APIs preserve the same contracts when raw metrics move to
an external time-series store or domain data moves to PostgreSQL.

## Risks / Trade-offs

- **[Telemetry increases SQLite writes]** → Batch inserts, fixed metric names,
  bounded labels, one-minute cadence, WAL monitoring, rollups, retention, and
  automatic collection degradation before customer writes are affected.
- **[Financial reports are mistaken for statutory accounts]** → Label the
  module as an internal operational subledger, document mappings, preserve
  source references, and export to approved external accounting software.
- **[Cost or margin is wrong]** → Version rate cards, distinguish actual from
  estimated values, show missing rates, retain calculation versions, and
  reconcile against provider statements.
- **[Tool events leak customer content]** → Enforce schemas and field
  allowlists, reject arbitrary metadata, use opaque IDs, add contract tests, and
  audit export access.
- **[Administrators gain excessive access]** → Deny-by-default permissions,
  least-privilege role seeds, server-side enforcement, step-up/approval for
  high-risk writes, and authorization-matrix tests.
- **[Alert fatigue]** → Deduplicate, require minimum samples, use cooldowns,
  distinguish warning/critical, assign owners, and review noisy rules.
- **[Monitoring silently stops]** → Persist heartbeat/freshness and raise a
  separate collector-stale alert.
- **[Single-server monitoring cannot observe a total host outage]** → Document
  the limitation and add an external uptime check before paid launch.
- **[Migration changes existing totals]** → Backfill new read models from
  immutable sources, compare old/new metrics, and enable pages read-only before
  activating writes.

## Migration Plan

1. Back up and integrity-check the production database; record the live release,
   current role grants, credit totals, commercial totals, tool/task counts, and
   server health.
2. Apply additive schemas for permissions, usage events/rollups, financial
   journals, cost rates, metric samples/rollups, alert rules, incidents, and
   exports.
3. Seed new permissions and map existing roles without removing any current
   grants. Keep all new write capabilities disabled.
4. Backfill credit reconciliation and initial financial source links without
   creating or changing balances. Validate journal balance and source coverage.
5. Deploy request metrics, usage events for platform-hosted tools, and the
   infrastructure collector in observe-only mode. Verify overhead and retention
   on a production-data copy.
6. Enable Command Center, Tool Analytics, System Health, and read-only
   Credits/Finance pages for the super administrator.
7. Enable alert acknowledgement, governed credit commands, journal posting,
   cost-rate management, and period operations progressively by permission and
   feature flag.
8. Enable external tool usage reporting only after signed contract tests pass.
9. Run production smoke, authorization, ledger/journal invariant, collector,
   alert, backup/restore, and rollback checks.

Rollback disables the new feature flags and collector, restores the prior
application release, and leaves additive tables intact. Posted journal and
credit records are never deleted; operational corrections use reversals.
Database restore is reserved for a failed migration before new-version writes
are accepted.

## Open Questions

- Which external accounting product will receive the first CSV export, and what
  chart-of-accounts mapping does it require?
- Which currencies will be operationally reported first?
- What credit adjustment and manual journal amounts require a second approver?
- Which administrators receive finance, infrastructure, analytics, and incident
  permissions at launch?
- What are the approved raw-event, rollup, audit, finance, and export retention
  periods?
- Which cost rates are available from OneShowModel and future tool providers?
- What warning and critical thresholds are appropriate for the current
  2-vCPU/4-GB server and 50-GB disk?
- Which external uptime channel and incident notification recipients will be
  configured before paid launch?
