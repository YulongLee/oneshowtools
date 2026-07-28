# OneShowTools tool contract v1

All endpoints are server-to-server JSON APIs under `/api/tools/v1`. A tool
authenticates with `X-Tool-Id` and `Authorization: Bearer <credential>`.
Credentials are independently revocable and stored only as salted hashes.

Every request may provide `X-Correlation-Id`; the platform generates one when
it is absent. Credit-affecting requests require an `Idempotency-Key` scoped to
the calling tool.

## Access decision

`POST /api/tools/v1/access`

Request: `{ "userId": "opaque-user-id" }`

The response contains only `allowed`, a stable user ID, locale, available
credits, a machine-readable denial reason, and the correlation ID. It never
contains email, password, payment, profile, or ledger data.

## Reserve credits

`POST /api/tools/v1/reserve`

Request: `{ "userId": "opaque-user-id", "amount": 10 }`

The platform atomically checks the available balance and creates a 15-minute
reservation. Repeating an identical request returns the original reservation.
Reusing the key with different parameters returns `IDEMPOTENCY_CONFLICT`.

## Commit or release

`POST /api/tools/v1/commit` or `POST /api/tools/v1/release`

Request: `{ "reservationId": "opaque-reservation-id" }`

Commit appends an immutable consumption entry. Release restores availability.
Both operations are exactly-once and safe to retry.

## Errors

Errors use `{ "error": { "code": "MACHINE_READABLE_CODE" } }`. Relevant codes
include `UNSUPPORTED_VERSION`, `INVALID_TOOL_IDENTITY`,
`OPERATION_NOT_ALLOWED`, `USER_NOT_ELIGIBLE`, `INSUFFICIENT_CREDITS`,
`IDEMPOTENCY_CONFLICT`, `RESERVATION_NOT_FOUND`, and
`RESERVATION_STATE_CONFLICT`.

Tool prompts, uploads, inference, model selection, and output history stay in
the individual tool. This contract only controls platform identity,
entitlements, and credits.
