## MODIFIED Requirements

### Requirement: Runtime management experience

The authenticated platform shell SHALL provide a bilingual, accessible Runtime
experience that shows OneShowModel readiness and lets users manage and select
their own supported model connections without exposing any managed or customer
credential.

#### Scenario: User views managed runtime

- **WHEN** an authenticated user opens Runtime
- **THEN** the interface SHALL show `OneShowModel`, supported capabilities, and a coarse readiness state
- **AND** SHALL NOT show the upstream provider, endpoint, model identifier, account, or credential

#### Scenario: User adds a personal connection

- **WHEN** an authenticated user chooses to add a model connection
- **THEN** the interface SHALL present reviewed provider templates and required fields
- **AND** SHALL explain that the API key is encrypted and cannot be displayed again
- **AND** SHALL keep the key out of browser storage and rendered responses after submission

#### Scenario: User selects task routing

- **WHEN** a tool supports managed and personal model routing
- **THEN** the interface SHALL let the user choose OneShowModel or an active owned connection
- **AND** SHALL persist the choice through an opaque connection reference
- **AND** SHALL explain the applicable credit and upstream-cost policy

#### Scenario: Runtime is unavailable

- **WHEN** model execution, OneShowModel, BYOK, or a selected connection is unavailable
- **THEN** the interface SHALL show an honest localized state and recovery action
- **AND** SHALL not fabricate output or disclose a raw provider error

### Requirement: Connected platform navigation

Every production navigation item and visible action in the customer and
administrator shells SHALL lead to a real implemented capability or an honest
server-controlled unavailable state.

#### Scenario: User activates a shell action

- **WHEN** a user activates search, account, runtime, tool, task, file, credit,
  billing, notification, or administrator action
- **THEN** the platform SHALL execute a real authorized contract or explain why it is unavailable
- **AND** SHALL not show mock success or inert controls
