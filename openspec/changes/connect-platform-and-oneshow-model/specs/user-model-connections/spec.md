## ADDED Requirements

### Requirement: Encrypted user model connections

The platform SHALL allow an authenticated active user to create model
connections using reviewed provider templates and SHALL encrypt every API key
at rest with a production master key that is not stored in the application
database.

#### Scenario: User saves an API key

- **WHEN** an authenticated user submits a valid supported connection and API key
- **THEN** the platform SHALL encrypt the key with a unique authenticated nonce
- **AND** SHALL bind the encrypted record to the user's opaque ID and connection ID
- **AND** SHALL return only an opaque connection ID, masked hint, state, and timestamps
- **AND** SHALL NOT return the raw key or ciphertext

#### Scenario: Encryption configuration is unavailable

- **WHEN** the credential-encryption master key is missing or invalid
- **THEN** BYOK creation and invocation SHALL fail closed
- **AND** existing unrelated platform capabilities SHALL remain available

### Requirement: User-scoped connection lifecycle

A user SHALL be able to list masked connections, test, select a default,
rotate, disable, and delete only connections they own.

#### Scenario: Owner manages a connection

- **WHEN** the owning user performs a valid lifecycle action
- **THEN** the platform SHALL apply it with version and audit metadata
- **AND** a disabled or deleted connection SHALL not accept new invocations

#### Scenario: Another user accesses a connection

- **WHEN** a different user reads, tests, selects, rotates, disables, deletes,
  or invokes a connection they do not own
- **THEN** the platform SHALL deny the request without revealing whether the
  connection exists or any of its metadata

#### Scenario: User rotates a key

- **WHEN** the owner submits a replacement API key
- **THEN** the platform SHALL create a new encrypted credential version
- **AND** SHALL invalidate the prior credential for subsequent invocations
- **AND** SHALL never display either raw key

### Requirement: Safe connection testing

Connection tests SHALL be server-side, bounded, rate-limited, non-content
probes and SHALL expose only normalized status and non-sensitive timing/error
classes.

#### Scenario: User tests a valid connection

- **WHEN** an owner requests a test within rate limits
- **THEN** the platform SHALL perform a low-cost capability probe with no user prompt or file
- **AND** SHALL persist only coarse status, timing, error class, and test time

#### Scenario: User exceeds the test limit

- **WHEN** a user exceeds the connection-test rate limit
- **THEN** the platform SHALL reject additional tests with a stable retry state
- **AND** SHALL not contact the upstream provider

### Requirement: Outbound endpoint protection

Customer model connections SHALL use reviewed HTTPS provider templates or an
administrator-approved endpoint policy and SHALL reject unsafe network targets
and redirects.

#### Scenario: Connection targets a private or metadata address

- **WHEN** a submitted or resolved endpoint targets loopback, private,
  link-local, multicast, cloud metadata, embedded credentials, or an unapproved
  port
- **THEN** the platform SHALL reject the connection before transmitting the API key

#### Scenario: Provider redirects to an unsafe address

- **WHEN** an approved endpoint redirects to a disallowed destination
- **THEN** the platform SHALL stop the request
- **AND** SHALL not forward authorization headers to the destination

### Requirement: Credential privacy and deletion

Raw keys, encrypted credentials, nonces, provider headers, and raw provider
failures SHALL be excluded from frontend state, APIs, logs, audit events,
metrics, customer exports, administrator exports, and support views.

#### Scenario: User exports account data

- **WHEN** a user downloads a platform data export
- **THEN** the export MAY include connection name, masked hint, state, and timestamps
- **AND** SHALL exclude raw keys, ciphertext, nonces, provider headers, and raw test responses

#### Scenario: Connection is deleted

- **WHEN** an owner deletes a connection
- **THEN** the credential material SHALL be revoked and erased according to policy
- **AND** historical tasks SHALL retain only non-secret routing and usage references
