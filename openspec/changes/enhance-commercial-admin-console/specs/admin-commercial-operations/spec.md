## ADDED Requirements

### Requirement: Provider-neutral commercial records

The platform SHALL model plans, prices, orders, payments, subscriptions,
invoices, top-ups, refunds, reversals, and disputes independently of Stripe,
Alipay, or WeChat Pay provider objects.

#### Scenario: Verified provider payment succeeds
- **WHEN** a verified and previously unprocessed provider event maps to a platform order
- **THEN** the platform SHALL update normalized payment state transactionally
- **AND** SHALL append the corresponding entitlement or credit ledger entry exactly once

#### Scenario: Provider state is pending reconciliation
- **WHEN** provider and platform commercial states do not agree
- **THEN** the admin console SHALL show a reconciliation exception
- **AND** SHALL not silently overwrite internal credit or entitlement history

### Requirement: Governed credit adjustments

Administrative credit grants and deductions MUST append immutable ledger
entries with reason code, operator note, idempotency key, actor, approval state,
and before/after balance; no administrative API may directly set a balance.

#### Scenario: Authorized small adjustment succeeds
- **WHEN** an authorized operator submits a valid adjustment within its approval threshold
- **THEN** the platform SHALL append one adjustment entry
- **AND** SHALL display the new computed balance and audit reference

#### Scenario: Adjustment exceeds approval threshold
- **WHEN** an adjustment exceeds the configured amount or negative-balance threshold
- **THEN** the platform SHALL keep it pending until a different authorized approver accepts it
- **AND** SHALL not alter the balance before approval

### Requirement: Refund, dispute, and failure handling

The platform SHALL reconcile refunds, reversals, disputes, failed renewals, and
cancellations using idempotent commercial events and compensating ledger
entries without deleting original history.

#### Scenario: Consumed credits are refunded
- **WHEN** a verified refund applies to credits that have already been consumed
- **THEN** the platform SHALL append the policy-defined compensating entry
- **AND** SHALL flag any resulting restricted or negative-balance state for operator review

#### Scenario: Duplicate or out-of-order webhook arrives
- **WHEN** a provider event is duplicated or arrives before a related event
- **THEN** the platform SHALL avoid duplicate entitlement or credit effects
- **AND** SHALL process, defer, or quarantine the event deterministically
