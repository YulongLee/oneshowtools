## Context

OneShowTools already owns users, sessions, roles, credits, task/file history,
tool discovery, and administration. Model execution is fragmented between
`server/runtime.mjs` and `server/tool-actions.mjs`, is coupled to one upstream
API shape, and is not configured in production. The Runtime page reads status
but cannot manage a user connection.

The supplied environment material contains a managed model configuration plus
many unrelated secrets from another product. Only the three logical values
needed for managed model invocation—credential, reviewed endpoint, and model
identifier—may be migrated into dedicated OneShowTools secret variables. Code,
database rows, APIs, and UI refer to the managed service only as
`OneShowModel`.

## Goals / Non-Goals

**Goals**

- Make model-backed tools execute through one reliable, provider-neutral
  server boundary.
- Configure a hidden managed model as OneShowModel without exposing upstream
  identity or credentials.
- Let each user securely add, test, choose, rotate, disable, and delete their
  own model API key.
- Make task execution durable across restarts and settle credits exactly once.
- Verify every customer and administrator UI operation against a real API and
  data source.

**Non-goals**

- Import unrelated secrets or services from the source environment.
- Enable live payments or destructive account deletion.
- Accept unrestricted arbitrary endpoints.
- Move tool-owned prompts or business logic into the platform gateway.

## Decisions

### 1. Use a provider-neutral ModelGateway

Tool code creates a versioned `ModelInvocationRequest` containing an opaque
task ID, capability, locale, messages/input, bounded output policy, and routing
choice. The gateway resolves either the managed `OneShowModel` connection or
the authenticated user's selected connection, invokes a reviewed adapter, and
returns normalized output, usage, finish reason, latency, and redacted error.

Provider SDK response objects never cross the gateway boundary.

### 2. Keep OneShowModel identity server-only

Production uses dedicated secret variables:

- `ONESHOW_MODEL_API_KEY`
- `ONESHOW_MODEL_BASE_URL`
- `ONESHOW_MODEL_ID`

Only `OneShowModel`, readiness, supported capabilities, and a coarse health
state may leave the server. The base URL, upstream provider, model identifier,
headers, account metadata, and raw errors are prohibited in customer and admin
serializers.

The supplied attachment is a one-time migration source handled outside Git.
Unrelated variables are ignored. After successful migration and smoke testing,
the source model credential should be rotated because it has existed outside
the production secret store.

### 3. Encrypt BYOK credentials with envelope-style record encryption

`user_model_connections` stores owner, provider-template code, encrypted API
key, nonce/authentication tag, non-secret key hint, optional allowed model
selection, state, test status, version, and timestamps. A separate
`MODEL_CREDENTIAL_ENCRYPTION_KEY` is provided by production secret storage and
is never stored in SQLite.

AES-256-GCM uses a unique nonce per write and authenticated associated data
containing the user and connection IDs. Rotation creates a new encrypted
version and invalidates cached decrypted values. APIs never return encrypted
bytes or raw credentials.

### 4. Use reviewed provider templates and outbound-network policy

The first release supports reviewed OpenAI-compatible templates required for
OneShowModel and selected customer providers. A customer chooses a template and
enters a key; a model identifier is optional only when the template policy
allows it.

Custom base URLs require an administrator-approved endpoint policy. Resolution
and every redirect reject non-HTTPS, credentials in URLs, non-standard
unapproved ports, loopback, private, link-local, multicast, and cloud metadata
addresses. DNS is revalidated at connection time.

### 5. Separate connection validation from task execution

Connection testing performs a bounded, low-cost server-side capability probe
with no customer content. It is rate-limited, audited, and stores only status,
latency class, error class, and test time. A failed test never returns the
provider's raw response or request headers.

Task execution always rechecks ownership, state, tool entitlement, provider
policy, quota, and deletion/account restrictions.

### 6. Replace process timers with durable leased jobs

Task creation transactionally reserves credits and enqueues a unique execution
job. Workers claim jobs with a lease, heartbeat while running, and transition
through queued, running, retrying, completed, failed, cancelled, or quarantined
states. Expired leases are recoverable after restart.

The job idempotency key and task ID ensure that retries cannot double-invoke
settlement, double-create output files, double-charge, or double-refund.

### 7. Unify synchronous tool pages and Task Center

Existing tool-action routes remain backward compatible but create and execute
the same task/job records used by Task Center. The UI may wait for a short
request or poll task status, but there is one source of truth for input
ownership, output, files, credit settlement, cancellation, and audit.

Local image processing remains a non-model adapter. Tool-specific prompt
construction stays in tool code and is not stored in model connection records.

### 8. Make routing explicit and privacy-preserving

The account-level default is OneShowModel unless the user selects an active
personal connection. A tool may restrict supported capability templates but
cannot select another user's connection. Task records store only a routing
class (`managed` or `user_connection`) and opaque connection ID where needed.

Customer export includes connection metadata but never keys, ciphertext,
provider headers, or raw test failures. Account deletion revokes and erases
credential material according to the approved retention policy.

### 9. Preserve commercial boundaries

Managed model tasks continue to consume platform credits using existing tool
prices. BYOK tasks distinguish upstream inference cost from OneShowTools
service credits. This change does not enable payment checkout or create a
provider charge on the user's behalf.

## Data Ownership and Source of Truth

- **OneShowTools:** connection ownership/state, encrypted credential material,
  routing preference, task/job state, entitlement, credits, usage summary,
  correlation IDs, and operational health.
- **Production secret store:** OneShowModel credential and model-credential
  encryption master key.
- **Model provider:** upstream inference execution and provider-side usage.
- **Individual tool:** prompt, model-input construction, output interpretation,
  and domain workflow.

## Failure and Security Model

- Provider timeouts and transient failures use bounded retry with jitter; auth,
  policy, and invalid-request failures do not retry.
- Raw provider bodies, headers, URLs, keys, prompts, and unrestricted outputs
  are absent from logs and audit events.
- OneShowModel failure does not reveal upstream identity and releases reserved
  credits once under policy.
- BYOK decryption failure disables that connection, creates a redacted security
  event, and never falls back to another user's key.
- Workers recover expired leases after restart and quarantine jobs after the
  retry limit.

## Migration and Rollout

1. Record baseline route/API coverage, flags, database invariants, task/credit
   state, and rollback commit.
2. Back up production and apply additive connection, invocation, and durable-job
   migrations with all new runtime flags disabled.
3. Install dedicated OneShowModel secrets outside Git using only the minimum
   model values; configure a new encryption master key.
4. Run adapter contract tests and a non-sensitive managed-model smoke in
   staging, then production with execution still restricted to administrators.
5. Migrate current model-backed tools to the gateway and verify restart,
   idempotency, cancellation, task, file, and credit behavior.
6. Enable OneShowModel for a canary cohort, then all eligible users.
7. Enable BYOK creation only after encryption, SSRF, cross-user authorization,
   export/deletion, and browser acceptance tests pass.
8. Preserve a rollback path to the prior application while additive tables
   remain; disable new routing flags before application rollback.
