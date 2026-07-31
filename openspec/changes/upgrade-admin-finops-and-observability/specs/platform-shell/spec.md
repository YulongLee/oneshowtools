## ADDED Requirements

### Requirement: Separate operations control center

The platform SHALL expose `/admin` as a separate bilingual administration
application with permission-scoped navigation for command center, customers,
credits, finance, tool analytics, infrastructure, jobs/alerts, tool governance,
access control, and audit. Administrative data MUST NOT be included in
customer-facing page payloads.

#### Scenario: Customer opens the main platform

- **WHEN** a non-administrator opens a customer-facing OneShowTools route
- **THEN** the platform SHALL render only customer-authorized data and navigation
- **AND** MUST NOT expose admin metrics, finance records, server health, permissions, or alert state

#### Scenario: Authorized administrator uses a narrow viewport

- **WHEN** an authorized administrator opens `/admin` on a narrow viewport
- **THEN** permitted navigation and critical alerts SHALL remain reachable
- **AND** dense tables SHALL provide a usable responsive or horizontally contained presentation without page overflow
