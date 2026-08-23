import { randomUUID } from "node:crypto";
import { db } from "./database.mjs";
import { executeTask, failTaskExecution } from "./runtime.mjs";
import { collectSystemMetrics } from "./observability.mjs";
import { generateMarketIntelligenceReport, shouldRunDailyMarketReport } from "./market-intelligence.mjs";
import { runDueSeoAgentScans } from "./seo-agent.mjs";
import { deleteStoredFile } from "./object-storage.mjs";

const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
let timer;
let working = false;
let metricsTimer;
let intelligenceTimer;
let seoAgentTimer;
let deletionTimer;

export async function processDueAccountDeletions(limit = 5) {
  const due = db.prepare(`SELECT id, user_id AS userId FROM deletion_requests
    WHERE status = 'pending' AND execute_after <= ? ORDER BY execute_after ASC LIMIT ?`).all(Date.now(), limit);
  let completed = 0;
  for (const request of due) {
    const files = db.prepare(`SELECT f.storage_name AS storageName,
      COALESCE(s.provider, 'local') AS provider, s.object_key AS objectKey
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id
      WHERE f.user_id = ?`).all(request.userId);
    let transactionStarted = false;
    try {
      for (const file of files) await deleteStoredFile(file);
      db.exec("BEGIN IMMEDIATE");
      transactionStarted = true;
      db.prepare("UPDATE deletion_requests SET status = 'executing' WHERE id = ? AND status = 'pending'").run(request.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(request.userId);
      db.exec("COMMIT");
      transactionStarted = false;
      completed += 1;
    } catch {
      if (transactionStarted) {
        try { db.exec("ROLLBACK"); } catch { /* the transaction may already be closed */ }
      }
    }
  }
  return completed;
}

export function enqueueTask(taskId, timestamp = Date.now()) {
  db.prepare(`
    INSERT OR IGNORE INTO execution_jobs
      (id, task_id, status, attempts, max_attempts, next_attempt_at, created_at, updated_at)
    VALUES (?, ?, 'queued', 0, 3, ?, ?, ?)
  `).run(randomUUID(), taskId, timestamp, timestamp, timestamp);
}

function recoverExpiredLeases(timestamp) {
  const expired = db.prepare(`
    SELECT task_id FROM execution_jobs
    WHERE status = 'running' AND lease_until IS NOT NULL AND lease_until < ?
  `).all(timestamp);
  db.prepare(`
    UPDATE execution_jobs SET status = 'retrying', lease_token = NULL, lease_until = NULL,
      next_attempt_at = ?, updated_at = ?, last_error_class = 'WORKER_LEASE_EXPIRED'
    WHERE status = 'running' AND lease_until IS NOT NULL AND lease_until < ?
  `).run(timestamp, timestamp, timestamp);
  const resetTask = db.prepare("UPDATE tasks SET status = 'queued', updated_at = ? WHERE id = ? AND status = 'running'");
  for (const item of expired) resetTask.run(timestamp, item.task_id);
}

function claimNextJob() {
  const timestamp = Date.now();
  recoverExpiredLeases(timestamp);
  const candidate = db.prepare(`
    SELECT * FROM execution_jobs
    WHERE status IN ('queued','retrying') AND next_attempt_at <= ?
    ORDER BY created_at ASC LIMIT 1
  `).get(timestamp);
  if (!candidate) return null;
  const leaseToken = randomUUID();
  const result = db.prepare(`
    UPDATE execution_jobs SET status = 'running', attempts = attempts + 1,
      lease_token = ?, lease_until = ?, heartbeat_at = ?, updated_at = ?
    WHERE id = ? AND status IN ('queued','retrying')
  `).run(leaseToken, timestamp + 60_000, timestamp, timestamp, candidate.id);
  if (!result.changes) return null;
  const job = db.prepare("SELECT * FROM execution_jobs WHERE id = ?").get(candidate.id);
  db.prepare(`
    INSERT INTO execution_attempts
      (id, job_id, attempt_number, worker_id, status, started_at)
    VALUES (?, ?, ?, ?, 'running', ?)
  `).run(randomUUID(), job.id, job.attempts, workerId, timestamp);
  return job;
}

function finishAttempt(job, status, errorClass = null) {
  db.prepare(`
    UPDATE execution_attempts SET status = ?, error_class = ?, completed_at = ?
    WHERE job_id = ? AND attempt_number = ?
  `).run(status, errorClass, Date.now(), job.id, job.attempts);
}

export async function runNextJob() {
  if (working) return false;
  const job = claimNextJob();
  if (!job) return false;
  working = true;
  const heartbeat = setInterval(() => {
    const timestamp = Date.now();
    db.prepare(`UPDATE execution_jobs SET lease_until = ?, heartbeat_at = ?, updated_at = ? WHERE id = ? AND lease_token = ? AND status = 'running'`)
      .run(timestamp + 60_000, timestamp, timestamp, job.id, job.lease_token);
  }, 20_000);
  heartbeat.unref?.();
  try {
    await executeTask(job.task_id);
    finishAttempt(job, "completed");
    db.prepare(`
      UPDATE execution_jobs SET status = 'completed', lease_token = NULL, lease_until = NULL,
        completed_at = ?, updated_at = ? WHERE id = ? AND lease_token = ?
    `).run(Date.now(), Date.now(), job.id, job.lease_token);
  } catch (error) {
    const errorClass = error?.code || "TASK_EXECUTION_FAILED";
    const retry = Boolean(error?.retryable) && job.attempts < job.max_attempts;
    finishAttempt(job, retry ? "retrying" : "failed", errorClass);
    const delay = Math.min(30_000, 1000 * (2 ** Math.max(0, job.attempts - 1)));
    db.prepare(`
      UPDATE execution_jobs SET status = ?, lease_token = NULL, lease_until = NULL,
        next_attempt_at = ?, last_error_class = ?, completed_at = ?, updated_at = ?
      WHERE id = ? AND lease_token = ?
    `).run(
      retry ? "retrying" : "failed",
      Date.now() + delay,
      errorClass,
      retry ? null : Date.now(),
      Date.now(),
      job.id,
      job.lease_token,
    );
    if (retry) {
      db.prepare("UPDATE tasks SET status = 'queued', updated_at = ? WHERE id = ?").run(Date.now(), job.task_id);
    } else {
      failTaskExecution(job.task_id, errorClass);
    }
  } finally {
    clearInterval(heartbeat);
    working = false;
  }
  return true;
}

export function cancelExecutionJob(taskId) {
  db.prepare(`
    UPDATE execution_jobs SET status = 'cancelled', lease_token = NULL, lease_until = NULL,
      completed_at = ?, updated_at = ?
    WHERE task_id = ? AND status IN ('queued','retrying')
  `).run(Date.now(), Date.now(), taskId);
}

export function startWorker() {
  if (timer || process.env.DURABLE_WORKER_ENABLED === "false") return;
  timer = setInterval(() => runNextJob().catch(() => {}), Number(process.env.WORKER_POLL_MS || 500));
  timer.unref?.();
  runNextJob().catch(() => {});
  if (process.env.INFRASTRUCTURE_COLLECTION_ENABLED !== "false") {
    metricsTimer = setInterval(() => collectSystemMetrics(), Number(process.env.METRICS_COLLECTION_MS || 60000));
    metricsTimer.unref?.();
    collectSystemMetrics();
  }
  if (process.env.MARKET_INTELLIGENCE_ENABLED !== "false") {
    const check = () => {
      if (shouldRunDailyMarketReport()) generateMarketIntelligenceReport({ triggerKind: "scheduled" }).catch(() => {});
    };
    intelligenceTimer = setInterval(check, Number(process.env.MARKET_INTELLIGENCE_POLL_MS || 900000));
    intelligenceTimer.unref?.();
    check();
  }
  if (process.env.SEO_AGENT_SCHEDULER_ENABLED !== "false") {
    const checkSeoAgents = () => runDueSeoAgentScans(1).catch(() => {});
    seoAgentTimer = setInterval(checkSeoAgents, Number(process.env.SEO_AGENT_POLL_MS || 300000));
    seoAgentTimer.unref?.();
    checkSeoAgents();
  }
  deletionTimer = setInterval(() => processDueAccountDeletions().catch(() => {}), Number(process.env.ACCOUNT_DELETION_POLL_MS || 3600000));
  deletionTimer.unref?.();
  processDueAccountDeletions().catch(() => {});
}

export function stopWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (metricsTimer) clearInterval(metricsTimer);
  metricsTimer = undefined;
  if (intelligenceTimer) clearInterval(intelligenceTimer);
  intelligenceTimer = undefined;
  if (seoAgentTimer) clearInterval(seoAgentTimer);
  seoAgentTimer = undefined;
  if (deletionTimer) clearInterval(deletionTimer);
  deletionTimer = undefined;
}
