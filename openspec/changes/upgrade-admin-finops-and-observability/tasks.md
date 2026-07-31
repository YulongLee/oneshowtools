## 1. Production baseline and migration safety

- [ ] 1.1 Record the live release, feature flags, administrator grants, credit totals, commercial totals, task/tool counts, database/WAL size, backup status, and current server health
- [ ] 1.2 Create and verify a production database backup plus an application rollback point before adding schemas
- [ ] 1.3 Add numbered additive migrations for new permissions, finance journals/postings/periods/source links, cost rates, usage events/rollups, metric definitions/samples/rollups, alert rules/incidents, saved views, and exports
- [ ] 1.4 Extend migration and backup checks to cover ownership, foreign keys, unique idempotency keys, balanced journals, source links, rollup buckets, alert deduplication, and retention configuration
- [ ] 1.5 Test forward migration on a copy of production data and verify the previous application release can run while additive tables remain present

## 2. Administrator permissions and navigation

- [x] 2.1 Add deny-by-default permissions for credit read/manage/approve, finance read/manage/close, analytics read, infrastructure read, alerts manage, and metrics export
- [x] 2.2 Map existing administrator roles to least-privilege grants without removing current required access
- [ ] 2.3 Add authorization-matrix tests for every new read, write, approval, close/reopen, threshold, suppression, export, and incident action
- [x] 2.4 Refactor `/admin` navigation into Command Center, Customers, Credits & Ledger, Finance & Reconciliation, Tool Analytics, System Health, Jobs & Alerts, Tool Governance, Access Control, and Audit & Exports
- [x] 2.5 Ensure hidden navigation cannot bypass server-side permission checks through direct API requests
- [ ] 2.6 Add bilingual permission-denied, unavailable, stale, empty, loading, retry, success, and high-risk confirmation states

## 3. Command center read models

- [x] 3.1 Define registered metric names, units, formulas, windows, comparison behavior, currency, timezone, freshness, and unavailable reasons
- [x] 3.2 Implement bounded `/api/admin/v1/command-center` queries for user, credit, finance, tool, infrastructure, queue, and alert summaries
- [ ] 3.3 Add idempotent hourly and daily dashboard rollups with calculation versions and freshness metadata
- [ ] 3.4 Build command-center metric cards, trends, service-health summaries, critical alerts, and permission-scoped drill-down links using real data only
- [ ] 3.5 Add saved views with owner, permitted filters, stable names, and safe deletion
- [ ] 3.6 Add small synchronous CSV export limits and durable export jobs for larger result sets
- [ ] 3.7 Audit sensitive drill-down reads, saved-view changes, export creation, export download, expiry, and failure

## 4. Credits and governed ledger operations

- [ ] 4.1 Build paginated credit-ledger search by user, type, reference, tool, actor, approval, amount range, and date window
- [ ] 4.2 Implement grant, deduction, refund, reversal, expiry, and corrective commands as immutable entries with stable reason codes and idempotency
- [ ] 4.3 Persist before/after balances, original-entry links, actor, permission, reason, approval, and correlation ID for every administrative credit command
- [ ] 4.4 Enforce step-up and maker-checker approval thresholds without changing balances before approval
- [ ] 4.5 Implement credit invariant checks for duplicate references, orphaned sources, unexpected negative balances, incomplete reservation settlement, and unmatched refunds
- [ ] 4.6 Build the Credits & Ledger UI with balance lookup, ledger table, adjustment drawer, approval state, invariant results, and reconciliation history
- [ ] 4.7 Add concurrency and replay tests proving repeated credit commands cannot double-grant, double-deduct, or double-refund

## 5. Internal financial subledger

