## ADDED Requirements

### Requirement: Policy and consent history

The platform SHALL store versioned policy documents and customer consent events
with locale, purpose, source, timestamp, and policy version and SHALL expose
only permission-scoped compliance views to administrators.

#### Scenario: Registration requires a new policy version
- **WHEN** a customer registers or re-consent is required
- **THEN** the platform SHALL record the accepted policy versions and timestamp
- **AND** SHALL make that history available to authorized privacy operators

### Requirement: Executable export and deletion lifecycle

The platform SHALL operate durable export and deletion jobs with validation,
retention rules, cancellation windows, retries, legal holds, execution results,
and auditable failure handling.

#### Scenario: Deletion waiting period expires
- **WHEN** an eligible deletion request reaches its execution time without cancellation or legal hold
- **THEN** the platform SHALL execute the approved deletion or anonymization policy
- **AND** SHALL retain only the legally required redacted evidence

#### Scenario: Legal hold blocks deletion
- **WHEN** an authorized privacy operator applies a valid legal hold
- **THEN** the platform SHALL pause destructive processing
- **AND** SHALL record the authority, reason, scope, and review date

### Requirement: Security anomaly operations

The admin console SHALL present redacted authentication, session, administrator,
email-abuse, and access anomalies and SHALL allow authorized operators to
acknowledge, investigate, and resolve them with correlated audit history.

#### Scenario: Suspicious administrator activity is detected
- **WHEN** configured administrator authentication or action thresholds are exceeded
- **THEN** the platform SHALL raise a high-severity anomaly
- **AND** SHALL support policy-defined session revocation or access suspension
