## ADDED Requirements

### Requirement: Real commercial and operational dashboards

The admin console SHALL display real, time-windowed metrics for users,
verification, active usage, tasks, tools, credits, subscriptions, payments,
email, runtime, files, queues, failures, and reconciliation; it MUST label
unavailable data and MUST NOT substitute mock values.

#### Scenario: Operator changes the dashboard time window
- **WHEN** an authorized operator selects a supported time window
- **THEN** the platform SHALL recompute metrics and trends from persisted events
- **AND** SHALL preserve currency, timezone, and metric definitions

### Requirement: Durable operational queues

Email, export, deletion, webhook, reconciliation, and integration work SHALL
have durable job state, attempt count, lease, next-attempt time, correlation ID,
redacted error code, and quarantine state.

#### Scenario: Retryable job fails
- **WHEN** a claimed job fails with a retryable error
- **THEN** the platform SHALL release or reschedule it with bounded backoff
- **AND** SHALL avoid repeating committed side effects

#### Scenario: Operator retries a quarantined job
- **WHEN** an authorized operator retries a quarantined job after recording a resolution note
- **THEN** the platform SHALL create an auditable new attempt
- **AND** SHALL preserve the prior failed attempts

### Requirement: Complete administrative audit envelope

Every sensitive administrative read and mutation SHALL append an audit event
containing actor, role, permission, action, target, reason, correlation ID,
redacted before/after state, approval, result, and timestamp.

#### Scenario: High-risk action succeeds
- **WHEN** a stepped-up and approved high-risk action commits
- **THEN** the platform SHALL write the resulting audit event atomically with or immediately after the domain change
- **AND** SHALL make the event searchable and exportable to authorized auditors

#### Scenario: Audit export is requested
- **WHEN** an authorized auditor requests an export with filters
- **THEN** the platform SHALL produce a bounded, integrity-verifiable export
- **AND** SHALL audit access to the exported records
