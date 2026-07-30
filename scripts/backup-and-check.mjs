import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = resolve(import.meta.dirname, "..");
const dataDirectory = resolve(projectRoot, process.env.DATA_DIR || "data");
const databasePath = resolve(dataDirectory, "oneshowtools.sqlite");
const backupDirectory = resolve(dataDirectory, "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = resolve(backupDirectory, `oneshowtools-${stamp}.sqlite`);

await mkdir(backupDirectory, { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA wal_checkpoint(FULL)");

const integrity = db.prepare("PRAGMA integrity_check").get();
if (integrity.integrity_check !== "ok") throw new Error(`Database integrity failed: ${integrity.integrity_check}`);

const orphanChecks = [
  ["sessions", "SELECT COUNT(*) AS count FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL"],
  ["tasks", "SELECT COUNT(*) AS count FROM tasks t LEFT JOIN users u ON u.id = t.user_id WHERE u.id IS NULL"],
  ["files", "SELECT COUNT(*) AS count FROM files f LEFT JOIN users u ON u.id = f.user_id WHERE u.id IS NULL"],
  ["credits", "SELECT COUNT(*) AS count FROM credit_ledger l LEFT JOIN users u ON u.id = l.user_id WHERE u.id IS NULL"],
  ["subscriptions", "SELECT COUNT(*) AS count FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL"],
  ["admin memberships", "SELECT COUNT(*) AS count FROM admin_memberships m LEFT JOIN users u ON u.id = m.user_id WHERE u.id IS NULL"],
  ["support notes", "SELECT COUNT(*) AS count FROM support_notes n LEFT JOIN users u ON u.id = n.user_id WHERE u.id IS NULL"],
  ["commercial orders", "SELECT COUNT(*) AS count FROM commercial_orders o LEFT JOIN users u ON u.id = o.user_id WHERE u.id IS NULL"],
  ["tool versions", "SELECT COUNT(*) AS count FROM tool_versions v LEFT JOIN tools t ON t.id = v.tool_id WHERE t.id IS NULL"],
];
for (const [name, sql] of orphanChecks) {
  const count = Number(db.prepare(sql).get().count);
  if (count) throw new Error(`${name} ownership invariant failed: ${count} orphaned rows`);
}

const summary = {
  users: Number(db.prepare("SELECT COUNT(*) AS count FROM users").get().count),
  sessions: Number(db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count),
  tasks: Number(db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count),
  files: Number(db.prepare("SELECT COUNT(*) AS count FROM files").get().count),
  totalCredits: Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM credit_ledger").get().total),
  administrators: Number(db.prepare("SELECT COUNT(*) AS count FROM admin_memberships").get().count),
  adminAuditEvents: Number(db.prepare("SELECT COUNT(*) AS count FROM admin_audit_events").get().count),
  commercialOrders: Number(db.prepare("SELECT COUNT(*) AS count FROM commercial_orders").get().count),
  openOperationalAlerts: Number(db.prepare("SELECT COUNT(*) AS count FROM operational_alerts WHERE status = 'open'").get().count),
};
db.close();
await copyFile(databasePath, backupPath);
console.log(JSON.stringify({ ok: true, backupPath, summary }, null, 2));
