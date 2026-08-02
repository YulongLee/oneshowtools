import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, ChartLineUp, CheckCircle, Clock, Coins, Database,
  ArrowsClockwise, FileText, GearSix, Globe, LockKey, MagicWand, Play, PlugsConnected,
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
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [connectorEndpoint, setConnectorEndpoint] = useState("");
  const [connectorSecret, setConnectorSecret] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("approval");
  const [dailyLimit, setDailyLimit] = useState(100);
  const [scanTime, setScanTime] = useState("08:30");

  const copy = zh ? {
    back: "返回工具市场", kicker: "SEO 增长驾驶舱", title: "OneShowSEO", sub: "使用真实网站证据持续发现、审批和追踪 SEO 行动。",
    credits: "可用积分", overview: "今日概览", opportunities: "机会队列", automation: "自动化", changes: "方案记录",
    noProject: "还没有网站项目", noProjectSub: "添加你有权分析的网站，OneShowSEO 将进行实时抓取并建立第一份 SEO 基线。", addSite: "添加网站",
    setupTitle: "创建网站项目", setupSub: "只允许添加你拥有或获得授权的网站。", name: "项目名称", siteUrl: "网站地址", continue: "创建并开始真实扫描", close: "关闭",
    scanning: "正在实时扫描网站", scanNow: "立即巡检", lastScan: "最近巡检", nextScan: "下次计划", score: "技术健康度", pages: "已分析页面", links: "已检查链接", sitemap: "Sitemap URL",
    sources: "数据与交付能力", sourceSub: "公开网站分析无需写入权限；只有选择自动修改时，才需要用户主动连接自己的网站。", liveCrawl: "网站实时抓取", ledger: "任务与积分账本", cms: "网站自动修改", available: "可用", optional: "可选", connected: "已连接", configure: "配置",
    opportunityTitle: "基于最新扫描的优化机会", opportunitySub: "优先级来自实际抓取证据，不展示未经验证的流量预测。", empty: "最新扫描没有发现当前规则覆盖的问题。", inspect: "查看修改建议", savePlan: "保存建议，自己修改", autoApply: "自动修改网站", approving: "正在处理", evidence: "证据", proposal: "修改建议", before: "当前内容", after: "建议内容", cost: "积分", draftReady: "建议方案已保存", executed: "已自动修改", rolledBack: "已回滚", failed: "处理失败",
    realOnly: "双模式交付", realOnlySub: "你可以保存建议后自行修改，也可以主动连接网站后选择自动修改。未授权时平台绝不会写入网站。",
    automationTitle: "自动巡检策略", automationSub: "设置每日扫描时间和分析预算。系统只会自动发现问题并生成建议。", recommend: "发现问题", approval: "生成建议", limit: "每日积分上限", time: "每日巡检时间", save: "保存自动化策略", saved: "策略已保存",
    historyTitle: "修改方案与执行记录", historySub: "每条记录都关联任务编号、证据和积分；自动修改记录支持在网站连接提供回滚能力时恢复。", noHistory: "还没有处理记录。", draft: "自行修改", automatic: "自动修改", rollback: "回滚", task: "任务",
    connectorTitle: "配置网站自动修改", connectorSub: "仅在你选择自动修改时使用。连接必须由你的网站提供安全的 HTTPS Webhook。", endpoint: "Webhook 地址", secret: "访问密钥", testSave: "验证并保存", connectorRequired: "如需自动修改，请先配置并验证网站连接；保存建议不受影响。",
    error: "操作失败", projectExists: "该网站已经添加。", invalidUrl: "请输入可访问的 HTTP 或 HTTPS 网站地址。", insufficient: "积分不足。", scanFailed: "网站抓取失败，请确认网站可以公开访问。",
  } : {
    back: "Back to marketplace", kicker: "SEO GROWTH COMMAND CENTER", title: "OneShowSEO", sub: "Continuously discover, approve, and track SEO actions using live website evidence.",
    credits: "Available credits", overview: "Today", opportunities: "Opportunity queue", automation: "Automation", changes: "Saved plans",
    noProject: "No website project yet", noProjectSub: "Add a site you own or are authorized to analyze. OneShowSEO will run a live crawl and establish a baseline.", addSite: "Add website",
    setupTitle: "Create website project", setupSub: "Only add websites you own or are authorized to analyze.", name: "Project name", siteUrl: "Website URL", continue: "Create and run live scan", close: "Close",
    scanning: "Scanning the live website", scanNow: "Scan now", lastScan: "Last scan", nextScan: "Next scan", score: "Technical health", pages: "Pages analyzed", links: "Links checked", sitemap: "Sitemap URLs",
    sources: "Data and delivery", sourceSub: "Public-site analysis needs no write access. A user-owned site connection is required only for automatic changes.", liveCrawl: "Live website crawl", ledger: "Tasks and credit ledger", cms: "Automatic site changes", available: "Available", optional: "Optional", connected: "Connected", configure: "Configure",
    opportunityTitle: "Actions from the latest scan", opportunitySub: "Priorities come from observed crawl evidence, not unverified traffic forecasts.", empty: "The latest scan found no issue covered by the current rules.", inspect: "Review proposal", savePlan: "Save plan, edit myself", autoApply: "Update site automatically", approving: "Processing", evidence: "Evidence", proposal: "Proposed changes", before: "Before", after: "After", cost: "credits", draftReady: "Recommendation saved", executed: "Site updated", rolledBack: "Rolled back", failed: "Processing failed",
    realOnly: "Two delivery modes", realOnlySub: "Save a recommendation for manual editing, or explicitly connect your site and choose automatic changes. No authorization means no site writes.",
    automationTitle: "Automated scan policy", automationSub: "Set the daily scan time and analysis budget. Automation only finds issues and produces recommendations.", recommend: "Find issues", approval: "Generate plans", limit: "Daily credit limit", time: "Daily scan time", save: "Save policy", saved: "Policy saved",
    historyTitle: "Plans and execution history", historySub: "Each record links to a task, evidence, and credits. Automatic changes can be rolled back when the site connector supports it.", noHistory: "No records yet.", draft: "Manual edit", automatic: "Automatic", rollback: "Rollback", task: "Task",
    connectorTitle: "Configure automatic site changes", connectorSub: "Used only when you choose automatic changes. Your site must provide a secure HTTPS webhook.", endpoint: "Webhook URL", secret: "Access secret", testSave: "Verify & save", connectorRequired: "Connect and verify your site for automatic changes. Saving a recommendation remains available.",
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
    SEO_AGENT_CONNECTOR_REQUIRED: copy.connectorRequired,
  }[code] || copy.error);

  async function createProject(event) {
    event.preventDefault();
    setBusy("create"); setError("");
    try {
      const result = await request("/api/seo-agent/projects", json("POST", { name: siteName, siteUrl }));
      await request(`/api/seo-agent/projects/${result.project.id}/scan`, { method: "POST" });
      setSetupOpen(false); setSiteUrl(""); setSiteName("");
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

  async function approve(item, deliveryMode) {
    setBusy(item.id); setError("");
    try {
      await request(`/api/seo-agent/opportunities/${item.id}/approve`, json("POST", { deliveryMode }));
      await Promise.all([load(), onCompleted?.()]);
      setSelected(null);
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function saveConnector(event) {
    event.preventDefault();
    setBusy("connector"); setError("");
    try {
      await request(`/api/seo-agent/projects/${project.id}/connectors/cms-webhook`, json("PUT", { endpoint: connectorEndpoint, secret: connectorSecret }));
      setConnectorOpen(false); setConnectorSecret(""); await load();
    } catch (cause) { setError(cause.code); }
    finally { setBusy(""); }
  }

  async function rollback(action) {
    setBusy(action.id); setError("");
    try { await request(`/api/seo-agent/actions/${action.id}/rollback`, { method: "POST" }); await Promise.all([load(), onCompleted?.()]); }
    catch (cause) { setError(cause.code); }
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
      <div className="seo-growth-projectbar"><div><small>{zh ? "网站项目" : "Website project"}</small><strong>{project.name}</strong><span><CheckCircle size={14} weight="fill" />{project.siteOrigin}</span></div><p><ShieldCheck size={15} />{copy.realOnly}</p></div>
      <section className="seo-growth-sources"><div><strong>{copy.sources}</strong><small>{copy.sourceSub}</small></div><ul>
        <li className="ready"><i />{copy.liveCrawl}<span>{copy.available}</span></li>
        <li className="ready"><i />{copy.ledger}<span>{copy.available}</span></li>
        <li className={cms?.status === "connected" ? "ready" : "pending"}><i />{copy.cms}<span>{cms?.status === "connected" ? copy.connected : copy.optional}</span></li>
      </ul><button onClick={() => setConnectorOpen(true)} aria-label={copy.configure}><GearSix size={16} /></button></section>
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

      {tab === "automation" && <section className="seo-growth-wide"><header><div><p>{copy.automation}</p><h2>{copy.automationTitle}</h2><small>{copy.automationSub}</small></div></header><div className="seo-growth-modes">{[["recommend",copy.recommend],["approval",copy.approval]].map(([id,label]) => <button key={id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}><span>{mode === id ? <CheckCircle size={20} weight="fill" /> : <ShieldCheck size={20} />}</span><strong>{label}</strong><small>{zh ? "不会获得或使用网站写入权限" : "No website write access is requested or used"}</small></button>)}</div><div className="seo-agent-policy-form"><label><span>{copy.limit}</span><input type="number" min="0" max="100000" value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} /></label><label><span>{copy.time}</span><input type="time" value={scanTime} onChange={(event) => setScanTime(event.target.value)} /></label><button onClick={saveAutomation} disabled={busy === "automation"}>{busy === "automation" ? <SpinnerGap className="spin" size={16} /> : <CheckCircle size={16} />}{copy.save}</button></div></section>}

      {tab === "changes" && <section className="seo-growth-wide"><header><div><p>{copy.changes}</p><h2>{copy.historyTitle}</h2><small>{copy.historySub}</small></div></header><div className="seo-growth-history">{(data.actions || []).map((action) => <div key={action.id}><span><CheckCircle size={18} weight="fill" /></span><div><strong>{action.status === "draft_ready" ? copy.draftReady : action.status === "executed" ? copy.executed : action.status === "rolled_back" ? copy.rolledBack : copy.failed}</strong><small>{copy.task} {action.taskId.slice(0,8)} · {fmt(action.approvedAt, locale)}</small></div><em>{action.executionKind === "cms_webhook" ? copy.automatic : copy.draft}</em>{action.status === "executed" && action.providerResponse && <button onClick={() => rollback(action)} disabled={busy === action.id}><ArrowsClockwise size={14} />{copy.rollback}</button>}<button onClick={() => setSelected((data.opportunities || []).find((item) => item.id === action.opportunityId) || null)}>{copy.inspect}</button></div>)}{!(data.actions || []).length && <div className="seo-agent-empty-real"><Clock size={22} />{copy.noHistory}</div>}</div></section>}
    </>}

    {selected && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal seo-agent-review-modal" role="dialog" aria-modal="true" aria-label={copy.proposal}><header><div><span><MagicWand size={22} /></span><div><h2>{zh ? selected.titleZh : selected.titleEn}</h2><p>{zh ? selected.summaryZh : selected.summaryEn}</p></div></div><button onClick={() => setSelected(null)} aria-label={copy.close}><X size={20} /></button></header><div className="seo-agent-evidence-box"><strong>{copy.evidence}</strong><pre>{JSON.stringify(selected.evidence, null, 2)}</pre></div><div className="seo-agent-change-list">{(selected.proposal?.changes || []).slice(0, 20).map((change, index) => <article key={`${change.url}-${change.field}-${index}`}><header><strong>{change.field}</strong><small>{change.url}</small></header><div><span><small>{copy.before}</small><p>{String(change.before ?? "—")}</p></span><ArrowRight size={16} /><span><small>{copy.after}</small><p>{String(change.after ?? (zh ? "需要人工决定" : "Decision required"))}</p></span></div></article>)}</div>{!cms || cms.status !== "connected" ? <div className="seo-agent-real-error"><LockKey size={16} />{copy.connectorRequired}<button onClick={() => setConnectorOpen(true)}>{copy.configure}</button></div> : null}<footer><span><Coins size={16} />{selected.creditCost} {copy.cost}</span><button className="secondary" onClick={() => approve(selected, "manual")} disabled={busy === selected.id}>{copy.savePlan}</button><button className="primary" onClick={() => approve(selected, "automatic")} disabled={busy === selected.id || cms?.status !== "connected"}>{busy === selected.id ? <><SpinnerGap className="spin" size={16} />{copy.approving}</> : <><Play size={16} />{copy.autoApply}</>}</button></footer></section></div>}

    {setupOpen && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal" role="dialog" aria-modal="true" aria-label={copy.setupTitle}><header><div><span><PlugsConnected size={22} /></span><div><h2>{copy.setupTitle}</h2><p>{copy.setupSub}</p></div></div><button onClick={() => setSetupOpen(false)} aria-label={copy.close}><X size={20} /></button></header>
      <form className="seo-agent-setup-form" onSubmit={createProject}><label><span>{copy.name}</span><input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="OneShowSEO" /></label><label><span>{copy.siteUrl}</span><input type="url" required value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://example.com" /></label><footer><button type="button" className="secondary" onClick={() => setSetupOpen(false)}>{copy.close}</button><button className="primary" disabled={busy === "create"}>{busy === "create" ? <SpinnerGap className="spin" size={16} /> : <Globe size={16} />}{busy === "create" ? copy.scanning : copy.continue}</button></footer></form>
    </section></div>}

    {connectorOpen && project && <div className="seo-growth-modal-backdrop"><section className="seo-growth-modal" role="dialog" aria-modal="true" aria-label={copy.connectorTitle}><header><div><span><GearSix size={22} /></span><div><h2>{copy.connectorTitle}</h2><p>{copy.connectorSub}</p></div></div><button onClick={() => setConnectorOpen(false)} aria-label={copy.close}><X size={20} /></button></header><form className="seo-agent-setup-form" onSubmit={saveConnector}><label><span>{copy.endpoint}</span><input type="url" required value={connectorEndpoint} onChange={(event) => setConnectorEndpoint(event.target.value)} placeholder="https://example.com/api/oneshowseo" /></label><label><span>{copy.secret}</span><input type="password" required value={connectorSecret} onChange={(event) => setConnectorSecret(event.target.value)} autoComplete="new-password" /></label><footer><button type="button" className="secondary" onClick={() => setConnectorOpen(false)}>{copy.close}</button><button className="primary" disabled={busy === "connector"}>{busy === "connector" ? <SpinnerGap className="spin" size={16} /> : <ShieldCheck size={16} />}{copy.testSave}</button></footer></form></section></div>}
  </div>;
}

function OpportunityRow({ item, zh, copy, onSelect }) {
  return <div><span className={item.risk}><FileText size={18} /></span><div><small>{item.kind}</small><strong>{zh ? item.titleZh : item.titleEn}</strong><p>{zh ? item.summaryZh : item.summaryEn}</p></div><em>{item.creditCost} {copy.cost}</em><button onClick={() => onSelect(item)}>{copy.inspect}<ArrowRight size={14} /></button></div>;
}
