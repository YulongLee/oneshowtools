## ADDED Requirements

### Requirement: Governed tool catalog lifecycle

The platform SHALL let authorized tool managers create and version bilingual
tool metadata and move a tool through draft, staged, published, maintenance,
and retired states with validation, audit, and rollback.

#### Scenario: Tool manager publishes a valid staged version
- **WHEN** an authorized tool manager confirms a staged tool version whose required contracts and health checks pass
- **THEN** the platform SHALL make that version discoverable according to its visibility
- **AND** SHALL retain the prior version for audit and rollback

#### Scenario: Tool version fails readiness validation
- **WHEN** required bilingual metadata, runtime contract, pricing, or health is missing
- **THEN** the platform SHALL block publication
- **AND** SHALL identify the failed readiness gates

### Requirement: Versioned tool integration contracts

Every managed tool SHALL identify supported platform contract versions for
launch context, entitlement checks, usage reporting, and runtime health, using
opaque user identifiers and scoped service credentials.

#### Scenario: Tool reports usage
- **WHEN** an authenticated tool reports a usage event with a supported contract version and idempotency key
- **THEN** the platform SHALL validate authorization, quota, ownership, and schema
- **AND** SHALL record the usage event exactly once

#### Scenario: Tool sends an unsupported contract
- **WHEN** a tool calls an integration endpoint with an unsupported version
- **THEN** the platform SHALL reject the event without consuming credits
- **AND** SHALL expose a redacted integration error to authorized operators

### Requirement: Runtime and maintenance governance

The admin console SHALL expose runtime readiness, recent health, failure rate,
latency summary, maintenance state, and last successful integration activity
without exposing provider secrets or tool-owned prompts.

#### Scenario: Operator enables maintenance mode
- **WHEN** an authorized operator confirms maintenance mode with a reason and expected duration
- **THEN** the platform SHALL prevent new launches according to policy
- **AND** SHALL preserve existing task and credit history
