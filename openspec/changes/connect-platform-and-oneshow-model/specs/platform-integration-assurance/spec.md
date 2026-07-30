## ADDED Requirements

### Requirement: Visible-action backend coverage

Every visible customer and administrator action SHALL either invoke a real,
authorized backend contract and source of truth or render an explicit
server-controlled unavailable state; the platform SHALL NOT present mock
success, fabricated personal data, or an inert production control.

#### Scenario: CI validates the platform action matrix

- **WHEN** the application adds or changes a visible interactive action
- **THEN** automated coverage SHALL map the action to an API, authorization
  rule, persistence/provider effect, error state, and acceptance test
- **AND** CI SHALL fail when a production action has no implemented contract

#### Scenario: A capability is release-gated

- **WHEN** a required provider, policy, worker, secret, or release flag is unavailable
- **THEN** the UI SHALL show an honest localized unavailable state
- **AND** the API SHALL fail closed with a stable error
- **AND** unrelated capabilities SHALL remain available

### Requirement: Durable task execution

Model-backed work SHALL execute through durable, leased, idempotent jobs that
recover from application and worker restarts.

#### Scenario: Worker claims a queued task

- **WHEN** an eligible queued task and execution job exist
- **THEN** one worker SHALL atomically acquire a bounded lease
- **AND** SHALL heartbeat while executing
- **AND** concurrent workers SHALL not execute the same active lease

#### Scenario: Worker restarts during execution

- **WHEN** a worker stops and its lease expires before terminal settlement
- **THEN** another worker SHALL recover the job according to retry policy
- **AND** provider calls, output files, credits, and audit settlement SHALL remain idempotent

#### Scenario: Job exceeds retry policy

- **WHEN** a job exhausts its permitted retry attempts
- **THEN** it SHALL enter a quarantined or terminal failed state
- **AND** reserved credits SHALL be released exactly once under policy
- **AND** an authorized operator SHALL be able to inspect and retry it with an audited reason

### Requirement: Unified task and settlement lifecycle

Tool-page execution and Task Center execution SHALL share one persisted source
of truth for ownership, input metadata, status, attempts, output, files,
cancellation, credit settlement, and audit.

#### Scenario: Tool page completes a task

- **WHEN** a user completes a supported tool from its direct tool page
- **THEN** the resulting task SHALL appear in Task Center
- **AND** any output file SHALL appear in File Center
- **AND** credit history SHALL reference the same task ID

#### Scenario: Duplicate execution delivery occurs

- **WHEN** the same task or job delivery is processed more than once
- **THEN** the platform SHALL not create duplicate output files
- **AND** SHALL not double-charge, double-refund, or produce conflicting terminal states

### Requirement: Full-platform release evidence

The platform SHALL record test, migration, backup, health, provider, security,
monitoring, smoke, and rollback evidence before enabling managed or customer
model execution in production.

#### Scenario: OneShowModel is enabled

- **WHEN** operators enable OneShowModel for a production cohort
- **THEN** existing application, adapter, durable-worker, idempotency, quota,
  redaction, migration, browser, and production smoke gates SHALL have passed
- **AND** a one-step runtime disable and application rollback SHALL be documented

#### Scenario: BYOK is enabled

- **WHEN** operators enable customer model connections
- **THEN** encryption, ownership, SSRF, redirect, DNS, rate-limit, export,
  deletion, serializer, and browser gates SHALL have passed
- **AND** live payment and destructive account-deletion flags SHALL remain unchanged
