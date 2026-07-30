## ADDED Requirements

### Requirement: Permission-scoped customer 360 view

The platform SHALL provide authorized operators a paginated customer view
containing only the sections permitted for their role, with sensitive access
recorded in the audit trail.

#### Scenario: Support operator opens a customer
- **WHEN** a support operator selects a customer search result
- **THEN** the platform SHALL show permitted identity, verification, account state, sessions, tasks, credits, and support history
- **AND** SHALL omit password hashes, tokens, provider credentials, and file contents

#### Scenario: Customer cannot be found
- **WHEN** a search or direct lookup has no permitted matching customer
- **THEN** the platform SHALL return a neutral not-found state
- **AND** SHALL not reveal restricted account existence

### Requirement: Governed customer lifecycle actions

Authorized operators SHALL be able to resend verification or recovery email,
revoke sessions, suspend or restore an account, and manage support notes through
explicit commands with reason, idempotency, and audit.

#### Scenario: Operator suspends a customer
- **WHEN** an authorized operator confirms suspension with a reason code and note
- **THEN** the platform SHALL mark the account suspended
- **AND** SHALL revoke all active customer sessions
- **AND** SHALL record the before and after account state

#### Scenario: Duplicate support command is retried
- **WHEN** the same idempotency key is submitted again for a customer action
- **THEN** the platform SHALL return the original result
- **AND** SHALL not repeat the side effect

### Requirement: Internal support history

The platform SHALL maintain append-only, permission-scoped support notes and
case events separately from customer-visible profile data.

#### Scenario: Operator adds a support note
- **WHEN** an authorized operator records a categorized note
- **THEN** the platform SHALL store the author, timestamp, category, and note
- **AND** SHALL exclude the note from customer account exports unless policy explicitly requires inclusion
