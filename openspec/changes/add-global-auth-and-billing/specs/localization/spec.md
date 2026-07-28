## ADDED Requirements

### Requirement: Supported interface locales

The platform SHALL provide complete Simplified Chinese and English interfaces
for public, authentication, account, pricing, checkout-return, and billing
management surfaces.

#### Scenario: User views a supported locale

- **WHEN** the resolved locale is Simplified Chinese or English
- **THEN** all platform-owned visible copy on the current surface SHALL use that locale
- **AND** brand names and legally required provider names MAY remain unchanged

### Requirement: Locale resolution

The platform SHALL resolve a user's locale using an explicit saved preference,
then a prior visitor preference, then the browser language, and finally the
Simplified Chinese fallback.

#### Scenario: Authenticated user has a saved preference

- **WHEN** an authenticated user opens the platform
- **THEN** the platform SHALL use the locale stored on that user's profile

#### Scenario: New visitor opens the platform

- **WHEN** a visitor has no saved locale preference
- **THEN** the platform SHALL use a supported browser language when available
- **AND** it SHALL otherwise use Simplified Chinese

### Requirement: Language switching

The platform SHALL let a user switch between Simplified Chinese and English
without losing their current workflow.

#### Scenario: User changes language

- **WHEN** a user selects another supported language
- **THEN** the current platform surface SHALL update to the selected language
- **AND** the current route and safe user-entered state SHALL be preserved
- **AND** the choice SHALL persist for future visits

### Requirement: Locale-aware formatting

The platform SHALL format dates, times, numbers, currencies, and billing periods
according to the resolved locale while preserving the underlying value.

#### Scenario: User views price and renewal information

- **WHEN** a localized pricing or billing surface renders
- **THEN** amounts, dates, and billing periods SHALL use locale-appropriate formatting
- **AND** the charged currency SHALL be stated unambiguously

### Requirement: Localized transactional messages

The platform SHALL send authentication and billing-related messages in the
recipient's saved or request-resolved supported locale.

#### Scenario: Verification email is sent

- **WHEN** the platform sends an email verification message
- **THEN** the subject, instructions, expiry guidance, and action label SHALL use the resolved locale

### Requirement: Translation fallback

The platform SHALL never expose an untranslated resource key to an end user.

#### Scenario: Translation entry is missing

- **WHEN** a requested translation is unavailable
- **THEN** the platform SHALL render the configured fallback-language copy
- **AND** it SHALL record the missing key for correction

### Requirement: Localized discovery metadata

The platform SHALL expose language-specific page titles, descriptions, and
alternate-language references for indexable public pages.

#### Scenario: Search crawler visits a localized public page

- **WHEN** a supported localized public page is requested
- **THEN** the response SHALL identify its language
- **AND** it SHALL reference the equivalent supported-language page
- **AND** it SHALL provide localized title and description metadata

