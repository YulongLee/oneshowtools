## MODIFIED Requirements

### Requirement: Account entry point

The portal SHALL provide visible, accessible, bilingual entry points for
registration, verification, sign-in, recovery, and Google authentication when
the corresponding feature is available.

#### Scenario: Visitor opens account access

- **WHEN** a visitor selects the login action
- **THEN** the portal SHALL open an accessible authentication experience
- **AND** it SHALL explain the shared-account benefits
- **AND** it SHALL allow switching between sign-in, registration, and recovery
- **AND** it SHALL preserve the intended destination after successful authentication

#### Scenario: Registration is unavailable

- **WHEN** commercial release gates disable registration
- **THEN** the portal SHALL show an honest localized unavailable state
- **AND** public tool discovery SHALL remain operable

### Requirement: Shared workspace preview

Visitors SHALL see an honest sign-in prompt instead of fabricated account,
activity, quota, subscription, or billing data; authenticated users SHALL see
only their server-resolved account and commercial state.

#### Scenario: Visitor views the default page

- **WHEN** no authenticated session exists
- **THEN** the portal SHALL not show mock personal activity or balance
- **AND** it SHALL explain that account data is available after sign-in

#### Scenario: Authenticated user views the workspace

- **WHEN** the server resolves a valid active session
- **THEN** the workspace SHALL show the user's real activity, credit, and
  subscription state
- **AND** it SHALL provide Account Center access to profile, security, privacy,
  billing, export, and deletion controls
