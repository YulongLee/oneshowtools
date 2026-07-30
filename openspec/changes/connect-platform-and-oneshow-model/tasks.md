## 1. Baseline and full-platform assurance

- [x] 1.1 Record production flags, health, current model readiness, task/file/ledger invariants, administrator state, database backup, deployed commit, and rollback version
- [ ] 1.2 Build a route-to-API-to-table/provider coverage matrix for every customer and administrator action and fail CI when a visible action has no real backend contract
- [ ] 1.3 Add full local acceptance for registration, verification, login, account, marketplace, every built-in tool, Task Center, File Center, Credits, Runtime, Billing unavailable state, and administrator operations
- [x] 1.4 Remove, implement, or honestly disable nonfunctional visible controls and placeholder states, including notification and unsupported runtime actions
- [x] 1.5 Update OpenSpec project context and operational documentation so they reflect the deployed Node/SQLite backend rather than the original frontend-only prototype

## 2. Secrets and configuration boundary

- [x] 2.1 Define dedicated `ONESHOW_MODEL_*` variables and a separate `MODEL_CREDENTIAL_ENCRYPTION_KEY`; prohibit upstream identity values in public configuration
- [x] 2.2 Import only the minimum managed-model credential, endpoint, and model identifier from the supplied source into server secret storage without copying the attachment or unrelated values
- [x] 2.3 Add startup validation and independent flags for OneShowModel, BYOK management, model execution, durable workers, and per-tool routing
- [ ] 2.4 Add repository, build-artifact, log, audit, response, export, and backup secret scans covering managed and user credentials
- [ ] 2.5 Rotate the source managed-model credential after migration and document secret rotation and emergency revocation

## 3. Additive data model and migration safety

- [x] 3.1 Add numbered migrations for user model connections, encrypted credential versions, routing preferences, provider endpoint policies, connection tests, and model invocation summaries
- [ ] 3.2 Add durable execution-job, attempt, lease, heartbeat, retry, cancellation, quarantine, and settlement-idempotency relations
- [x] 3.3 Add ownership, status, uniqueness, foreign-key, index, and redaction invariants without modifying historical task, file, or ledger rows
- [x] 3.4 Extend production backup and invariant tooling for encrypted connections, jobs, attempts, invocations, reservations, and settlement references without exporting master keys
- [ ] 3.5 Test forward migration and application rollback on a production-data copy while additive tables remain present

## 4. OneShowModel gateway

- [x] 4.1 Define versioned provider-neutral request, response, usage, finish, error, health, timeout, cancellation, and correlation contracts
- [x] 4.2 Implement the managed OpenAI-compatible adapter using dedicated server secrets and expose only the `OneShowModel` alias
- [x] 4.3 Consolidate duplicated model-call code behind the gateway and keep prompt construction in tool-owned modules
- [ ] 4.4 Add bounded connection, first-byte, total, and idle timeouts plus retry classification, jitter, cancellation, and response-size limits
- [ ] 4.5 Normalize text and approved multimodal outputs and usage without returning provider-native objects
- [x] 4.6 Add redacted health and readiness checks that never expose provider, endpoint, model ID, account, key, raw response, or prompt
- [x] 4.7 Add managed-model contract tests using a local fake provider and one non-sensitive configured-provider smoke test

## 5. Customer-managed model connections (BYOK)

- [x] 5.1 Implement AES-256-GCM credential encryption with unique nonce, authenticated ownership data, versioning, rotation, and master-key validation
- [x] 5.2 Implement user-scoped create, list-masked, test, update metadata, set default, disable, rotate key, and delete APIs
- [ ] 5.3 Implement reviewed provider templates and SSRF-safe endpoint policy with HTTPS, redirect, DNS, IP-range, port, and metadata-service enforcement
- [x] 5.4 Rate-limit connection tests and return only normalized, non-enumerating health/error states
- [ ] 5.5 Enforce active account, ownership, capability, entitlement, quota, connection state, and deletion restrictions on every model invocation
- [x] 5.6 Exclude raw keys, ciphertext, nonces, provider headers, and raw failures from customer export, admin APIs, logs, audit, errors, metrics, and frontend state
- [ ] 5.7 Add cross-user, encryption, rotation, tamper, SSRF, redirect, DNS-rebinding, rate-limit, deletion, and serializer security tests

