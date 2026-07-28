## ADDED Requirements

### Requirement: Google sign-in

The platform SHALL allow a visitor to authenticate through a configured Google
OAuth provider while retaining email registration as an independent option.

#### Scenario: New user continues with Google

- **WHEN** Google returns a valid identity with a verified email
- **THEN** the platform SHALL create one verified platform user
- **AND** it SHALL create a platform-owned secure session

#### Scenario: Google email matches an existing verified account

- **WHEN** Google returns the same verified email as an existing platform user
- **THEN** the platform SHALL link the Google identity to that user
- **AND** it SHALL not create a duplicate user

#### Scenario: Google identity cannot be trusted

- **WHEN** the OAuth response is invalid or does not provide a verified email
- **THEN** the platform SHALL deny authentication
- **AND** it SHALL not merge the identity with an existing account

### Requirement: Email registration

The platform SHALL allow a visitor to create one account with a normalized
email address and password without exposing whether an email is already
registered.

#### Scenario: New visitor registers

- **WHEN** a visitor submits a valid email address and compliant password
- **THEN** the platform SHALL create an unverified account
- **AND** it SHALL send a time-limited verification message
- **AND** it SHALL not create an authenticated session before verification

#### Scenario: Existing email is submitted

- **WHEN** registration is attempted with an email that already belongs to an account
- **THEN** the platform SHALL return the same public response used for a new registration
- **AND** it SHALL not create a duplicate account

#### Scenario: Registration input is invalid

- **WHEN** a visitor submits a malformed email or non-compliant password
- **THEN** the platform SHALL reject the request with localized field guidance

### Requirement: Email ownership verification

The platform SHALL require email ownership verification before an email and
password account can create an authenticated session.

#### Scenario: Valid verification link is used

- **WHEN** a user opens a valid unused verification link before it expires
- **THEN** the platform SHALL mark the account email as verified
- **AND** it SHALL invalidate the verification token
- **AND** it SHALL redirect to a localized success state

#### Scenario: Verification link is invalid

- **WHEN** a verification link is expired, malformed, or already used
- **THEN** the platform SHALL not verify the account
- **AND** it SHALL offer a localized way to request a new verification message

### Requirement: Email sign-in

The platform SHALL authenticate a verified active user with their normalized
email address and password.

#### Scenario: Valid credentials are submitted

- **WHEN** a verified active user submits valid credentials
- **THEN** the platform SHALL create a secure authenticated session
- **AND** it SHALL return the user to the intended platform destination

#### Scenario: Invalid credentials are submitted

- **WHEN** a sign-in attempt contains an unknown email or incorrect password
- **THEN** the platform SHALL reject the attempt with a generic localized error
- **AND** it SHALL not reveal which credential was incorrect

#### Scenario: Unverified user attempts sign-in

- **WHEN** a user with an unverified email submits valid credentials
- **THEN** the platform SHALL deny the session
- **AND** it SHALL offer to resend verification without exposing account internals

### Requirement: Secure session lifecycle

The platform SHALL manage authentication with revocable, expiring sessions
protected against common browser-based attacks.

#### Scenario: Authenticated request is received

- **WHEN** a protected platform route receives a valid unexpired session
- **THEN** the platform SHALL resolve the current user from the server-side session
- **AND** protected behavior SHALL use that server-resolved identity

#### Scenario: Session is invalid

- **WHEN** a protected route receives an expired, revoked, or malformed session
- **THEN** the platform SHALL deny protected access
- **AND** it SHALL direct the user to a localized sign-in state

#### Scenario: User signs out

- **WHEN** an authenticated user signs out
- **THEN** the current session SHALL be revoked
- **AND** the browser session credential SHALL be cleared

### Requirement: Password recovery

The platform SHALL provide a time-limited password recovery flow without
revealing whether an email address belongs to an account.

#### Scenario: Password reset is requested

- **WHEN** a visitor submits an email address to the password recovery form
- **THEN** the platform SHALL return a generic success response
- **AND** it SHALL send a reset message only when an eligible account exists

#### Scenario: Password is successfully reset

- **WHEN** a user submits a valid unused reset token and compliant new password
- **THEN** the platform SHALL update the credential
- **AND** it SHALL invalidate the token
- **AND** it SHALL revoke the user's other active sessions

### Requirement: Authentication abuse protection

The platform SHALL limit automated abuse of registration, verification,
sign-in, and password recovery endpoints.

#### Scenario: Repeated authentication attempts occur

- **WHEN** an actor exceeds configured request limits for an authentication flow
- **THEN** the platform SHALL temporarily reject further attempts
- **AND** it SHALL return a generic localized response
- **AND** it SHALL record a security event without storing plaintext passwords or tokens

### Requirement: Account state enforcement

The platform SHALL enforce active, suspended, and deleted account states across
all protected platform capabilities.

#### Scenario: Suspended account presents a valid session

- **WHEN** a suspended account attempts a protected action
- **THEN** the platform SHALL deny the action
- **AND** it SHALL revoke or reject the presented session
