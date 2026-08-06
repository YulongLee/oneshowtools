import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const deployFiles = [
  "deploy/one-click.sh",
  "deploy/remote-release.sh",
  "deploy/rollback.sh",
  "deploy/remote-rollback.sh",
  "deploy/bootstrap-ubuntu.sh",
];

test("deployment scripts are valid shell programs", () => {
  execFileSync("bash", ["-n", ...deployFiles], { cwd: projectRoot });
});

test("one-click deployment preserves secrets and user data", () => {
  const source = readFileSync(resolve(projectRoot, "deploy/one-click.sh"), "utf8");
  for (const excluded of ["--exclude='.env'", "--exclude='data/'", "--exclude='node_modules/'"]) {
    assert.match(source, new RegExp(excluded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /npm test/);
  assert.match(source, /npm run db:check/);
  assert.match(source, /DEPLOY_BOOTSTRAP/);
  assert.match(source, /DEPLOY_ENV_FILE/);
});

test("remote release has backup, health check, rollback, and bounded retention", () => {
  const source = readFileSync(resolve(projectRoot, "deploy/remote-release.sh"), "utf8");
  assert.match(source, /npm run db:backup/);
  assert.match(source, /trap rollback ERR/);
  assert.match(source, /HEALTH_URL/);
  assert.match(source, /KEEP_RELEASES/);
  assert.match(source, /KEEP_DB_BACKUPS/);
  assert.match(source, /PREVIOUS_MODULES/);
  assert.match(source, /mv "\$STAGE\/node_modules"/);
  assert.doesNotMatch(source, /rm -rf \/|rm -rf "\$APP_ROOT"/);
});
