import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

const projectRoot = resolve(import.meta.dirname, "..");
export const dataDirectory = resolve(projectRoot, process.env.DATA_DIR || "data");
export const uploadDirectory = resolve(dataDirectory, "uploads");
const databasePath = resolve(dataDirectory, "oneshowtools.sqlite");

mkdirSync(uploadDirectory, { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

const now = () => Date.now();

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'zh-CN',
      email_verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER,
      user_agent TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS auth_tokens_lookup_idx ON auth_tokens(token_hash, purpose, expires_at);

    CREATE TABLE IF NOT EXISTS provider_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      provider_email TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      window_started_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      kind TEXT NOT NULL,
      subject TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      payload_json TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deletion_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      execute_after INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      cancelled_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS webhook_receipts (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      error_code TEXT,
      created_at INTEGER NOT NULL,
      processed_at INTEGER,
      UNIQUE(provider, provider_event_id)
    );

    CREATE TABLE IF NOT EXISTS provider_mappings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      kind TEXT NOT NULL,
      provider_object_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(provider, kind, provider_object_id)
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_zh TEXT NOT NULL,
      description_en TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT NOT NULL,
      credit_cost INTEGER NOT NULL DEFAULT 0,
      runtime_kind TEXT NOT NULL DEFAULT 'external',
      runtime_status TEXT NOT NULL DEFAULT 'configuration_required',
      runtime_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tool_id TEXT NOT NULL REFERENCES tools(id),
      status TEXT NOT NULL,
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT,
      error_code TEXT,
      credit_cost INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS tasks_user_created_idx ON tasks(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      storage_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS files_user_created_idx ON files(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS task_files (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, file_id)
    );

    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description_zh TEXT NOT NULL,
      description_en TEXT NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(type, reference_type, reference_id)
    );

    CREATE INDEX IF NOT EXISTS ledger_user_created_idx ON credit_ledger(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL,
      interval TEXT NOT NULL,
      recurring_credits INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      provider TEXT NOT NULL,
      provider_subscription_id TEXT,
      status TEXT NOT NULL,
      current_period_end INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_invoice_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      amount_paid INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      hosted_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
  `);

  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0003_commercial_admin_console.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0004_oneshow_model_runtime.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0005_tool_model_preferences.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0006_admin_finops_observability.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0007_custom_model_endpoints.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0008_market_intelligence_agent.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0009_market_intelligence_v2.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0010_market_intelligence_conversations.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0011_platform_models_and_object_storage.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0012_ai_writing.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0013_seo_workbench.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0014_seo_provider_configs.sql"), "utf8"));

  const sessionColumns = new Set(db.prepare("PRAGMA table_info(sessions)").all().map((column) => column.name));
  if (!sessionColumns.has("last_seen_at")) db.exec("ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER");
  if (!sessionColumns.has("user_agent")) db.exec("ALTER TABLE sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''");
  if (!sessionColumns.has("ip_hash")) db.exec("ALTER TABLE sessions ADD COLUMN ip_hash TEXT NOT NULL DEFAULT ''");

  const timestamp = now();
  const tools = [
    ["tool_background", "background-remover", "图片背景移除", "Background Remover", "智能识别主体并移除纯色背景，支持透明 PNG 导出。", "Detect a solid-color background and export a transparent PNG.", "image", "MagicWand", 8, "builtin-image"],
    ["tool_polish", "copy-polish", "文案润色", "Copy Polisher", "优化语句表达，让内容更清晰、专业和自然。", "Refine wording so content reads clearly and naturally.", "writing", "Sparkle", 3, "openai"],
    ["tool_pdf", "pdf-summary", "PDF 摘要", "PDF Summarizer", "提取 PDF 文本并生成结构化摘要。", "Extract PDF text into a structured summary.", "document", "FilePdf", 12, "openai"],
    ["tool_compress", "image-compressor", "图片压缩", "Image Compressor", "转换为 WebP 以减小图片体积，同时保持清晰度。", "Convert to WebP to reduce size while preserving clarity.", "image", "ImageSquare", 2, "builtin-image"],
    ["tool_speech", "speech-to-text", "语音转文字", "Speech to Text", "使用浏览器语音识别将实时语音转换为文本。", "Use browser speech recognition to turn live speech into text.", "audio", "Microphone", 5, "browser"],
    ["tool_writer", "ai-writer", "AI 写作", "AI Writer", "覆盖内容创作、优化、SEO、营销、社媒、办公与创意写作的专业工作台。", "A professional workspace for content, SEO, marketing, social, business, and creative writing.", "writing", "NotePencil", 8, "openai"],
    ["tool_seo", "seo-workbench", "SEO 工作台", "SEO Workspace", "覆盖关键词、内容优化、网站诊断、排名、外链、竞品与报告的证据驱动 SEO 工具。", "Evidence-driven keyword, content, audit, rank, backlink, competitor, and reporting tools.", "seo", "ChartLineUp", 10, "openai"],
  ];
  const insertTool = db.prepare(`
    INSERT INTO tools (
      id, slug, name_zh, name_en, description_zh, description_en, category, icon,
      credit_cost, runtime_kind, runtime_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name_zh = excluded.name_zh,
      name_en = excluded.name_en,
      description_zh = excluded.description_zh,
      description_en = excluded.description_en,
      category = excluded.category,
      icon = excluded.icon,
      credit_cost = excluded.credit_cost,
      runtime_kind = excluded.runtime_kind,
      runtime_status = excluded.runtime_status,
      updated_at = excluded.updated_at
  `);
  for (const tool of tools) insertTool.run(...tool, "configuration_required", timestamp, timestamp);

  const plans = [
    ["plan_free", "free", "免费版", "Free", 0, "USD", "month", 200],
    ["plan_pro", "pro-monthly", "专业版", "Pro", 1200, "USD", "month", 2000],
  ];
  const insertPlan = db.prepare(`
    INSERT INTO plans (id, code, name_zh, name_en, amount_minor, currency, interval, recurring_credits, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET name_zh = excluded.name_zh, name_en = excluded.name_en,
      amount_minor = excluded.amount_minor, currency = excluded.currency,
      interval = excluded.interval, recurring_credits = excluded.recurring_credits
  `);
  for (const plan of plans) insertPlan.run(...plan);

  refreshRuntimeStatuses();
}

export function refreshRuntimeStatuses() {
  const storedManagedModel = db.prepare("SELECT 1 AS ready FROM platform_model_configs WHERE purpose = 'managed_runtime' AND status = 'active'").get();
  const openAiReady = Boolean(process.env.ONESHOW_MODEL_API_KEY || process.env.OPENAI_API_KEY || storedManagedModel?.ready)
    && String(process.env.ONESHOW_MODEL_EXECUTION_ENABLED || "true").toLowerCase() !== "false";
  const externalReady = Boolean(process.env.TOOL_RUNTIME_BASE_URL);
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'openai'")
    .run(openAiReady ? "ready" : "configuration_required");
  db.prepare("UPDATE tools SET runtime_status = ?, runtime_url = ? WHERE runtime_kind = 'external'")
    .run(externalReady ? "ready" : "configuration_required", process.env.TOOL_RUNTIME_BASE_URL || null);
  db.prepare("UPDATE tools SET runtime_status = 'ready' WHERE runtime_kind LIKE 'builtin-%' OR runtime_kind = 'browser'").run();
}

export function audit(userId, action, targetType = null, targetId = null, metadata = {}) {
  db.prepare(`
    INSERT INTO audit_events (id, user_id, action, target_type, target_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), userId || null, action, targetType, targetId, JSON.stringify(metadata), now());
}

initializeDatabase();