## 6. Durable task execution and credit settlement

- [x] 6.1 Replace `setTimeout` task dispatch with transactional enqueue and leased worker execution supervised by the production service
- [ ] 6.2 Implement heartbeat, expired-lease recovery, bounded retries, cancellation, quarantine, and safe worker restart
- [ ] 6.3 Unify tool-action and Task Center execution around one persisted task/job/output/file lifecycle while preserving existing response compatibility
- [ ] 6.4 Implement idempotent credit reserve, commit, release, refund, and reconciliation so retries cannot double-charge or double-refund
- [x] 6.5 Record managed versus BYOK routing and normalized usage without storing unrestricted prompts or outputs in gateway telemetry
- [ ] 6.6 Add concurrency, crash-before/after-provider-call, duplicate-delivery, timeout, cancellation, file-write, insufficient-credit, and restart-recovery tests

## 7. Runtime and account experience

- [x] 7.1 Replace upstream provider/model cards with bilingual OneShowModel readiness and personal-connection cards
- [x] 7.2 Add accessible UI to add a supported connection, enter an API key, test it, choose a model where allowed, set default, rotate, disable, and delete
- [x] 7.3 Mask saved keys and clearly explain that OneShowTools cannot display them again after submission
- [x] 7.4 Let eligible tool runs choose OneShowModel or an active user connection and persist that choice without exposing secrets
- [ ] 7.5 Add honest unavailable, invalid-key, rate-limit, timeout, retrying, cancelled, and provider-outage states in Chinese and English
- [ ] 7.6 Add keyboard, focus, screen-reader, validation, reduced-motion, responsive, and secret-autofill/privacy checks

## 8. Tool and administrator integration

- [x] 8.1 Define the versioned tool-to-gateway contract and migrate current model-backed tools without moving their prompts or domain logic into platform configuration
- [x] 8.2 Preserve all existing tool URLs, non-model processing, task history, files, and credit prices
- [x] 8.3 Add administrator runtime health, invocation failure, latency, usage, retry, and stuck-job views using the OneShowModel alias only
- [ ] 8.4 Add permission-scoped job retry/quarantine and connection-disable actions with reason, idempotency, and immutable audit
- [x] 8.5 Prove administrator serializers and exports cannot reveal managed or customer provider identities and credentials

## 9. End-to-end validation and production rollout

- [ ] 9.1 Run all existing tests plus adapter, encryption, SSRF, ownership, durable-worker, idempotency, quota, redaction, and migration suites
- [ ] 9.2 Run browser acceptance from verified registration through OneShowModel tool result, Task Center, File Center, Credits, account model settings, and administrator observability
- [ ] 9.3 Run a separate BYOK browser flow using a synthetic provider account and prove another user and every admin role cannot retrieve its secret
- [x] 9.4 Back up production, apply additive migrations, verify invariants, and deploy with OneShowModel and BYOK flags disabled
- [x] 9.5 Configure dedicated secrets, run an administrator-only OneShowModel canary, and verify provider identity remains absent from public/API/log/audit output
- [x] 9.6 Enable managed execution progressively, monitor failures/latency/credits/jobs, and retain one-step runtime disable and application rollback
- [x] 9.7 Enable BYOK only after security and browser gates pass; keep Stripe, Alipay, WeChat Pay, and destructive account deletion disabled
- [ ] 9.8 Push validated code and record commit, backup, migration, secret-rotation, health, smoke, monitoring, and rollback evidence
