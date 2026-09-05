import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { seoSpecialists } from "./seo-specialists.mjs";
import { billingPlanSeeds } from "./billing-catalog.mjs";

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

    CREATE TABLE IF NOT EXISTS policy_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      policy_type TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'registration',
      accepted_at INTEGER NOT NULL,
      UNIQUE(user_id, policy_type, policy_version)
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
      active INTEGER NOT NULL DEFAULT 0,
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

    CREATE TRIGGER IF NOT EXISTS files_user_limit_before_insert
    BEFORE INSERT ON files
    WHEN (SELECT COUNT(*) FROM files WHERE user_id = NEW.user_id) >= 100
    BEGIN
      SELECT RAISE(ABORT, 'USER_FILE_LIMIT_REACHED');
    END;

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

    CREATE TABLE IF NOT EXISTS product_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_code TEXT NOT NULL,
      entitlement_type TEXT NOT NULL DEFAULT 'lifetime',
      status TEXT NOT NULL DEFAULT 'active',
      credit_cost INTEGER NOT NULL DEFAULT 0,
      granted_at INTEGER NOT NULL,
      revoked_at INTEGER,
      UNIQUE(user_id, product_code)
    );

    CREATE TABLE IF NOT EXISTS licensed_devices (
      id TEXT PRIMARY KEY,
      entitlement_id TEXT NOT NULL REFERENCES product_entitlements(id) ON DELETE CASCADE,
      device_fingerprint TEXT NOT NULL,
      device_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      app_version TEXT NOT NULL DEFAULT '',
      last_seen_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(entitlement_id, device_fingerprint)
    );

    CREATE TABLE IF NOT EXISTS stock_watchlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL DEFAULT 'A',
      display_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      threshold REAL NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      cooldown_minutes INTEGER NOT NULL DEFAULT 30,
      last_triggered_at INTEGER,
      created_at INTEGER NOT NULL
    );

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
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0015_seo_agent.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0016_music_studio.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0017_object_storage_admin_config.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0018_music_history_and_cover.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0019_music_reference_cover.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0020_singing_cover.sql"), "utf8"));
  const imageProviderSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'image_provider_configs'").get()?.sql || "";
  if (!imageProviderSchema.includes("image_editing")) {
    db.exec(readFileSync(resolve(projectRoot, "db/migrations/0021_ai_image_suite.sql"), "utf8"));
  }
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0022_model_studio_workspace.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0023_customer_support.sql"), "utf8"));
  const platformModelSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'platform_model_configs'").get()?.sql || "";
  if (!platformModelSchema.includes("oneshow_home_chat")) {
    db.exec(readFileSync(resolve(projectRoot, "db/migrations/0024_oneshow_home_model_gateway.sql"), "utf8"));
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS platform_model_invocations (
        id TEXT PRIMARY KEY,
        purpose TEXT NOT NULL,
        service TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
        model_id TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        latency_ms INTEGER,
        error_class TEXT,
        started_at INTEGER NOT NULL,
        completed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS platform_model_invocations_purpose_started_idx
        ON platform_model_invocations(purpose, started_at DESC);
    `);
  }
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0025_tool_publication_control.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0026_sms_auth.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0027_tool_branding.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0028_domestic_payment_providers.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0029_favorites_library.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0030_workspace_projects_and_preferences.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0031_stock_market_provider.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0032_commercial_payment_lifecycle.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0033_intelligent_tool_search.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0034_tool_manuals.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0035_promotion_center.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0036_word_immersion.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0037_image_text_editor.sql"), "utf8"));
  db.exec(readFileSync(resolve(projectRoot, "db/migrations/0038_ppt_text_editor.sql"), "utf8"));
  const imageTextAssetColumns = new Set(db.prepare("PRAGMA table_info(image_text_assets)").all().map((item) => item.name));
  if (!imageTextAssetColumns.has("background_file_id")) db.exec("ALTER TABLE image_text_assets ADD COLUMN background_file_id TEXT REFERENCES files(id) ON DELETE SET NULL");
  const taskColumns = new Set(db.prepare("PRAGMA table_info(tasks)").all().map((item) => item.name));
  if (!taskColumns.has("deleted_at")) db.exec("ALTER TABLE tasks ADD COLUMN deleted_at INTEGER");
  db.exec("CREATE INDEX IF NOT EXISTS tasks_user_visible_created_idx ON tasks(user_id, deleted_at, created_at DESC)");
  const planColumns = new Set(db.prepare("PRAGMA table_info(plans)").all().map((item) => item.name));
  if (!planColumns.has("file_limit")) db.exec("ALTER TABLE plans ADD COLUMN file_limit INTEGER NOT NULL DEFAULT 100");
  const subscriptionColumns = new Set(db.prepare("PRAGMA table_info(subscriptions)").all().map((item) => item.name));
  if (!subscriptionColumns.has("cancel_at_period_end")) db.exec("ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0");
  const commercialOrderColumns = new Set(db.prepare("PRAGMA table_info(commercial_orders)").all().map((item) => item.name));
  if (!commercialOrderColumns.has("provider_checked_at")) db.exec("ALTER TABLE commercial_orders ADD COLUMN provider_checked_at INTEGER");
  if (!commercialOrderColumns.has("fulfillment_status")) db.exec("ALTER TABLE commercial_orders ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'pending'");
  if (!commercialOrderColumns.has("failure_code")) db.exec("ALTER TABLE commercial_orders ADD COLUMN failure_code TEXT");
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_membership_overrides (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
      expires_at INTEGER,
      assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_membership_overrides_status_expiry_idx
      ON user_membership_overrides(status, expires_at);
    DROP TRIGGER IF EXISTS files_user_limit_before_insert;
    CREATE TRIGGER files_user_limit_before_insert
    BEFORE INSERT ON files
    WHEN (SELECT COUNT(*) FROM files WHERE user_id = NEW.user_id) >= COALESCE(
      (SELECT p.file_limit FROM user_membership_overrides o JOIN plans p ON p.id = o.plan_id
        WHERE o.user_id = NEW.user_id AND o.status = 'active'
          AND (o.expires_at IS NULL OR o.expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000)),
      (SELECT p.file_limit FROM subscriptions s JOIN plans p ON p.id = s.plan_id
        WHERE s.user_id = NEW.user_id AND s.status IN ('active','trialing')
          AND (s.current_period_end IS NULL OR s.current_period_end > CAST(strftime('%s','now') AS INTEGER) * 1000)
        ORDER BY s.created_at DESC LIMIT 1),
      (SELECT file_limit FROM plans WHERE code = 'free' LIMIT 1),
      100
    )
    BEGIN
      SELECT RAISE(ABORT, 'USER_FILE_LIMIT_REACHED');
    END;
  `);
  const imageProviderColumns = new Set(db.prepare("PRAGMA table_info(image_provider_configs)").all().map((item) => item.name));
  if (!imageProviderColumns.has("credential_source")) db.exec("ALTER TABLE image_provider_configs ADD COLUMN credential_source TEXT NOT NULL DEFAULT 'direct' CHECK(credential_source IN ('direct','workspace'))");
  const imageProviderWithOcrSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'image_provider_configs'").get()?.sql || "";
  if (!imageProviderWithOcrSchema.includes("image_text_ocr")) db.exec(readFileSync(resolve(projectRoot, "db/migrations/0039_image_text_ocr_provider.sql"), "utf8"));
  const foodNutritionModelSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'platform_model_configs'").get()?.sql || "";
  if (!foodNutritionModelSchema.includes("food_nutrition")) db.exec(readFileSync(resolve(projectRoot, "db/migrations/0040_food_nutrition_model_gateway.sql"), "utf8"));
  db.exec(`INSERT OR IGNORE INTO image_provider_configs (
    purpose,adapter,base_url,model_id,key_ciphertext,key_iv,key_tag,key_hint,credential_version,status,credit_cost,
    last_test_status,last_test_latency_ms,last_tested_at,updated_by,created_at,updated_at,credential_source
  ) SELECT 'image_text_ocr','dashscope',base_url,'qwen-vl-ocr-latest',key_ciphertext,key_iv,key_tag,key_hint,1,'active',1,
    'inherited',NULL,NULL,updated_by,created_at,updated_at,'workspace'
    FROM model_studio_workspace_configs WHERE id='default' AND status='active'`);
  db.exec("UPDATE seo_agent_connectors SET status = 'disabled' WHERE status <> 'disabled'");
  db.exec("UPDATE seo_agent_projects SET automation_mode = 'approval' WHERE automation_mode NOT IN ('recommend', 'approval')");

  const rankSnapshotColumns = new Set(db.prepare("PRAGMA table_info(seo_rank_snapshots)").all().map((item) => item.name));
  if (!rankSnapshotColumns.has("search_engine")) db.exec("ALTER TABLE seo_rank_snapshots ADD COLUMN search_engine TEXT NOT NULL DEFAULT 'google'");
  if (!rankSnapshotColumns.has("device")) db.exec("ALTER TABLE seo_rank_snapshots ADD COLUMN device TEXT NOT NULL DEFAULT 'desktop'");
  db.exec("CREATE INDEX IF NOT EXISTS idx_seo_rank_engine_history ON seo_rank_snapshots(user_id, website, keyword, search_engine, device, observed_at DESC)");

  const musicTrackColumns = new Set(db.prepare("PRAGMA table_info(music_tracks)").all().map((item) => item.name));
  if (!musicTrackColumns.has("cover_file_id")) db.exec("ALTER TABLE music_tracks ADD COLUMN cover_file_id TEXT");
  if (!musicTrackColumns.has("lyrics_source")) db.exec("ALTER TABLE music_tracks ADD COLUMN lyrics_source TEXT NOT NULL DEFAULT 'input'");
  const stockWatchColumns = new Set(db.prepare("PRAGMA table_info(stock_watchlists)").all().map((item) => item.name));
  if (!stockWatchColumns.has("is_primary")) db.exec("ALTER TABLE stock_watchlists ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0");
  const musicTrackSql = String(db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'music_tracks'").get()?.sql || "");
  if (!musicTrackSql.includes("'singing_cover'")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN IMMEDIATE;
      CREATE TABLE music_tracks_next (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('inspiration','lyrics','instrumental','cover','singing_cover')),
        prompt TEXT NOT NULL,
        lyrics TEXT NOT NULL DEFAULT '',
        options_json TEXT NOT NULL DEFAULT '{}',
        variant_index INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
        provider_alias TEXT NOT NULL DEFAULT 'OneShowMusic',
        provider_track_id TEXT,
        duration_ms INTEGER,
        error_code TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        cover_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
        lyrics_source TEXT NOT NULL DEFAULT 'input',
        UNIQUE(task_id, variant_index)
      );
      INSERT INTO music_tracks_next (
        id, user_id, task_id, file_id, title, mode, prompt, lyrics, options_json,
        variant_index, status, provider_alias, provider_track_id, duration_ms,
        error_code, created_at, updated_at, completed_at, cover_file_id, lyrics_source
      ) SELECT
        id, user_id, task_id, file_id, title, mode, prompt, lyrics, options_json,
        variant_index, status, provider_alias, provider_track_id, duration_ms,
        error_code, created_at, updated_at, completed_at, cover_file_id, lyrics_source
      FROM music_tracks;
      DROP TABLE music_tracks;
      ALTER TABLE music_tracks_next RENAME TO music_tracks;
      CREATE INDEX music_tracks_user_created_idx ON music_tracks(user_id, created_at DESC);
      CREATE INDEX music_tracks_task_idx ON music_tracks(task_id, variant_index);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  const sessionColumns = new Set(db.prepare("PRAGMA table_info(sessions)").all().map((column) => column.name));
  if (!sessionColumns.has("last_seen_at")) db.exec("ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER");
  if (!sessionColumns.has("user_agent")) db.exec("ALTER TABLE sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''");
  if (!sessionColumns.has("ip_hash")) db.exec("ALTER TABLE sessions ADD COLUMN ip_hash TEXT NOT NULL DEFAULT ''");

  const timestamp = now();
  const tools = [
    ["tool_background", "background-remover", "图片背景移除", "Background Remover", "智能识别主体并移除纯色背景，支持透明 PNG 导出。", "Detect a solid-color background and export a transparent PNG.", "image", "MagicWand", 8, "builtin-image"],
    ["tool_polish", "copy-polish", "文案润色", "Copy Polisher", "优化语句表达，让内容更清晰、专业和自然。", "Refine wording so content reads clearly and naturally.", "writing", "Sparkle", 3, "openai"],
    ["tool_pdf", "pdf-summary", "PDF 摘要与问答", "PDF Summary & Q&A", "提取 PDF 内容生成结构化摘要，或针对文档进行问答。", "Summarize a PDF or ask questions grounded in its content.", "document", "FilePdf", 12, "openai"],
    ["tool_pdf_merge", "pdf-merge", "PDF 合并", "Merge PDF", "按选择顺序合并多个 PDF，并生成一个可下载文件。", "Combine multiple PDFs in the selected order into one download.", "document", "FilePdf", 1, "builtin-pdf"],
    ["tool_pdf_split", "pdf-split", "PDF 拆分", "Split PDF", "按页码提取页面，或将每一页拆分后打包下载。", "Extract selected pages or split pages into a downloadable package.", "document", "FilePdf", 1, "builtin-pdf"],
    ["tool_pdf_compress", "pdf-compress", "PDF 压缩", "Compress PDF", "通过页面图像优化缩小扫描件和图片型 PDF 的体积。", "Reduce scanned and image-heavy PDF size with page image optimization.", "document", "FilePdf", 2, "builtin-pdf"],
    ["tool_pdf_organize", "pdf-organizer", "PDF 页面整理", "Organize PDF Pages", "重新排序、删除并批量旋转 PDF 页面。", "Reorder, remove, and rotate PDF pages in one operation.", "document", "GridFour", 1, "builtin-pdf"],
    ["tool_images_pdf", "images-to-pdf", "图片转 PDF", "Images to PDF", "将多张 JPG、PNG、WebP 或 HEIC 图片按顺序合成为 PDF。", "Combine JPG, PNG, WebP, or HEIC images into an ordered PDF.", "document", "ImageSquare", 1, "builtin-pdf"],
    ["tool_pdf_images", "pdf-to-images", "PDF 转 JPG/PNG", "PDF to JPG/PNG", "将 PDF 每一页转换为高清 JPG 或 PNG 并打包下载。", "Convert every PDF page to high-resolution JPG or PNG images.", "document", "ImageSquare", 2, "builtin-pdf"],
    ["tool_pdf_watermark", "pdf-watermark", "PDF 加水印", "Watermark PDF", "为 PDF 的全部页面添加可调文字、颜色和透明度水印。", "Add adjustable text, color, and opacity watermarks to every page.", "document", "TextAa", 1, "builtin-pdf"],
    ["tool_pdf_numbers", "pdf-page-numbers", "PDF 添加页码", "Add PDF Page Numbers", "选择位置和起始数字，为 PDF 自动添加连续页码。", "Add continuous page numbers with a chosen position and starting number.", "document", "FileText", 1, "builtin-pdf"],
    ["tool_pdf_ocr", "pdf-ocr", "PDF OCR 文字识别", "PDF OCR", "识别中文和英文扫描件文字并导出可编辑 TXT。", "Recognize Chinese and English scanned text and export editable TXT.", "document", "FileText", 8, "builtin-pdf"],
    ["tool_pdf_markdown", "pdf-to-markdown", "PDF 转 Markdown", "PDF to Markdown", "提取文本层并按页面与标题结构输出 Markdown。", "Extract the text layer into page- and heading-aware Markdown.", "document", "FileText", 3, "builtin-pdf"],
    ["tool_pdf_excel", "pdf-table-to-excel", "PDF 表格提取为 Excel", "PDF Tables to Excel", "识别 PDF 文本层中的行列位置并生成多工作表 Excel。", "Detect rows and columns in the PDF text layer and create an Excel workbook.", "document", "Database", 6, "builtin-pdf"],
    ["tool_compress", "image-compressor", "图片压缩", "Image Compressor", "转换为 WebP 以减小图片体积，同时保持清晰度。", "Convert to WebP to reduce size while preserving clarity.", "image", "ImageSquare", 2, "builtin-image"],
    ["tool_heic_jpg", "heic-to-jpg", "HEIC 转 JPG", "HEIC to JPG", "将 iPhone HEIC 照片转换为兼容性更好的 JPG。", "Convert iPhone HEIC photos into widely compatible JPG files.", "image", "ImageSquare", 1, "builtin-image"],
    ["tool_image_convert", "image-format-converter", "图片格式转换", "Image Format Converter", "在 PNG、JPG、WebP 与 AVIF 之间转换图片格式。", "Convert images between PNG, JPG, WebP, and AVIF.", "image", "ArrowsClockwise", 1, "builtin-image"],
    ["tool_image_target", "target-image-compressor", "图片压缩到指定大小", "Compress Image to Target Size", "将图片尽量压缩到 100KB、200KB、500KB 或自定义大小。", "Compress an image toward 100KB, 200KB, 500KB, or a custom target.", "image", "ImageSquare", 2, "builtin-image"],
    ["tool_image_batch_resize", "batch-image-resizer", "图片批量改尺寸", "Batch Image Resizer", "一次调整最多 20 张图片并打包下载。", "Resize up to 20 images at once and download them as a package.", "image", "ArrowsClockwise", 2, "builtin-image"],
    ["tool_image_social_resize", "social-image-resizer", "社媒图片尺寸", "Social Image Resizer", "一键适配小红书、公众号、Instagram 与 YouTube 图片尺寸。", "Resize images for Xiaohongshu, WeChat, Instagram, and YouTube presets.", "image", "ImageSquare", 1, "builtin-image"],
    ["tool_favicon", "favicon-generator", "Favicon 生成器", "Favicon Generator", "从一张图片生成包含常用尺寸的 favicon.ico。", "Generate a multi-size favicon.ico from one image.", "image", "ImageSquare", 1, "builtin-image"],
    ["tool_og_image", "og-image-generator", "OG 分享图生成器", "OG Image Generator", "生成适合网站链接分享的 1200×630 品牌图片。", "Create a branded 1200×630 social sharing image for a web page.", "image", "ImageSquare", 2, "builtin-image"],
    ["tool_exif_remove", "exif-remover", "图片隐私信息清理", "EXIF Metadata Remover", "移除图片中的 EXIF、GPS 与设备元数据。", "Remove EXIF, GPS, and device metadata from an image.", "image", "ShieldCheck", 1, "builtin-image"],
    ["tool_image_watermark", "image-watermark", "图片加水印", "Image Watermark", "添加可调透明度和字号的文字水印。", "Add a text watermark with adjustable opacity and size.", "image", "TextAa", 1, "builtin-image"],
    ["tool_nine_grid", "nine-grid-image", "九宫格切图", "Nine-grid Image Splitter", "将方形区域切成九张图片并打包下载。", "Split a square image into nine tiles and download them as a package.", "image", "GridFour", 1, "builtin-image"],
    ["tool_id_photo", "id-photo-maker", "证件照尺寸与背景", "ID Photo Maker", "裁剪常用证件照尺寸并替换纯色背景；复杂发丝抠图接口已预留。", "Crop common ID-photo sizes and replace solid-color backgrounds; advanced AI matting is reserved.", "image", "UserCircle", 3, "builtin-image"],
    ["tool_ai_outfit", "ai-outfit-changer", "AI 一键换装", "AI Outfit Changer", "上传人像并描述服装，或同时上传服装参考图，生成保留本人特征的真实换装效果。", "Change an outfit from a description or clothing reference while preserving the person's identity.", "image", "MagicWand", 30, "platform-image-edit"],
    ["tool_sliding_ancestor", "sliding-ancestor-generator", "滑动变祖器", "Sliding Power-Up Generator", "上传一张人物照片，生成同一个人从虚到夯、严格按强度排列的 10 种连续形态。", "Upload a portrait and create ten strictly ordered power stages of the same person, from fragile to formidable.", "image", "ArrowsOutLineHorizontal", 120, "platform-image-edit"],
    ["tool_ai_id_photo", "ai-id-photo", "AI 证件照", "AI ID Photo", "智能生成规范构图、自然光线和指定底色的高清证件照。", "Create a polished ID photo with compliant framing, natural lighting, and a selected background.", "image", "UserCircle", 25, "platform-image-edit"],
    ["tool_ai_headshot", "ai-professional-headshot", "AI 职业形象照", "AI Professional Headshot", "保留人物身份特征，生成适合简历、LinkedIn 和企业主页的职业形象照。", "Create identity-preserving professional headshots for resumes, LinkedIn, and company profiles.", "image", "Briefcase", 35, "platform-image-edit"],
    ["tool_ai_product", "ai-product-photo", "AI 商品图", "AI Product Photo", "保留商品外观与包装信息，生成电商白底图、场景图和广告级商品图。", "Create commercial product photos while preserving shape, colors, logos, and packaging.", "image", "ImageSquare", 35, "platform-image-edit"],
    ["tool_ai_portrait", "ai-portrait-studio", "AI 写真", "AI Portrait Studio", "根据风格和场景描述生成保留本人特征的高品质个人写真。", "Generate premium identity-preserving portraits from a chosen style and scene.", "image", "Sparkle", 40, "platform-image-edit"],
    ["tool_ai_cutout", "ai-smart-cutout", "智能抠图", "Smart AI Cutout", "识别人物、商品和复杂边缘，生成透明背景 PNG。", "Extract people and products with fine edges into a transparent PNG.", "image", "GridFour", 20, "platform-image-edit"],
    ["tool_ai_bg_replace", "ai-background-replacer", "背景替换", "AI Background Replacer", "保留主体细节并根据描述生成光影与透视自然的新背景。", "Replace a background while matching the subject's lighting, perspective, and contact shadow.", "image", "ArrowsClockwise", 25, "platform-image-edit"],
    ["tool_ai_restore", "ai-image-restorer", "图片高清修复", "AI Image Restorer", "修复模糊、噪点、压缩痕迹和老照片划痕，输出高清图片。", "Restore blur, noise, compression artifacts, and scratches into a high-resolution image.", "image", "Sparkle", 25, "platform-image-upscale"],
    ["tool_food_nutrition", "food-nutrition-analyzer", "AI 食物热量分析", "AI Food Nutrition Analyzer", "上传一张食物照片，识别菜品与份量，估算热量、蛋白质、碳水、脂肪、膳食纤维和钠，并说明误差来源。", "Upload a food photo to estimate portions, calories, protein, carbs, fat, fiber, and sodium with transparent uncertainty.", "image", "ChartBar", 8, "platform-food-vision"],
    ["tool_fridge_recipe", "ai-fridge-recipe", "AI 冰箱食谱", "AI Fridge Recipe Planner", "上传冰箱照片识别现有食材，生成匹配度、缺少食材、采购清单与完整烹饪步骤。", "Upload a fridge photo to identify ingredients and get matched recipes, shopping gaps, and complete cooking steps.", "image", "ForkKnife", 30, "openai"],
    ["tool_stock_pet", "stock-pet", "牛来了桌面宠物", "Niu Lai Le Stock Pet", "把自选行情变成会涨会跌、会提醒的桌面小牛；一次解锁，支持 Windows 与 macOS。", "A lively desktop bull that follows your watchlist, reacts to market moves, and alerts you on Windows and macOS.", "data", "ChartLineUp", 2000, "desktop-product"],
    ["tool_fortune_cat", "fortune-cat", "招财滚滚", "Fortune Cat", "输入工资与工作时间，让招财猫在桌面实时告诉你今天和本月已经赚了多少钱。", "A lucky-cat desktop companion that turns salary and work hours into live earnings progress.", "productivity", "Coins", 1000, "desktop-product"],
    ["tool_hang_la_tier", "hang-la-tier-list-generator", "夯拉排行榜生成器", "Hang-La Tier List Maker", "上传图片、自定义夯拉等级并拖拽排序，一键导出适合分享的排行榜长图。", "Upload images, customize ranking tiers, drag to rank, and export a share-ready tier list.", "image", "ChartBar", 0, "builtin-tier-list"],
    ["tool_mbti_test", "mbti-personality-test", "MBTI 性格偏好自测", "Personality Preference Self-Test", "通过 64 道原创平衡情境题了解四维偏好，支持模糊维度与答题质量提示，报告可回看。", "Explore four preference dimensions with an original balanced questionnaire, ambiguity handling, response-quality checks, and saved reports.", "developer", "Brain", 0, "builtin-assessment"],
    ["tool_word_immersion", "word-immersion", "词浸 · AI 沉浸式英语阅读", "WordIn · AI Immersive Reading", "上传你真正想读的内容，让目标英语词汇自然融入上下文，在阅读中逐渐掌握。", "Bring target English vocabulary naturally into content you genuinely want to read and learn through context.", "education", "BookOpenText", 20, "openai"],
    ["tool_interview_assistant", "interview-assistant", "面试稳 AI 助手", "Interview Ace AI Assistant", "结合简历、目标岗位和知识资料，提供实时语音识别、截图解题、技术题回答思路与面试复盘。", "Use your resume, target role, and knowledge materials for live transcription, screenshot questions, technical-answer guidance, and interview review.", "career", "UserFocus", 0, "external-link"],
    ["tool_speech", "speech-to-text", "语音转文字", "Speech to Text", "使用浏览器语音识别将实时语音转换为文本。", "Use browser speech recognition to turn live speech into text.", "audio", "Microphone", 5, "browser"],
    ["tool_writer", "ai-writer", "AI 写作", "AI Writer", "覆盖内容创作、优化、SEO、营销、社媒、办公与创意写作的专业工作台。", "A professional workspace for content, SEO, marketing, social, business, and creative writing.", "writing", "NotePencil", 8, "openai"],
    ["tool_seo", "seo-workbench", "SEO 工作台", "SEO Workspace", "覆盖关键词、内容优化、网站诊断、排名、外链、竞品与报告的证据驱动 SEO 工具。", "Evidence-driven keyword, content, audit, rank, backlink, competitor, and reporting tools.", "seo", "ChartLineUp", 10, "openai"],
    ["tool_json_formatter", "json-formatter", "JSON 格式化与校验", "JSON Formatter & Validator", "格式化、压缩并校验 JSON，明确指出语法问题。", "Format, minify, and validate JSON with clear syntax feedback.", "developer", "Code", 0, "builtin-text"],
    ["tool_data_converter", "data-format-converter", "JSON / YAML / XML 转换", "JSON / YAML / XML Converter", "在常见结构化数据格式之间相互转换。", "Convert between common structured data formats.", "developer", "ArrowsClockwise", 0, "builtin-text"],
    ["tool_jwt_decoder", "jwt-decoder", "JWT 本地解析", "JWT Decoder", "解析 JWT Header 与 Payload，敏感令牌不会写入任务记录。", "Decode JWT headers and payloads without storing the sensitive token in task history.", "developer", "ShieldCheck", 0, "builtin-text"],
    ["tool_timestamp", "timestamp-converter", "时间戳转换", "Timestamp Converter", "在 Unix 秒、毫秒、ISO 与中国时间之间转换。", "Convert Unix seconds, milliseconds, ISO, UTC, and China time.", "developer", "ArrowsClockwise", 0, "builtin-text"],
    ["tool_base64_url", "base64-url-codec", "Base64 / URL 编解码", "Base64 / URL Encoder & Decoder", "进行 Base64 与 URL 编码解码，敏感原文不写入任务记录。", "Encode and decode Base64 or URLs without storing sensitive source text in task history.", "developer", "Code", 0, "builtin-text"],
    ["tool_regex", "regex-tester", "正则表达式测试", "Regex Tester", "安全测试正则匹配、位置与捕获分组。", "Safely test regex matches, positions, and capture groups.", "developer", "Code", 0, "builtin-text"],
    ["tool_text_diff", "text-diff", "文本差异对比", "Text Diff", "逐行对比两个文本并标记新增、删除与未变化内容。", "Compare two texts line by line and mark additions and removals.", "developer", "ArrowsClockwise", 0, "builtin-text"],
    ["tool_meta_title", "meta-title-generator", "Meta Title 生成器", "Meta Title Generator", "围绕目标关键词生成标题候选并检查长度。", "Generate title candidates around a target keyword and check length.", "seo", "TextAa", 1, "builtin-text"],
    ["tool_meta_description", "meta-description-generator", "Meta Description 生成器", "Meta Description Generator", "生成与页面意图一致的搜索摘要并检查长度。", "Create intent-aligned search descriptions and check length.", "seo", "FileText", 1, "builtin-text"],
    ["tool_schema_generator", "schema-generator", "Schema 结构化数据生成器", "Schema Markup Generator", "生成可复制的 JSON-LD Article、Product、Organization 或面包屑结构。", "Generate copy-ready JSON-LD for Article, Product, Organization, or breadcrumbs.", "seo", "Code", 1, "builtin-text"],
    ["tool_serp_preview", "serp-preview", "搜索结果预览", "SERP Preview", "预览标题、网址与摘要在搜索结果中的组合并检查长度。", "Preview a search snippet and check title and description lengths.", "seo", "MagnifyingGlass", 0, "builtin-text"],
    ["tool_robots", "robots-generator", "robots.txt 生成器", "robots.txt Generator", "按允许、禁止路径和 Sitemap 地址生成 robots.txt。", "Generate robots.txt from allow, disallow, and sitemap rules.", "seo", "Robot", 0, "builtin-text"],
    ["tool_sitemap_checker", "sitemap-checker", "Sitemap 检查器", "Sitemap Checker", "联网读取 Sitemap，检查状态、URL 数量、重复和无效地址。", "Fetch a live sitemap and check status, URL count, duplicates, and invalid entries.", "seo", "ChartLineUp", 1, "builtin-seo"],
    ["tool_xhs_copy", "xiaohongshu-copy", "小红书文案生成器", "Xiaohongshu Copy Generator", "生成标题、正文、标签并进行事实自检。", "Generate titles, platform-native copy, hashtags, and a factual self-check.", "social", "Megaphone", 5, "openai"],
    ["tool_content_repurpose", "content-repurposer", "多平台内容改写", "Multi-platform Content Repurposer", "将一份原始内容改写为不同平台可直接发布的版本。", "Turn one source into ready-to-publish versions for multiple platforms.", "social", "ShareNetwork", 5, "openai"],
    ["tool_qr_generator", "qr-code-generator", "二维码生成器", "QR Code Generator", "将网址、文本、Wi-Fi 或联系方式生成高清二维码图片。", "Create a high-resolution QR code from a URL, text, Wi-Fi settings, or contact details.", "marketing", "GridFour", 0, "builtin-text"],
    ["tool_qr_reader", "qr-code-reader", "二维码识别器", "QR Code Reader", "从图片中安全识别二维码内容，不上传到第三方服务。", "Read QR code content from an image without sending it to a third-party service.", "image", "MagnifyingGlass", 0, "builtin-image"],
    ["tool_image_ocr", "image-ocr", "图片 OCR 文字识别", "Image OCR", "识别截图和照片中的中英文文字并导出可编辑文本。", "Recognize Chinese and English text in screenshots or photos and export editable text.", "image", "FileText", 3, "builtin-image"],
    ["tool_image_text_editor", "image-text-editor", "字迹 · AI 视觉结构重建", "AI Visual Reconstruction", "将图片、海报、截图和 PDF 重建为可编辑文字图层，并导出可编辑 PPTX、SVG 或高清图片。", "Reconstruct images, posters, screenshots, and PDFs into editable text layers for PPTX, SVG, and high-resolution exports.", "image", "TextAa", 30, "image-text-edit"],
    ["tool_text_statistics", "text-statistics", "字数与阅读时间统计", "Word & Reading Time Counter", "统计中英文字词、字符、句子、段落和预计阅读时间。", "Count Chinese and English words, characters, sentences, paragraphs, and reading time.", "writing", "TextAa", 0, "builtin-text"],
    ["tool_csv_json", "csv-json-converter", "CSV / JSON 转换", "CSV / JSON Converter", "在 CSV 与 JSON 之间转换，支持常用分隔符和规范引号。", "Convert between CSV and JSON with common delimiters and standards-compliant quoting.", "data", "ArrowsClockwise", 0, "builtin-text"],
    ["tool_csv_cleaner", "csv-cleaner", "CSV 清理与去重", "CSV Cleaner & Deduplicator", "清理单元格空格、删除重复数据并输出规范 CSV。", "Trim cells, remove duplicate records, and produce clean CSV.", "data", "Database", 0, "builtin-text"],
    ["tool_csv_excel", "csv-to-excel", "CSV 转 Excel", "CSV to Excel", "将 CSV 生成带冻结表头和适配列宽的 Excel 工作簿。", "Create an Excel workbook from CSV with a frozen header and readable column widths.", "data", "Database", 1, "builtin-text"],
    ["tool_markdown_html", "markdown-html-converter", "Markdown / HTML 转换", "Markdown / HTML Converter", "在 Markdown 与语义化 HTML 之间双向转换。", "Convert between Markdown and semantic HTML in both directions.", "developer", "Code", 0, "builtin-text"],
    ["tool_rich_text_cleaner", "rich-text-cleaner", "富文本格式清理", "Rich Text Cleaner", "移除网页和办公软件复制内容中的隐藏标签与多余格式。", "Remove hidden markup and unwanted formatting from copied web or office content.", "writing", "TextAa", 0, "builtin-text"],
    ["tool_utm_builder", "utm-builder", "UTM 营销链接生成器", "UTM Campaign URL Builder", "生成规范的广告来源、渠道、活动和素材追踪链接。", "Build standards-compliant campaign URLs with source, medium, campaign, term, and content tracking.", "marketing", "ChartLineUp", 0, "builtin-text"],
    ["tool_video_compressor", "video-compressor", "视频压缩", "Video Compressor", "在服务端压缩 MP4、MOV 与 MKV 视频并保留可用画质。", "Compress MP4, MOV, and MKV video on the server while preserving usable quality.", "video", "VideoCamera", 3, "builtin-media"],
    ["tool_mov_mp4", "mov-to-mp4", "MOV 转 MP4", "MOV to MP4", "将 MOV 视频转换为网页和设备兼容性更好的 MP4。", "Convert MOV video to broadly compatible MP4.", "video", "ArrowsClockwise", 2, "builtin-media"],
    ["tool_mkv_mp4", "mkv-to-mp4", "MKV 转 MP4", "MKV to MP4", "将 MKV 视频转码为 H.264 MP4。", "Transcode MKV video into H.264 MP4.", "video", "ArrowsClockwise", 2, "builtin-media"],
    ["tool_video_trim", "video-trimmer", "视频裁剪", "Video Trimmer", "按开始时间和时长截取视频片段。", "Cut a video clip by start time and duration.", "video", "VideoCamera", 2, "builtin-media"],
    ["tool_video_gif", "video-to-gif", "视频转 GIF", "Video to GIF", "截取视频片段并生成适合分享的 GIF 动图。", "Turn a selected video segment into a shareable GIF.", "video", "ImageSquare", 2, "builtin-media"],
    ["tool_video_audio", "video-extract-audio", "视频提取音频", "Extract Audio from Video", "从视频中提取 MP3 音频。", "Extract MP3 audio from a video.", "video", "Microphone", 2, "builtin-media"],
    ["tool_mp4_mp3", "mp4-to-mp3", "MP4 转 MP3", "MP4 to MP3", "将 MP4 中的声音转换为 192kbps MP3。", "Convert audio from MP4 into a 192kbps MP3.", "audio", "Microphone", 2, "builtin-media"],
    ["tool_audio_convert", "audio-format-converter", "音频格式转换", "Audio Format Converter", "在 MP3、WAV 与 FLAC 之间转换音频。", "Convert audio between MP3, WAV, and FLAC.", "audio", "ArrowsClockwise", 1, "builtin-media"],
    ["tool_audio_trim", "audio-trimmer", "音频裁剪", "Audio Trimmer", "按开始时间和时长截取音频。", "Trim audio by start time and duration.", "audio", "Microphone", 1, "builtin-media"],
    ["tool_audio_merge", "audio-merger", "音频合并", "Audio Merger", "按上传顺序合并最多 10 个音频文件。", "Merge up to 10 audio files in upload order.", "audio", "Microphone", 2, "builtin-media"],
    ["tool_audio_normalize", "audio-normalizer", "音频响度标准化", "Audio Loudness Normalizer", "按播客、视频或广播目标统一音频响度。", "Normalize audio loudness for podcasts, video, or broadcast.", "audio", "Microphone", 2, "builtin-media"],
    ["tool_music_studio", "ai-music-studio", "AI 音乐工作室", "AI Music Studio", "通过灵感、自定义歌词或纯音乐模式创作完整音乐，并统一管理试听与下载。", "Create complete tracks from an idea, custom lyrics, or instrumental mode, then manage playback and downloads.", "music", "MusicNotes", 30, "builtin-music"],
    ["tool_lyrics_generator", "lyrics-generator", "AI 歌词生成器", "AI Lyrics Generator", "创作、续写或改写具有完整歌曲结构和记忆点的原创歌词，并可直接带入音乐工作室。", "Create, continue, or rewrite original, singable lyrics with a complete song structure and memorable hook.", "music", "NotePencil", 5, "openai"],
    ["tool_excel_merge", "excel-merger", "Excel 合并", "Merge Excel Workbooks", "将多个 Excel 工作簿和工作表合并到一个文件。", "Combine worksheets from multiple Excel workbooks into one file.", "data", "Database", 2, "builtin-data"],
    ["tool_excel_split", "excel-splitter", "Excel 按工作表拆分", "Split Excel Worksheets", "将每个工作表拆为独立 Excel 并打包下载。", "Split every worksheet into an individual Excel file and download a ZIP.", "data", "Database", 1, "builtin-data"],
    ["tool_csv_split", "csv-file-splitter", "CSV 大文件拆分", "Split Large CSV", "保留表头并按指定行数拆分 CSV。", "Split CSV by row count while retaining headers.", "data", "Database", 1, "builtin-data"],
    ["tool_excel_dedupe", "excel-deduplicator", "Excel 去重", "Excel Deduplicator", "按整行或指定字段删除重复数据。", "Remove duplicate rows using all columns or a selected key.", "data", "Database", 1, "builtin-data"],
    ["tool_excel_csv", "excel-to-csv", "Excel 转 CSV", "Excel to CSV", "将工作簿中的每个工作表导出为规范 CSV。", "Export every workbook sheet as standards-compliant CSV.", "data", "ArrowsClockwise", 1, "builtin-data"],
    ["tool_json_excel", "json-to-excel", "JSON 转 Excel", "JSON to Excel", "将 JSON 对象数组转换为可读 Excel。", "Convert JSON object arrays into a readable Excel workbook.", "data", "Database", 1, "builtin-data"],
    ["tool_xml_excel", "xml-to-excel", "XML 转 Excel", "XML to Excel", "解析重复 XML 记录并生成 Excel 表格。", "Parse repeated XML records into an Excel table.", "data", "Database", 1, "builtin-data"],
    ["tool_excel_json", "excel-to-json", "Excel 转 JSON", "Excel to JSON", "将工作表表头和数据转换为结构化 JSON。", "Convert worksheet headers and rows into structured JSON.", "data", "ArrowsClockwise", 1, "builtin-data"],
    ["tool_field_mapper", "table-field-mapper", "表格字段映射", "Table Field Mapper", "批量重命名 CSV 或 Excel 表头并导出新文件。", "Rename CSV or Excel headers in bulk and export a new file.", "data", "Database", 1, "builtin-data"],
    ["tool_pivot_summary", "table-pivot-summary", "表格数据透视汇总", "Table Pivot Summary", "按字段分组并计算求和、计数或平均值。", "Group rows and calculate sums, counts, or averages.", "data", "ChartLineUp", 2, "builtin-data"],
    ["tool_contact_extract", "contact-data-extractor", "邮箱手机号网址提取", "Contact Data Extractor", "从表格或文本文件中提取邮箱、手机号与网址。", "Extract email addresses, phone numbers, and URLs from tabular or text files.", "data", "MagnifyingGlass", 1, "builtin-data"],
    ["tool_seo_agent", "seo-agent", "OneShow SEO Agent", "OneShow SEO Agent", "持续发现 SEO 机会并输出可执行的修改建议，所有网站变更由用户自行完成。", "Continuously discover SEO opportunities and produce actionable recommendations for users to apply themselves.", "agent", "Robot", 20, "openai"],
    ...seoSpecialists.map((agent) => [agent.id, agent.slug, agent.nameZh, agent.nameEn, agent.descriptionZh, agent.descriptionEn, "agent", agent.icon, agent.creditCost, agent.runtimeKind || "openai"]),
  ];
  const insertTool = db.prepare(`
    INSERT INTO tools (
      id, slug, name_zh, name_en, description_zh, description_en, category, icon,
      credit_cost, runtime_kind, runtime_status, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      runtime_kind = excluded.runtime_kind,
      updated_at = excluded.updated_at
    WHERE tools.runtime_kind <> excluded.runtime_kind
  `);
  for (const tool of tools) insertTool.run(...tool, "configuration_required", timestamp, timestamp);

  const publicationDefaultsKey = "tool_publication_defaults_v1";
  if (!db.prepare("SELECT 1 AS configured FROM platform_settings WHERE key = ?").get(publicationDefaultsKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      if (!db.prepare("SELECT 1 AS configured FROM platform_settings WHERE key = ?").get(publicationDefaultsKey)) {
        const publishedSlugs = ["ai-music-studio", "ai-outfit-changer"];
        db.prepare("UPDATE tools SET active = 0, updated_at = ?").run(timestamp);
        db.prepare(`
          UPDATE tools SET active = 1, updated_at = ?
          WHERE slug IN (${publishedSlugs.map(() => "?").join(", ")})
        `).run(timestamp, ...publishedSlugs);
        db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
          .run(publicationDefaultsKey, JSON.stringify({ publishedSlugs }), timestamp);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const hangLaPublicationKey = "tool_hang_la_tier_publication_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(hangLaPublicationKey)) {
    db.prepare("UPDATE tools SET active = 1, updated_at = ? WHERE slug = 'hang-la-tier-list-generator'").run(timestamp);
    db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
      .run(hangLaPublicationKey, JSON.stringify({ slug: "hang-la-tier-list-generator", published: true }), timestamp);
  }

  const mbtiPublicationKey = "tool_mbti_test_publication_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(mbtiPublicationKey)) {
    db.prepare("UPDATE tools SET active = 1, updated_at = ? WHERE slug = 'mbti-personality-test'").run(timestamp);
    db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
      .run(mbtiPublicationKey, JSON.stringify({ slug: "mbti-personality-test", published: true }), timestamp);
  }

  const stockPetPublicationKey = "tool_stock_pet_publication_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(stockPetPublicationKey)) {
    db.prepare("UPDATE tools SET active = 1, updated_at = ? WHERE slug = 'stock-pet'").run(timestamp);
    db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
      .run(stockPetPublicationKey, JSON.stringify({ slug: "stock-pet", published: true }), timestamp);
  }

  const fortuneCatTestingKey = "tool_fortune_cat_testing_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(fortuneCatTestingKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE tools SET active = 0, runtime_status = 'ready', updated_at = ? WHERE slug = 'fortune-cat'").run(timestamp);
      db.prepare(`INSERT INTO tool_versions
        (id, tool_id, version, lifecycle_state, visibility, name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, contract_version, runtime_kind, created_at)
        SELECT ?, id, 1, 'testing', 'private', name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, 'v1', runtime_kind, ?
        FROM tools WHERE slug = 'fortune-cat' AND NOT EXISTS
          (SELECT 1 FROM tool_versions WHERE tool_id = 'tool_fortune_cat')`).run(randomUUID(), timestamp);
      db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
        .run(fortuneCatTestingKey, JSON.stringify({ slug: "fortune-cat", lifecycle: "testing", adminOnly: true }), timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const wordImmersionTestingKey = "tool_word_immersion_testing_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(wordImmersionTestingKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE tools SET active = 0, updated_at = ? WHERE slug = 'word-immersion'").run(timestamp);
      db.prepare(`INSERT INTO tool_versions
        (id, tool_id, version, lifecycle_state, visibility, name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, contract_version, runtime_kind, created_at)
        SELECT ?, id, 1, 'testing', 'private', name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, 'v1', runtime_kind, ?
        FROM tools WHERE slug = 'word-immersion' AND NOT EXISTS
          (SELECT 1 FROM tool_versions WHERE tool_id = 'tool_word_immersion')`).run(randomUUID(), timestamp);
      db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
        .run(wordImmersionTestingKey, JSON.stringify({ slug: "word-immersion", lifecycle: "testing", adminOnly: true }), timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const imageTextEditorTestingKey = "tool_image_text_editor_testing_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(imageTextEditorTestingKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE tools SET active = 0, updated_at = ? WHERE slug = 'image-text-editor'").run(timestamp);
      db.prepare(`INSERT INTO tool_versions
        (id, tool_id, version, lifecycle_state, visibility, name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, contract_version, runtime_kind, created_at)
        SELECT ?, id, 1, 'testing', 'private', name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, 'v1', runtime_kind, ?
        FROM tools WHERE slug = 'image-text-editor' AND NOT EXISTS
          (SELECT 1 FROM tool_versions WHERE tool_id = 'tool_image_text_editor')`).run(randomUUID(), timestamp);
      db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
        .run(imageTextEditorTestingKey, JSON.stringify({ slug: "image-text-editor", lifecycle: "testing", adminOnly: true }), timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const visualReconstructionUpgradeKey = "tool_image_text_editor_visual_reconstruction_v2";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(visualReconstructionUpgradeKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`UPDATE tools SET name_zh='字迹 · AI 视觉结构重建',name_en='AI Visual Reconstruction',
        description_zh='将图片、海报、截图和 PDF 重建为可编辑文字图层，并导出可编辑 PPTX、SVG 或高清图片。',
        description_en='Reconstruct images, posters, screenshots, and PDFs into editable text layers for PPTX, SVG, and high-resolution exports.',updated_at=?
        WHERE slug='image-text-editor'`).run(timestamp);
      db.prepare(`INSERT INTO tool_versions
        (id,tool_id,version,lifecycle_state,visibility,name_zh,name_en,description_zh,description_en,category,icon,credit_cost,contract_version,runtime_kind,created_at)
        SELECT ?,id,2,'testing','private',name_zh,name_en,description_zh,description_en,category,icon,credit_cost,'v2',runtime_kind,?
        FROM tools WHERE slug='image-text-editor' AND NOT EXISTS (SELECT 1 FROM tool_versions WHERE tool_id='tool_image_text_editor' AND version=2)`)
        .run(randomUUID(), timestamp);
      db.prepare("INSERT INTO platform_settings (key,value_json,updated_at) VALUES (?,?,?)")
        .run(visualReconstructionUpgradeKey, JSON.stringify({ slug: "image-text-editor", lifecycle: "testing", product: "visual-reconstruction" }), timestamp);
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }

  const interviewAssistantPublicationKey = "tool_interview_assistant_publication_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(interviewAssistantPublicationKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        UPDATE tools SET runtime_url = ?, runtime_status = 'ready', active = 1, updated_at = ?
        WHERE slug = 'interview-assistant'
      `).run("https://mianshiwen.cn/", timestamp);
      db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
        .run(interviewAssistantPublicationKey, JSON.stringify({
          slug: "interview-assistant",
          published: true,
          externalUrl: "https://mianshiwen.cn/",
        }), timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const lyricsStudioMergeKey = "tool_lyrics_music_studio_merge_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(lyricsStudioMergeKey)) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE tools SET active = 0, updated_at = ? WHERE slug = 'lyrics-generator'").run(timestamp);
      db.prepare(`
        UPDATE tool_versions SET lifecycle_state = 'retired'
        WHERE id = (SELECT id FROM tool_versions WHERE tool_id = 'tool_lyrics_generator' ORDER BY version DESC LIMIT 1)
      `).run();
      db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
        .run(lyricsStudioMergeKey, JSON.stringify({ slug: "lyrics-generator", parentSlug: "ai-music-studio" }), timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const marketplaceFeaturedKey = "marketplace.featured_tools";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(marketplaceFeaturedKey)) {
    db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
      .run(marketplaceFeaturedKey, JSON.stringify({
        toolSlugs: ["ai-music-studio", "ai-outfit-changer", "ai-fridge-recipe", "mbti-personality-test", "sliding-ancestor-generator"],
      }), timestamp);
  }
  const interviewAssistantFeaturedKey = "marketplace_interview_assistant_featured_v1";
  if (!db.prepare("SELECT 1 FROM platform_settings WHERE key = ?").get(interviewAssistantFeaturedKey)) {
    const featuredRow = db.prepare("SELECT value_json FROM platform_settings WHERE key = ?").get(marketplaceFeaturedKey);
    let featuredConfig = { toolSlugs: [] };
    try { featuredConfig = JSON.parse(featuredRow?.value_json || "{}"); } catch { /* Use a safe empty placement. */ }
    const toolSlugs = Array.isArray(featuredConfig.toolSlugs) ? featuredConfig.toolSlugs.filter(Boolean).slice(0, 20) : [];
    if (!toolSlugs.includes("interview-assistant") && toolSlugs.length < 20) toolSlugs.push("interview-assistant");
    db.prepare("UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = ?")
      .run(JSON.stringify({ ...featuredConfig, toolSlugs }), timestamp, marketplaceFeaturedKey);
    db.prepare("INSERT INTO platform_settings (key, value_json, updated_at) VALUES (?, ?, ?)")
      .run(interviewAssistantFeaturedKey, JSON.stringify({ slug: "interview-assistant", featured: true }), timestamp);
  }

  const plans = billingPlanSeeds;
  const insertPlan = db.prepare(`
    INSERT INTO plans (id, code, name_zh, name_en, amount_minor, currency, interval, recurring_credits, file_limit, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO NOTHING
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
  db.prepare("UPDATE tools SET runtime_status = 'ready' WHERE (runtime_kind LIKE 'builtin-%' AND runtime_kind <> 'builtin-music') OR runtime_kind = 'browser'").run();
  db.prepare("UPDATE tools SET runtime_status = 'ready' WHERE runtime_kind = 'desktop-product'").run();
  db.prepare(`
    UPDATE tools SET runtime_status = CASE
      WHEN runtime_url LIKE 'https://mianshiwen.cn/%' THEN 'ready'
      ELSE 'configuration_required'
    END WHERE runtime_kind = 'external-link'
  `).run();
  const musicReady = db.prepare("SELECT 1 AS ready FROM music_provider_configs WHERE status = 'active' LIMIT 1").get();
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'builtin-music'")
    .run(musicReady ? "ready" : "configuration_required");
  const imageEditingReady = db.prepare(`
    SELECT 1 AS ready FROM image_provider_configs AS provider
    WHERE provider.purpose = 'image_editing' AND provider.status = 'active'
      AND (COALESCE(provider.credential_source, 'direct') = 'direct' OR EXISTS (
        SELECT 1 FROM model_studio_workspace_configs AS workspace
        WHERE workspace.id = 'default' AND workspace.status = 'active'
      ))
  `).get();
  const imageUpscalingReady = db.prepare(`
    SELECT 1 AS ready FROM image_provider_configs AS provider
    WHERE provider.purpose IN ('image_upscaling','image_editing') AND provider.status = 'active'
      AND (COALESCE(provider.credential_source, 'direct') = 'direct' OR EXISTS (
        SELECT 1 FROM model_studio_workspace_configs AS workspace
        WHERE workspace.id = 'default' AND workspace.status = 'active'
      ))
    LIMIT 1
  `).get();
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-edit'").run(imageEditingReady ? "ready" : "configuration_required");
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-upscale'").run(imageUpscalingReady ? "ready" : "configuration_required");
  const foodVisionReady = db.prepare(`
    SELECT 1 AS ready FROM platform_model_configs WHERE purpose = 'food_nutrition' AND status = 'active'
    UNION ALL
    SELECT 1 AS ready FROM model_studio_workspace_configs WHERE id = 'default' AND status = 'active'
    LIMIT 1
  `).get();
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-food-vision'").run(foodVisionReady ? "ready" : "configuration_required");
}

export function audit(userId, action, targetType = null, targetId = null, metadata = {}) {
  db.prepare(`
    INSERT INTO audit_events (id, user_id, action, target_type, target_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), userId || null, action, targetType, targetId, JSON.stringify(metadata), now());
}

initializeDatabase();
