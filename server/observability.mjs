import { randomUUID } from "node:crypto";
import { readFileSync, statSync, statfsSync } from "node:fs";
import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";
import { resolve } from "node:path";
import { db, dataDirectory } from "./database.mjs";

const definitions = [
  ["host.load.1m", "1 分钟系统负载", "1 minute load", "ratio", "gauge", 0.8, 1.2, 180000, "raw_7d"],
  ["host.memory.used_pct", "内存使用率", "Memory used", "percent", "gauge", 80, 92, 180000, "raw_7d"],
  ["host.disk.used_pct", "磁盘使用率", "Disk used", "percent", "gauge", 80, 92, 180000, "raw_7d"],
  ["host.uptime_seconds", "服务器运行时间", "Host uptime", "seconds", "gauge", null, null, 180000, "raw_7d"],
  ["process.rss_bytes", "进程内存", "Process RSS", "bytes", "gauge", 536870912, 805306368, 180000, "raw_7d"],
  ["process.heap_used_bytes", "堆内存", "Heap used", "bytes", "gauge", null, null, 180000, "raw_7d"],
  ["process.uptime_seconds", "服务运行时间", "Process uptime", "seconds", "gauge", null, null, 180000, "raw_7d"],
  ["database.size_bytes", "数据库大小", "Database size", "bytes", "gauge", null, null, 180000, "raw_7d"],
  ["database.wal_bytes", "WAL 大小", "WAL size", "bytes", "gauge", 67108864, 268435456, 180000, "raw_7d"],
  ["queue.depth", "作业队列深度", "Queue depth", "count", "gauge", 20, 100, 180000, "raw_7d"],
  ["queue.failed", "失败作业", "Failed jobs", "count", "gauge", 1, 10, 180000, "raw_7d"],
  ["collector.heartbeat", "指标采集心跳", "Collector heartbeat", "boolean", "gauge", null, null, 180000, "raw_7d"],
];

export function seedMetricCatalog() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO metric_definitions
    (name, label_zh, label_en, unit, metric_type, warning_threshold, critical_threshold,
      freshness_ms, retention_class, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rule = db.prepare(`
    INSERT OR IGNORE INTO metric_alert_rules
    (id, metric_name, warning_threshold, critical_threshold, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const timestamp = Date.now();
  for (const item of definitions) {
    insert.run(...item, timestamp);
    if (item[5] != null || item[6] != null) {
      rule.run(`rule:${item[0]}`, item[0], item[5], item[6], timestamp, timestamp);
    }
  }
}

function safeSize(pathname) {
  try { return statSync(pathname).size; } catch { return 0; }
}

function availableMemory() {
  if (process.platform !== "linux") return freemem();
  try {
    const source = readFileSync("/proc/meminfo", "utf8");
    const availableKb = Number(source.match(/^MemAvailable:\s+(\d+)\s+kB$/m)?.[1]);
    return Number.isFinite(availableKb) ? availableKb * 1024 : freemem();
  } catch {
    return freemem();
  }
}

function metricValues() {
  const memoryTotal = totalmem();
  const disk = statfsSync(dataDirectory);
  const diskTotal = Number(disk.blocks) * Number(disk.bsize);
  const diskFree = Number(disk.bavail) * Number(disk.bsize);
  const cpuCount = Math.max(1, cpus().length);
  const memory = process.memoryUsage();
  return {
    "host.load.1m": loadavg()[0] / cpuCount,
    "host.memory.used_pct": ((memoryTotal - availableMemory()) / memoryTotal) * 100,
    "host.disk.used_pct": diskTotal ? ((diskTotal - diskFree) / diskTotal) * 100 : 0,
    "host.uptime_seconds": uptime(),
    "process.rss_bytes": memory.rss,
    "process.heap_used_bytes": memory.heapUsed,
    "process.uptime_seconds": process.uptime(),
    "database.size_bytes": safeSize(resolve(dataDirectory, "oneshowtools.sqlite")),
    "database.wal_bytes": safeSize(resolve(dataDirectory, "oneshowtools.sqlite-wal")),
    "queue.depth": Number(db.prepare(`
      SELECT COUNT(*) AS count FROM operational_jobs WHERE status IN ('queued','running','retrying')
    `).get().count),
    "queue.failed": Number(db.prepare(`
      SELECT COUNT(*) AS count FROM operational_jobs WHERE status IN ('failed','quarantined')
    `).get().count),
    "collector.heartbeat": 1,
  };
}

function alertSeverity(value, rule) {
  if (rule.critical_threshold != null && value >= rule.critical_threshold) return "critical";
  if (rule.warning_threshold != null && value >= rule.warning_threshold) return "warning";
  return null;
}

function evaluateAlerts(values, timestamp) {
  const rules = db.prepare("SELECT * FROM metric_alert_rules WHERE enabled = 1").all();
  for (const rule of rules) {
    const value = values[rule.metric_name];
    if (value == null) continue;
    const severity = alertSeverity(value, rule);
    const kind = `metric:${rule.metric_name}`;
    const existing = db.prepare(`
      SELECT * FROM operational_alerts
      WHERE kind = ? AND target_type = ? AND target_id = ? AND status IN ('open','acknowledged')
      ORDER BY created_at DESC LIMIT 1
    `).get(kind, rule.scope_type, rule.scope_id);
    if (severity) {
      const details = JSON.stringify({ metricName: rule.metric_name, value, unit: definitions.find((item) => item[0] === rule.metric_name)?.[3] });
      if (existing) {
        db.prepare("UPDATE operational_alerts SET severity = ?, details_json = ? WHERE id = ?")
          .run(severity, details, existing.id);
      } else {
        db.prepare(`
          INSERT INTO operational_alerts
          (id, severity, kind, title, target_type, target_id, status, correlation_id,
            details_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
        `).run(randomUUID(), severity, kind, rule.metric_name, rule.scope_type, rule.scope_id, randomUUID(), details, timestamp);
      }
    } else if (existing) {
      db.prepare("UPDATE operational_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?")
        .run(timestamp, existing.id);
    }
  }
}

export function collectSystemMetrics(timestamp = Date.now()) {
  seedMetricCatalog();
  try {
    const values = metricValues();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO metric_samples
      (id, metric_name, scope_type, scope_id, value, collected_at)
      VALUES (?, ?, 'service', 'oneshowtools', ?, ?)
    `);
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const [name, value] of Object.entries(values)) insert.run(randomUUID(), name, Number(value), timestamp);
      db.prepare(`
        INSERT INTO observability_heartbeats (collector, status, error_code, collected_at)
        VALUES ('local', 'healthy', NULL, ?)
        ON CONFLICT(collector) DO UPDATE SET status = 'healthy', error_code = NULL,
          collected_at = excluded.collected_at
      `).run(timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    evaluateAlerts(values, timestamp);
    const cutoff = timestamp - 7 * 86400000;
    db.prepare("DELETE FROM metric_samples WHERE collected_at < ?").run(cutoff);
    return values;
  } catch (error) {
    db.prepare(`
      INSERT INTO observability_heartbeats (collector, status, error_code, collected_at)
      VALUES ('local', 'failed', 'COLLECTION_FAILED', ?)
      ON CONFLICT(collector) DO UPDATE SET status = 'failed',
        error_code = 'COLLECTION_FAILED', collected_at = excluded.collected_at
    `).run(timestamp);
    return null;
  }
}

seedMetricCatalog();
