## ADDED Requirements

### Requirement: Customer commercial summary

The authenticated Account Center SHALL present the platform source of truth for
plan, subscription status, renewal or end date, available credits, recent
ledger entries, and payment-recovery state.

#### Scenario: Customer opens Account Center

- **WHEN** an authenticated customer opens billing management
- **THEN** the platform SHALL show normalized local subscription and credit data
- **AND** it SHALL not infer entitlement from checkout return parameters alone

### Requirement: Verified checkout and reconciliation

The platform SHALL bind hosted subscription and top-up checkout sessions to an
authenticated verified user and SHALL grant entitlements or credits only after
verified idempotent provider-event reconciliation.

#### Scenario: Checkout returns successfully

- **WHEN** the browser returns from hosted checkout
- **THEN** the platform SHALL show a pending-confirmation state
- **AND** it SHALL not grant credits or subscription access from the browser return

#### Scenario: Provider sends a duplicate successful event

- **WHEN** a previously processed provider event is delivered again
- **THEN** the platform SHALL acknowledge it without duplicating subscription or
  ledger mutations

#### Scenario: Provider signature is invalid

- **WHEN** a webhook fails signature or recency validation
- **THEN** the platform SHALL reject it
- **AND** it SHALL not change billing or credit state

### Requirement: Hosted billing management

Customers with a provider profile SHALL be able to open a short-lived hosted
portal for payment methods, invoices, and subscription actions.

#### Scenario: Customer requests billing portal access

- **WHEN** an authenticated customer with a provider mapping requests access
- **THEN** the platform SHALL create a short-lived portal session
- **AND** it SHALL return the customer to the localized Account Center

### Requirement: Immutable commercial credit history

Every purchase, periodic grant, reservation, consumption, release, expiry,
refund, dispute, and administrative adjustment MUST append an immutable,
idempotent ledger entry.

#### Scenario: Paid top-up is reconciled

- **WHEN** a top-up payment succeeds and is reconciled for the first time
- **THEN** the platform SHALL append exactly one purchase grant
- **AND** the available balance SHALL increase by the configured amount

#### Scenario: Customer views credit history

- **WHEN** the customer opens credit history
- **THEN** the platform SHALL show localized entries and resulting balance changes
- **AND** it SHALL not expose another user's ledger

### Requirement: Refund, dispute, and payment-recovery behavior

The platform SHALL reconcile refunds, reversals, disputes, failed renewals, and
subscription termination with compensating records and explicit customer state.

#### Scenario: Consumed top-up is refunded

- **WHEN** a verified refund would reduce the customer below zero credits
- **THEN** the platform SHALL append a compensating ledger entry
- **AND** it SHALL flag the deficit for policy enforcement
- **AND** it SHALL preserve the original purchase and consumption history

#### Scenario: Subscription renewal fails

- **WHEN** a renewal enters a recoverable failed-payment state
- **THEN** the Account Center SHALL show a localized recovery action
- **AND** entitlement SHALL follow the configured grace-period policy

### Requirement: Payment data minimization

OneShowTools MUST store only provider identifiers and non-sensitive
reconciliation metadata and MUST NOT store full card numbers, verification
values, or raw payment credentials.

#### Scenario: Customer submits payment details

- **WHEN** payment details are required for checkout or account management
- **THEN** the hosted provider SHALL collect the sensitive data
- **AND** the OneShowTools application SHALL not receive or persist it
