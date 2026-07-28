import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../db/migrations/0001_global_auth_and_billing.sql", import.meta.url), "utf8");
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

console.log(`Migration check passed (${requiredTables.length} required tables).`);
