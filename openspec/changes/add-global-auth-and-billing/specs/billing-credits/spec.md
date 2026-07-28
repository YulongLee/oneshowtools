## ADDED Requirements

### Requirement: Plan and credit offer presentation

The platform SHALL present available subscription plans and one-time credit
top-up offers with price, currency, included benefits, renewal behavior, and
applicable limitations.

#### Scenario: User views pricing

- **WHEN** a visitor opens the pricing surface
- **THEN** the platform SHALL show active purchasable offers
- **AND** recurring offers SHALL clearly state their billing interval
- **AND** one-time offers SHALL clearly state the credits granted

### Requirement: Subscription checkout

The platform SHALL allow an authenticated verified user to begin hosted
checkout for an active subscription offer.

#### Scenario: User starts subscription checkout

- **WHEN** an eligible user selects an active subscription offer
- **THEN** the platform SHALL create a payment-provider checkout session bound to that user and offer
- **AND** it SHALL redirect the user to the hosted checkout
- **AND** it SHALL not grant subscription access from the browser return alone

### Requirement: Credit top-up checkout

The platform SHALL allow an authenticated verified user to purchase a
configured one-time credit package.

#### Scenario: User starts a top-up

- **WHEN** an eligible user selects an active credit package
- **THEN** the platform SHALL create a one-time hosted checkout bound to that user and package
- **AND** credits SHALL remain ungranted until a verified successful payment event is reconciled

### Requirement: Payment event reconciliation

The platform SHALL verify, persist, and idempotently process required
payment-provider events before changing entitlements or credits.

#### Scenario: Valid payment event is received

- **WHEN** a correctly signed event with an unprocessed provider event ID is received
- **THEN** the platform SHALL persist the event identity and reconciliation result
- **AND** it SHALL apply each resulting entitlement or ledger mutation at most once

#### Scenario: Duplicate payment event is received

- **WHEN** an already processed provider event is received again
- **THEN** the platform SHALL acknowledge the event without duplicating any entitlement or credit mutation

#### Scenario: Webhook signature is invalid

- **WHEN** an event fails signature or recency verification
- **THEN** the platform SHALL reject it
- **AND** it SHALL not change subscription, payment, entitlement, or credit state

### Requirement: Platform subscription state

The platform SHALL maintain a normalized local subscription state reconciled
from payment-provider lifecycle events.

#### Scenario: Subscription payment succeeds

- **WHEN** the platform reconciles a successful subscription invoice
- **THEN** the corresponding platform subscription SHALL become or remain entitled
- **AND** its paid-through period SHALL be updated

#### Scenario: Subscription ends

- **WHEN** a cancellation reaches its effective end or the subscription becomes non-entitled
- **THEN** recurring plan benefits SHALL end according to the normalized platform policy
- **AND** already purchased non-expiring credits SHALL remain available unless separately reversed

### Requirement: Immutable credit ledger

The platform SHALL record every credit grant, purchase, reservation,
consumption, release, refund, expiry, and administrative adjustment as an
auditable immutable ledger entry.

#### Scenario: Successful top-up is reconciled

- **WHEN** a paid credit package is reconciled for the first time
- **THEN** the platform SHALL append one purchase grant to the user's ledger
- **AND** the balance SHALL increase by the configured credit amount

#### Scenario: Credit history is displayed

- **WHEN** a user views credit history
- **THEN** the platform SHALL show localized ledger entries and resulting balance changes
- **AND** it SHALL not expose another user's ledger

### Requirement: Atomic credit consumption

The platform SHALL authorize and consume credits atomically so concurrent tool
requests cannot produce a negative available balance.

#### Scenario: User has sufficient credits

- **WHEN** an eligible tool requests an idempotent credit reservation within the user's available balance
- **THEN** the platform SHALL reserve the requested amount exactly once
- **AND** the reserved amount SHALL no longer be available to concurrent requests

#### Scenario: User has insufficient credits

- **WHEN** a requested reservation exceeds the user's available balance
- **THEN** the platform SHALL deny the reservation
- **AND** it SHALL not append a consumption entry

#### Scenario: Tool operation fails after reservation

- **WHEN** a tool releases a valid outstanding reservation
- **THEN** the platform SHALL restore the reserved credits exactly once

### Requirement: Refund and dispute reconciliation

The platform SHALL reconcile refunds, reversals, and disputes without deleting
historical ledger entries.

#### Scenario: Credit purchase is refunded

- **WHEN** a refund for a credit purchase is verified
- **THEN** the platform SHALL append a compensating ledger entry
- **AND** it SHALL flag any resulting deficit for policy enforcement

### Requirement: Customer billing management

The platform SHALL allow an authenticated customer to access a hosted billing
management experience for payment methods, invoices, and subscription actions.

#### Scenario: Customer opens billing management

- **WHEN** a customer with a provider billing profile requests management access
- **THEN** the platform SHALL create a short-lived hosted customer portal session
- **AND** it SHALL return the customer to the localized account surface afterward

### Requirement: Payment data minimization

The platform SHALL not store full card numbers, card verification values, or
raw payment credentials.

#### Scenario: User completes hosted checkout

- **WHEN** payment details are collected
- **THEN** the payment provider SHALL collect and store sensitive payment credentials
- **AND** OneShowTools SHALL store only provider identifiers and non-sensitive reconciliation metadata

