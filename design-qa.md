# Design QA — User System

## Evidence

- Source: `codex-clipboard-5159b932-baf5-4c52-8bbd-c5021296ed14.png`
- Implementation: `artifacts/account-implementation-desktop.png`
- Same-state comparison: `artifacts/account-design-comparison.png`
- Verified route: `http://localhost:5173/?view=account`

## Comparison

- Layout: passed. The implementation preserves the reference hierarchy: persistent platform navigation, account title and tabs, profile card, primary account form, security/session cards, and an account overview rail.
- Visual system: passed. Blue accent, soft neutral canvas, compact bordered surfaces, status pills, typography, density, and spacing are consistent with both the reference and the existing OneShowTools shell.
- Functional fidelity: passed. Profile and language save through the real profile endpoint; password and email changes, session listing/revocation, data export, deletion gating, runtime, credits, billing, and logout all use existing production routes.
- Responsive behavior: passed by CSS breakpoint inspection and intrinsic grid constraints. Main columns collapse at 1240px/900px, forms become single-column on mobile, tabs scroll horizontally, and session/privacy rows reflow without fixed-width overflow.
- Console: passed. No runtime errors were recorded during the verified account flow.

## Intentional differences

- Google/GitHub account linking, phone number, notification preferences, and 2FA from the visual reference are not shown because this product does not currently expose those backend capabilities. This prevents false commercial UI.
- The right rail uses real membership and credit ledger data rather than sample values.

## Interaction checks

- Profile save: passed.
- Security tab and password/email forms: passed.
- Session tab with two live database records: passed.
- Data export endpoint: covered by the existing account lifecycle test suite; UI action is present.
- Full automated suite: 103/103 passed.
- Production build: passed.

## Open issues

- P0: none.
- P1: none.
- P2: none.
- P3: optional future enhancement — add third-party account linking only after a real provider lifecycle exists.

final result: passed
