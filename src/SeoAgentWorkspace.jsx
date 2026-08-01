import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, ChartLineUp, CheckCircle, Clock, Coins, Database,
  FileText, GearSix, Globe, Link, LockKey, MagicWand, Play, PlugsConnected,
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
  const [setupStep, setSetupStep] = useState(1);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selected, setSelected] = useState(null);
  const [connector, setConnector] = useState({ endpoint: "", secret: "" });
  const [mode, setMode] = useState("approval");
  const [dailyLimit, setDailyLimit] = useState(100);
  const [scanTime, setScanTime] = useState("08:30");

  const copy = zh ? {
    back: "返回工具市场", kicker: "SEO 增长驾驶舱", title: "OneShowSEO", sub: "使用真实网站证据持续发现、审批和追踪 SEO 行动。",
    credits: "可用积分", overview: "今日概览", opportunities: "机会队列", automation: "自动化", changes: "变更与回滚",
    noProject: "还没有网站项目", noProjectSub: "添加你有权分析的网站，OneShowSEO 将进行实时抓取并建立第一份 SEO 基线。", addSite: "添加网站",
    setupTitle: "创建网站项目", setupSub: "只允许添加你拥有或获得授权的网站。", name: "项目名称", siteUrl: "网站地址", continue: "创建并开始真实扫描", close: "关闭",
    scanning: "正在实时扫描网站", scanNow: "立即巡检", lastScan: "最近巡检", nextScan: "下次计划", score: "技术健康度", pages: "已分析页面", links: "已检查链接", sitemap: "Sitemap URL",
    sources: "数据与执行连接", sourceSub: "仅展示真实配置状态；未授权的数据源不会显示为已连接。", liveCrawl: "网站实时抓取", ledger: "任务与积分账本", cms: "CMS 写入 Webhook", unavailable: "未连接", connected: "已连接", available: "可用",
    opportunityTitle: "基于最新扫描的行动机会", opportunitySub: "优先级来自实际抓取证据，不展示未经验证的流量预测。", empty: "最新扫描没有发现当前规则覆盖的问题。", inspect: "审核修改方案", approve: "批准并生成方案", execute: "批准并执行", approving: "正在处理", evidence: "证据", proposal: "修改方案", before: "修改前", after: "修改后", cost: "积分", draftReady: "方案已生成", executed: "已执行", failed: "执行失败",
    realOnly: "真实数据模式", realOnlySub: "未连接 GSC、GA4、百度或 CMS 时，系统会明确标记未知，不会生成虚假曝光、点击或排名。",
    automationTitle: "自动巡检策略", automationSub: "设置每日扫描时间和预算上限。网站写入仍受连接状态与审批策略保护。", recommend: "仅建议", approval: "逐项审批", auto: "低风险自动", limit: "每日积分上限", time: "每日巡检时间", save: "保存自动化策略", saved: "策略已保存",
    historyTitle: "真实任务与变更记录", historySub: "每次批准都关联任务编号、积分和执行状态。", noHistory: "还没有执行记录。", rollback: "回滚", rolledBack: "已回滚", draft: "修改方案", task: "任务",
    connectorTitle: "连接网站写入端", connectorSub: "高级功能：你的 CMS 接口需实现 OneShowSEO Webhook 合约，并返回 applied 与 rollbackToken。密钥只会加密保存。", endpoint: "Webhook 地址", secret: "Bearer 密钥", testSave: "测试并安全保存", connectorError: "连接测试失败，未启用网站写入。",
    error: "操作失败", projectExists: "该网站已经添加。", invalidUrl: "请输入可访问的 HTTP 或 HTTPS 网站地址。", insufficient: "积分不足。", scanFailed: "网站抓取失败，请确认网站可以公开访问。",
  } : {
    back: "Back to marketplace", kicker: "SEO GROWTH COMMAND CENTER", title: "OneShowSEO", sub: "Continuously discover, approve, and track SEO actions using live website evidence.",
    credits: "Available credits", overview: "Today", opportunities: "Opportunity queue", automation: "Automation", changes: "Changes & rollback",
    noProject: "No website project yet", noProjectSub: "Add a site you own or are authorized to analyze. OneShowSEO will run a live crawl and establish a baseline.", addSite: "Add website",
    setupTitle: "Create website project", setupSub: "Only add websites you own or are authorized to analyze.", name: "Project name", siteUrl: "Website URL", continue: "Create and run live scan", close: "Close",
    scanning: "Scanning the live website", scanNow: "Scan now", lastScan: "Last scan", nextScan: "Next scan", score: "Technical health", pages: "Pages analyzed", links: "Links checked", sitemap: "Sitemap URLs",
    sources: "Data and execution connections", sourceSub: "Only real configuration is shown. Unauthorized sources never appear connected.", liveCrawl: "Live website crawl", ledger: "Tasks and credit ledger", cms: "CMS write webhook", unavailable: "Not connected", connected: "Connected", available: "Available",
    opportunityTitle: "Actions from the latest scan", opportunitySub: "Priorities come from observed crawl evidence, not unverified traffic forecasts.", empty: "The latest scan found no issue covered by the current rules.", inspect: "Review proposal", approve: "Approve & draft", execute: "Approve & execute", approving: "Processing", evidence: "Evidence", proposal: "Proposed changes", before: "Before", after: "After", cost: "credits", draftReady: "Draft ready", executed: "Executed", failed: "Execution failed",
    realOnly: "Live-data mode", realOnlySub: "Without GSC, GA4, Baidu, or CMS authorization, unknown values stay unknown. The system does not invent impressions, clicks, or rankings.",
    automationTitle: "Automated scan policy", automationSub: "Set the daily scan time and budget limit. Site writes remain protected by connection and approval policy.", recommend: "Recommend only", approval: "Approval required", auto: "Auto low-risk", limit: "Daily credit limit", time: "Daily scan time", save: "Save policy", saved: "Policy saved",
    historyTitle: "Real tasks and change history", historySub: "Every approval is linked to a task ID, credits, and execution status.", noHistory: "No actions yet.", rollback: "Rollback", rolledBack: "Rolled back", draft: "Draft", task: "Task",
    connectorTitle: "Connect a site writer", connectorSub: "Advanced: your CMS endpoint must implement the OneShowSEO webhook contract and return applied plus rollbackToken. The secret is stored encrypted.", endpoint: "Webhook endpoint", secret: "Bearer secret", testSave: "Test & save securely", connectorError: "Connection test failed. Site writing remains disabled.",
    error: "Operation failed", projectExists: "This website is already added.", invalidUrl: "Enter a reachable HTTP or HTTPS website URL.", insufficient: "Insufficient credits.", scanFailed: "The website crawl failed. Confirm the site is publicly reachable.",
  };

  const load = useCallback(async () => {
    const next = await request("/api/seo-agent");
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
  const cms = project?.connectors?.find((item) => item.provider === "cms_webhook");
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
      await request(`/api/seo-agent/projects/${result.project.id}/scan`, { method: "POST" });
      setSetupOpen(false); setSetupStep(1); setSiteUrl(""); setSiteName("");
      await load();
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function scan() {
    if (!project) return;
    setBusy("scan"); setError("");
    try { await request(`/api/seo-agent/projects/${project.id}/scan`, { method: "POST" }); await load(); }
    catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function approve(item) {
    setBusy(item.id); setError("");
    try {
      await request(`/api/seo-agent/opportunities/${item.id}/approve`, { method: "POST" });
      await Promise.all([load(), onCompleted?.()]);
      setSelected(null);
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function saveAutomation() {
    const [scanHour, scanMinute] = scanTime.split(":").map(Number);
    setBusy("automation"); setError("");
    try {
      await request(`/api/seo-agent/projects/${project.id}/automation`, json("PATCH", { mode, dailyCreditLimit: Number(dailyLimit), scanHour, scanMinute }));
      await load();
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function saveConnector(event) {
    event.preventDefault(); setBusy("connector"); setError("");
    try {
      await request(`/api/seo-agent/projects/${project.id}/connectors/cms-webhook`, json("PUT", connector));
      setSetupStep(1); setSetupOpen(false); setConnector({ endpoint: "", secret: "" }); await load();
    } catch (cause) { setError(cause.code || "CONNECTOR_FAILED"); }
    finally { setBusy(""); }
  }

  async function rollback(action) {
    setBusy(action.id); setError("");
    try { await request(`/api/seo-agent/actions/${action.id}/rollback`, { method: "POST" }); await load(); }
    catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  if (!data) return <div className="seo-growth-page"><div className="tool-loading"><SpinnerGap className="spin" size={24} />{zh ? "正在读取 SEO Agent 数据…" : "Loading SEO Agent data…"}</div></div>;

  return <div className="seo-growth-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{copy.back}</button>
    <header className="seo-growth-header">
      <div className="seo-growth-title"><span><Robot size={28} weight="duotone" /></span><div><p className="eyebrow">{copy.kicker}</p><h1>{copy.title}</h1><p>{copy.sub}</p></div></div>
      <div className="seo-growth-account"><span><Coins size={17} />{copy.credits}<strong>{account?.credits?.balance?.toLocaleString() ?? "—"}</strong></span>{project && <button onClick={() => { setSetupStep(2); setSetupOpen(true); }}><PlugsConnected size={17} />{copy.cms}</button>}</div>
    </header>
    {error && <div className="seo-agent-real-error"><Warning size={17} />{message(error)}<small>{error}</small></div>}

    {!project ? <section className="seo-agent-onboarding">
      <span><Globe size={34} weight="duotone" /></span><h2>{copy.noProject}</h2><p>{copy.noProjectSub}</p><button onClick={() => { setSetupStep(1); setSetupOpen(true); }}><PlugsConnected size={17} />{copy.addSite}</button>
    </section> : <>
      <div className="seo-growth-projectbar"><div><small>{zh ? "网站项目" : "Website project"}</small><strong>{project.name}</strong><span><CheckCircle size={14} weight="fill" />{project.siteOrigin}</span></div><p><ShieldCheck size={15} />{copy.realOnly}</p></div>
      <section className="seo-growth-sources"><div><strong>{copy.sources}</strong><small>{copy.sourceSub}</small></div><ul>
        <li className="ready"><i />{copy.liveCrawl}<span>{copy.available}</span></li>
        <li className="ready"><i />{copy.ledger}<span>{copy.available}</span></li>
        <li className={cms?.status === "connected" ? "ready" : "pending"}><i />{copy.cms}<span>{cms?.status === "connected" ? copy.connected : copy.unavailable}</span></li>
      </ul><button onClick={() => { setSetupStep(2); setSetupOpen(true); }}><GearSix size={16} /></button></section>
      <nav className="seo-growth-tabs">{[["overview",copy.overview],["opportunities",copy.opportunities],["automation",copy.automation],["changes",copy.changes]].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "opportunities" && detected.length > 0 && <span>{detected.length}</span>}</button>)}</nav>

      {tab === "overview" && <div className="seo-agent-real-layout"><main>
        <section className="seo-agent-baseline-row">
          <div><small>{copy.score}</small><strong>{project.latestScan?.healthScore ?? "—"}<em>/100</em></strong></div>
          <div><small>{copy.pages}</small><strong>{project.latestScan?.coverage?.pagesParsed ?? "—"}</strong></div>
          <div><small>{copy.links}</small><strong>{project.latestScan?.coverage?.linksChecked ?? "—"}</strong></div>
          <div><small>{copy.sitemap}</small><strong>{project.latestScan?.coverage?.sitemapUrlsFound ?? "—"}</strong></div>
        </section>
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

      {tab === "automation" && <section className="seo-growth-wide"><header><div><p>{copy.automation}</p><h2>{copy.automationTitle}</h2><small>{copy.automationSub}</small></div></header><div className="seo-growth-modes">{[["recommend",copy.recommend],["approval",copy.approval],["auto_low_risk",copy.auto]].map(([id,label]) => <button key={id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}><span>{mode === id ? <CheckCircle size={20} weight="fill" /> : <ShieldCheck size={20} />}</span><strong>{label}</strong><small>{id === "auto_low_risk" ? (zh ? "仅限低风险、已连接且可回滚的动作" : "Only low-risk, connected, reversible actions") : (zh ? "网站写入不会绕过你的策略" : "Site writes never bypass your policy")}</small></button>)}</div><div className="seo-agent-policy-form"><label><span>{copy.limit}</span><input type="number" min="0" max="100000" value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} /></label><label><span>{copy.time}</span><input type="time" value={scanTime} onChange={(event) => setScanTime(event.target.value)} /></label><button onClick={saveAutomation} disabled={busy === "automation"}>{busy === "automation" ? <SpinnerGap className="spin" size={16} /> : <CheckCircle size={16} />}{copy.save}</button></div></section>}

      {tab === "changes" && <section className="seo-growth-wide"><header><div><p>{copy.changes}</p><h2>{copy.historyTitle}</h2><small>{copy.historySub}</small></div></header><div className="seo-growth-history">{(data.actions || []).map((action) => <div key={action.id}><span><CheckCircle size={18} weight="fill" /></span><div><strong>{action.status === "draft_ready" ? copy.draftReady : action.status === "executed" ? copy.executed : action.status === "rolled_back" ? copy.rolledBack : copy.failed}</strong><small>{copy.task} {action.taskId.slice(0,8)} · {fmt(action.approvedAt, locale)}</small></div><em>{action.executionKind}</em>{action.status === "executed" && action.providerResponse && <button onClick={() => rollback(action)} disabled={busy === action.id}>{copy.rollback}</button>}<button onClick={() => setSelected((data.opportunities || []).find((item) => item.id === action.opportunityId) || null)}>{copy.inspect}</button></div>)}{!(data.actions || []).length && <div className="seo-agent-empty-real"><Clock size={22} />{copy.noHistory}</div>}</div></section>}
    </>}

    {selected && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal seo-agent-review-modal" role="dialog" aria-modal="true" aria-label={copy.proposal}><header><div><span><MagicWand size={22} /></span><div><h2>{zh ? selected.titleZh : selected.titleEn}</h2><p>{zh ? selected.summaryZh : selected.summaryEn}</p></div></div><button onClick={() => setSelected(null)} aria-label={copy.close}><X size={20} /></button></header><div className="seo-agent-evidence-box"><strong>{copy.evidence}</strong><pre>{JSON.stringify(selected.evidence, null, 2)}</pre></div><div className="seo-agent-change-list">{(selected.proposal?.changes || []).slice(0, 20).map((change, index) => <article key={`${change.url}-${change.field}-${index}`}><header><strong>{change.field}</strong><small>{change.url}</small></header><div><span><small>{copy.before}</small><p>{String(change.before ?? "—")}</p></span><ArrowRight size={16} /><span><small>{copy.after}</small><p>{String(change.after ?? (zh ? "需要人工决定" : "Decision required"))}</p></span></div></article>)}</div><footer><span><Coins size={16} />{selected.creditCost} {copy.cost}</span><button className="secondary" onClick={() => setSelected(null)}>{copy.close}</button><button className="primary" onClick={() => approve(selected)} disabled={busy === selected.id}>{busy === selected.id ? <><SpinnerGap className="spin" size={16} />{copy.approving}</> : <><Play size={16} />{cms?.status === "connected" ? copy.execute : copy.approve}</>}</button></footer></section></div>}

    {setupOpen && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal" role="dialog" aria-modal="true" aria-label={setupStep === 1 ? copy.setupTitle : copy.connectorTitle}><header><div><span><PlugsConnected size={22} /></span><div><h2>{setupStep === 1 ? copy.setupTitle : copy.connectorTitle}</h2><p>{setupStep === 1 ? copy.setupSub : copy.connectorSub}</p></div></div><button onClick={() => setSetupOpen(false)} aria-label={copy.close}><X size={20} /></button></header>
      {setupStep === 1 ? <form className="seo-agent-setup-form" onSubmit={createProject}><label><span>{copy.name}</span><input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="OneShowSEO" /></label><label><span>{copy.siteUrl}</span><input type="url" required value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://example.com" /></label><footer><button type="button" className="secondary" onClick={() => setSetupOpen(false)}>{copy.close}</button><button className="primary" disabled={busy === "create"}>{busy === "create" ? <SpinnerGap className="spin" size={16} /> : <Globe size={16} />}{busy === "create" ? copy.scanning : copy.continue}</button></footer></form> : <form className="seo-agent-setup-form" onSubmit={saveConnector}><label><span>{copy.endpoint}</span><input type="url" required value={connector.endpoint} onChange={(event) => setConnector({ ...connector, endpoint: event.target.value })} placeholder="https://cms.example.com/oneshowseo/webhook" /></label><label><span>{copy.secret}</span><input type="password" required value={connector.secret} onChange={(event) => setConnector({ ...connector, secret: event.target.value })} /></label><footer><button type="button" className="secondary" onClick={() => setSetupOpen(false)}>{copy.close}</button><button className="primary" disabled={busy === "connector"}>{busy === "connector" ? <SpinnerGap className="spin" size={16} /> : <PlugsConnected size={16} />}{copy.testSave}</button></footer></form>}
    </section></div>}
  </div>;
}

function OpportunityRow({ item, zh, copy, onSelect }) {
  return <div><span className={item.risk}><FileText size={18} /></span><div><small>{item.kind}</small><strong>{zh ? item.titleZh : item.titleEn}</strong><p>{zh ? item.summaryZh : item.summaryEn}</p></div><em>{item.creditCost} {copy.cost}</em><button onClick={() => onSelect(item)}>{copy.inspect}<ArrowRight size={14} /></button></div>;
}
