import { randomUUID } from "node:crypto";
import { audit, db } from "./database.mjs";
import { inspectSite, safeSeoUrl } from "./seo-fetch.mjs";

const DAY = 86_400_000;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const agentError = (code, status = 400) => Object.assign(new Error(code), { code, status });
const parse = (value, fallback = {}) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

async function requestBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function projectRow(userId, projectId) {
  const row = db.prepare("SELECT * FROM seo_agent_projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!row) throw agentError("SEO_AGENT_PROJECT_NOT_FOUND", 404);
  return row;
}

function opportunityView(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    scanId: row.scan_id,
    kind: row.kind,
    titleZh: row.title_zh,
    titleEn: row.title_en,
    summaryZh: row.summary_zh,
    summaryEn: row.summary_en,
    risk: row.risk,
    impact: row.impact,
    confidence: row.confidence,
    creditCost: row.credit_cost,
    executionKind: row.execution_kind,
    status: row.status,
    evidence: parse(row.evidence_json),
    proposal: parse(row.proposal_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function actionView(row) {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    taskId: row.task_id,
    status: row.status,
    executionKind: row.execution_kind,
    before: parse(row.before_json),
    after: parse(row.after_json),
    providerResponse: parse(row.provider_response_json),
    errorCode: row.error_code,
    approvedAt: row.approved_at,
    executedAt: row.executed_at,
    rolledBackAt: row.rolled_back_at,
  };
}

function nextScan(timestamp, hour = 8, minute = 30) {
  const next = new Date(timestamp);
  next.setHours(clamp(hour, 0, 23), clamp(minute, 0, 59), 0, 0);
  if (next.getTime() <= timestamp) next.setDate(next.getDate() + 1);
  return next.getTime();
}

function projectView(row) {
  const latest = db.prepare("SELECT * FROM seo_agent_scans WHERE project_id = ? ORDER BY started_at DESC LIMIT 1").get(row.id);
  const counts = db.prepare("SELECT status, COUNT(*) AS count FROM seo_agent_opportunities WHERE project_id = ? GROUP BY status").all(row.id);
  return {
    id: row.id,
    name: row.name,
    siteUrl: row.site_url,
    siteOrigin: row.site_origin,
    status: row.status,
    ownershipStatus: row.ownership_status,
    automationMode: ["recommend", "approval"].includes(row.automation_mode) ? row.automation_mode : "approval",
    dailyCreditLimit: row.daily_credit_limit,
    scanHour: row.scan_hour,
    scanMinute: row.scan_minute,
    lastScannedAt: row.last_scanned_at,
    nextScanAt: row.next_scan_at,
    latestScan: latest ? {
      id: latest.id,
      status: latest.status,
      source: latest.source,
      healthScore: latest.health_score,
      coverage: parse(latest.coverage_json),
      errorCode: latest.error_code,
      startedAt: latest.started_at,
      completedAt: latest.completed_at,
    } : null,
    opportunityCounts: Object.fromEntries(counts.map((item) => [item.status, Number(item.count)])),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function pageLabel(page) {
  try { return new URL(page.finalUrl || page.requestedUrl).pathname || "/"; } catch { return page.finalUrl || page.requestedUrl || "/"; }
}

function descriptionDraft(page) {
  const subject = page.title || page.headings?.find((item) => item.level === "H1")?.text || pageLabel(page);
  const sample = String(page.textSample || "").replace(/\s+/g, " ").trim();
  const body = sample && sample !== subject ? sample.slice(0, 110).replace(/[，。,.!?！？；;:]?$/, "") : "了解页面核心内容、适用场景与下一步操作";
  return `${subject}：${body}`.slice(0, 155);
}

function titleDraft(page) {
  const h1 = page.headings?.find((item) => item.level === "H1")?.text;
  return String(h1 || page.title || pageLabel(page)).slice(0, 60);
}

function deriveOpportunities(scan) {
  const pages = scan.pages.filter((page) => page.status >= 200 && page.status < 400);
  const opportunities = [];
  const add = (data) => opportunities.push({
    risk: "low", impact: "medium", confidence: 85, creditCost: 8, executionKind: "draft", ...data,
  });
  const missingDescriptions = pages.filter((page) => !page.description);
  if (missingDescriptions.length) add({
    kind: "meta_description",
    titleZh: `补全 ${missingDescriptions.length} 个页面的搜索摘要`,
    titleEn: `Add search descriptions to ${missingDescriptions.length} pages`,
    summaryZh: "实时抓取发现页面缺少 Meta Description；生成独立草稿供审核，不虚构点击率提升。",
    summaryEn: "The live crawl found missing meta descriptions. Generate unique drafts for review without inventing CTR forecasts.",
    impact: "high", confidence: 95, creditCost: Math.max(4, missingDescriptions.length * 2),
    evidence: { source: "live-crawl", urls: missingDescriptions.map((page) => page.finalUrl), observed: `${missingDescriptions.length} missing descriptions` },
    proposal: { changes: missingDescriptions.map((page) => ({ url: page.finalUrl, field: "meta_description", before: page.description || "", after: descriptionDraft(page) })) },
  });
  const titleIssues = pages.filter((page) => !page.title || page.title.length < 15 || page.title.length > 65);
  if (titleIssues.length) add({
    kind: "title", titleZh: `优化 ${titleIssues.length} 个异常页面标题`, titleEn: `Improve ${titleIssues.length} abnormal page titles`,
    summaryZh: "页面标题缺失、过短或过长。系统生成标题草稿和定位信息，由用户审核后自行修改网站。", summaryEn: "Page titles are missing, too short, or too long. The system provides drafts and locations for the user to apply manually.",
    evidence: { source: "live-crawl", urls: titleIssues.map((page) => page.finalUrl), observed: titleIssues.map((page) => ({ url: page.finalUrl, length: page.title?.length || 0 })) },
    proposal: { changes: titleIssues.map((page) => ({ url: page.finalUrl, field: "title", before: page.title || "", after: titleDraft(page) })) },
  });
  const noCanonical = pages.filter((page) => !page.canonical);
  if (noCanonical.length) add({
    kind: "canonical", titleZh: `为 ${noCanonical.length} 个页面补充规范地址`, titleEn: `Add canonical URLs to ${noCanonical.length} pages`,
    summaryZh: "实时页面未发现 canonical 标签，可能增加重复地址信号的不确定性。", summaryEn: "No canonical tag was observed on these live pages, increasing URL-signal ambiguity.",
    evidence: { source: "live-crawl", urls: noCanonical.map((page) => page.finalUrl) },
    proposal: { changes: noCanonical.map((page) => ({ url: page.finalUrl, field: "canonical", before: "", after: page.finalUrl })) },
  });
  const missingAlt = pages.flatMap((page) => (page.images || []).filter((image) => !image.alt).map((image) => ({ page: page.finalUrl, src: image.src })));
  if (missingAlt.length) add({
    kind: "image_alt", titleZh: `处理 ${missingAlt.length} 张缺少替代文本的图片`, titleEn: `Review ${missingAlt.length} images missing alternative text`,
    summaryZh: "图片缺少 alt。Agent 只生成候选文本，仍需结合图片语义审核。", summaryEn: "Images are missing alt text. The Agent creates candidates that still require semantic review.",
    evidence: { source: "live-crawl", images: missingAlt.slice(0, 100) },
    proposal: { changes: missingAlt.slice(0, 100).map((item) => ({ url: item.page, asset: item.src, field: "alt", before: "", after: "待结合图片内容确认" })) },
  });
  const broken = (scan.checkedLinks || []).filter((item) => item.status >= 400 || item.errorCode);
  if (broken.length) add({
    kind: "broken_link", titleZh: `检查 ${broken.length} 个失效或不可访问链接`, titleEn: `Review ${broken.length} broken or unreachable links`,
    summaryZh: "链接检查观察到错误响应；跳转或删除属于高影响操作，只生成修复清单。", summaryEn: "Link checks returned errors. Redirects and deletion are high-impact, so only a repair list is generated.",
    risk: "medium", confidence: 90, creditCost: Math.max(6, broken.length), executionKind: "draft",
    evidence: { source: "live-link-check", links: broken }, proposal: { changes: broken.map((item) => ({ url: item.url, field: "link", before: item.url, after: null, requiresDecision: true })) },
  });
  if (!scan.robots?.status || scan.robots.status >= 400) add({
    kind: "robots", titleZh: "检查 robots.txt 可访问性", titleEn: "Review robots.txt availability",
    summaryZh: "抓取期间未获得可用 robots.txt，需要确认是否为站点配置或临时网络问题。", summaryEn: "The scan did not obtain a usable robots.txt. Confirm whether this is site configuration or a transient network issue.",
    risk: "medium", confidence: 80, creditCost: 4,
    evidence: { source: "live-crawl", url: scan.robots?.url, status: scan.robots?.status, errorCode: scan.robots?.errorCode },
    proposal: { changes: [{ url: scan.robots?.url, field: "robots", before: null, after: "User-agent: *\nAllow: /\nSitemap: <site-origin>/sitemap.xml", requiresDecision: true }] },
  });
  if (!scan.sitemaps?.some((item) => item.status >= 200 && item.status < 400)) add({
    kind: "sitemap", titleZh: "创建或修复 XML Sitemap", titleEn: "Create or repair the XML sitemap",
    summaryZh: "实时抓取未找到可用 Sitemap；建议用户根据网站实际 URL 清单自行创建或修复。", summaryEn: "No usable sitemap was found. The user should create or repair it from the site's real URL inventory.",
    risk: "medium", confidence: 85, creditCost: 6,
    evidence: { source: "live-crawl", sitemaps: scan.sitemaps }, proposal: { changes: [], requiresCmsInventory: true },
  });
  return opportunities.slice(0, 12);
}

function healthScore(scan) {
  const pages = scan.pages.filter((page) => page.status);
  if (!pages.length) return 0;
  let penalties = 0;
  for (const page of pages) {
    if (!page.title) penalties += 8;
    else if (page.title.length < 15 || page.title.length > 65) penalties += 3;
    if (!page.description) penalties += 6;
    if (!page.canonical) penalties += 4;
    if (page.h1Count !== 1) penalties += 4;
    penalties += Math.min(8, (page.images || []).filter((image) => !image.alt).length);
  }
  penalties += Math.min(12, (scan.checkedLinks || []).filter((item) => item.status >= 400 || item.errorCode).length * 2);
  if (!scan.robots?.status || scan.robots.status >= 400) penalties += 5;
  if (!scan.sitemaps?.some((item) => item.status >= 200 && item.status < 400)) penalties += 5;
  return Math.max(0, Math.round(100 - penalties / pages.length));
}

export async function runSeoAgentScan(projectId, userId, { fetchImpl = fetch } = {}) {
  const project = projectRow(userId, projectId);
  const scanId = randomUUID();
  const startedAt = Date.now();
  db.prepare("INSERT INTO seo_agent_scans (id, project_id, user_id, status, started_at) VALUES (?, ?, ?, 'running', ?)").run(scanId, project.id, userId, startedAt);
  try {
    const evidence = await inspectSite(project.site_url, { maxPages: 8, checkLinks: true, fetchImpl });
    const score = healthScore(evidence);
    const opportunities = deriveOpportunities(evidence);
    const completedAt = Date.now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE seo_agent_scans SET status = 'completed', health_score = ?, coverage_json = ?, evidence_json = ?, completed_at = ? WHERE id = ?")
        .run(score, JSON.stringify(evidence.coverage), JSON.stringify(evidence), completedAt, scanId);
      db.prepare("UPDATE seo_agent_opportunities SET status = 'superseded', updated_at = ? WHERE project_id = ? AND status = 'detected'").run(completedAt, project.id);
      const insert = db.prepare(`INSERT INTO seo_agent_opportunities
        (id, project_id, scan_id, user_id, kind, title_zh, title_en, summary_zh, summary_en, risk, impact, confidence, credit_cost, execution_kind, status, evidence_json, proposal_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'detected', ?, ?, ?, ?)`);
      for (const item of opportunities) insert.run(randomUUID(), project.id, scanId, userId, item.kind, item.titleZh, item.titleEn, item.summaryZh, item.summaryEn, item.risk, item.impact, item.confidence, item.creditCost, item.executionKind, JSON.stringify(item.evidence || {}), JSON.stringify(item.proposal || {}), completedAt, completedAt);
      db.prepare("UPDATE seo_agent_projects SET ownership_status = 'observed', last_scanned_at = ?, next_scan_at = ?, updated_at = ? WHERE id = ?")
        .run(completedAt, nextScan(completedAt, project.scan_hour, project.scan_minute), completedAt, project.id);
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    audit(userId, "seo_agent.scan.completed", "seo_agent_project", project.id, { scanId, healthScore: score, opportunities: opportunities.length, coverage: evidence.coverage });
    return { scanId, healthScore: score, opportunities: opportunities.length, coverage: evidence.coverage };
  } catch (error) {
    db.prepare("UPDATE seo_agent_scans SET status = 'failed', error_code = ?, completed_at = ? WHERE id = ?").run(error.code || "SEO_AGENT_SCAN_FAILED", Date.now(), scanId);
    audit(userId, "seo_agent.scan.failed", "seo_agent_project", project.id, { scanId, errorCode: error.code || "SEO_AGENT_SCAN_FAILED" });
    throw error;
  }
}

async function approveOpportunity(user, opportunityId) {
  const opportunity = db.prepare("SELECT * FROM seo_agent_opportunities WHERE id = ? AND user_id = ?").get(opportunityId, user.id);
  if (!opportunity) throw agentError("SEO_AGENT_OPPORTUNITY_NOT_FOUND", 404);
  if (opportunity.status !== "detected") throw agentError("SEO_AGENT_OPPORTUNITY_NOT_ACTIONABLE", 409);
  const available = Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance);
  if (available < opportunity.credit_cost) throw agentError("INSUFFICIENT_CREDITS", 402);
  const taskId = randomUUID();
  const actionId = randomUUID();
  const timestamp = Date.now();
  const status = "draft_ready";
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO tasks (id, user_id, tool_id, status, input_json, output_json, error_code, credit_cost, created_at, updated_at, completed_at)
      VALUES (?, ?, 'tool_seo_agent', ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(taskId, user.id, "completed", JSON.stringify({ opportunityId, deliveryMode: "recommendation" }), JSON.stringify({ actionId, status, proposal: parse(opportunity.proposal_json) }), null, opportunity.credit_cost, timestamp, timestamp, timestamp);
    db.prepare(`INSERT INTO seo_agent_actions
      (id, opportunity_id, project_id, user_id, task_id, status, execution_kind, before_json, after_json, provider_response_json, rollback_token, error_code, approved_at, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?)`)
      .run(actionId, opportunity.id, opportunity.project_id, user.id, taskId, status, "recommendation", opportunity.proposal_json, "{}", null, null, timestamp, null);
    db.prepare("UPDATE seo_agent_opportunities SET status = ?, updated_at = ? WHERE id = ?").run(status, timestamp, opportunity.id);
    if (opportunity.credit_cost > 0) db.prepare(`INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'consumption', ?, ?, ?, 'task', ?, ?)`)
      .run(randomUUID(), user.id, -opportunity.credit_cost, "OneShowSEO 修改建议", "OneShowSEO recommendation plan", taskId, timestamp);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  audit(user.id, "seo_agent.recommendation.saved", "seo_agent_action", actionId, { opportunityId, status, siteWrite: false });
  return actionView(db.prepare("SELECT * FROM seo_agent_actions WHERE id = ?").get(actionId));
}

function dashboard(userId) {
  const projects = db.prepare("SELECT * FROM seo_agent_projects WHERE user_id = ? ORDER BY updated_at DESC").all(userId).map(projectView);
  const project = projects[0] || null;
  const opportunities = project ? db.prepare("SELECT * FROM seo_agent_opportunities WHERE project_id = ? AND status NOT IN ('superseded') ORDER BY CASE impact WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, confidence DESC, created_at DESC LIMIT 30").all(project.id).map(opportunityView) : [];
  const actions = project ? db.prepare("SELECT * FROM seo_agent_actions WHERE project_id = ? ORDER BY approved_at DESC LIMIT 30").all(project.id).map(actionView) : [];
  return {
    projects,
    activeProject: project,
    opportunities,
    actions,
    capabilities: {
      liveCrawl: true,
      scheduledScan: true,
      creditsLedger: true,
      auditTrail: true,
      manualRecommendations: true,
      siteWrite: false,
      gsc: false,
      ga4: false,
      baidu: false,
    },
  };
}

export async function handleSeoAgent(request, user, path) {
  try {
    if (path === "/api/seo-agent" && request.method === "GET") return json(dashboard(user.id));
    if (path === "/api/seo-agent/projects" && request.method === "POST") {
      const payload = await requestBody(request);
      const url = await safeSeoUrl(payload.siteUrl);
      url.pathname = url.pathname || "/";
      const timestamp = Date.now();
      const id = randomUUID();
      try {
        db.prepare(`INSERT INTO seo_agent_projects
          (id, user_id, name, site_url, site_origin, next_scan_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, user.id, String(payload.name || url.hostname).trim().slice(0, 120), url.href, url.origin, nextScan(timestamp), timestamp, timestamp);
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw agentError("SEO_AGENT_PROJECT_EXISTS", 409);
        throw error;
      }
      audit(user.id, "seo_agent.project.created", "seo_agent_project", id, { siteOrigin: url.origin });
      return json({ project: projectView(projectRow(user.id, id)) }, 201);
    }
    let match = path.match(/^\/api\/seo-agent\/projects\/([^/]+)\/scan$/);
    if (match && request.method === "POST") return json(await runSeoAgentScan(match[1], user.id), 201);
    match = path.match(/^\/api\/seo-agent\/projects\/([^/]+)\/automation$/);
    if (match && request.method === "PATCH") {
      const project = projectRow(user.id, match[1]);
      const payload = await requestBody(request);
      const mode = ["recommend", "approval"].includes(payload.mode) ? payload.mode : (["recommend", "approval"].includes(project.automation_mode) ? project.automation_mode : "approval");
      const limit = clamp(payload.dailyCreditLimit ?? project.daily_credit_limit, 0, 100000);
      const hour = clamp(payload.scanHour ?? project.scan_hour, 0, 23);
      const minute = clamp(payload.scanMinute ?? project.scan_minute, 0, 59);
      const timestamp = Date.now();
      db.prepare("UPDATE seo_agent_projects SET automation_mode = ?, daily_credit_limit = ?, scan_hour = ?, scan_minute = ?, next_scan_at = ?, updated_at = ? WHERE id = ?")
        .run(mode, limit, hour, minute, nextScan(timestamp, hour, minute), timestamp, project.id);
      audit(user.id, "seo_agent.automation.updated", "seo_agent_project", project.id, { mode, dailyCreditLimit: limit, scanHour: hour, scanMinute: minute });
      return json({ project: projectView(projectRow(user.id, project.id)) });
    }
    match = path.match(/^\/api\/seo-agent\/opportunities\/([^/]+)\/approve$/);
    if (match && request.method === "POST") {
      const payload = await requestBody(request);
      if (payload.deliveryMode === "automatic") throw agentError("SEO_AGENT_AUTOMATIC_CHANGES_DISABLED", 409);
      return json({ action: await approveOpportunity(user, match[1]) }, 201);
    }
    return json({ error: { code: "NOT_FOUND" } }, 404);
  } catch (error) {
    return json({ error: { code: error.code || "SEO_AGENT_FAILED" } }, error.status || 500);
  }
}

export async function runDueSeoAgentScans(limit = 1) {
  const due = db.prepare("SELECT id, user_id FROM seo_agent_projects WHERE status = 'active' AND next_scan_at IS NOT NULL AND next_scan_at <= ? ORDER BY next_scan_at LIMIT ?").all(Date.now(), Math.max(1, limit));
  for (const item of due) {
    await runSeoAgentScan(item.id, item.user_id).catch(() => {});
  }
  return due.length;
}
