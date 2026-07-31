## ADDED Requirements

### Requirement: Low-overhead production metric collection

The platform SHALL collect registered server, process, HTTP, database, queue,
email, model, tool-runtime, backup, TLS, and service metrics outside the
customer request path at a configurable bounded cadence.

#### Scenario: Metric collection fails

- **WHEN** one collection cycle fails
- **THEN** customer requests SHALL continue without waiting for collection
- **AND** the collector SHALL record a redacted failure and update freshness state

### Requirement: Registered metrics and bounded dimensions

Metric ingestion SHALL accept only centrally registered metric names, units,
types, and bounded label dimensions. Customer identifiers, arbitrary labels,
secrets, and customer content MUST be rejected.

#### Scenario: Collector submits an unregistered label

- **WHEN** a sample includes a label outside the metric definition allowlist
- **THEN** the platform MUST reject that sample
- **AND** MUST NOT persist the rejected label value

### Requirement: Server and application health visibility

Authorized administrators SHALL be able to view CPU/load, memory, disk,
uptime, process memory, event-loop lag, restarts, HTTP throughput, HTTP latency,
HTTP error rate, and in-flight requests with units, windows, freshness, and
warning/critical state.

#### Scenario: Disk usage crosses critical threshold

- **WHEN** disk utilization remains above the configured critical threshold for the minimum sample count
- **THEN** the system-health page SHALL show a critical state
- **AND** the platform SHALL create or update the corresponding deduplicated alert

### Requirement: Database, backup, queue, and dependency health

The console SHALL show SQLite database and WAL size, busy errors, invariant
duration, backup age/result, queue depth/oldest age/retries/quarantine, SMTP
health, OneShowModel health, tool runtime health, TLS expiry, and service
reachability.

#### Scenario: Backup becomes stale

- **WHEN** no verified backup exists within the configured recovery objective
- **THEN** the infrastructure module SHALL mark backup health critical
- **AND** SHALL link the alert to backup evidence and the recovery runbook

### Requirement: Metric retention and rollups

The platform SHALL retain one-minute, five-minute, and hourly infrastructure
data only for their configured periods and SHALL generate idempotent rollups
before removing eligible raw samples.

#### Scenario: Rollup job retries

- **WHEN** a rollup job restarts after partially processing a time bucket
- **THEN** it SHALL produce one deterministic rollup per metric, scope, and bucket
- **AND** SHALL not double-count samples

### Requirement: Alert and incident lifecycle

Metric rules SHALL support warning and critical thresholds, minimum samples,
cooldown, deduplication, owner role, acknowledgement, assignment, bounded
suppression, notes, resolution, and incident timelines.

#### Scenario: Operator acknowledges an alert

- **WHEN** an authorized incident operator acknowledges an open alert with a note
- **THEN** the alert SHALL retain its underlying active condition and assigned owner
- **AND** the acknowledgement SHALL be appended to audit and incident history

### Requirement: Monitoring freshness

The platform SHALL monitor the collector heartbeat and SHALL distinguish
healthy values from missing or stale monitoring data.

#### Scenario: Collector stops sending samples

- **WHEN** the collector heartbeat exceeds its critical freshness threshold
- **THEN** the console MUST show monitoring unavailable rather than healthy
- **AND** SHALL create a collector-stale alert through an independent evaluation path

### Requirement: Safe metric export

Authorized infrastructure administrators SHALL be able to export bounded,
aggregated metric windows through a stable adapter without exporting server
environment variables, credentials, raw logs, or customer content.

#### Scenario: External metrics adapter is disabled

- **WHEN** no external metrics backend is configured
- **THEN** local monitoring and retention SHALL continue normally
- **AND** the console SHALL label external export as disabled without treating it as a service failure
