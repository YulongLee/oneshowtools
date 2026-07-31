## ADDED Requirements

### Requirement: Permission-driven administration navigation

The administration application SHALL expose command center, customer, credit,
finance, tool analytics, infrastructure, jobs/alerts, tool governance, access,
and audit modules only when the administrator has the corresponding persisted
permission. The server MUST independently enforce the same permissions.

#### Scenario: Administrator lacks finance permission

- **WHEN** an authenticated administrator without `finance.read` opens `/admin`
- **THEN** finance navigation SHALL be hidden
- **AND** direct finance API requests MUST return a permission-denied response

### Requirement: Real command center metrics

The command center SHALL display only metrics computed from persisted domain
records, usage events, or infrastructure samples and MUST include the selected
time window, comparison window, timezone, currency where applicable, metric
definition, and freshness.

#### Scenario: Metric source is stale

- **WHEN** the newest sample for a command-center metric exceeds its freshness threshold
- **THEN** the metric SHALL be labeled stale with its last successful sample time
- **AND** the interface MUST NOT substitute zero or mock data

### Requirement: Operational drill-down

Every summary metric or alert SHALL link to a permission-allowed filtered detail
view that preserves the metric window and scope.

#### Scenario: Operator drills into failed tool executions

- **WHEN** an authorized operator selects the failed-execution metric for a tool
- **THEN** the console SHALL open the matching tool-usage detail filtered to the same window
- **AND** the detail SHALL expose correlation IDs and safe error codes without customer content

### Requirement: Bounded saved views and exports

Authorized administrators SHALL be able to save named filter views and request
bounded exports. Export creation, download, expiry, and failure MUST be audited.

#### Scenario: Large export is requested

- **WHEN** a permitted administrator requests an export exceeding the synchronous limit
- **THEN** the platform SHALL create a durable export job
- **AND** the resulting file SHALL be permission scoped, short-lived, and unavailable from public file routes

### Requirement: Complete interface states

Every command-center module SHALL provide accessible loading, empty,
unavailable, stale, error, retry, permission-denied, and success states in
Simplified Chinese and English.

#### Scenario: Analytics collection has not started

- **WHEN** a tool has no verified usage events
- **THEN** the interface SHALL display `not reporting`
- **AND** it MUST NOT present the tool as zero usage or healthy
