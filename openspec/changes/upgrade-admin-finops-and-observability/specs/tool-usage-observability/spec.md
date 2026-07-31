## ADDED Requirements

### Requirement: Versioned tool usage event contract

The platform SHALL accept signed, scoped, versioned usage events for registered
tools with a stable usage ID, event ID, idempotency key, correlation ID, opaque
user ID, tool/runtime version, event type, timestamp, latency, credit amounts,
token counts, and permitted cost units.

#### Scenario: External tool reports a completed execution

- **WHEN** an authorized tool submits a valid `usage-reporting/v1` completed event
- **THEN** the platform SHALL persist the event once and update the corresponding rollup
- **AND** SHALL return the same successful result for an identical idempotent retry

### Requirement: Legal usage lifecycle

The platform SHALL validate accepted, started, completed, failed, cancelled, and
refunded transitions while safely tolerating duplicate and supported
out-of-order delivery.

#### Scenario: Completion arrives before start

- **WHEN** a completion event arrives before its start event within the supported reconciliation window
- **THEN** the platform SHALL retain the completion without inventing a start time
- **AND** SHALL reconcile the lifecycle when the matching start event arrives

### Requirement: Privacy-safe usage schema

Usage reporting MUST reject raw prompts, outputs, email addresses, IP addresses,
filenames, unrestricted URLs, API keys, tokens, credentials, arbitrary labels,
and raw provider error bodies.

#### Scenario: Tool includes a prompt field

- **WHEN** a usage event contains a prohibited customer-content field
- **THEN** the platform MUST reject the event with a stable schema error
- **AND** MUST NOT persist the prohibited value in usage, error, or audit records

### Requirement: Per-tool adoption and reliability analytics

Authorized administrators SHALL be able to view executions, unique users,
active users, completion/failure/cancellation/refund rates, latency percentiles,
credits reserved/consumed/refunded, version breakdown, and runtime health for
each tool and selected time window.

#### Scenario: Administrator compares tool versions

- **WHEN** an analytics administrator selects two tool versions and a supported time window
- **THEN** the platform SHALL return independently calculated usage, reliability, and latency metrics
- **AND** SHALL include data freshness and sample counts

### Requirement: Token cost and estimated unit economics

When measured token or provider units and an applicable versioned rate exist,
the platform SHALL calculate estimated provider cost and estimated gross margin
without overwriting the measured usage. Missing rate data MUST be labeled
unavailable, not zero.

#### Scenario: Model rate is missing

- **WHEN** usage contains token counts but no effective cost rate exists
- **THEN** the tool analytics view SHALL show the measured tokens
- **AND** SHALL label cost and margin unavailable for the affected records

### Requirement: Bounded rollups and retention

Raw tool usage events and hourly/daily rollups SHALL follow configured retention
periods, and aggregation MUST be idempotent by bucket, tool, version, runtime,
and calculation version.

#### Scenario: Raw usage retention expires

- **WHEN** raw usage events exceed the configured retention period after their rollups are verified
- **THEN** the retention job SHALL remove only eligible raw events
- **AND** SHALL preserve rollups, financial source links, alerts, and audit records

### Requirement: Reporting freshness and coverage

The platform SHALL calculate reporting coverage and last-event freshness for
every published tool.

#### Scenario: Published tool stops reporting

- **WHEN** a published tool with prior verified reporting exceeds its freshness threshold
- **THEN** the platform SHALL mark analytics stale
- **AND** SHALL create or update a deduplicated missing-reporting alert
