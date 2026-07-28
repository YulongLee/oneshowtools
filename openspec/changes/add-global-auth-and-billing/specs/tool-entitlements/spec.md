## ADDED Requirements

### Requirement: Versioned entitlement contract

The platform SHALL expose a versioned server-to-server contract for registered
tools to verify user access and coordinate credit usage.

#### Scenario: Registered tool calls a supported version

- **WHEN** a registered tool submits an authenticated request to a supported contract version
- **THEN** the platform SHALL process the request according to that version's documented behavior

#### Scenario: Tool calls an unsupported version

- **WHEN** a tool requests an unsupported contract version
- **THEN** the platform SHALL reject the request with a machine-readable version error
- **AND** it SHALL not change entitlement or credit state

### Requirement: Tool identity

The platform SHALL authenticate each integrating tool independently from end-user sessions.

#### Scenario: Tool presents valid service credentials

- **WHEN** a registered tool presents valid non-revoked service credentials
- **THEN** the platform SHALL resolve the tool's stable identifier and allowed operations

#### Scenario: Tool identity is invalid

- **WHEN** service credentials are missing, expired, revoked, or invalid
- **THEN** the platform SHALL deny the integration request
- **AND** it SHALL not expose user or billing data

### Requirement: User access decision

The platform SHALL return a minimal access decision for a registered tool and
authenticated user without exposing unnecessary identity or billing data.

#### Scenario: Tool checks eligible user

- **WHEN** a registered tool requests access for an active verified user
- **THEN** the platform SHALL return whether access is allowed
- **AND** it SHALL include only the stable user reference, locale, applicable plan features, and policy data required by that tool

#### Scenario: User is not eligible

- **WHEN** a user is unauthenticated, suspended, or lacks a required entitlement
- **THEN** the platform SHALL deny access with a machine-readable reason

### Requirement: Idempotent usage authorization

The platform SHALL require an idempotency key for every credit-affecting tool
operation.

#### Scenario: Tool reserves credits

- **WHEN** a registered tool submits a new usage key, user reference, tool reference, and valid cost
- **THEN** the platform SHALL return one reservation result for that key

#### Scenario: Tool retries a reservation

- **WHEN** the same tool retries the same usage key with identical parameters
- **THEN** the platform SHALL return the original reservation result
- **AND** it SHALL not reserve credits twice

#### Scenario: Tool reuses a key with different parameters

- **WHEN** a tool reuses a usage key with conflicting parameters
- **THEN** the platform SHALL reject the request
- **AND** it SHALL record a contract violation

### Requirement: Usage settlement

The platform SHALL let a tool commit or release a valid outstanding credit
reservation exactly once.

#### Scenario: Tool completes work

- **WHEN** a registered tool commits a valid reservation
- **THEN** the platform SHALL convert the reservation into final credit consumption
- **AND** it SHALL record the tool, user, usage key, amount, and timestamp

#### Scenario: Reservation expires

- **WHEN** a reservation exceeds its configured settlement window without commitment
- **THEN** the platform SHALL release it according to policy
- **AND** it SHALL record the timeout outcome

### Requirement: Integration auditability

The platform SHALL record security and credit-affecting integration events with
correlation identifiers while excluding secrets and sensitive user content.

#### Scenario: Administrator investigates usage

- **WHEN** an authorized administrator reviews a disputed tool charge
- **THEN** the platform SHALL provide the related tool, user reference, usage key, ledger entries, and reconciliation status
- **AND** it SHALL not reveal tool inputs, outputs, passwords, payment credentials, or service secrets