- [x] 5.1 Seed a minimal versioned internal chart of accounts for cash/provider receivable, deferred revenue, revenue, refunds, provider fees, model/tool cost, and control accounts
- [ ] 5.2 Implement balanced draft and post transactions for finance journals and postings with currency and source references
- [ ] 5.3 Prevent updates/deletes of posted journals and implement audited reversal-and-replacement corrections
- [ ] 5.4 Normalize journal source links for orders, payments, refunds, disputes, provider fees, credit grants/consumption, and provider/model costs with duplicate prevention
- [ ] 5.5 Implement accounting-period open, close, and approved reopen commands with step-up authorization and audit
- [ ] 5.6 Add versioned provider/model/tool cost rates with effective dates, units, currencies, sources, and recalculation versions
- [ ] 5.7 Implement finance reconciliation runs for journal balance, source coverage, payment/order/refund consistency, and credit/commercial linkage
- [ ] 5.8 Build Finance & Reconciliation pages for journals, postings, periods, sources, rate cards, actual/estimated values, exceptions, and bounded exports
- [x] 5.9 Label the module as an internal operational subledger and document external bookkeeping handoff limitations
- [ ] 5.10 Add tests for balanced posting, closed periods, duplicate sources, reversal, missing rates, currency isolation, and reconciliation exception resolution

## 6. Tool usage reporting contract

- [ ] 6.1 Document `usage-reporting/v1` schemas, allowed event types, state transitions, authentication, signing, opaque identifiers, idempotency, clock tolerance, and stable errors
- [ ] 6.2 Implement scoped tool credentials and signature verification without exposing credential material to admin APIs or logs
- [ ] 6.3 Implement `/api/integrations/v1/tools/:toolId/usage-events` with strict field allowlists and rejection of prompts, outputs, emails, IPs, filenames, arbitrary URLs/labels, tokens, credentials, and raw errors
- [ ] 6.4 Implement duplicate and supported out-of-order event handling for accepted, started, completed, failed, cancelled, and refunded events
- [ ] 6.5 Emit the same usage contract internally for all platform-hosted tools and link existing task, credit, refund, and model-invocation records
- [ ] 6.6 Add contract tests for valid lifecycle, replay, out-of-order delivery, ownership, version mismatch, invalid signature, prohibited fields, quota linkage, and redaction
- [ ] 6.7 Add compatibility documentation and a staged adoption checklist for independently deployed tools

## 7. Tool analytics and unit economics

- [ ] 7.1 Implement idempotent hourly/daily tool rollups for executions, unique/active users, lifecycle outcomes, latency histograms, credits, tokens, measured units, and reporting coverage
- [ ] 7.2 Apply effective versioned cost rates while preserving measured usage and label missing cost data unavailable
- [ ] 7.3 Implement estimated revenue allocation and gross-margin calculation with actual/estimated labels and calculation versions
- [ ] 7.4 Add `/api/admin/v1/analytics/tools` and tool-detail endpoints with bounded windows, allowed dimensions, comparison periods, freshness, and sample counts
- [ ] 7.5 Build Tool Analytics overview and detail pages with adoption, reliability, latency, credits, tokens, cost, margin, version/runtime breakdown, and safe error-code drill-down
- [ ] 7.6 Show published tools with missing or stale reporting as `not reporting` and create deduplicated reporting alerts
- [ ] 7.7 Add retention jobs for raw events and rollups that preserve finance links, alerts, and audit evidence
- [ ] 7.8 Add performance tests for approved launch-volume usage ingestion, rollups, and analytics queries on SQLite

## 8. Infrastructure metrics collection

- [x] 8.1 Implement a registered metric catalog with fixed names, units, types, bounded dimensions, retention classes, and thresholds
- [x] 8.2 Implement low-overhead host collection for CPU/load, memory, uptime, and disk capacity/pressure without reading server secrets
- [ ] 8.3 Instrument process uptime, RSS, heap, event-loop lag, restart state, HTTP request counts, status classes, latency histograms, and in-flight requests
- [ ] 8.4 Collect SQLite database/WAL size, busy errors, invariant duration, backup age/result, and migration state
- [ ] 8.5 Collect operational queue depth/age/retries/quarantine plus SMTP, OneShowModel, tool runtime, service, Nginx, and TLS health
- [x] 8.6 Run collection every minute outside the customer request path and persist an independent collector heartbeat
- [ ] 8.7 Add collection timeouts, redacted stable error codes, partial-success handling, and tests proving collection failure cannot fail customer requests
- [ ] 8.8 Add idempotent five-minute/hourly rollups and retention jobs with database-size and write-pressure safeguards

