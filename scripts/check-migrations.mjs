import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../db/migrations/0001_global_auth_and_billing.sql", import.meta.url), "utf8");
const commercialMigration = await readFile(new URL("../db/migrations/0002_commercial_account_lifecycle.sql", import.meta.url), "utf8");
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

console.log(`Migration check passed (${requiredTables.length} required tables).`);
