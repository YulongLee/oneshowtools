import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, ChartLineUp, CheckCircle, Clock, Coins, Database,
  DownloadSimple, FileText, Globe, LockKey, MagicWand, Play, PlugsConnected, Plus,
  Robot, ShieldCheck, SpinnerGap, Warning, X,
} from "@phosphor-icons/react";

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.code || "REQUEST_FAILED"), { code: data.error?.code || "REQUEST_FAILED", status: response.status });
  return data;
}

const json = (method, body) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const fmt = (value, locale) => value ? new Intl.DateTimeFormat(locale === "en" ? "en" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";

export function SeoAgentWorkspace({ locale, account, onBack, onCompleted }) {
  const zh = locale !== "en";
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("approval");
  const [dailyLimit, setDailyLimit] = useState(100);
  const [scanTime, setScanTime] = useState("08:30");
  const [scanFeedback, setScanFeedback] = useState(null);

  const copy = zh ? {
    back: "返回工具市场", kicker: "SEO 增长驾驶舱", title: "OneShowSEO", sub: "使用真实网站证据持续发现、审批和追踪 SEO 行动。",
    credits: "可用积分", overview: "今日概览", opportunities: "机会队列", automation: "自动化", changes: "方案记录",
    noProject: "还没有网站项目", noProjectSub: "添加你有权分析的网站，OneShowSEO 将进行实时抓取并建立第一份 SEO 基线。", addSite: "添加网站",
    setupTitle: "创建网站项目", setupSub: "只允许添加你拥有或获得授权的网站。", name: "项目名称", siteUrl: "网站地址", continue: "创建并开始真实扫描", close: "关闭",
    scanning: "正在实时扫描网站", scanNow: "立即巡检", lastScan: "最近巡检", nextScan: "下次计划", score: "技术健康度", pages: "已分析页面", links: "已检查链接", sitemap: "Sitemap URL",
    sources: "数据能力", sourceSub: "OneShowSEO 只读取公开网站数据并生成修改建议，不需要也不会获取网站后台写入权限。", liveCrawl: "网站实时抓取", ledger: "任务与积分账本", available: "可用",
    opportunityTitle: "基于最新扫描的优化机会", opportunitySub: "优先级来自实际抓取证据，不展示未经验证的流量预测。", empty: "最新扫描没有发现当前规则覆盖的问题。", inspect: "查看修改建议", savePlan: "保存修改建议", approving: "正在处理", evidence: "证据", proposal: "修改建议", before: "当前内容", after: "建议内容", cost: "积分", draftReady: "修改建议已保存", failed: "处理失败",
    realOnly: "只读建议模式", realOnlySub: "平台只分析网站并输出具体修改建议，所有网站变更均由用户自行完成。",
    automationTitle: "自动巡检策略", automationSub: "设置每日扫描时间和分析预算。系统只会自动发现问题并生成建议。", recommend: "发现问题", approval: "生成建议", limit: "每日积分上限", time: "每日巡检时间", save: "保存自动化策略", saved: "策略已保存",
    historyTitle: "已保存的修改建议", historySub: "每条建议都关联任务编号、真实证据和积分记录，用户可据此自行修改网站。", noHistory: "还没有保存修改建议。", draft: "修改建议", task: "任务",
    switchProject: "切换网站项目", addProject: "添加网站", reportTitle: "最近一次巡检与整改报告", reportHealthy: "巡检完成，当前规则未发现明显问题", reportIssues: "巡检完成，已生成可执行的整改建议", checkedAt: "完成时间", checksPassed: "检查项通过", reportCoverage: "本次只代表已抓取范围，不等同于搜索引擎完整收录情况。", improvementPlan: "整改建议", downloadReport: "下载完整报告", downloadHint: "包含真实证据、问题优先级和具体修改清单",
    checkLabels: { title: "页面标题", description: "搜索摘要", canonical: "Canonical", h1: "H1 结构", image_alt: "图片替代文本", broken_links: "链接可访问性", robots: "Robots.txt", sitemap: "XML Sitemap" },
    error: "操作失败", projectExists: "该网站已经添加。", invalidUrl: "请输入可访问的 HTTP 或 HTTPS 网站地址。", insufficient: "积分不足。", scanFailed: "网站抓取失败，请确认网站可以公开访问。",
  } : {
    back: "Back to marketplace", kicker: "SEO GROWTH COMMAND CENTER", title: "OneShowSEO", sub: "Continuously discover, approve, and track SEO actions using live website evidence.",
    credits: "Available credits", overview: "Today", opportunities: "Opportunity queue", automation: "Automation", changes: "Saved plans",
    noProject: "No website project yet", noProjectSub: "Add a site you own or are authorized to analyze. OneShowSEO will run a live crawl and establish a baseline.", addSite: "Add website",
    setupTitle: "Create website project", setupSub: "Only add websites you own or are authorized to analyze.", name: "Project name", siteUrl: "Website URL", continue: "Create and run live scan", close: "Close",
    scanning: "Scanning the live website", scanNow: "Scan now", lastScan: "Last scan", nextScan: "Next scan", score: "Technical health", pages: "Pages analyzed", links: "Links checked", sitemap: "Sitemap URLs",
    sources: "Data capabilities", sourceSub: "OneShowSEO reads public website data and generates recommendations. It never requests or uses website write access.", liveCrawl: "Live website crawl", ledger: "Tasks and credit ledger", available: "Available",
    opportunityTitle: "Actions from the latest scan", opportunitySub: "Priorities come from observed crawl evidence, not unverified traffic forecasts.", empty: "The latest scan found no issue covered by the current rules.", inspect: "Review proposal", savePlan: "Save recommendation", approving: "Processing", evidence: "Evidence", proposal: "Proposed changes", before: "Before", after: "After", cost: "credits", draftReady: "Recommendation saved", failed: "Processing failed",
    realOnly: "Read-only recommendations", realOnlySub: "The platform analyzes and recommends only. Users make every change to their own websites.",
    automationTitle: "Automated scan policy", automationSub: "Set the daily scan time and analysis budget. Automation only finds issues and produces recommendations.", recommend: "Find issues", approval: "Generate plans", limit: "Daily credit limit", time: "Daily scan time", save: "Save policy", saved: "Policy saved",
    historyTitle: "Saved recommendations", historySub: "Each recommendation links to a task ID, real evidence, and a credit record so the user can update the site.", noHistory: "No saved recommendations yet.", draft: "Recommendation", task: "Task",
    switchProject: "Switch website project", addProject: "Add website", reportTitle: "Latest inspection & improvement report", reportHealthy: "Inspection complete. No covered issue was found.", reportIssues: "Inspection complete. An actionable improvement plan is ready.", checkedAt: "Completed", checksPassed: "checks passed", reportCoverage: "This result covers crawled pages only and is not a complete search-engine index report.", improvementPlan: "Improvement plan", downloadReport: "Download full report", downloadHint: "Includes evidence, priorities, and specific change suggestions",
    checkLabels: { title: "Page titles", description: "Search descriptions", canonical: "Canonical", h1: "H1 structure", image_alt: "Image alt text", broken_links: "Link availability", robots: "Robots.txt", sitemap: "XML Sitemap" },
    error: "Operation failed", projectExists: "This website is already added.", invalidUrl: "Enter a reachable HTTP or HTTPS website URL.", insufficient: "Insufficient credits.", scanFailed: "The website crawl failed. Confirm the site is publicly reachable.",
  };

  const load = useCallback(async (projectId = null) => {
    const next = await request(projectId ? `/api/seo-agent?projectId=${encodeURIComponent(projectId)}` : "/api/seo-agent");
    setData(next);
    const project = next.activeProject;
    if (project) {
      setMode(project.automationMode || "approval");
      setDailyLimit(project.dailyCreditLimit ?? 100);
      setScanTime(`${String(project.scanHour ?? 8).padStart(2, "0")}:${String(project.scanMinute ?? 30).padStart(2, "0")}`);
    }
  }, []);

  useEffect(() => { load().catch((cause) => setError(cause.code)); }, [load]);
  const project = data?.activeProject;
  const detected = useMemo(() => (data?.opportunities || []).filter((item) => item.status === "detected"), [data]);

  const message = (code) => ({
    SEO_AGENT_PROJECT_EXISTS: copy.projectExists,
    SEO_INVALID_URL: copy.invalidUrl,
    SEO_HTTP_REQUIRED: copy.invalidUrl,
    INSUFFICIENT_CREDITS: copy.insufficient,
    SEO_FETCH_FAILED: copy.scanFailed,
    SEO_FETCH_TIMEOUT: copy.scanFailed,
  }[code] || copy.error);

  async function createProject(event) {
    event.preventDefault();
    setBusy("create"); setError("");
    try {
      const result = await request("/api/seo-agent/projects", json("POST", { name: siteName, siteUrl }));
      const scanResult = await request(`/api/seo-agent/projects/${result.project.id}/scan`, { method: "POST" });
      setSetupOpen(false); setSiteUrl(""); setSiteName("");
      setScanFeedback(scanResult.report || null);
      await load(result.project.id);
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function scan() {
    if (!project) return;
    setBusy("scan"); setError("");
    try { const result = await request(`/api/seo-agent/projects/${project.id}/scan`, { method: "POST" }); setScanFeedback(result.report || null); await load(project.id); }
    catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function approve(item) {
    setBusy(item.id); setError("");
    try {
      await request(`/api/seo-agent/opportunities/${item.id}/approve`, json("POST", { deliveryMode: "recommendation" }));
      await Promise.all([load(project.id), onCompleted?.()]);
      setSelected(null);
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function saveAutomation() {
    const [scanHour, scanMinute] = scanTime.split(":").map(Number);
    setBusy("automation"); setError("");
    try {
      await request(`/api/seo-agent/projects/${project.id}/automation`, json("PATCH", { mode, dailyCreditLimit: Number(dailyLimit), scanHour, scanMinute }));
      await load(project.id);
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function switchProject(projectId) {
    setBusy("switch"); setError(""); setSelected(null); setScanFeedback(null); setTab("overview");
    try { await load(projectId); }
    catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  if (!data) return <div className="seo-growth-page"><div className="tool-loading"><SpinnerGap className="spin" size={24} />{zh ? "正在读取 SEO Agent 数据…" : "Loading SEO Agent data…"}</div></div>;

  return <div className="seo-growth-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{copy.back}</button>
    <header className="seo-growth-header">
      <div className="seo-growth-title"><span><Robot size={28} weight="duotone" /></span><div><p className="eyebrow">{copy.kicker}</p><h1>{copy.title}</h1><p>{copy.sub}</p></div></div>
      <div className="seo-growth-account"><span><Coins size={17} />{copy.credits}<strong>{account?.credits?.balance?.toLocaleString() ?? "—"}</strong></span></div>
    </header>
    {error && <div className="seo-agent-real-error"><Warning size={17} />{message(error)}<small>{error}</small></div>}

    {!project ? <section className="seo-agent-onboarding">
      <span><Globe size={34} weight="duotone" /></span><h2>{copy.noProject}</h2><p>{copy.noProjectSub}</p><button onClick={() => setSetupOpen(true)}><PlugsConnected size={17} />{copy.addSite}</button>
    </section> : <>
      <div className="seo-growth-projectbar"><div className="seo-agent-project-picker"><label><small>{copy.switchProject}</small><select value={project.id} onChange={(event) => switchProject(event.target.value)} disabled={busy === "switch"}>{(data.projects || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.siteOrigin}</option>)}</select></label><button onClick={() => setSetupOpen(true)}><Plus size={15} />{copy.addProject}</button></div><p><ShieldCheck size={15} />{copy.realOnly}</p></div>
      <section className="seo-growth-sources"><div><strong>{copy.sources}</strong><small>{copy.sourceSub}</small></div><ul>
        <li className="ready"><i />{copy.liveCrawl}<span>{copy.available}</span></li>
        <li className="ready"><i />{copy.ledger}<span>{copy.available}</span></li>
      </ul></section>
      <nav className="seo-growth-tabs">{[["overview",copy.overview],["opportunities",copy.opportunities],["automation",copy.automation],["changes",copy.changes]].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "opportunities" && detected.length > 0 && <span>{detected.length}</span>}</button>)}</nav>

      {tab === "overview" && <div className="seo-agent-real-layout"><main>
        <section className="seo-agent-baseline-row">
          <div><small>{copy.score}</small><strong>{project.latestScan?.healthScore ?? "—"}<em>/100</em></strong></div>
          <div><small>{copy.pages}</small><strong>{project.latestScan?.coverage?.pagesParsed ?? "—"}</strong></div>
          <div><small>{copy.links}</small><strong>{project.latestScan?.coverage?.linksChecked ?? "—"}</strong></div>
          <div><small>{copy.sitemap}</small><strong>{project.latestScan?.coverage?.sitemapUrlsFound ?? "—"}</strong></div>
        </section>
        <ScanReport report={scanFeedback || project.latestScan?.report} copy={copy} locale={locale} projectId={project.id} />
        <section className="seo-growth-queue"><header><div><strong>{copy.opportunityTitle}</strong><small>{copy.opportunitySub}</small></div><button onClick={() => setTab("opportunities")}>{copy.opportunities}<ArrowRight size={14} /></button></header>
          {detected.slice(0, 3).map((item) => <OpportunityRow key={item.id} item={item} zh={zh} copy={copy} onSelect={setSelected} />)}
          {!detected.length && <div className="seo-agent-empty-real"><CheckCircle size={22} />{copy.empty}</div>}
        </section>
      </main><aside>
        <section className="seo-growth-baseline"><header><div><strong>{copy.lastScan}</strong><small>{project.latestScan?.status || "—"}</small></div><Database size={19} /></header><dl><div><dt>{copy.lastScan}</dt><dd>{fmt(project.lastScannedAt, locale)}</dd></div><div><dt>{copy.nextScan}</dt><dd>{fmt(project.nextScanAt, locale)}</dd></div></dl><button className="seo-agent-scan-button" onClick={scan} disabled={busy === "scan"}>{busy === "scan" ? <SpinnerGap className="spin" size={16} /> : <Play size={16} />}{busy === "scan" ? copy.scanning : copy.scanNow}</button></section>
        <section className="seo-growth-guard"><header><ShieldCheck size={20} weight="duotone" /><strong>{copy.realOnly}</strong></header><p>{copy.realOnlySub}</p><span><LockKey size={14} />{zh ? "所有操作均记录审计事件" : "Every operation is audited"}</span></section>
      </aside></div>}

      {tab === "opportunities" && <section className="seo-growth-wide"><header><div><p>{copy.opportunities}</p><h2>{copy.opportunityTitle}</h2><small>{copy.opportunitySub}</small></div><button className="seo-agent-inline-action" onClick={scan} disabled={busy === "scan"}>{busy === "scan" ? <SpinnerGap className="spin" size={16} /> : <Play size={16} />}{copy.scanNow}</button></header><div className="seo-growth-table">
        {detected.map((item, index) => <div key={item.id}><b>{index + 1}</b><span className={item.risk}><FileText size={19} /></span><div><small>{item.kind}</small><strong>{zh ? item.titleZh : item.titleEn}</strong><p>{zh ? item.summaryZh : item.summaryEn}</p></div><em>{item.risk}</em><span>{item.creditCost} {copy.cost}</span><button onClick={() => setSelected(item)}>{copy.inspect}<ArrowRight size={14} /></button></div>)}
        {!detected.length && <div className="seo-agent-empty-real"><CheckCircle size={22} />{copy.empty}</div>}
      </div></section>}

      {tab === "automation" && <section className="seo-growth-wide"><header><div><p>{copy.automation}</p><h2>{copy.automationTitle}</h2><small>{copy.automationSub}</small></div></header><div className="seo-growth-modes">{[["recommend",copy.recommend],["approval",copy.approval]].map(([id,label]) => <button key={id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}><span>{mode === id ? <CheckCircle size={20} weight="fill" /> : <ShieldCheck size={20} />}</span><strong>{label}</strong><small>{zh ? "不会获得或使用网站写入权限" : "No website write access is requested or used"}</small></button>)}</div><div className="seo-agent-policy-form"><label><span>{copy.limit}</span><input type="number" min="0" max="100000" value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} /></label><label><span>{copy.time}</span><input type="time" value={scanTime} onChange={(event) => setScanTime(event.target.value)} /></label><button onClick={saveAutomation} disabled={busy === "automation"}>{busy === "automation" ? <SpinnerGap className="spin" size={16} /> : <CheckCircle size={16} />}{copy.save}</button></div></section>}

      {tab === "changes" && <section className="seo-growth-wide"><header><div><p>{copy.changes}</p><h2>{copy.historyTitle}</h2><small>{copy.historySub}</small></div></header><div className="seo-growth-history">{(data.actions || []).map((action) => <div key={action.id}><span><CheckCircle size={18} weight="fill" /></span><div><strong>{action.status === "draft_ready" ? copy.draftReady : copy.failed}</strong><small>{copy.task} {action.taskId.slice(0,8)} · {fmt(action.approvedAt, locale)}</small></div><em>{copy.draft}</em><button onClick={() => setSelected((data.opportunities || []).find((item) => item.id === action.opportunityId) || null)}>{copy.inspect}</button></div>)}{!(data.actions || []).length && <div className="seo-agent-empty-real"><Clock size={22} />{copy.noHistory}</div>}</div></section>}
    </>}

    {selected && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal seo-agent-review-modal" role="dialog" aria-modal="true" aria-label={copy.proposal}><header><div><span><MagicWand size={22} /></span><div><h2>{zh ? selected.titleZh : selected.titleEn}</h2><p>{zh ? selected.summaryZh : selected.summaryEn}</p></div></div><button onClick={() => setSelected(null)} aria-label={copy.close}><X size={20} /></button></header><div className="seo-agent-evidence-box"><strong>{copy.evidence}</strong><pre>{JSON.stringify(selected.evidence, null, 2)}</pre></div><div className="seo-agent-change-list">{(selected.proposal?.changes || []).slice(0, 20).map((change, index) => <article key={`${change.url}-${change.field}-${index}`}><header><strong>{change.field}</strong><small>{change.url}</small></header><div><span><small>{copy.before}</small><p>{String(change.before ?? "—")}</p></span><ArrowRight size={16} /><span><small>{copy.after}</small><p>{String(change.after ?? (zh ? "需要人工决定" : "Decision required"))}</p></span></div></article>)}</div><footer><span><Coins size={16} />{selected.creditCost} {copy.cost}</span><button className="secondary" onClick={() => setSelected(null)}>{copy.close}</button><button className="primary" onClick={() => approve(selected)} disabled={busy === selected.id}>{busy === selected.id ? <><SpinnerGap className="spin" size={16} />{copy.approving}</> : <><FileText size={16} />{copy.savePlan}</>}</button></footer></section></div>}

    {setupOpen && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal" role="dialog" aria-modal="true" aria-label={copy.setupTitle}><header><div><span><PlugsConnected size={22} /></span><div><h2>{copy.setupTitle}</h2><p>{copy.setupSub}</p></div></div><button onClick={() => setSetupOpen(false)} aria-label={copy.close}><X size={20} /></button></header>
      <form className="seo-agent-setup-form" onSubmit={createProject}><label><span>{copy.name}</span><input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="OneShowSEO" /></label><label><span>{copy.siteUrl}</span><input type="url" required value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://example.com" /></label><footer><button type="button" className="secondary" onClick={() => setSetupOpen(false)}>{copy.close}</button><button className="primary" disabled={busy === "create"}>{busy === "create" ? <SpinnerGap className="spin" size={16} /> : <Globe size={16} />}{busy === "create" ? copy.scanning : copy.continue}</button></footer></form>
    </section></div>}

  </div>;
}

function OpportunityRow({ item, zh, copy, onSelect }) {
  return <div><span className={item.risk}><FileText size={18} /></span><div><small>{item.kind}</small><strong>{zh ? item.titleZh : item.titleEn}</strong><p>{zh ? item.summaryZh : item.summaryEn}</p></div><em>{item.creditCost} {copy.cost}</em><button onClick={() => onSelect(item)}>{copy.inspect}<ArrowRight size={14} /></button></div>;
}

function ScanReport({ report, copy, locale, projectId }) {
  if (!report) return null;
  const passed = (report.checks || []).filter((item) => item.passed).length;
  const failed = (report.checks || []).filter((item) => !item.passed);
  const healthy = report.conclusion === "healthy";
  return <section className={`seo-agent-scan-report ${healthy ? "healthy" : "attention"}`}>
    <header><span>{healthy ? <CheckCircle size={21} weight="fill" /> : <Warning size={21} weight="fill" />}</span><div><small>{copy.reportTitle}</small><strong>{healthy ? copy.reportHealthy : copy.reportIssues}</strong></div><em>{passed}/{(report.checks || []).length} {copy.checksPassed}</em></header>
    <div>{(report.checks || []).map((item) => <span key={item.code} className={item.passed ? "passed" : "failed"}>{item.passed ? <CheckCircle size={14} weight="fill" /> : <Warning size={14} weight="fill" />}<strong>{copy.checkLabels[item.code] || item.code}</strong><small>{item.passedCount}/{item.totalCount}</small></span>)}</div>
    {failed.length > 0 && <section className="seo-agent-report-plan"><strong>{copy.improvementPlan}</strong>{failed.map((item, index) => <article key={item.code}><b>P{index + 1}</b><div><span>{copy.checkLabels[item.code] || item.code}</span><p>{locale === "en" ? item.recommendationEn : item.recommendationZh}</p></div></article>)}</section>}
    <footer><div><span>{copy.checkedAt}：{fmt(report.checkedAt, locale)}</span><p>{copy.reportCoverage}</p></div><a href={`/api/seo-agent/projects/${projectId}/reports/latest/download?locale=${locale === "en" ? "en" : "zh-CN"}`}><DownloadSimple size={15} /><span><strong>{copy.downloadReport}</strong><small>{copy.downloadHint}</small></span></a></footer>
  </section>;
}
