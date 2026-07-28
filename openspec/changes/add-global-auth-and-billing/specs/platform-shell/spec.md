## ADDED Requirements

### Requirement: Language control

The portal SHALL expose a reachable Simplified Chinese and English language
control on public and authenticated platform surfaces.

#### Scenario: User switches language from the header

- **WHEN** a user selects another supported language
- **THEN** the current portal surface SHALL render in that language
- **AND** the control SHALL indicate the active language

### Requirement: Pricing entry point

The portal SHALL provide a pricing surface for subscriptions and credit top-ups.

#### Scenario: Visitor opens pricing

- **WHEN** a visitor selects the pricing navigation item
- **THEN** the portal SHALL display localized active offers
- **AND** authentication SHALL be requested before checkout when necessary

## MODIFIED Requirements

### Requirement: Account entry point

The portal SHALL provide real localized registration, sign-in, recovery,
sign-out, account, and billing entry points according to authentication state.

#### Scenario: Visitor opens account entry

- **WHEN** an unauthenticated visitor selects the account action
- **THEN** the portal SHALL offer email registration and sign-in
- **AND** it SHALL provide password recovery

#### Scenario: Authenticated user opens account entry

- **WHEN** an authenticated user selects the account action
- **THEN** the portal SHALL open the user's workspace
- **AND** it SHALL expose profile, subscription, credits, billing management, and sign-out actions

### Requirement: Shared workspace preview

The portal SHALL show authenticated users their platform-owned recent activity,
subscription status, and current available credit balance while showing
non-deceptive sign-in prompts to visitors.

#### Scenario: Authenticated user views the portal

- **WHEN** an authenticated user opens the default page
- **THEN** the portal SHALL show that user's recent tool activity
- **AND** it SHALL show the user's current subscription and available credit state

#### Scenario: Visitor views the portal

- **WHEN** an unauthenticated visitor opens the default page
- **THEN** the portal SHALL not present mock activity or credits as if they belong to the visitor
- **AND** it SHALL offer sign-in to synchronize activity and credits

