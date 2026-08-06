import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../db/migrations/0001_global_auth_and_billing.sql", import.meta.url), "utf8");
const commercialMigration = await readFile(new URL("../db/migrations/0002_commercial_account_lifecycle.sql", import.meta.url), "utf8");
const adminMigration = await readFile(new URL("../db/migrations/0003_commercial_admin_console.sql", import.meta.url), "utf8");
const modelMigration = await readFile(new URL("../db/migrations/0004_oneshow_model_runtime.sql", import.meta.url), "utf8");
const customEndpointMigration = await readFile(new URL("../db/migrations/0007_custom_model_endpoints.sql", import.meta.url), "utf8");
const intelligenceMigration = await readFile(new URL("../db/migrations/0008_market_intelligence_agent.sql", import.meta.url), "utf8");
const platformInfrastructureMigration = await readFile(new URL("../db/migrations/0011_platform_models_and_object_storage.sql", import.meta.url), "utf8");
const seoAgentMigration = await readFile(new URL("../db/migrations/0015_seo_agent.sql", import.meta.url), "utf8");
const objectStorageAdminMigration = await readFile(new URL("../db/migrations/0017_object_storage_admin_config.sql", import.meta.url), "utf8");
const musicCoverMigration = await readFile(new URL("../db/migrations/0018_music_history_and_cover.sql", import.meta.url), "utf8");
const musicReferenceMigration = await readFile(new URL("../db/migrations/0019_music_reference_cover.sql", import.meta.url), "utf8");
const aiImageMigration = await readFile(new URL("../db/migrations/0021_ai_image_suite.sql", import.meta.url), "utf8");
const modelStudioWorkspaceMigration = await readFile(new URL("../db/migrations/0022_model_studio_workspace.sql", import.meta.url), "utf8");
const customerSupportMigration = await readFile(new URL("../db/migrations/0023_customer_support.sql", import.meta.url), "utf8");
const requiredTables = [
  "users", "sessions", "accounts", "verifications", "profiles", "plans", "offers",
  "provider_mappings", "subscriptions", "webhook_receipts", "ledger_entries",
  "reservations", "tools", "audit_events",
];
const missing = requiredTables.filter((table) => !migration.includes(`CREATE TABLE ${table} `));
if (missing.length) throw new Error(`Migration is missing tables: ${missing.join(", ")}`);

for (const required of [
  "users_email_unique",
  "webhook_provider_event_unique",
  "provider_object_unique",
  "reservations_tool_usage_unique",
  "ledger_entries_no_update",
]) {
  if (!migration.includes(required)) throw new Error(`Migration is missing invariant: ${required}`);
}

for (const table of [
  "auth_tokens", "provider_accounts", "security_events", "rate_limits",
  "export_jobs", "deletion_requests", "webhook_receipts_v2",
  "account_provider_mappings", "invoices",
]) {
  if (!commercialMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`Commercial migration is missing table: ${table}`);
  }
}

for (const table of [
  "model_endpoint_policies", "user_model_connections", "model_credential_versions",
  "model_invocations", "execution_jobs", "execution_attempts", "task_settlements",
]) {
  if (!modelMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`Model runtime migration is missing table: ${table}`);
  }
}

for (const invariant of [
  "user_model_connections_one_default", "execution_jobs_claim_idx", "UNIQUE(task_id, kind)",
]) {
  if (!modelMigration.includes(invariant)) {
    throw new Error(`Model runtime migration is missing invariant: ${invariant}`);
  }
}

if (!customEndpointMigration.includes("CREATE TABLE IF NOT EXISTS user_model_connection_endpoints ")) {
  throw new Error("Custom endpoint migration is missing user_model_connection_endpoints");
}

for (const table of ["platform_model_configs", "file_storage_objects"]) {
  if (!platformInfrastructureMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`Platform infrastructure migration is missing table: ${table}`);
  }
}

if (!objectStorageAdminMigration.includes("CREATE TABLE IF NOT EXISTS object_storage_configs ")) {
  throw new Error("Object storage admin migration is missing object_storage_configs");
}
if (!musicCoverMigration.includes("CREATE TABLE IF NOT EXISTS image_provider_configs ")) {
  throw new Error("Music cover migration is missing image_provider_configs");
}
if (!musicReferenceMigration.includes("CREATE TABLE IF NOT EXISTS music_references ")) {
  throw new Error("Music reference migration is missing music_references");
}
for (const purpose of ["image_editing", "image_upscaling"]) {
  if (!aiImageMigration.includes(`'${purpose}'`)) throw new Error(`AI image migration is missing purpose: ${purpose}`);
}
if (!modelStudioWorkspaceMigration.includes("CREATE TABLE IF NOT EXISTS model_studio_workspace_configs ")) {
  throw new Error("Model Studio workspace migration is missing model_studio_workspace_configs");
}
for (const table of ["support_conversations", "support_messages", "support_knowledge_articles"]) {
  if (!customerSupportMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`Customer support migration is missing table: ${table}`);
  }
}

for (const table of [
  "seo_agent_projects", "seo_agent_connectors", "seo_agent_scans",
  "seo_agent_opportunities", "seo_agent_actions",
]) {
  if (!seoAgentMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`SEO Agent migration is missing table: ${table}`);
  }
}

for (const table of ["market_intelligence_reports", "marketplace_search_events"]) {
  if (!intelligenceMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`Market intelligence migration is missing table: ${table}`);
  }
}

for (const table of [
  "admin_roles", "admin_permissions", "admin_memberships", "admin_membership_roles",
  "admin_mfa_factors", "admin_recovery_codes", "admin_auth_sessions", "admin_approvals",
  "admin_idempotency", "admin_audit_events", "support_notes", "policy_versions",
  "user_consents", "legal_holds", "operational_jobs", "operational_alerts",
  "commercial_orders", "commercial_payment_events", "commercial_refunds",
  "commercial_disputes", "reconciliation_exceptions", "tool_versions",
  "tool_health_reports",
]) {
  if (!adminMigration.includes(`CREATE TABLE IF NOT EXISTS ${table} `)) {
    throw new Error(`Commercial admin migration is missing table: ${table}`);
  }
}

console.log(`Migration check passed (${requiredTables.length} required tables).`);