## 9. System health, alerts, and incidents

- [ ] 9.1 Add `/api/admin/v1/infrastructure/overview` and bounded metric-series endpoints with units, freshness, thresholds, and sample counts
- [ ] 9.2 Build System Health pages for server, application, database, backup, queues, email, model, tool runtimes, TLS, and service reachability
- [ ] 9.3 Seed safe warning/critical rules for disk, memory, event-loop lag, HTTP failures, database/WAL pressure, backup freshness, stuck jobs, dependency failure, and collector freshness
- [ ] 9.4 Implement minimum-sample evaluation, cooldown, stable deduplication keys, and automatic alert update/resolve behavior
- [ ] 9.5 Implement permission-scoped acknowledgement, assignment, bounded suppression, notes, resolution, and incident timelines
- [ ] 9.6 Link alerts to affected tools, services, jobs, reconciliation items, metrics, safe diagnostics, and runbooks
- [ ] 9.7 Audit threshold changes, suppression, acknowledgement, assignment, retry, resolution, and incident notes
- [ ] 9.8 Add tests for alert deduplication, severity transitions, stale monitoring, suppression expiry, authorization, and resolution while the underlying condition remains active

## 10. Security, privacy, and export controls

- [ ] 10.1 Implement explicit serializers proving admin, finance, analytics, infrastructure, and export APIs cannot return hashes, tokens, credentials, environment values, prompts, outputs, file contents, or raw provider errors
- [ ] 10.2 Apply origin/CSRF, session, rate-limit, enumeration, permission, step-up, approval, idempotency, and audit controls to all new write routes
- [ ] 10.3 Enforce aggregation and opaque-identifier rules for privacy-safe tool analytics
- [ ] 10.4 Store exports outside public routes with short-lived authorization, expiry, bounded filters, actor metadata, and download audit
- [ ] 10.5 Document and configure raw usage, metric, rollup, export, finance, incident, and audit retention
- [ ] 10.6 Add security tests for malicious metric labels, prohibited usage fields, forged tool signatures, cross-user access, export access, and diagnostic redaction

## 11. User-visible and operational validation

- [ ] 11.1 Add Chinese/English catalog parity tests for all new navigation, metrics, tables, statuses, confirmations, errors, and export labels
- [ ] 11.2 Test keyboard navigation, focus order, screen-reader labels, contrast, tables, charts, reduced motion, and narrow viewport behavior
- [ ] 11.3 Add end-to-end tests for super administrator, finance, operations, support, tool manager, and read-only workflows
- [ ] 11.4 Run production-volume query tests for credit ledger, finance journals, usage analytics, metric series, alerts, and exports
- [ ] 11.5 Run fault tests for SMTP/model/runtime outage, disk warning, stale backup, stuck jobs, collector failure, worker restart, database busy state, and alert recovery
- [ ] 11.6 Verify database backup/restore, additive migration, retention, invariant checks, application rollback, and continued customer/API compatibility

## 12. Staged production rollout

- [ ] 12.1 Add independent feature flags for command center, credit control, finance journals, usage ingestion, tool analytics, infrastructure collection, system health, and alert management
- [ ] 12.2 Deploy schemas and permissions with all new write flags disabled, then verify existing `/admin`, customer, tool, email, and model flows
- [ ] 12.3 Enable collection and usage emission in observe-only mode; measure CPU, memory, disk, SQLite write pressure, query latency, and collector freshness
- [ ] 12.4 Enable read-only Command Center, Credits, Finance, Tool Analytics, and System Health for the super administrator
- [ ] 12.5 Review metric formulas, chart-of-accounts mappings, cost rates, retention, thresholds, roles, approval limits, and alert ownership with the product owner
- [ ] 12.6 Progressively enable alert actions, governed credit writes, finance posting/period operations, exports, and external tool reporting by permission
- [ ] 12.7 Record production smoke, authorization, journal/ledger invariants, collector health, backup evidence, monitoring freshness, release version, and rollback evidence
- [ ] 12.8 Keep live payment providers disabled until separate provider, legal, refund, reconciliation, tax, and monitoring release gates are approved
