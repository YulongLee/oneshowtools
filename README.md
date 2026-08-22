# OneShowTools Platform

OneShowTools Platform is the shared account, discovery, runtime, credits, billing,
task, and file layer for AI tools published by OneShow AI Lab.

## Platform modules

1. User System — email registration, password login, secure cookie sessions, and account status.
2. Tool Marketplace — database-backed bilingual tool catalog and search.
3. AI Runtime — the managed OneShowModel gateway plus encrypted user-owned model connections.
4. Credits — append-only grants, consumption, refunds, and a computed balance.
5. Billing — database-backed plans and optional Stripe Checkout.
6. Task Center — persistent task input, output, runtime state, and credit cost.
7. File Center — authenticated upload, download, listing, and deletion.
8. Dashboard — live account, task, file, credit, and subscription metrics.
9. Admin Console — role-based operations, MFA, customer 360, governed credits, commerce, tool governance, jobs, privacy, and audit records.

No visitor metrics, balances, tasks, files, or billing state are mocked. Optional
providers are shown as unconfigured until their environment variables are present.

## Built-in tool pages

Marketplace cards and search results open stable, directly addressable routes:

- `/tools/background-remover` — solid-color background removal with transparent PNG output.
- `/tools/copy-polish` — local copy cleanup, upgraded through OneShowModel or a selected personal connection.
- `/tools/pdf-summary` — PDF text extraction and local summary, upgraded through OneShowModel or a selected personal connection.
- PDF suite — merge, split, page organization, scanned-document compression, images to PDF, PDF to JPG/PNG, text watermarks, page numbers, Chinese/English OCR, Markdown extraction, and table-to-Excel extraction. Every successful operation stores a real downloadable result in File Center.
- `/tools/image-compressor` — real WebP image compression with quality controls and size statistics.
- `/tools/speech-to-text` — browser speech recognition with an editable transcript.

Every successful run creates a real completed task, consumes credits from the
ledger, and stores downloadable image outputs in the File Center.

## Local development

```bash
npm install
npm run dev
```

The web app runs at `http://localhost:5173` and proxies API requests to the local
server on port `8787`. SQLite data and uploaded files are stored under `data/`,
which is ignored by Git.

## Provider configuration

Copy `.env.example` to `.env` and configure only the providers you are ready to
use. The platform runs without provider keys, but AI tasks remain in
`waiting_for_runtime` and their reserved credits are refunded.

- `ONESHOW_MODEL_API_KEY`, `ONESHOW_MODEL_BASE_URL`, and `ONESHOW_MODEL_ID` configure the private managed adapter. They are never returned to the browser.
- `MODEL_CREDENTIAL_ENCRYPTION_KEY` encrypts personal API keys with AES-256-GCM; `MODEL_CONNECTIONS_ENABLED` gates the feature.
- `DURABLE_WORKER_ENABLED` runs persisted, leased jobs that recover after a process restart.
- `TOOL_RUNTIME_BASE_URL` connects independent tool runtimes.
- `STRIPE_SECRET_KEY` and `STRIPE_PRO_PRICE_ID` enable real subscription checkout.
- Alipay and WeChat Pay credentials are configured in `/admin` under Commerce. Their encrypted key material is stored server-side, and verified provider notifications are the only path that grants credits.
- `ADMIN_EMAILS` is a comma-separated allowlist of verified accounts that may access `/admin`.

## Internal Codex executor

The backend includes an internal Codex executor for developing and maintaining
individual tools. It is deliberately separate from OneShowModel, is not returned
by public runtime APIs, and does not appear in the customer model picker.

The executor is disabled by default. To enable it, configure
`CODEX_EXECUTOR_ENABLED`, `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`,
`DASHSCOPE_MODEL`, and `CODEX_WORKSPACE_ROOT`. The supplied
`OFFERSTEADY_DASHSCOPE_API_KEY`, `OFFERSTEADY_CHAT_QWEN_BASE_URL`, and
`OFFERSTEADY_CHAT_MODEL` variable names are also accepted directly. The
workspace must be a dedicated Git checkout beneath the configured root and must
not contain production credentials, `.env` files, customer uploads, or database
files. Runs use DashScope's OpenAI-compatible Responses endpoint, a
workspace-write sandbox with network and web search disabled, a minimal
child-process environment, and a bounded timeout.

Backend development code can import `codexExecutor` from
`server/codex-executor.mjs` and call `run({ prompt, workingDirectory })`. The
result contains only the final response, changed file paths, token usage, and a
resumable thread ID; raw command output and reasoning are not returned.

## Admin console

The standalone admin console is available at `/admin`. It uses the same verified
email/password account system as the customer app, followed by server-side RBAC
and optional mandatory TOTP MFA. The commercial console provides real operational
data for dashboard metrics, customer 360, session and account controls, governed
credit adjustments and approvals, provider-neutral commerce records, tool
lifecycle management, operational jobs, privacy status, administrator roles, and
an immutable audit trail. Suspending a user immediately revokes that user's
sessions. Password hashes, session tokens, MFA secrets, and provider credentials
are never returned by admin APIs.

## Verification

```bash
npm run build
npm test
```

## Mobile App and WeChat Mini Program

The web application remains in `src/` and keeps its secure cookie session. Two
isolated clients now consume the same production API without changing the web
contract:

- `apps/mobile` is an Expo application for iOS and Android. It stores its
  revocable bearer session in the operating system secure store and provides
  real dashboard, catalog, task, file, music, outfit-changing, and food-analysis
  flows.
- `apps/miniprogram` is a Taro WeChat Mini Program. It supports server-side
  WeChat code exchange, SMS/email fallback login, the shared account dashboard,
  tool execution, tasks, and files.
- `packages/platform-client` is the shared, versioned native API contract.

Install and verify each client independently so web deployment remains
unchanged:

```bash
npm --prefix apps/mobile install
npm --prefix apps/miniprogram install
npm run build:clients
```

Before a real release, set the App API base URL, replace the Mini Program test
AppID, configure `WECHAT_MINIPROGRAM_APP_ID` and
`WECHAT_MINIPROGRAM_APP_SECRET` only on the server, and add the API host to the
Mini Program request/upload/download domain allowlist. See
`docs/mobile-and-miniprogram.md` for the complete release checklist.

The automated lifecycle test covers registration, session cookies, welcome
credits, task persistence, runtime waiting/refund behavior, file
upload/download/deletion, copy polishing, and image compression.
