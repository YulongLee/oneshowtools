## ADDED Requirements

### Requirement: Immutable credit balance control

The platform SHALL compute each user credit balance exclusively from immutable
credit ledger entries. Administrative grants, deductions, refunds, reversals,
expirations, and corrections MUST append entries and MUST NOT overwrite a
stored balance.

#### Scenario: Administrator corrects a prior deduction

- **WHEN** an authorized administrator submits a valid idempotent correction with a reason
- **THEN** the platform SHALL append a compensating credit entry linked to the original entry
- **AND** SHALL record actor, approval, before balance, after balance, and correlation ID

### Requirement: Governed credit operations

Credit operations SHALL require specific permissions, reason codes, operator
notes, idempotency keys, and configurable step-up or second approval thresholds.

#### Scenario: High-value credit grant is submitted

- **WHEN** a credit grant exceeds the configured approval threshold
- **THEN** the platform SHALL create a pending approval without changing the balance
- **AND** a different administrator with approval permission MUST approve it before posting

### Requirement: Balanced internal financial journals

Every posted internal financial journal entry SHALL contain two or more
postings in one currency whose total debits equal total credits. Posted entries
MUST be immutable and corrections MUST use reversing entries.

#### Scenario: Unbalanced journal is submitted

- **WHEN** an authorized finance administrator submits postings whose debits and credits differ
- **THEN** the platform MUST reject the journal without partial writes
- **AND** SHALL append an audit result identifying the validation failure without exposing secrets

### Requirement: Source-linked financial records

Journal entries SHALL retain immutable links to normalized orders, payment
attempts, provider events, refunds, disputes, fees, credit grants, credit
consumption, or cost records. Duplicate source postings MUST be prevented.

#### Scenario: Provider event is delivered twice

- **WHEN** the same verified provider event is processed more than once
- **THEN** the financial subledger SHALL create at most one source-linked journal entry
- **AND** the repeated delivery SHALL be recorded as an idempotent duplicate

### Requirement: Financial periods and controlled close

The platform SHALL group postings into periods and SHALL prevent ordinary
backdated posting into a closed period. Close and reopen operations MUST require
finance-close permission, reason, step-up authorization, and audit.

#### Scenario: Operator posts into a closed period

- **WHEN** an administrator without an approved reopen attempts to post into a closed period
- **THEN** the platform MUST reject the posting
- **AND** the closed period and existing journals SHALL remain unchanged

### Requirement: Credit and commercial reconciliation

Scheduled reconciliation SHALL detect duplicate references, orphaned source
events, unexpected negative balances, missing refunds, unbalanced journals,
payment-to-order mismatches, and credit-to-commercial inconsistencies.

#### Scenario: Reconciliation finds a mismatch

- **WHEN** a reconciliation run detects an invariant failure
- **THEN** the platform SHALL create a deduplicated exception and alert with source references
- **AND** resolution MUST require an authorized note and, when needed, compensating entries

### Requirement: Bookkeeping export

Authorized finance administrators SHALL be able to export bounded journal,
posting, source-reference, reconciliation, and credit-ledger data with currency,
timezone, period, actor, and calculation-version metadata.

#### Scenario: Finance export is downloaded

- **WHEN** an authorized administrator downloads a completed finance export
- **THEN** the platform SHALL audit the actor, filters, record count, and download time
- **AND** the export MUST exclude credentials, payment secrets, customer content, and raw session identifiers
