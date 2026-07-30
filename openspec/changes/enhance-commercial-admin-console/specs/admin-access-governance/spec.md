## ADDED Requirements

### Requirement: Deny-by-default administrative authorization

The platform SHALL persist administrator memberships, roles, and permissions
and MUST deny every administrative capability unless the authenticated,
active administrator has the required permission.

#### Scenario: Support operator attempts a finance action
- **WHEN** an active support operator calls a refund or credit-approval endpoint
- **THEN** the platform SHALL deny the request
- **AND** SHALL record the denied action without exposing restricted data

#### Scenario: Existing bootstrap administrator migrates
- **WHEN** the migration finds an active verified account in `ADMIN_EMAILS`
- **THEN** the platform SHALL create an auditable initial super-administrator membership
- **AND** SHALL preserve the customer's existing account and sessions

### Requirement: Administrator multi-factor and step-up authentication

The platform SHALL require enrolled MFA for administrative access and MUST
require a recent step-up challenge for configured high-risk actions.

#### Scenario: Administrator completes TOTP enrollment
- **WHEN** an authorized administrator verifies a valid TOTP and recovery codes
- **THEN** the platform SHALL activate the factor
- **AND** SHALL never return the stored MFA secret again

#### Scenario: High-risk session is not stepped up
- **WHEN** an administrator attempts a large credit adjustment with an expired step-up state
- **THEN** the platform SHALL reject the mutation with a step-up-required result
- **AND** SHALL make no ledger change

### Requirement: Governed role and emergency access changes

Role assignment, permission changes, administrator suspension, MFA recovery,
and emergency access SHALL require explicit authorization, reason, audit, and
approval where configured.

#### Scenario: Super administrator changes an operator role
- **WHEN** an authorized super administrator submits a valid role change with a reason
- **THEN** the platform SHALL apply the new permissions atomically
- **AND** SHALL revoke sessions whose privileges are no longer valid

#### Scenario: Operator attempts self-escalation
- **WHEN** an administrator attempts to grant a role or permission to itself without the required approval
- **THEN** the platform SHALL deny the change
- **AND** SHALL record a high-severity security event
