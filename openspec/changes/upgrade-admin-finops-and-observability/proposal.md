## Why

The current OneShowTools administration console already supports basic customer,
role, credit, tool, and operational actions, but it does not yet provide one
reliable control center for financial accountability, per-tool usage analysis,
or production infrastructure health. As the platform adds more AI tools and
starts commercial operations, administrators need to understand who changed
credits, how every tool is used and costed, whether money and credits reconcile,
and whether the server is healthy without consulting the database or server
manually.

This is a platform-level change owned by OneShowTools. Individual tools continue
to own their prompts, models, inference pipelines, and domain workflows; they
only report versioned, privacy-safe usage and health events to the platform.

## What Changes

- Redesign `/admin` as a permission-driven operations control center with clear
  modules for executive overview, users, access control, credits, financial
  records, tool usage, infrastructure, jobs and alerts, tool governance, and
  audit. All pages use real persisted data and explicitly label unavailable or
  stale metrics instead of displaying mock values.
- Expand role and permission control so super administrators can add other
  administrators and separately grant customer support, credit operations,
  finance, tool analytics, infrastructure monitoring, incident response, tool
  governance, privacy, and audit capabilities. High-risk writes remain
  deny-by-default, reasoned, idempotent, and auditable.
- Add a dedicated credit control workspace for balance lookup, immutable ledger
  search, grant/deduction/refund/reversal/expiry entries, before-and-after
  balances, approval thresholds, anomaly detection, reconciliation, and
  export. No administrator can directly overwrite a user's computed balance.
- Add a provider-neutral internal financial subledger for orders, payments,
  refunds, disputes, provider fees, credits issued, credits consumed, and model
  or tool costs. Journal postings are balanced, append-only after posting,
  linked to source events, grouped into accounting periods, and exportable for
  external bookkeeping. This is an operational subledger, not tax filing or a
  replacement for licensed accounting software.
- Add privacy-safe per-tool usage analytics: executions, unique users, active
  users, success and failure rates, latency percentiles, credits consumed and
  refunded, model tokens, estimated provider cost, revenue allocation, gross
  margin estimate, retention, and version/runtime breakdown. Raw prompts,
  generated content, uploaded files, API keys, and model secrets are excluded.
- Introduce a versioned tool usage-reporting contract so platform-hosted and
  independently deployed tools report accepted, started, completed, failed,
  refunded, token, cost, latency, and health events with opaque user IDs,
  correlation IDs, idempotency keys, contract versions, and signed/scoped
  credentials.
- Add production infrastructure monitoring for the current Alibaba Cloud
  server: CPU/load, memory, disk capacity, disk pressure, process uptime and
  memory, event-loop lag, HTTP throughput/latency/error rate, SQLite database
  size/WAL/backup freshness, job queues, email delivery, OneShowModel health,
  tool runtime health, TLS expiry, and service restart state.
- Add bounded metric retention and rollups suitable for the current
  single-server SQLite deployment, with a future export adapter for an external
  metrics backend. High-cardinality labels and customer content are prohibited.
- Add configurable warning/critical thresholds, alert deduplication,
  acknowledgement, ownership, resolution notes, incident timelines, and links
  from every alert to the affected tool, service, job, or metric.
- Add scheduled invariants for credit balances, source-to-ledger references,
  balanced financial journals, payment/credit reconciliation, stuck tasks,
  missing usage completion events, database/backup health, and metric
  collection freshness.
- Add bilingual metric definitions, date windows, timezone/currency labels,
  filtering, saved views, CSV export, drill-down navigation, responsive layouts,
  and accessible loading, empty, stale, error, and permission-denied states.
- Add migrations, collection workers, APIs, tests, dashboards, runbooks,
  backup/restore evidence, staged production rollout, and rollback controls.
- **Non-goals:** implementing tool-specific AI workflows; storing raw prompts,
  model outputs, unrestricted files, secrets, or API keys in analytics; enabling
  live Stripe, Alipay, or WeChat Pay; tax filing, statutory accounting, payroll,
  or bank settlement; replacing provider portals; distributed tracing across
  arbitrary third-party infrastructure; or migrating production to PostgreSQL
  as part of this change.
- **Backward compatibility:** current users, administrator memberships, roles,
  sessions, credit history, orders, tasks, files, tool routes, model routing,
  and payment-provider flags remain intact. Existing admin APIs remain available
  during migration behind the same or stricter permissions. New usage and
  monitoring contracts are additive and versioned; tools that do not yet report
  them are shown as `not reporting`, never as healthy or zero-usage.

## Capabilities

### New Capabilities

- `admin-command-center`: Permission-driven information architecture, real
  operational overview, drill-down navigation, metric definitions, saved views,
  exports, and safe administrative interaction states.
- `credit-and-finance-control`: Governed credit operations, immutable credit
  history, balanced internal financial journals, periods, source references,
  reconciliation, approvals, anomaly detection, and bookkeeping exports.
- `tool-usage-observability`: Versioned privacy-safe usage reporting and
  per-tool analytics for adoption, reliability, quota, token usage, cost, and
  estimated unit economics.
- `infrastructure-monitoring`: Server, application, database, queue, email,
  model, tool runtime, backup, and TLS metrics with retention, thresholds,
  alerts, incident handling, and monitoring freshness.

### Modified Capabilities

- `platform-shell`: Extend the separate bilingual administration application
  with permission-scoped navigation for credits, finance, tool analytics,
  infrastructure, alerts, and audit while keeping administrative state out of
  customer-facing pages.

## Impact

- **Affected code and data:** `src/AdminApp.jsx`, admin styles and translations,
  `/api/admin/v1/*`, role/permission seeds, credit ledger services, normalized
  commercial records, tool runtime and job services, new metric/event
  collectors, SQLite migrations and rollups, systemd deployment, tests, exports,
  and operational documentation.
- **Affected tools and integration contracts:** all tools may adopt the additive
  `usage-reporting/v1` and `runtime-health/v1` contracts. Existing tools continue
  to run before adoption, but advanced analytics remain unavailable until their
  reporting is verified.
- **Source of truth:** the immutable credit ledger remains the source of truth
  for balances; normalized orders/payments/refunds remain the source for
  commercial state; balanced journal postings form the internal financial
  subledger; usage events and rollups form product analytics; sampled metrics
  form infrastructure history; alerts never replace their underlying source.
- **Security:** new permissions are deny-by-default. Credit writes, manual
  financial journals, period close/reopen, threshold changes, administrator
  access, and alert suppression require explicit authorization, reasons,
  step-up/approval where configured, idempotency, and append-only audit.
- **Privacy:** usage and infrastructure telemetry exclude prompts, outputs,
  file contents, email addresses, IP addresses by default, tokens, and
  credentials. Opaque identifiers, aggregation thresholds, bounded retention,
  permission-scoped exports, and sensitive-read audits apply.
- **Quota:** credits remain append-only and computed as the sum of ledger
  entries. Analytics must distinguish reservation, consumption, refund,
  reversal, and expiry without introducing a second balance.
- **Billing:** payment providers remain disabled unless separately approved.
  The new financial subledger records normalized events and reconciliation
  status but cannot initiate charges by itself.
- **Operations:** the current Alibaba Cloud server gains a low-overhead local
  collector and scheduled invariants. Collection failure must not interrupt
  customer requests; stale monitoring must generate its own visible alert.
- **Dependencies:** production database backup/restore, scheduled worker
  execution, server-level read-only metrics access, SMTP/model/runtime health
  checks, approved accounting mappings and cost rates, alert thresholds,
  retention policy, and owner assignment for operational alerts.
