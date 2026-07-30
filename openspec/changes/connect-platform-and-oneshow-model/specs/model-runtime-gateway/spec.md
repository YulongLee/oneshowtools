## ADDED Requirements

### Requirement: Managed model product identity

The platform SHALL expose its managed model only as `OneShowModel` and SHALL
keep the upstream provider, endpoint, model identifier, account metadata,
headers, credentials, and provider-native errors server-only.

#### Scenario: Customer views Runtime

- **WHEN** an authenticated customer opens the Runtime page
- **THEN** the platform SHALL identify the managed runtime as `OneShowModel`
- **AND** SHALL show only readiness, supported capabilities, and a coarse health state
- **AND** SHALL NOT return or render upstream provider identity or configuration

#### Scenario: Administrator inspects runtime health

- **WHEN** an authorized administrator reads model-runtime health
- **THEN** the response SHALL use the `OneShowModel` alias
- **AND** SHALL omit upstream provider, endpoint, model identifier, account, key, raw headers, raw error, prompt, and unrestricted output

### Requirement: Provider-neutral gateway contract

The platform SHALL route model-backed tool work through a versioned,
provider-neutral gateway contract with normalized request, output, usage,
finish, health, timeout, cancellation, and redacted error semantics.

#### Scenario: Tool invokes a supported capability

- **WHEN** an eligible tool submits a valid versioned model invocation
- **THEN** the gateway SHALL authorize the task, routing choice, entitlement, and quota
- **AND** SHALL invoke the selected connection through a reviewed adapter
- **AND** SHALL return a normalized result without provider-native objects

#### Scenario: Provider returns a transient failure

- **WHEN** an adapter receives a timeout, rate limit, or approved transient provider error
- **THEN** the gateway SHALL classify it without exposing the raw provider response
- **AND** SHALL apply bounded retry policy with correlation and idempotency

#### Scenario: Provider returns a permanent failure

- **WHEN** an adapter receives an authentication, policy, unsupported-capability, or invalid-request failure
- **THEN** the gateway SHALL not blindly retry
- **AND** SHALL return a stable redacted error class

### Requirement: Tool ownership boundary

Individual tools SHALL remain the source of truth for their prompts,
model-input construction, output interpretation, and domain workflow; the
platform gateway SHALL own connection routing, secure invocation, normalized
usage, operational state, and settlement correlation.

#### Scenario: Tool adopts the shared gateway

- **WHEN** a model-backed tool migrates to the gateway
- **THEN** its prompt and domain logic SHALL remain in tool-owned code
- **AND** connection records SHALL NOT store that tool's prompt
- **AND** the gateway SHALL store only the minimum operational invocation metadata

### Requirement: Managed runtime failure behavior

OneShowModel unavailability SHALL NOT fabricate results, reveal upstream
identity, corrupt task history, or charge credits more than once.

#### Scenario: OneShowModel is disabled or unhealthy

- **WHEN** a customer starts an eligible managed-model task while OneShowModel cannot execute it
- **THEN** the task SHALL enter an honest unavailable, retrying, or failed state
- **AND** any reserved credits SHALL be released exactly once under policy
- **AND** non-model tools and public discovery SHALL remain available
