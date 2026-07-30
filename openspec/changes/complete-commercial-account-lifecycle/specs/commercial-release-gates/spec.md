## ADDED Requirements

### Requirement: Independent commercial feature gates

The platform SHALL independently gate email registration, Google sign-in,
checkout creation, and destructive account actions without disabling public
tool discovery.

#### Scenario: Provider configuration is incomplete

- **WHEN** a required provider or secret is unavailable
- **THEN** the affected feature SHALL remain disabled
- **AND** the interface SHALL show an honest localized unavailable state
- **AND** unrelated public and authenticated capabilities SHALL remain usable

### Requirement: Startup readiness validation

Production startup MUST fail closed or disable the affected commercial feature
when required secrets, URLs, migrations, provider mappings, or secure-cookie
conditions are invalid.

#### Scenario: Live billing is enabled without webhook secret

- **WHEN** production configuration enables checkout without a valid webhook secret
- **THEN** the platform SHALL refuse to enable live billing
- **AND** it SHALL emit a redacted operational error

### Requirement: Commercial observability

The platform SHALL expose redacted operational signals and alerts for
authentication abuse, email delivery, OAuth callbacks, webhook failures,
reconciliation delays, ledger invariants, and deletion/export jobs.

#### Scenario: Reconciliation repeatedly fails

- **WHEN** a provider event cannot be reconciled within the configured threshold
- **THEN** the platform SHALL alert operators with a correlation identifier
- **AND** the alert SHALL not include payment credentials or raw tokens

### Requirement: Release acceptance gate

Commercial features MUST remain disabled until bilingual end-to-end,
authorization, abuse, session, migration, provider test-mode, ledger,
accessibility, privacy, support, and rollback checks have recorded passing
evidence.

#### Scenario: A required acceptance suite fails

- **WHEN** any required launch check fails
- **THEN** production registration or billing SHALL remain disabled for the
  affected capability
- **AND** public discovery SHALL remain available

### Requirement: Rollback without financial data loss

The deployment SHALL support disabling new registration, checkout, and tool
credit reservations while preserving users, sessions needed for investigation,
provider events, subscriptions, immutable ledger entries, and audit records.

#### Scenario: Commercial deployment is rolled back

- **WHEN** operators activate the documented rollback
- **THEN** new commercial mutations SHALL stop
- **AND** existing financial and audit history SHALL remain available for reconciliation
