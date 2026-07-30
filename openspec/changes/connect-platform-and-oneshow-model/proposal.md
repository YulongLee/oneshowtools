## Why

A full local and production-domain audit on 2026-07-31 shows that OneShowTools
has real persistence and working account, email, credit, task, file, tool-page,
and administrator foundations, but the whole platform is not yet fully
connected:

- the production AI runtime reports no configured managed model or external
  runtime, so queued model tasks cannot produce managed AI results;
- the customer Runtime page is read-only and currently exposes upstream-style
  provider and model details instead of a stable OneShowTools product identity;
- customers cannot securely connect or select their own model API key;
- model calls are implemented in more than one server module, without a common
  adapter, timeout, retry, usage, redaction, or provider-neutral error contract;
- queued tasks are started by an in-process timer, so a restart can leave work
  without a durable worker lease or retry path;
- synchronous tool actions and queued tasks do not yet share one idempotent
  execution, credit-settlement, and observability lifecycle;
- some broader commercial capabilities, including live payments and destructive
  account deletion, remain intentionally disabled by release policy.

The supplied environment material contains usable managed-model configuration
alongside unrelated sensitive credentials. The platform must ingest only the
minimum model values through production secret storage, never copy the source
file into the repository, and never reveal its upstream provider, endpoint,
model identifier, or API key. Customers will see the managed runtime only as
**OneShowModel**.

## Audit Baseline

| Area | Current result | Proposal treatment |
| --- | --- | --- |
| Email registration, verification, login, recovery | Real and tested | Preserve and add full browser acceptance |
| Profile, sessions, export | Real and tested | Preserve; do not include model secrets in export |
| Credits and task/file ownership | Real SQLite state | Unify model usage and credit settlement |
| Built-in tool pages | Real local processing and task history | Route AI work through the shared gateway |
| Admin RBAC and user operations | Real and protected | Add provider-neutral runtime operations only |
| AI Runtime | Not configured in production | Add OneShowModel managed adapter |
| Customer model configuration | Missing | Add encrypted BYOK connections and selection |
| Queued execution | Process-local timer | Add durable leased jobs and retries |
| Billing and account deletion | Disabled by policy | Remain disabled and out of scope for enablement |

The audit passed 16 application tests, 4 Sites-worker tests, the production
build, and migration checks. Public production health, tools, plans, account
session, `/admin`, and an existing tool route responded successfully. These
checks prove the implemented baseline, not complete AI-runtime readiness.

## What Changes

- Introduce a server-only, provider-neutral model gateway. Its built-in managed
  connection is named `OneShowModel` in every customer, tool, API, task, log,
  metric, and administrator surface.
- Load the managed model only from dedicated OneShowTools production-secret
  variables. The source attachment and its unrelated credentials SHALL NOT be
  copied, parsed at runtime, logged, committed, or deployed.
- Add a normalized model-adapter contract for text and supported multimodal
  requests, with bounded timeouts, retries, cancellation, usage normalization,
  redacted errors, health checks, and correlation IDs.
- Add customer-managed model connections (BYOK): supported provider template,
  API key, optional allowed model identifier, connection test, default
  selection, rotation, disable, and deletion.
- Encrypt customer API keys at rest with an independent production master key.
  Never return raw keys after submission; return only an opaque connection ID,
  masked hint, state, timestamps, and non-sensitive health result.
- Restrict outbound model endpoints to reviewed HTTPS provider templates or
  administrator-approved endpoint policies. Reject loopback, private-network,
  link-local, metadata-service, redirect, and DNS-rebinding targets.
- Change Runtime UI and APIs so customers can choose OneShowModel or one of
  their own active connections without learning OneShowModel's upstream
  provider, base URL, model identifier, account, or credential.
- Replace process-local task dispatch with durable leased jobs, idempotent
  attempts, bounded retries, cancellation, restart recovery, and a single
  credit reservation/commit/release path shared by tool pages and Task Center.
- Keep prompts and tool-specific inference behavior owned by each individual
  tool. The platform gateway transports normalized model requests and records
  minimal operational usage; it does not become the source of truth for tool
  prompts or business logic.
- Add full contract, integration, browser, security, migration, provider
  sandbox, failure/restart, quota, and production smoke tests before enabling
  managed AI execution.

## Capabilities

### New Capabilities

- `model-runtime-gateway`: Server-only OneShowModel alias, adapter contract,
  routing, health, usage, timeout, retry, cancellation, and redaction behavior.
- `user-model-connections`: Encrypted BYOK lifecycle, provider policy,
  connection testing, user selection, rotation, revocation, and privacy rules.
- `platform-integration-assurance`: Route-to-API coverage, durable execution,
  unified task/credit/file settlement, production gates, and acceptance
  evidence for a genuinely connected platform.

### Modified Capabilities

- `platform-shell`: Replace the read-only provider display with a bilingual
  model configuration and selection experience that exposes only
  OneShowModel's product alias.

## Non-Goals

- Enabling Stripe, Alipay, WeChat Pay, account deletion, SMS authentication, or
  any unrelated service found in the supplied environment material.
- Importing another product's database, JWT secret, payment key, SMS key,
  object-storage key, parsing credential, speech key, or other configuration.
- Publishing OneShowModel's upstream provider, endpoint, model identifier,
  organization, account, prompt, or API key.
- Allowing arbitrary customer URLs to bypass the reviewed provider and SSRF
  policy.
- Moving tool-owned prompts, domain workflows, or unrestricted tool files into
  platform configuration.
- Charging customers' external model-provider accounts on behalf of
  OneShowTools or guaranteeing provider availability.

## Backward Compatibility

- Existing user IDs, passwords, sessions, tool URLs, tasks, files, credits,
  administrator memberships, and audit history remain unchanged.
- Existing `OPENAI_*` configuration is supported only through a bounded
  migration adapter and is removed from customer-visible runtime responses.
- Existing tool-action and task endpoints remain available while internally
  adopting the unified execution contract; response fields currently consumed
  by the frontend remain compatible.
- Existing tasks retain their historical status and ledger entries. Migration
  does not retroactively charge or re-run them.
- If OneShowModel is disabled or unhealthy, tool discovery and non-model tools
  remain available; a model task receives an honest unavailable/retry state and
  reserved credits are released exactly once.

## Impact

- **Ownership:** platform-level shared capability owned by OneShowTools. Each AI
  tool continues to own its prompt and domain-specific inference workflow.
- **Affected code and data:** Runtime and Account UI, task/tool execution,
  server configuration, model adapters, encrypted credential storage, durable
  jobs, usage records, credit settlement, admin runtime views, migrations,
  tests, deployment secrets, and operational documentation.
- **Affected tools/contracts:** every model-backed tool adopts a versioned
  request/response and usage contract. Non-model image processing and browser
  speech behavior remain compatible.
- **Security:** managed and customer secrets are server-only, encrypted or held
  in secret storage, redacted from logs/audit/errors/export/backups where
  required, never placed in browser storage, and protected from SSRF and
  cross-user access.
- **Privacy:** prompts and outputs are not retained by the gateway beyond the
  tool/task policy. Invocation telemetry stores identifiers, timing, token/usage
  counts, status, and error class, not unrestricted content.
- **Quota and billing:** OneShowModel uses existing platform credit policy.
  BYOK usage is marked separately and never pretends OneShowTools paid the
  upstream inference cost. Any platform service fee remains an explicit,
  configurable tool-price decision; no live payment feature is enabled.
- **External dependencies:** managed model secret configuration, an encryption
  master key, reviewed provider endpoint policies, provider sandbox access,
  worker supervision, backup/restore validation, and monitoring.
