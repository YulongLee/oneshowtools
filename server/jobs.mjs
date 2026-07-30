import { randomUUID } from "node:crypto";
import { db } from "./database.mjs";
import { executeTask, failTaskExecution } from "./runtime.mjs";

const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
let timer;
let working = false;

export function enqueueTask(taskId, timestamp = Date.now()) {
  db.prepare(`
    INSERT OR IGNORE INTO execution_jobs
      (id, task_id, status, attempts, max_attempts, next_attempt_at, created_at, updated_at)
    VALUES (?, ?, 'queued', 0, 3, ?, ?, ?)
  `).run(randomUUID(), taskId, timestamp, timestamp, timestamp);
}

function recoverExpiredLeases(timestamp) {
  db.prepare(`
    UPDATE execution_jobs SET status = 'retrying', lease_token = NULL, lease_until = NULL,
      next_attempt_at = ?, updated_at = ?, last_error_class = 'WORKER_LEASE_EXPIRED'
    WHERE status = 'running' AND lease_until IS NOT NULL AND lease_until < ?
  `).run(timestamp, timestamp, timestamp);
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
}

export function stopWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
