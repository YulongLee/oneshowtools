# OneShowTools Platform

OneShowTools Platform is the shared account, discovery, runtime, credits, billing,
task, and file layer for AI tools published by OneShow AI Lab.

## Platform modules

1. User System — email registration, password login, secure cookie sessions, and account status.
2. Tool Marketplace — database-backed bilingual tool catalog and search.
3. AI Runtime — provider readiness, external runtime routing, and optional OpenAI execution.
4. Credits — append-only grants, consumption, refunds, and a computed balance.
5. Billing — database-backed plans and optional Stripe Checkout.
6. Task Center — persistent task input, output, runtime state, and credit cost.
7. File Center — authenticated upload, download, listing, and deletion.
8. Dashboard — live account, task, file, credit, and subscription metrics.

No visitor metrics, balances, tasks, files, or billing state are mocked. Optional
providers are shown as unconfigured until their environment variables are present.

## Built-in tool pages

Marketplace cards and search results open stable, directly addressable routes:

- `/tools/background-remover` — solid-color background removal with transparent PNG output.
- `/tools/copy-polish` — local copy cleanup, upgraded to AI polishing when OpenAI is configured.
- `/tools/pdf-summary` — PDF text extraction and local extractive summary, upgraded to an AI summary when OpenAI is configured.
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

- `OPENAI_API_KEY` enables OpenAI-backed tools.
- `TOOL_RUNTIME_BASE_URL` connects independent tool runtimes.
- `STRIPE_SECRET_KEY` and `STRIPE_PRO_PRICE_ID` enable real subscription checkout.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` enable the real Google OAuth
  redirect and callback flow.

## Verification

```bash
npm run build
npm test
```

The automated lifecycle test covers registration, session cookies, welcome
credits, task persistence, runtime waiting/refund behavior, file
upload/download/deletion, copy polishing, and image compression.
