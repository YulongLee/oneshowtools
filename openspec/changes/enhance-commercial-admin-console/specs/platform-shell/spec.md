## MODIFIED Requirements

### Requirement: Account entry point

The platform SHALL provide a visible customer login entry point and SHALL keep
the administration application behind a separate authenticated and authorized
boundary. Both interfaces SHALL support Simplified Chinese and English without
exposing administrator state on customer-facing pages.

#### Scenario: Visitor opens login

- **WHEN** a visitor selects the login action
- **THEN** the platform SHALL open an accessible login dialog
- **AND** the dialog SHALL mention synchronized history, favorites, or credits
- **AND** the visitor SHALL be able to close the dialog

#### Scenario: Authorized administrator opens the admin application

- **WHEN** an authenticated administrator with an active membership and MFA opens `/admin`
- **THEN** the platform SHALL render the administration navigation permitted by the administrator's role
- **AND** customer-facing pages SHALL not receive restricted administration data

#### Scenario: Customer opens the admin application

- **WHEN** an authenticated customer without an active administrator membership opens `/admin`
- **THEN** the platform SHALL deny administrative access
- **AND** SHALL not reveal customer, billing, tool, or operational administration data
