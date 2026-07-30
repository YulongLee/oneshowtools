## ADDED Requirements

### Requirement: Verified email registration

The platform SHALL normalize email addresses, create email/password accounts
without an authenticated session, and require a single-use verification token
before the account can sign in or begin paid activity.

#### Scenario: New user registers with email

- **WHEN** a visitor submits a valid email, display name, and compliant password
- **THEN** the platform SHALL create an unverified account
- **AND** it SHALL return a generic verification-pending response
- **AND** it SHALL send a localized time-limited verification message
- **AND** it SHALL not create an authenticated session

#### Scenario: Existing email is registered again

- **WHEN** an email already associated with an account is submitted
- **THEN** the platform SHALL return the same public response as a new registration
- **AND** it SHALL not reveal whether the account exists

#### Scenario: Verification token is consumed

- **WHEN** an unused verification token is presented before expiry
- **THEN** the platform SHALL verify the account exactly once
- **AND** subsequent use of that token SHALL not change account state

### Requirement: Secure sign-in and recovery

The platform SHALL authenticate only active verified accounts and SHALL provide
enumeration-resistant password recovery using expiring single-use tokens.

#### Scenario: Unverified account attempts password sign-in

- **WHEN** an unverified account submits otherwise valid credentials
- **THEN** the platform SHALL not create a session
- **AND** it SHALL offer a safe verification-resend path

#### Scenario: Password reset is requested

- **WHEN** a visitor submits any syntactically valid email address
- **THEN** the platform SHALL return a generic localized response
- **AND** it SHALL send a reset message only when an eligible account exists

#### Scenario: Password is reset

- **WHEN** a valid reset token and compliant replacement password are submitted
- **THEN** the platform SHALL update the password hash
- **AND** it SHALL consume the token
- **AND** it SHALL revoke all previously active sessions

### Requirement: Email-owned platform identity

The platform SHALL expose verified email registration and password sign-in as
its only public authentication method and SHALL NOT expose social-provider
authentication routes.

#### Scenario: Visitor attempts social sign-in

- **WHEN** a visitor requests a retired social-authentication route
- **THEN** the platform SHALL return a not-found response
- **AND** it SHALL not create or link an account

### Requirement: Profile and credential control

Authenticated users SHALL be able to update non-sensitive profile data and
request guarded changes to sensitive identifiers.

#### Scenario: User updates profile and locale

- **WHEN** an authenticated user submits a valid display name or supported locale
- **THEN** the platform SHALL update only that user's profile
- **AND** subsequent authenticated views SHALL use the saved values

#### Scenario: User changes email address

- **WHEN** an authenticated user confirms their password and submits a new email
- **THEN** the platform SHALL require verification of the new address
- **AND** it SHALL not transfer the account to an already used address
- **AND** it SHALL notify the previous verified address

### Requirement: Session and account-state control

The platform SHALL issue hashed, expiring, revocable session credentials and
enforce active, suspended, deletion-pending, and deleted states on every
protected route.

#### Scenario: User reviews active sessions

- **WHEN** an authenticated user opens account security
- **THEN** the platform SHALL list session metadata without exposing raw tokens
- **AND** it SHALL allow revoking another session or all other sessions

#### Scenario: Suspended account presents a valid session

- **WHEN** a suspended account attempts a protected action
- **THEN** the platform SHALL deny the request
- **AND** it SHALL revoke or reject the session

### Requirement: Account export and deletion

The platform SHALL provide authenticated export and deletion workflows for
platform-owned account data while retaining records that must remain for fraud,
billing, tax, dispute, or legal obligations.

#### Scenario: User requests data export

- **WHEN** an authenticated user completes the required re-authentication
- **THEN** the platform SHALL produce a user-scoped export of identity, profile,
  subscription, credit, task metadata, file metadata, and audit history
- **AND** it SHALL not include another user's data or raw secrets

#### Scenario: User confirms account deletion

- **WHEN** an authenticated user re-authenticates and confirms deletion
- **THEN** the platform SHALL stop new paid usage immediately
- **AND** it SHALL revoke sessions
- **AND** it SHALL schedule deletion or anonymization according to retention policy

### Requirement: Authentication abuse protection

Authentication and sensitive account endpoints MUST enforce IP and
account-scoped limits, same-origin or CSRF protection, generic public errors,
and redacted security-event logging.

#### Scenario: Repeated authentication attempts exceed policy

- **WHEN** an actor exceeds the configured threshold
- **THEN** the platform SHALL temporarily reject further attempts
- **AND** it SHALL not reveal whether the target account exists
- **AND** it SHALL record a security event without passwords or raw tokens
