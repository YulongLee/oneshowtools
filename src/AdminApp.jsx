import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pulse, ArrowClockwise, Bank, Bell, Check, CheckCircle, Coins, CreditCard,
  File, Gauge, Gear, Globe, IdentificationCard, Key, ListChecks, LockKey,
  MagnifyingGlass, Package, Receipt, ShieldCheck, SignOut, SpinnerGap, Storefront,
  Translate, User, UserCircle, Users, Warning, Wrench, X, ChartLineUp, HardDrives,
  BookOpenText,
  Binoculars, Lightning, LinkSimple, TrendUp, ChatCircleDots, PaperPlaneTilt, MusicNotes, ImageSquare, Clock, Robot,
} from "@phosphor-icons/react";

const copy = {
  "zh-CN": {
    console: "商业管理后台", loading: "正在加载安全管理后台…", signIn: "管理员登录",
    signInBody: "使用已验证并获得管理员授权的邮箱账户登录。", email: "管理员邮箱", emailStatus: "邮箱状态",
    password: "密码", secureLogin: "安全登录", back: "返回 OneShowTools",
    noPermission: "当前账户没有管理员权限。", loginFailed: "登录失败，请检查邮箱、密码和验证状态。",
    loadFailed: "管理数据加载失败，请稍后重试。", overview: "经营概览", command: "指挥中心", users: "用户运营",
    creditLedger: "积分与账本", finance: "财务与对账", analytics: "工具分析", infrastructure: "系统健康",
    intelligence: "市场情报", runIntelligence: "立即看盘", intelligenceAgent: "需求分析 Agent",
    supportCenter: "客服中心", supportQueue: "客服工单", supportKnowledge: "解决方案知识库", awaitingAgent: "待处理工单", inProgress: "处理中", resolvedSupport: "已解决",
    replyUser: "回复工单", resolveTicket: "标记已解决", publishKnowledge: "将本次方案沉淀到知识库", knowledgeTitle: "方案标题", knowledgeQuestion: "典型问题", knowledgeAnswer: "标准答案", knowledgeKeywords: "检索关键词", priority: "优先级", selectTicket: "选择一条工单查看问题和历史回复", noTickets: "暂无客服工单",
    models: "平台模型", platformModels: "平台模型配置", platformModelsHint: "管理用户工具和市场情报使用的服务端模型。密钥加密保存且不会再次显示明文。",
    model_studio_workspace: "百炼工作空间", music_generation: "OneShowMusic", singing_cover: "歌曲翻唱模型", image_generation: "图片生成模型", image_editing: "图片编辑模型", image_upscaling: "高清修复模型", musicProvider: "音乐模型", musicProviderTitle: "OneShowMusic 生成服务", musicProviderHint: "管理 AI 音乐工作室使用的服务端音乐模型。密钥只在后端加密保存，不会发送到浏览器。",
    musicModel: "音乐模型 ID", musicFormat: "输出格式", musicCredits: "每个版本积分", musicDuration: "最长时长（秒）", musicStatus: "运行状态", musicActive: "启用", musicDisabled: "停用",
    seoSources: "SEO 数据源", seoSourceTitle: "DataForSEO 数据源", seoSourceHint: "用于关键词指标、实时排名、外链和竞争分析。API 密码加密保存，提交后不再显示明文。",
    seoLogin: "API 登录名", seoPassword: "API 密码（留空则保留现有密码）", seoConnectionTest: "测试账户连接",
    seoConnectionSave: "测试并保存", seoBalance: "账户余额", seoUnlocked: "可解锁能力", seoProviderHealthy: "认证成功，可以读取账户信息",
    seoIpHint: "如果在 DataForSEO 开启 IP 白名单，请加入 OneShowTools 服务器的固定出口 IP。未配置白名单时无需填写。",
    managed_runtime: "OneShowModel", market_intelligence: "市场情报模型", oneshow_home_chat: "OneShow Home 对话", modelName: "配置名称", modelProtocol: "接口协议",
    modelBaseUrl: "API Base URL", modelId: "模型 ID", workspaceId: "阿里云 Workspace（可选）", replaceApiKey: "API Key（留空则保留现有密钥）",
    testModel: "测试连接", saveModel: "测试并保存", modelTestHealthy: "连接正常", modelRateLimited: "连接有效，但模型当前繁忙或限流",
    changeReason: "变更原因", storageBackend: "用户文件存储", storage_management: "对象存储", storagePrefix: "隔离前缀", storageBucket: "Bucket", storageRegion: "地域", storageEndpoint: "OSS Endpoint",
    storageAccessId: "AccessKey ID（留空则保留现有密钥）", storageSecret: "AccessKey Secret（留空则保留现有密钥）", storageTest: "测试 OSS 连接", storageSave: "测试并保存", storageHealthy: "连接正常，测试对象已清理", storageHint: "统一管理用户上传和工具生成文件的阿里云 OSS。密钥仅在后端加密保存，不会返回浏览器。",
    intelligenceBrief: "结合外部市场信号与站内真实数据，生成每日工具开发优先级。",
    opportunity: "开发机会", demand: "需求", fit: "平台匹配", competition: "竞争机会", effort: "开发可行性",
    evidence: "需求证据", whyNow: "为什么现在值得关注", validationPlan: "7 天验证计划", nextStep: "建议下一步", latestReport: "最新日报", reportHistory: "历史日报",
    build_now: "可进入开发", validate_next: "优先验证", watch: "持续观察",
    sourceNetwork: "情报数据源", categoryCoverage: "产品矩阵覆盖", internalSignals: "站内商业信号",
    connectedSources: "已采集来源", needsConfig: "需要授权", sourceItems: "条信号", unserved: "无结果搜索",
    repeatUsers: "重复使用用户", subscribers: "有效订阅", paidInvoices: "已支付账单", sourceReady: "等待本次采集",
    intelligenceChat: "与情报助手沟通", chatHint: "针对当前日报继续追问需求场景、产品边界和商业化方案。",
    chatPlaceholder: "例如：这个需求最适合哪些用户？最小版本应该做什么？", sendQuestion: "发送问题",
    chatNeedsReport: "生成成功的日报后即可开始沟通。", citedEvidence: "引用证据", suggestedQuestion: "你还可以问",
    commerce: "支付与积分", tools: "工具治理", operations: "作业与告警", privacy: "隐私合规",
    audit: "审计日志", admins: "权限管理", refresh: "刷新", logout: "退出",
    searchUser: "搜索用户 ID、姓名或邮箱", search: "搜索", all: "全部", active: "正常",
    suspended: "已封禁", verified: "已验证", unverified: "待验证", credits: "积分",
    tasks: "任务", files: "文件", registered: "注册时间", lastSeen: "最后活跃",
    details: "查看详情", customer360: "用户全景", close: "关闭", account: "账户",
    security: "安全", billing: "商业记录", activity: "任务与文件", support: "客服记录",
    reason: "操作原因", suspend: "封禁账户", restore: "恢复账户", revoke: "注销全部会话",
    resendVerify: "重发验证邮件", sendReset: "发送密码重置", amount: "积分增减",
    reasonCode: "原因类型", note: "备注", adjust: "提交调整", supportNote: "添加客服记录",
    addNote: "保存记录", balance: "当前余额", sessions: "有效会话", subscription: "订阅",
    membershipPlan: "会员方案", membershipExpiry: "会员到期时间", membershipReason: "会员调整原因",
    assignMembership: "保存会员配置", fileAllowance: "文件额度", permanentMembership: "长期有效",
    invoice: "账单", noData: "暂无数据", provider: "支付渠道", status: "状态",
    paymentVolume: "支付金额", openAlerts: "未处理告警", queuedJobs: "待处理作业",
    creditLiability: "平台积分余额", newUsers: "新增用户", activeUsers: "活跃用户",
    failedTasks: "异常任务", totalUsers: "用户总数", verifiedUsers: "验证用户",
    storage: "文件存储", mfaTitle: "管理员双重验证", mfaEnroll: "绑定身份验证器",
    mfaBody: "管理员高风险操作需要动态验证码保护。请在身份验证器中添加下面的密钥。",
    mfaSecret: "验证器密钥", mfaCode: "6 位动态验证码", activate: "完成绑定",
    verifyMfa: "验证并进入后台", recovery: "恢复代码", recoveryBody: "请立即安全保存，代码只展示一次。",
    saved: "我已安全保存", lifecycle: "生命周期", cost: "积分价格", runtime: "运行状态",
    publish: "发布", maintenance: "维护", retire: "下架", draft: "草稿", staged: "预发布",
    publicationTitle: "工具上线管理", publicationHint: "新工具默认不上线。上线后才会出现在工具市场并允许用户执行。",
    onlineTools: "已上线", offlineTools: "未上线", searchTools: "搜索工具名称或标识", onlineOnly: "仅已上线",
    offlineOnly: "仅未上线", putOnline: "上线", takeOffline: "下线", online: "已上线", offline: "未上线",
    configureBranding: "配置产品图标", brandingTitle: "产品品牌外观", brandingHint: "上传独立产品图标并配置图标底色。PNG、JPG 或 WebP，最大 2MB。",
    iconUpload: "上传产品图标", iconColor: "强调色", iconBackground: "图标背景色", brandingReason: "本次变更原因",
    saveBranding: "保存品牌外观", resetBranding: "恢复默认图标", brandingSaved: "产品图标配置已保存",
    orders: "订单", subscriptions: "订阅", invoices: "发票", refunds: "退款",
    disputes: "争议", exceptions: "对账异常", approvals: "待审批", approve: "批准",
    jobs: "作业队列", alerts: "运营告警", retry: "重试", policies: "政策版本",
    deletions: "注销队列", exports: "导出任务", holds: "法律保留", roles: "角色",
    mfa: "双重验证", enrolled: "已绑定", pending: "待处理", success: "操作成功",
    previous: "上一页", next: "下一页", page: "页", result: "结果", action: "操作",
    actor: "操作者", target: "对象", time: "时间", detailsJson: "变更摘要",
    role: "角色", changeRole: "变更角色", reasonRequired: "请先填写操作原因。",
    addAdmin: "新增管理员", addAdminHint: "对方需要先注册账户并完成邮箱验证。",
    adminEmail: "用户注册邮箱", selectRole: "分配角色", auditReason: "操作说明",
    disableAdmin: "停用权限", enableAdmin: "恢复权限", adminAdded: "管理员添加成功",
    super_admin: "超级管理员", operationsRole: "运营管理员", supportRole: "客服管理员",
    financeRole: "财务管理员", tool_manager: "工具管理员", privacyRole: "隐私管理员",
    read_only: "只读审计员",
    adminAccountNotFound: "没有找到该邮箱账户，请让对方先注册。",
    adminEmailNotVerified: "该账户尚未完成邮箱验证。",
    adminAlreadyExists: "该账户已经是管理员。",
    adminInactive: "该用户账户当前不可用。",
    lastSuperAdmin: "系统必须至少保留一名正常的超级管理员。",
    ownAdminLocked: "不能修改或停用自己的管理员权限。",
    reporting: "数据上报", notReporting: "未上报", stale: "数据过期", healthy: "正常",
    executions: "执行次数", uniqueUsers: "独立用户", successRate: "成功率", consumed: "已消耗",
    grants: "累计发放", ledgerEntries: "账本记录", invariants: "账本校验", financeNotice: "内部经营子账，不替代法定会计与报税系统。",
    journals: "会计分录", accounts: "科目表", periods: "会计期间", reconciliation: "对账运行",
    metric: "指标", currentValue: "当前值", freshness: "新鲜度", monitoring: "监控状态",
  },
  en: {
    console: "Commercial Admin", loading: "Loading secure administration…", signIn: "Administrator sign in",
    signInBody: "Use a verified email account with administrator access.", email: "Administrator email", emailStatus: "Email status",
    password: "Password", secureLogin: "Secure sign in", back: "Back to OneShowTools",
    noPermission: "This account does not have administrator access.", loginFailed: "Sign in failed. Check the email, password, and verification status.",
    loadFailed: "Admin data could not be loaded.", overview: "Overview", command: "Command Center", users: "Customers",
    creditLedger: "Credits & Ledger", finance: "Finance & Reconciliation", analytics: "Tool Analytics", infrastructure: "System Health",
    intelligence: "Market Intelligence", runIntelligence: "Run analysis", intelligenceAgent: "Demand Analysis Agent",
    supportCenter: "Support Center", supportQueue: "Support tickets", supportKnowledge: "Resolution knowledge", awaitingAgent: "Pending tickets", inProgress: "In progress", resolvedSupport: "Resolved",
    replyUser: "Reply to user", resolveTicket: "Resolve ticket", publishKnowledge: "Publish this resolution to the knowledge base", knowledgeTitle: "Resolution title", knowledgeQuestion: "Typical question", knowledgeAnswer: "Verified answer", knowledgeKeywords: "Search keywords", priority: "Priority", selectTicket: "Select a ticket to view the full conversation", noTickets: "No support tickets",
    models: "Platform Models", platformModels: "Platform model configuration", platformModelsHint: "Manage server-side models used by customer tools and market intelligence. Keys are encrypted and never shown again.",
    model_studio_workspace: "Model Studio Workspace", music_generation: "OneShowMusic", singing_cover: "Song Cover Model", image_generation: "Image Generation Model", image_editing: "Image Editing Model", image_upscaling: "Image Restoration Model", musicProvider: "Music Model", musicProviderTitle: "OneShowMusic generation service", musicProviderHint: "Manage the server-side music model used by AI Music Studio. Credentials are encrypted on the backend and never sent to browsers.",
    musicModel: "Music model ID", musicFormat: "Output format", musicCredits: "Credits per version", musicDuration: "Maximum duration (seconds)", musicStatus: "Runtime status", musicActive: "Enabled", musicDisabled: "Disabled",
    seoSources: "SEO Sources", seoSourceTitle: "DataForSEO source", seoSourceHint: "Provides keyword metrics, live rankings, backlinks, and competitor data. The API password is encrypted and never displayed again.",
    seoLogin: "API login", seoPassword: "API password (leave blank to keep the stored password)", seoConnectionTest: "Test account connection",
    seoConnectionSave: "Test and save", seoBalance: "Account balance", seoUnlocked: "Capabilities unlocked", seoProviderHealthy: "Authentication succeeded and account data is available",
    seoIpHint: "If DataForSEO IP allowlisting is enabled, add the fixed OneShowTools outbound IP. No action is needed when allowlisting is disabled.",
    managed_runtime: "OneShowModel", market_intelligence: "Market Intelligence", oneshow_home_chat: "OneShow Home Chat", modelName: "Configuration name", modelProtocol: "API protocol",
    modelBaseUrl: "API Base URL", modelId: "Model ID", workspaceId: "DashScope Workspace (optional)", replaceApiKey: "API Key (leave blank to keep current key)",
    testModel: "Test connection", saveModel: "Test and save", modelTestHealthy: "Connection healthy", modelRateLimited: "Credential accepted, but model is busy or rate limited",
    changeReason: "Change reason", storageBackend: "User file storage", storage_management: "Object Storage", storagePrefix: "Isolated prefix", storageBucket: "Bucket", storageRegion: "Region", storageEndpoint: "OSS Endpoint",
    storageAccessId: "AccessKey ID (leave blank to keep current key)", storageSecret: "AccessKey Secret (leave blank to keep current key)", storageTest: "Test OSS connection", storageSave: "Test and save", storageHealthy: "Connection healthy; test object removed", storageHint: "Manage Aliyun OSS for user uploads and generated files. Credentials are encrypted on the backend and never returned to browsers.",
    intelligenceBrief: "Combines external market signals with persisted product data into a daily development priority brief.",
    opportunity: "Opportunity", demand: "Demand", fit: "Platform fit", competition: "Competition", effort: "Feasibility",
    evidence: "Evidence", whyNow: "Why now", validationPlan: "7-day validation", nextStep: "Next step", latestReport: "Latest report", reportHistory: "Report history",
    build_now: "Build ready", validate_next: "Validate next", watch: "Watch",
    sourceNetwork: "Intelligence sources", categoryCoverage: "Product coverage", internalSignals: "First-party signals",
    connectedSources: "Collected sources", needsConfig: "Authorization needed", sourceItems: "signals", unserved: "Zero-result searches",
    repeatUsers: "Repeat users", subscribers: "Active subscriptions", paidInvoices: "Paid invoices", sourceReady: "Ready for next run",
    intelligenceChat: "Discuss with intelligence", chatHint: "Ask follow-up questions about demand, scope, and commercialization. Answers remain in Chinese.",
    chatPlaceholder: "例如：这个需求最适合哪些用户？最小版本应该做什么？", sendQuestion: "发送问题",
    chatNeedsReport: "生成成功的日报后即可开始沟通。", citedEvidence: "引用证据", suggestedQuestion: "你还可以问",
    commerce: "Commerce & Credits", tools: "Tool Governance", operations: "Jobs & Alerts", privacy: "Privacy",
    audit: "Audit Log", admins: "Access Control", refresh: "Refresh", logout: "Sign out",
    searchUser: "Search user ID, name, or email", search: "Search", all: "All", active: "Active",
    suspended: "Suspended", verified: "Verified", unverified: "Unverified", credits: "Credits",
    tasks: "Tasks", files: "Files", registered: "Registered", lastSeen: "Last active",
    details: "Details", customer360: "Customer 360", close: "Close", account: "Account",
    security: "Security", billing: "Commercial", activity: "Tasks & Files", support: "Support",
    reason: "Action reason", suspend: "Suspend account", restore: "Restore account", revoke: "Revoke all sessions",
    resendVerify: "Resend verification", sendReset: "Send password reset", amount: "Credit amount",
    reasonCode: "Reason code", note: "Note", adjust: "Submit adjustment", supportNote: "Add support note",
    addNote: "Save note", balance: "Balance", sessions: "Sessions", subscription: "Subscription",
    membershipPlan: "Membership plan", membershipExpiry: "Membership expiry", membershipReason: "Membership change reason",
    assignMembership: "Save membership", fileAllowance: "File allowance", permanentMembership: "No expiry",
    invoice: "Invoice", noData: "No data", provider: "Provider", status: "Status",
    paymentVolume: "Payment volume", openAlerts: "Open alerts", queuedJobs: "Queued jobs",
    creditLiability: "Credit liability", newUsers: "New users", activeUsers: "Active users",
    failedTasks: "Failed tasks", totalUsers: "Total users", verifiedUsers: "Verified users",
    storage: "Storage", mfaTitle: "Administrator MFA", mfaEnroll: "Connect authenticator",
    mfaBody: "High-risk administrator actions require a one-time code. Add this key to your authenticator.",
    mfaSecret: "Authenticator key", mfaCode: "6-digit code", activate: "Activate MFA",
    verifyMfa: "Verify and continue", recovery: "Recovery codes", recoveryBody: "Store these securely now. They are shown once.",
    saved: "I saved them securely", lifecycle: "Lifecycle", cost: "Credit cost", runtime: "Runtime",
    publish: "Publish", maintenance: "Maintenance", retire: "Retire", draft: "Draft", staged: "Staged",
    publicationTitle: "Tool publication", publicationHint: "New tools stay offline by default. Only published tools appear in the marketplace and can run.",
    onlineTools: "Online", offlineTools: "Offline", searchTools: "Search name or slug", onlineOnly: "Online only",
    offlineOnly: "Offline only", putOnline: "Publish", takeOffline: "Take offline", online: "Online", offline: "Offline",
    configureBranding: "Configure icon", brandingTitle: "Product branding", brandingHint: "Upload a product icon and choose its accent and background colors. PNG, JPG or WebP, up to 2 MB.",
    iconUpload: "Upload product icon", iconColor: "Accent color", iconBackground: "Icon background", brandingReason: "Reason for change",
    saveBranding: "Save branding", resetBranding: "Restore default icon", brandingSaved: "Product branding saved",
    orders: "Orders", subscriptions: "Subscriptions", invoices: "Invoices", refunds: "Refunds",
    disputes: "Disputes", exceptions: "Exceptions", approvals: "Approvals", approve: "Approve",
    jobs: "Jobs", alerts: "Alerts", retry: "Retry", policies: "Policies", deletions: "Deletion queue",
    exports: "Exports", holds: "Legal holds", roles: "Roles", mfa: "MFA", enrolled: "Enrolled",
    pending: "Pending", success: "Success", previous: "Previous", next: "Next", page: "Page",
    result: "Result", action: "Action", actor: "Actor", target: "Target", time: "Time",
    detailsJson: "Change summary", role: "Role", changeRole: "Change role",
    reasonRequired: "Enter an action reason first.", addAdmin: "Add administrator",
    addAdminHint: "The user must register and verify their email first.",
    adminEmail: "Registered user email", selectRole: "Assign role", auditReason: "Audit note",
    disableAdmin: "Suspend access", enableAdmin: "Restore access", adminAdded: "Administrator added",
    super_admin: "Super administrator", operationsRole: "Operations", supportRole: "Support",
    financeRole: "Finance", tool_manager: "Tool manager", privacyRole: "Privacy",
    read_only: "Read-only auditor",
    adminAccountNotFound: "No account was found for that email. Ask the user to register first.",
    adminEmailNotVerified: "That account has not verified its email.",
    adminAlreadyExists: "That account is already an administrator.",
    adminInactive: "That user account is not active.",
    lastSuperAdmin: "At least one active super administrator must remain.",
    ownAdminLocked: "You cannot change or suspend your own administrator access.",
    reporting: "Reporting", notReporting: "Not reporting", stale: "Stale", healthy: "Healthy",
    executions: "Executions", uniqueUsers: "Unique users", successRate: "Success rate", consumed: "Consumed",
    grants: "Granted", ledgerEntries: "Ledger entries", invariants: "Ledger invariants", financeNotice: "Internal operational subledger; not a replacement for statutory accounting or tax filing.",
    journals: "Journals", accounts: "Chart of accounts", periods: "Periods", reconciliation: "Reconciliation runs",
    metric: "Metric", currentValue: "Current value", freshness: "Freshness", monitoring: "Monitoring",
  },
};

const api = async (path, options = {}) => {
  const response = await fetch(path, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.code || "REQUEST_FAILED");
    error.code = data?.error?.code || "REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return data;
};
const json = (method, data, headers = {}) => ({
  method, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data),
});
const date = (value, locale) => value ? new Intl.DateTimeFormat(locale, {
  dateStyle: "medium", timeStyle: "short",
}).format(new Date(value)) : "—";
const number = (value, locale) => Number(value || 0).toLocaleString(locale);
const bytes = (value, locale) => {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} KB`;
  if (size < 1073741824) return `${(size / 1048576).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
  return `${(size / 1073741824).toLocaleString(locale, { maximumFractionDigits: 1 })} GB`;
};
const allowed = (session, permission) => session?.permissions?.includes(permission);

function Login({ locale, onAuthenticated, message, setMessage }) {
  const t = copy[locale];
  const [login, setLogin] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await api("/api/auth/login", json("POST", login));
      await onAuthenticated();
    } catch {
      setMessage(t.loginFailed);
    } finally { setBusy(false); }
  };
  return <main className="admin-login-page"><section className="admin-login-card">
    <span className="admin-mark"><ShieldCheck size={30} weight="fill" /></span>
    <small>OneShowTools Platform</small><h1>{t.signIn}</h1><p>{t.signInBody}</p>
    <form onSubmit={submit}><label>{t.email}<input type="email" autoComplete="username" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
      <label>{t.password}<input type="password" autoComplete="current-password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
      {message && <div className="admin-alert"><Warning size={18} />{message}</div>}
      <button disabled={busy}>{busy ? <SpinnerGap className="spin" size={20} /> : <LockKey size={19} />}{t.secureLogin}</button>
    </form><a href="/">{t.back}</a>
  </section></main>;
}

function MfaGate({ locale, session, onReady, onLogout }) {
  const t = copy[locale];
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true); setMessage("");
    try { setEnrollment(await api("/api/admin/v1/mfa/enroll", { method: "POST" })); }
    catch (error) { setMessage(error.code); } finally { setBusy(false); }
  };
  const activate = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await api("/api/admin/v1/mfa/activate", json("POST", { factorId: enrollment.factorId, code }));
      setRecoveryCodes(result.recoveryCodes);
    } catch (error) { setMessage(error.code); } finally { setBusy(false); }
  };
  const verify = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api("/api/admin/v1/mfa/verify", json("POST", { code })); await onReady(); }
    catch (error) { setMessage(error.code); } finally { setBusy(false); }
  };
  if (recoveryCodes.length) return <main className="admin-login-page"><section className="admin-login-card admin-mfa-card">
    <span className="admin-mark"><Key size={28} weight="fill" /></span><small>SECURITY RECOVERY</small>
    <h1>{t.recovery}</h1><p>{t.recoveryBody}</p><div className="admin-recovery-grid">
      {recoveryCodes.map((item) => <code key={item}>{item}</code>)}
    </div><button className="admin-primary-wide" onClick={onReady}><Check size={18} />{t.saved}</button>
  </section></main>;
  const needsEnrollment = !session.mfa.enrolled;
  return <main className="admin-login-page"><section className="admin-login-card admin-mfa-card">
    <span className="admin-mark"><ShieldCheck size={30} weight="fill" /></span><small>SECURITY CHECK</small>
    <h1>{t.mfaTitle}</h1><p>{t.mfaBody}</p>
    {needsEnrollment && !enrollment && <button className="admin-primary-wide" disabled={busy} onClick={start}>
      {busy ? <SpinnerGap className="spin" size={18} /> : <Key size={18} />}{t.mfaEnroll}</button>}
    {enrollment && <form onSubmit={activate}><label>{t.mfaSecret}<div className="admin-secret">{enrollment.secret}</div></label>
      <label>{t.mfaCode}<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label>
      <button disabled={busy}>{busy ? <SpinnerGap className="spin" size={18} /> : <Check size={18} />}{t.activate}</button></form>}
    {!needsEnrollment && <form onSubmit={verify}><label>{t.mfaCode}<input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label>
      <button disabled={busy}>{busy ? <SpinnerGap className="spin" size={18} /> : <ShieldCheck size={18} />}{t.verifyMfa}</button></form>}
    {message && <div className="admin-alert"><Warning size={18} />{message}</div>}
    <button className="admin-text-button" onClick={onLogout}>{t.logout}</button>
  </section></main>;
}

function Metric({ icon: Icon, label, value, tone = "blue", sub }) {
  return <article className="admin-v2-metric"><span className={`metric-symbol ${tone}`}><Icon size={20} /></span>
    <div><small>{label}</small><strong>{value}</strong>{sub && <em>{sub}</em>}</div></article>;
}

function Overview({ data, locale }) {
  const t = copy[locale];
  const m = data?.metrics || {};
  return <div className="admin-page-stack">
    <section className="admin-v2-metrics">
      <Metric icon={Users} label={t.totalUsers} value={number(m.users, locale)} sub={`+${number(m.newUsers, locale)} / ${data?.windowDays || 30}d`} />
      <Metric icon={CheckCircle} label={t.verifiedUsers} value={number(m.verifiedUsers, locale)} tone="green" />
      <Metric icon={Pulse} label={t.activeUsers} value={number(m.activeUsers, locale)} tone="purple" />
      <Metric icon={ListChecks} label={t.tasks} value={number(m.tasks, locale)} sub={`${number(m.failedTasks, locale)} ${t.failedTasks}`} tone="orange" />
      <Metric icon={Coins} label={t.creditLiability} value={number(m.creditLiability, locale)} tone="gold" />
      <Metric icon={CreditCard} label={t.subscriptions} value={number(m.subscriptions, locale)} />
      <Metric icon={Bell} label={t.openAlerts} value={number(m.openAlerts, locale)} tone={m.openAlerts ? "red" : "green"} />
      <Metric icon={File} label={t.storage} value={bytes(m.storageBytes, locale)} tone="purple" />
    </section>
    <section className="admin-v2-grid two">
      <article className="admin-v2-panel"><header><div><small>OPERATIONS</small><h2>{t.operations}</h2></div><Gauge size={22} /></header>
        <div className="admin-health-list">
          <Health label={t.queuedJobs} value={m.queuedJobs} ok={!m.queuedJobs} />
          <Health label={t.failedTasks} value={m.failedTasks} ok={!m.failedTasks} />
          <Health label="Email failures" value={m.emailFailures} ok={!m.emailFailures} />
          <Health label={t.openAlerts} value={m.openAlerts} ok={!m.openAlerts} />
        </div></article>
      <article className="admin-v2-panel"><header><div><small>COMMERCIAL</small><h2>{t.commerce}</h2></div><Bank size={22} /></header>
        <div className="admin-health-list">
          <Health label={t.orders} value={m.orders} ok />
          <Health label={t.paymentVolume} value={`${number(m.paymentVolumeMinor / 100, locale)} USD`} ok />
          <Health label={t.subscriptions} value={m.subscriptions} ok />
          <Health label={t.creditLiability} value={number(m.creditLiability, locale)} ok />
        </div></article>
    </section>
  </div>;
}
function Health({ label, value, ok }) {
  return <div className="admin-health-row"><span className={ok ? "ok" : "warn"}>{ok ? <Check size={13} /> : <Warning size={13} />}</span><strong>{label}</strong><b>{value}</b></div>;
}

function CommandCenter({ data, locale }) {
  const t = copy[locale];
  if (!data) return null;
  return <div className="admin-page-stack">
    <div className={`admin-data-freshness ${data.meta.monitoringStatus}`}>
      <Pulse size={18} /><strong>{t.monitoring}: {data.meta.monitoringStatus}</strong>
      <span>{data.meta.window} · {data.meta.timezone} · {date(data.meta.generatedAt, locale)}</span>
    </div>
    <Overview data={data} locale={locale} />
    <section className="admin-v2-grid two">
      <article className="admin-v2-panel"><header><div><small>TOOL RELIABILITY</small><h2>{t.analytics}</h2></div><ChartLineUp size={22} /></header>
        <div className="admin-health-list">
          <Health label={t.executions} value={number(data.toolUsage.executions, locale)} ok />
          <Health label={t.success} value={number(data.toolUsage.completed, locale)} ok />
          <Health label={t.failedTasks} value={number(data.toolUsage.failed, locale)} ok={!data.toolUsage.failed} />
        </div></article>
      <article className="admin-v2-panel"><header><div><small>CRITICAL ATTENTION</small><h2>{t.alerts}</h2></div><Bell size={22} /></header>
        <div className="admin-health-list">{data.criticalAlerts.length ? data.criticalAlerts.map((alert) =>
          <Health key={alert.id} label={alert.title} value={alert.severity} ok={false} />
        ) : <Health label={t.openAlerts} value="0" ok />}</div></article>
    </section>
  </div>;
}

function CreditLedgerView({ data, locale, onPage }) {
  const t = copy[locale];
  return <div className="admin-page-stack">
    <section className="admin-v2-metrics admin-v2-metrics-three">
      <Metric icon={Coins} label={t.balance} value={number(data?.totals?.balance, locale)} tone="blue" />
      <Metric icon={ChartLineUp} label={t.grants} value={number(data?.totals?.grants, locale)} tone="green" />
      <Metric icon={Receipt} label={t.consumed} value={number(data?.totals?.consumed, locale)} tone="orange" />
    </section>
    <section className="admin-v2-panel admin-table-panel"><header><div><small>IMMUTABLE LEDGER</small><h2>{t.ledgerEntries}</h2></div><BookOpenText size={22} /></header>
      <div className="admin-v2-table-wrap"><table><thead><tr><th>{t.account}</th><th>{t.reasonCode}</th><th>{t.amount}</th><th>{t.balance}</th><th>{t.actor}</th><th>{t.time}</th></tr></thead>
        <tbody>{data?.entries?.map((entry) => <tr key={entry.id}><td><strong>{entry.email}</strong><small>{entry.referenceType} / {entry.referenceId}</small></td>
          <td>{entry.reasonCode || entry.type}<small>{entry.operatorNote || (locale === "en" ? entry.descriptionEn : entry.descriptionZh)}</small></td>
          <td><strong className={entry.amount >= 0 ? "admin-positive" : "admin-negative"}>{entry.amount > 0 ? "+" : ""}{number(entry.amount, locale)}</strong></td>
          <td>{entry.balanceAfter == null ? "—" : `${number(entry.balanceBefore, locale)} → ${number(entry.balanceAfter, locale)}`}</td>
          <td>{entry.actorEmail || "system"}</td><td>{date(entry.createdAt, locale)}</td></tr>)}
        {!data?.entries?.length && <tr><td colSpan="6" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div>
      <Pager data={data} onPage={onPage} locale={locale} />
    </section>
    <section className="admin-v2-panel"><header><div><small>INVARIANTS</small><h2>{t.invariants}</h2></div><ShieldCheck size={22} /></header>
      <div className="admin-health-list"><Health label="Duplicate references" value={data?.invariants?.duplicateReferences || 0} ok={!data?.invariants?.duplicateReferences} />
        <Health label="Negative balances" value={data?.invariants?.negativeBalances || 0} ok={!data?.invariants?.negativeBalances} /></div></section>
  </div>;
}

function FinanceView({ data, locale }) {
  const t = copy[locale];
  return <div className="admin-page-stack">
    <div className="admin-data-freshness healthy"><Bank size={18} /><strong>{t.financeNotice}</strong><span>{data?.currency || "USD"}</span></div>
    <section className="admin-v2-grid two">
      <article className="admin-v2-panel admin-table-panel"><header><div><small>CHART OF ACCOUNTS</small><h2>{t.accounts}</h2></div><BookOpenText size={22} /></header>
        <div className="admin-v2-table-wrap"><table><thead><tr><th>Code</th><th>{t.account}</th><th>Type</th></tr></thead><tbody>{data?.accounts?.map((account) =>
          <tr key={account.id}><td><code>{account.code}</code></td><td>{locale === "en" ? account.nameEn : account.nameZh}</td><td>{account.accountType}</td></tr>)}</tbody></table></div></article>
      <article className="admin-v2-panel"><header><div><small>RECONCILIATION</small><h2>{t.reconciliation}</h2></div><ListChecks size={22} /></header>
        <div className="admin-health-list"><Health label={t.journals} value={data?.journals?.length || 0} ok />
          <Health label={t.periods} value={data?.periods?.length || 0} ok />
          <Health label={t.exceptions} value={data?.exceptions?.filter((item) => item.status === "open").length || 0} ok={!data?.exceptions?.some((item) => item.status === "open")} /></div></article>
    </section>
    <section className="admin-v2-panel admin-table-panel"><header><div><small>BALANCED POSTINGS</small><h2>{t.journals}</h2></div><Receipt size={22} /></header>
      <div className="admin-v2-table-wrap"><table><thead><tr><th>No.</th><th>{t.status}</th><th>{t.detailsJson}</th><th>Debit</th><th>Credit</th><th>{t.time}</th></tr></thead><tbody>
        {data?.journals?.map((journal) => <tr key={journal.id}><td><code>{journal.entryNumber}</code></td><td><span className={`admin-badge ${journal.status}`}>{journal.status}</span></td><td>{journal.description}</td><td>{number(journal.debitMinor / 100, locale)} {journal.currency}</td><td>{number(journal.creditMinor / 100, locale)} {journal.currency}</td><td>{date(journal.postedAt || journal.createdAt, locale)}</td></tr>)}
        {!data?.journals?.length && <tr><td colSpan="6" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div></section>
  </div>;
}

function ToolAnalyticsView({ data, locale }) {
  const t = copy[locale];
  return <section className="admin-v2-panel admin-table-panel">
    <div className="admin-data-freshness healthy"><ChartLineUp size={18} /><strong>{data?.meta?.definition}</strong><span>{data?.meta?.windowDays || 30}d · {data?.meta?.timezone}</span></div>
    <div className="admin-v2-table-wrap"><table><thead><tr><th>{t.tools}</th><th>{t.reporting}</th><th>{t.executions}</th><th>{t.uniqueUsers}</th><th>{t.successRate}</th><th>{t.credits}</th><th>{t.lastSeen}</th></tr></thead><tbody>
      {data?.tools?.map((tool) => <tr key={tool.id}><td><strong>{locale === "en" ? tool.nameEn : tool.nameZh}</strong><small>{tool.runtimeKind}</small></td>
        <td><span className={`admin-badge ${tool.reportingStatus}`}>{tool.reportingStatus === "not_reporting" ? t.notReporting : tool.reportingStatus === "stale" ? t.stale : t.healthy}</span></td>
        <td>{number(tool.executions, locale)}</td><td>{number(tool.uniqueUsers, locale)}</td><td>{tool.successRate == null ? "—" : `${(tool.successRate * 100).toFixed(1)}%`}</td>
        <td>{number(tool.creditsConsumed, locale)}</td><td>{date(tool.lastEventAt, locale)}</td></tr>)}</tbody></table></div>
  </section>;
}

function MarketIntelligenceView({ data, locale, onRun, onSelectDate, onAsk, running, chatRunning }) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const report = data?.report;
  const sourceById = new Map((report?.sources || []).map((source) => [source.id, source]));
  const agentReady = data?.agent?.ready;
  const sourceHealth = report?.sourceHealth?.length ? report.sourceHealth : (data?.agent?.sources || []);
  const healthySources = sourceHealth.filter((source) => ["healthy", "ready"].includes(source.status)).length;
  const unservedSearches = report?.internalSnapshot?.unservedSearches?.reduce((sum, item) => sum + Number(item.searches || 0), 0) || 0;
  const repeatUsers = report?.internalSnapshot?.repeatUsage?.reduce((sum, item) => sum + Number(item.repeatUsers || 0), 0) || 0;
  const commercial = report?.internalSnapshot?.commercial || {};
  return <div className="admin-page-stack market-intelligence-page">
    <section className="market-agent-hero">
      <div className="market-agent-icon"><Binoculars size={26} weight="fill" /></div>
      <div><small>CODEX · DAILY MARKET WATCH</small><h2>{t.intelligenceAgent}</h2><p>{t.intelligenceBrief}</p>
        <div className="market-agent-meta"><span><span className={`admin-metric-state ${agentReady ? "healthy" : "critical"}`} />{agentReady ? t.healthy : t.notReporting}</span><span>{report?.model || data?.agent?.model || "kimi/kimi-k3"}</span><span>{data?.agent?.schedule || "08:00"} · {data?.agent?.timezone || "Asia/Shanghai"}</span></div>
      </div>
      <button className="admin-primary market-agent-run" disabled={running || !agentReady} onClick={onRun}>{running ? <SpinnerGap className="spin" size={17} /> : <Lightning size={17} weight="fill" />}{t.runIntelligence}</button>
    </section>

    <section className="admin-v2-metrics admin-v2-metrics-three">
      <Metric icon={TrendUp} label={t.opportunity} value={number(report?.opportunityCount, locale)} tone="blue" />
      <Metric icon={Globe} label={t.evidence} value={number(report?.sourceCount, locale)} tone="green" />
      <Metric icon={Pulse} label={t.connectedSources} value={`${healthySources}/${sourceHealth.length || 0}`} tone={report?.status === "completed" ? "purple" : "orange"} />
    </section>

    <section className="market-intelligence-grid">
      <article className="admin-v2-panel market-source-panel"><header><div><small>LIVE SOURCE HEALTH</small><h2>{t.sourceNetwork}</h2></div><Globe size={22} /></header>
        <div className="market-source-grid">{sourceHealth.map((source) => <div className={`market-source-card ${source.status}`} key={source.key}>
          <span className={`admin-metric-state ${source.status === "healthy" || source.status === "ready" ? "healthy" : source.status === "failed" ? "critical" : "warning"}`} />
          <div><strong>{source.label}</strong><small>{source.status === "configuration_required" ? t.needsConfig : source.status === "ready" ? t.sourceReady : source.status.replaceAll("_", " ")}</small></div>
          <em>{number(source.itemCount || 0, locale)} {t.sourceItems}</em>
        </div>)}</div>
      </article>
      <article className="admin-v2-panel market-coverage-panel"><header><div><small>13-CATEGORY MATRIX</small><h2>{t.categoryCoverage}</h2></div><Storefront size={22} /></header>
        <div className="market-coverage-list">{(report?.categoryCoverage || []).map((item) => <div key={item.category}><span><strong>{item.category}</strong><small>{number(item.count, locale)}</small></span><i><b style={{ width: `${Math.min(100, Number(item.count || 0) * 10)}%` }} /></i></div>)}
          {!report?.categoryCoverage?.length && <div className="admin-empty">{t.noData}</div>}
        </div>
      </article>
    </section>

    <section className="admin-v2-panel market-first-party-panel"><header><div><small>FIRST-PARTY DEMAND</small><h2>{t.internalSignals}</h2></div><ChartLineUp size={22} /></header>
      <div><Metric icon={MagnifyingGlass} label={t.unserved} value={number(unservedSearches, locale)} tone="orange" />
        <Metric icon={ArrowClockwise} label={t.repeatUsers} value={number(repeatUsers, locale)} tone="blue" />
        <Metric icon={Users} label={t.subscribers} value={number(commercial.subscribers, locale)} tone="green" />
        <Metric icon={Receipt} label={t.paidInvoices} value={number(commercial.paidInvoices, locale)} tone="purple" /></div>
    </section>

    <section className="admin-v2-grid market-report-layout">
      <article className="admin-v2-panel market-report-main"><header><div><small>DAILY BRIEF</small><h2>{t.latestReport}{report?.reportDate ? ` · ${report.reportDate}` : ""}</h2></div><ChartLineUp size={22} /></header>
        {!report && <div className="market-report-empty"><Binoculars size={30} /><strong>{t.noData}</strong><p>{t.intelligenceBrief}</p></div>}
        {report && <><div className="market-report-summary"><p>{report.summaryZh}</p>{report.errorCode && <span className="admin-badge failed">{report.errorCode}</span>}</div>
          <div className="market-opportunity-list">{report.opportunities?.map((item, index) => <article className="market-opportunity" key={`${item.titleEn}-${index}`}>
            <header><span className="market-rank">{String(index + 1).padStart(2, "0")}</span><div><small>{item.category} · {item.decision}</small><h3>{item.titleZh}</h3><span className={`market-stage ${item.stage || "watch"}`}>{t[item.stage] || item.stage || t.watch}</span></div><strong>{item.priorityScore}</strong></header>
            <p>{item.problem}</p><p className="market-solution">{item.solution}</p>
            {item.whyNow && <p className="market-why-now"><strong>{t.whyNow}：</strong>{item.whyNow}</p>}
            <div className="market-score-grid"><Score label={t.demand} value={item.demandScore} /><Score label={t.fit} value={item.fitScore} /><Score label={t.competition} value={item.competitionScore} /><Score label={t.effort} value={item.effortScore} /></div>
            {item.validationPlan && <div className="market-validation-plan"><CheckCircle size={15} /><div><small>{t.validationPlan}</small><span>{item.validationPlan}</span></div></div>}
            <div className="market-next-step"><Lightning size={15} /><div><small>{t.nextStep}</small><span>{item.nextStep}</span></div></div>
            <div className="market-evidence"><small>{t.evidence}</small>{item.evidenceIds?.map((id) => { const source = sourceById.get(id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer"><LinkSimple size={13} />{source.source} · {source.title}</a> : null; })}</div>
          </article>)}</div></>}
      </article>
      <aside className="market-report-rail"><article className="admin-v2-panel market-intelligence-chat"><header><div><small>ASK CODEX</small><h2>{t.intelligenceChat}</h2></div><ChatCircleDots size={22} /></header>
        <p className="market-chat-hint">{t.chatHint}</p>
        <div className="market-chat-messages">{data?.conversation?.messages?.map((message) => <div className={`market-chat-message ${message.role}`} key={message.id}>
          <small>{message.role === "assistant" ? "市场情报" : "我"}</small><p>{message.content}</p>
          {message.evidenceIds?.length > 0 && <div className="market-chat-citations"><span>{t.citedEvidence}</span>{message.evidenceIds.map((id) => { const source = sourceById.get(id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{id}</a> : null; })}</div>}
          {message.role === "assistant" && message.suggestedQuestions?.length > 0 && <div className="market-chat-suggestions"><span>{t.suggestedQuestion}</span>{message.suggestedQuestions.map((item) => <button key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div>}
        </div>)}{!data?.conversation?.messages?.length && <div className="market-chat-empty"><ChatCircleDots size={23} /><span>{report?.status === "completed" ? t.chatHint : t.chatNeedsReport}</span></div>}</div>
        <form className="market-chat-form" onSubmit={async (event) => { event.preventDefault(); if (!question.trim() || chatRunning || report?.status !== "completed") return; const sent = await onAsk(report.id, question.trim()); if (sent) setQuestion(""); }}><textarea rows="3" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t.chatPlaceholder} disabled={report?.status !== "completed" || chatRunning} /><button disabled={!question.trim() || report?.status !== "completed" || chatRunning}>{chatRunning ? <SpinnerGap className="spin" size={16} /> : <PaperPlaneTilt size={16} weight="fill" />}{t.sendQuestion}</button></form>
      </article><article className="admin-v2-panel market-report-history"><header><div><small>ARCHIVE</small><h2>{t.reportHistory}</h2></div><BookOpenText size={22} /></header>
        <div className="admin-list">{data?.history?.map((item) => <button key={item.reportDate} className={item.reportDate === report?.reportDate ? "active" : ""} onClick={() => onSelectDate(item.reportDate)}><span><strong>{item.reportDate}</strong><small>{item.sourceCount} {t.evidence} · {item.opportunityCount} {t.opportunity}</small></span><em className={`admin-badge ${item.status}`}>{item.status}</em></button>)}{!data?.history?.length && <div className="admin-empty">{t.noData}</div>}</div>
      </article>
      </aside>
    </section>
  </div>;
}

function Score({ label, value }) {
  return <div><span><small>{label}</small><strong>{Number(value || 0)}</strong></span><i><b style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></i></div>;
}

function ObjectStorageView({ configuration, locale, canManage, onTest, onSave }) {
  const t = copy[locale];
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setDraft({
      bucket: configuration?.bucket || "", endpoint: configuration?.endpoint || "https://oss-cn-shanghai.aliyuncs.com",
      region: configuration?.region || "cn-shanghai", prefix: configuration?.prefix || "oneshowtools",
      accessKeyId: "", accessKeySecret: "", status: configuration?.enabled === false && configuration?.source === "admin" ? "disabled" : "active", reason: "",
    });
    setTestResult(null);
  }, [configuration?.updatedAt, configuration?.source, configuration?.configured]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const test = async () => { setTesting(true); setTestResult(null); try { setTestResult(await onTest(draft)); } finally { setTesting(false); } };
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try { const ok = await onSave(draft); if (ok) setDraft((current) => ({ ...current, accessKeyId: "", accessKeySecret: "", reason: "" })); }
    finally { setSaving(false); }
  };
  return <section className="platform-model-layout">
    <article className="admin-v2-panel platform-model-editor">
      <div className="platform-model-current"><span className={`admin-metric-state ${configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.enabled ? "Aliyun OSS" : "Local storage"}</strong><small>{configuration?.source === "admin" ? `${configuration.accessKeyIdHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : configuration?.source === "environment" ? (locale === "en" ? "Environment configuration" : "环境变量配置") : t.notReporting}</small></div></div>
      <form className="platform-model-form" onSubmit={save}>
        <label>{t.storageBucket}<input value={draft.bucket || ""} onChange={change("bucket")} disabled={!canManage} required /></label>
        <label>{t.storageRegion}<input value={draft.region || ""} onChange={change("region")} disabled={!canManage} required /></label>
        <label className="wide">{t.storageEndpoint}<input type="url" value={draft.endpoint || ""} onChange={change("endpoint")} disabled={!canManage} required /></label>
        <label>{t.storagePrefix}<input value={draft.prefix || ""} onChange={change("prefix")} disabled={!canManage} required /></label>
        <label>{t.musicStatus}<select value={draft.status || "active"} onChange={change("status")} disabled={!canManage}><option value="active">{t.musicActive}</option><option value="disabled">{t.musicDisabled}</option></select></label>
        <label>{t.storageAccessId}<input type="password" autoComplete="new-password" value={draft.accessKeyId || ""} onChange={change("accessKeyId")} disabled={!canManage} required={configuration?.source !== "admin"} /></label>
        <label>{t.storageSecret}<input type="password" autoComplete="new-password" value={draft.accessKeySecret || ""} onChange={change("accessKeySecret")} disabled={!canManage} required={configuration?.source !== "admin"} /></label>
        <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
        {testResult && <div className="platform-model-test healthy"><CheckCircle size={17} /><span>{t.storageHealthy}</span><em>{testResult.latencyMs} ms</em></div>}
        {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.storageTest}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.storageSave}</button></div>}
      </form>
    </article>
    <aside className="admin-v2-panel platform-storage-card"><header><div><small>PRIVATE OBJECT STORAGE</small><h2>{t.storageBackend}</h2></div><HardDrives size={22} /></header><div className="platform-storage-status"><span className={`admin-metric-state ${configuration?.enabled ? "healthy" : "warning"}`} /><strong>{configuration?.provider?.toUpperCase() || "LOCAL"}</strong></div><DetailRow label={t.storageBucket} value={configuration?.bucket} /><DetailRow label={t.storageRegion} value={configuration?.region} /><DetailRow label={t.storagePrefix} value={configuration?.prefix} /><DetailRow label={locale === "en" ? "Credential" : "密钥标识"} value={configuration?.accessKeyIdHint} /><p>{t.storageHint}</p><p>{locale === "en" ? "The connection check only creates and removes one isolated test object. Existing bucket objects are never listed or changed." : "连接测试只会创建并清理一个隔离的测试对象，不会列举或改动 Bucket 中已有的内容。"}</p></aside>
  </section>;
}

function ModelStudioWorkspaceView({ configuration, locale, canManage, onTest, onSave }) {
  const t = copy[locale];
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setDraft({
      name: configuration?.name || (locale === "en" ? "Default Model Studio Workspace" : "阿里云百炼默认工作空间"),
      region: configuration?.region || "cn-beijing", workspaceId: configuration?.workspaceId || "",
      endpointMode: configuration?.endpointMode || "public", apiKey: "",
      status: configuration?.enabled === false && configuration?.configured ? "disabled" : "active", reason: "",
    });
    setTestResult(null);
  }, [configuration?.updatedAt, configuration?.configured, locale]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const endpoint = draft.endpointMode === "workspace" && draft.workspaceId
    ? `https://${draft.workspaceId}.${draft.region || "cn-beijing"}.maas.aliyuncs.com/api/v1`
    : draft.region === "ap-southeast-1" ? "https://dashscope-intl.aliyuncs.com/api/v1" : "https://dashscope.aliyuncs.com/api/v1";
  const test = async () => { setTesting(true); setTestResult(null); try { setTestResult(await onTest(draft)); } finally { setTesting(false); } };
  const save = async (event) => { event.preventDefault(); setSaving(true); try { const ok = await onSave(draft); if (ok) setDraft((current) => ({ ...current, apiKey: "", reason: "" })); } finally { setSaving(false); } };
  return <section className="platform-model-layout"><article className="admin-v2-panel platform-model-editor">
    <div className="platform-model-current"><span className={`admin-metric-state ${configuration?.configured && configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.configured ? configuration.name : (locale === "en" ? "Not configured" : "尚未配置工作空间")}</strong><small>{configuration?.configured ? `${configuration.keyHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : (locale === "en" ? "Configure one encrypted key for inherited platform models" : "配置一个加密密钥，供平台模型统一继承")}</small></div></div>
    <form className="platform-model-form" onSubmit={save}>
      <label>{locale === "en" ? "Workspace name" : "工作空间名称"}<input value={draft.name || ""} onChange={change("name")} disabled={!canManage} required /></label>
      <label>{locale === "en" ? "Region" : "地域"}<select value={draft.region || "cn-beijing"} onChange={change("region")} disabled={!canManage}><option value="cn-beijing">华北 2（北京）</option><option value="ap-southeast-1">Singapore</option></select></label>
      <label>{locale === "en" ? "Endpoint mode" : "接口模式"}<select value={draft.endpointMode || "public"} onChange={change("endpointMode")} disabled={!canManage}><option value="public">{locale === "en" ? "Public DashScope endpoint" : "公共 DashScope 地址"}</option><option value="workspace">{locale === "en" ? "Workspace dedicated endpoint" : "工作空间专属地址"}</option></select></label>
      <label>{t.workspaceId}<input value={draft.workspaceId || ""} onChange={change("workspaceId")} disabled={!canManage} required={draft.endpointMode === "workspace"} placeholder="ws-xxxxxxxx" /></label>
      <label className="wide">API Host<input value={endpoint} readOnly /></label>
      <label>{t.musicStatus}<select value={draft.status || "active"} onChange={change("status")} disabled={!canManage}><option value="active">{t.musicActive}</option><option value="disabled">{t.musicDisabled}</option></select></label>
      <label className="wide">{t.replaceApiKey}<input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={change("apiKey")} disabled={!canManage} required={!configuration?.configured} placeholder="sk-... / sk-ws-..." /></label>
      <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
      {testResult && <div className="platform-model-test healthy"><CheckCircle size={17} /><span>{t.modelTestHealthy}</span><em>{testResult.latencyMs} ms</em></div>}
      {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.testModel}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.saveModel}</button></div>}
    </form>
  </article><aside className="admin-v2-panel platform-model-guidance"><Globe size={25} /><h3>{locale === "en" ? "Alibaba Cloud Model Studio" : "阿里云百炼工作空间"}</h3><p>{locale === "en" ? "Centralize the region, endpoint, workspace ID and API key. Image models can inherit this connection without storing another key." : "统一管理地域、接口地址、Workspace ID 与 API Key，图片模型可直接继承，无需重复保存密钥。"}</p><ul><li>{locale === "en" ? "The test validates authentication without generating a billable image" : "连接测试使用无计费鉴权探针，不生成图片"}</li><li>{locale === "en" ? "Use the exact API Host shown when the API key was created" : "专属接口必须与创建 API Key 时显示的 API Host 一致"}</li><li>{locale === "en" ? "Keys are encrypted and never returned in plaintext" : "密钥加密保存，提交后不再返回明文"}</li></ul></aside></section>;
}

function PlatformModelsView({ data, locale, canManage, canManageStorage, onTest, onSave, onMusicTest, onMusicSave, onSingingTest, onSingingSave, onImageTest, onImageSave, onImageEditTest, onImageEditSave, onWorkspaceTest, onWorkspaceSave, onStorageTest, onStorageSave }) {
  const t = copy[locale];
  const [purpose, setPurpose] = useState("managed_runtime");
  const selected = data?.models?.find((item) => item.purpose === purpose);
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setDraft({
      name: selected?.name || t[purpose], providerTemplate: selected?.providerTemplate || "openai",
      baseUrl: selected?.baseUrl || "", modelId: selected?.modelId || "", workspaceId: selected?.workspaceId || "",
      apiKey: "", reason: "",
    });
    setTestResult(null);
  }, [purpose, selected?.updatedAt, selected?.source, t]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const test = async () => {
    setTesting(true); setTestResult(null);
    try { setTestResult(await onTest(purpose, draft)); } finally { setTesting(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try { const result = await onSave(purpose, draft); if (result) setDraft((current) => ({ ...current, apiKey: "", reason: "" })); }
    finally { setSaving(false); }
  };
  const purposes = ["managed_runtime", "market_intelligence", "oneshow_home_chat", "model_studio_workspace", "music_generation", "singing_cover", "image_generation", "image_editing", "image_upscaling", "storage_management"];
  return <div className="admin-page-stack platform-model-page">
    <section className="admin-v2-panel platform-model-intro"><header><div><small>SERVER-SIDE AI ROUTING</small><h2>{t.platformModels}</h2></div><Gear size={23} /></header><p>{t.platformModelsHint}</p></section>
    <nav className="admin-v2-panel admin-section-tabs platform-model-purpose-tabs">{purposes.map((item) => <button key={item} className={purpose === item ? "active" : ""} onClick={() => setPurpose(item)}>{t[item]}</button>)}</nav>
    {purpose === "storage_management"
      ? <ObjectStorageView configuration={data?.storage} locale={locale} canManage={canManageStorage} onTest={onStorageTest} onSave={onStorageSave} />
      : purpose === "model_studio_workspace"
      ? <ModelStudioWorkspaceView configuration={data?.modelStudioWorkspace} locale={locale} canManage={canManage} onTest={onWorkspaceTest} onSave={onWorkspaceSave} />
      : purpose === "music_generation"
      ? <section className="platform-model-layout"><MusicProviderView data={{ configuration: data?.music }} locale={locale} canManage={canManage} onTest={onMusicTest} onSave={onMusicSave} embedded /></section>
      : purpose === "singing_cover"
      ? <section className="platform-model-layout"><SingingProviderView configuration={data?.singing} locale={locale} canManage={canManage} onTest={onSingingTest} onSave={onSingingSave} /></section>
      : purpose === "image_generation"
      ? <section className="platform-model-layout"><ImageProviderView configuration={data?.image} workspace={data?.modelStudioWorkspace} locale={locale} canManage={canManage} onTest={onImageTest} onSave={onImageSave} /></section>
      : purpose === "image_editing" || purpose === "image_upscaling"
      ? <section className="platform-model-layout"><ImageEditProviderView purpose={purpose} configuration={purpose === "image_editing" ? data?.imageEditing : data?.imageUpscaling} workspace={data?.modelStudioWorkspace} locale={locale} canManage={canManage} onTest={onImageEditTest} onSave={onImageEditSave} /></section>
      : <section className="platform-model-layout">
      <article className="admin-v2-panel platform-model-editor">
        <div className="platform-model-current"><span className={`admin-metric-state ${selected?.configured ? "healthy" : "warning"}`} /><div><strong>{selected?.modelId || t.notReporting}</strong><small>{selected?.source === "admin" ? `${selected.keyHint || "••••"} · ${selected.lastTestStatus || t.pending}` : `${locale === "en" ? "Environment configuration" : "环境变量配置"}`}</small></div></div>
        <form className="platform-model-form" onSubmit={save}>
          <label>{t.modelName}<input value={draft.name || ""} onChange={change("name")} disabled={!canManage} required /></label>
          <label>{t.modelProtocol}<select value={draft.providerTemplate || "openai"} onChange={change("providerTemplate")} disabled={!canManage}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></label>
          <label className="wide">{t.modelBaseUrl}<input type="url" value={draft.baseUrl || ""} onChange={change("baseUrl")} disabled={!canManage} required /></label>
          <label>{t.modelId}<input value={draft.modelId || ""} onChange={change("modelId")} disabled={!canManage} required /></label>
          <label>{t.workspaceId}<input value={draft.workspaceId || ""} onChange={change("workspaceId")} disabled={!canManage} /></label>
          <label className="wide">{t.replaceApiKey}<input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={change("apiKey")} disabled={!canManage} required={selected?.source !== "admin"} /></label>
          <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
          {testResult && <div className={`platform-model-test ${testResult.status === "healthy" ? "healthy" : "warning"}`}><CheckCircle size={17} /><span>{testResult.status === "healthy" ? t.modelTestHealthy : testResult.status === "model_rate_limited" ? t.modelRateLimited : testResult.status}</span><em>{testResult.latencyMs} ms</em></div>}
          {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.testModel}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.saveModel}</button></div>}
        </form>
      </article>
      <aside className="admin-v2-panel platform-storage-card"><header><div><small>PRIVATE OBJECT STORAGE</small><h2>{t.storageBackend}</h2></div><HardDrives size={22} /></header><div className="platform-storage-status"><span className={`admin-metric-state ${data?.storage?.configured ? "healthy" : "warning"}`} /><strong>{data?.storage?.provider?.toUpperCase() || "LOCAL"}</strong></div><DetailRow label={t.storageBucket} value={data?.storage?.bucket} /><DetailRow label={t.storageRegion} value={data?.storage?.region} /><DetailRow label={t.storagePrefix} value={data?.storage?.prefix} /><p>{locale === "en" ? "Objects use private ACL, random IDs, and an isolated prefix. Existing bucket objects are never listed or modified." : "对象使用私有权限、随机 ID 和独立前缀；系统不会列举或修改 Bucket 中的既有文件。"}</p></aside>
    </section>}
  </div>;
}

function ImageProviderView({ configuration, workspace, locale, canManage, onTest, onSave }) {
  const t = copy[locale];
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    const credentialSource = configuration?.credentialSource || (workspace?.configured ? "workspace" : "direct");
    const adapter = credentialSource === "workspace" ? "dashscope" : (configuration?.adapter || "minimax");
    setDraft({ adapter, credentialSource, baseUrl: credentialSource === "workspace" ? workspace?.baseUrl : (configuration?.baseUrl || (adapter === "minimax" ? "https://api.minimaxi.com" : "https://api.openai.com")), modelId: configuration?.modelId || (adapter === "dashscope" ? "qwen-image-2.0" : adapter === "minimax" ? "image-01" : "gpt-image-1"), apiKey: "", creditCost: configuration?.creditCost || 10, status: configuration?.enabled === false && configuration?.configured ? "disabled" : "active", reason: "" });
    setTestResult(null);
  }, [configuration?.updatedAt, configuration?.configured, workspace?.updatedAt, workspace?.configured]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const changeCredentialSource = (event) => { const credentialSource = event.target.value; setDraft((current) => credentialSource === "workspace" ? { ...current, credentialSource, adapter: "dashscope", baseUrl: workspace?.baseUrl || "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0", apiKey: "" } : { ...current, credentialSource: "direct", adapter: "minimax", baseUrl: "https://api.minimaxi.com", modelId: "image-01" }); };
  const changeAdapter = (event) => { const adapter = event.target.value; setDraft((current) => ({ ...current, adapter, credentialSource: "direct", baseUrl: adapter === "minimax" ? "https://api.minimaxi.com" : "https://api.openai.com", modelId: adapter === "minimax" ? "image-01" : "gpt-image-1" })); };
  const test = async () => { setTesting(true); setTestResult(null); try { setTestResult(await onTest(draft)); } finally { setTesting(false); } };
  const save = async (event) => { event.preventDefault(); setSaving(true); try { const ok = await onSave(draft); if (ok) setDraft((current) => ({ ...current, apiKey: "", reason: "" })); } finally { setSaving(false); } };
  return <><article className="admin-v2-panel platform-model-editor"><div className="platform-model-current"><span className={`admin-metric-state ${configuration?.configured && configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.configured ? configuration.modelId : t.notReporting}</strong><small>{configuration?.configured ? `${configuration.keyHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : (locale === "en" ? "No image model configured" : "尚未配置图片模型")}</small></div></div><form className="platform-model-form" onSubmit={save}>
    <label>{locale === "en" ? "Credential source" : "连接来源"}<select value={draft.credentialSource || "direct"} onChange={changeCredentialSource} disabled={!canManage}><option value="workspace" disabled={!workspace?.configured}>{locale === "en" ? "Inherit default Model Studio workspace" : "继承默认百炼工作空间"}</option><option value="direct">{locale === "en" ? "Independent API key" : "使用独立 API Key"}</option></select></label>
    <label>{locale === "en" ? "API format" : "接口格式"}<select value={draft.adapter || "minimax"} onChange={changeAdapter} disabled={!canManage || draft.credentialSource === "workspace"}>{draft.credentialSource === "workspace" && <option value="dashscope">Alibaba Cloud Model Studio</option>}<option value="minimax">MiniMax Images</option><option value="openai">OpenAI Images</option></select></label>
    <label>{t.modelId}<input list="image-generation-model-options" value={draft.modelId || ""} onChange={change("modelId")} disabled={!canManage} required /><datalist id="image-generation-model-options"><option value="qwen-image-2.0" /><option value="qwen-image-2.0-pro" /><option value="gpt-image-1" /><option value="image-01" /></datalist></label>
    <label className="wide">{t.modelBaseUrl}<input type="url" value={draft.credentialSource === "workspace" ? (workspace?.baseUrl || draft.baseUrl || "") : (draft.baseUrl || "")} onChange={change("baseUrl")} disabled={!canManage || draft.credentialSource === "workspace"} required /></label>
    <label>{locale === "en" ? "Credits per image" : "每张图片积分"}<input type="number" min="1" max="10000" value={draft.creditCost || 10} onChange={change("creditCost")} disabled={!canManage} required /></label>
    <label>{t.musicStatus}<select value={draft.status || "active"} onChange={change("status")} disabled={!canManage}><option value="active">{t.musicActive}</option><option value="disabled">{t.musicDisabled}</option></select></label>
    {draft.credentialSource === "direct" && <label className="wide">{t.replaceApiKey}<input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={change("apiKey")} disabled={!canManage} required={!configuration?.configured || configuration?.credentialSource === "workspace"} /></label>}
    <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
    {testResult && <div className="platform-model-test healthy"><CheckCircle size={17} /><span>{t.modelTestHealthy}</span><em>{testResult.latencyMs} ms</em></div>}
    {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.testModel}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.saveModel}</button></div>}
  </form></article><aside className="admin-v2-panel platform-model-guidance"><ImageSquare size={25} /><h3>{locale === "en" ? "Image generation" : "图片生成能力"}</h3><p>{locale === "en" ? "Provides a shared image-generation service for music covers and future image tools. Generated assets are stored with the user's files." : "为音乐封面以及后续图片工具提供统一的图片生成服务，生成结果归档到用户文件中心与 OSS。"}</p><ul><li>{locale === "en" ? "Users never see provider credentials" : "用户不会接触模型密钥"}</li><li>{locale === "en" ? "Testing creates one real image" : "连接测试会真实生成一张测试图片"}</li><li>{locale === "en" ? "Available to approved platform tools" : "仅向已接入的平台工具提供能力"}</li></ul></aside></>;
}

function ImageEditProviderView({ purpose, configuration, workspace, locale, canManage, onTest, onSave }) {
  const t = copy[locale];
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    const adapter = configuration?.adapter || "dashscope";
    setDraft({ adapter, credentialSource: configuration?.credentialSource || (workspace?.configured ? "workspace" : "direct"), baseUrl: configuration?.baseUrl || "https://dashscope.aliyuncs.com/api/v1", modelId: configuration?.modelId || "qwen-image-2.0", apiKey: "", creditCost: configuration?.creditCost || (purpose === "image_upscaling" ? 20 : 30), status: configuration?.enabled === false && configuration?.configured ? "disabled" : "active", reason: "" });
    setTestResult(null);
  }, [configuration?.updatedAt, configuration?.configured, purpose, workspace?.updatedAt, workspace?.configured]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const changeCredentialSource = (event) => { const credentialSource = event.target.value; setDraft((current) => credentialSource === "workspace" ? { ...current, credentialSource, adapter: "dashscope", baseUrl: workspace?.baseUrl || "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0", apiKey: "" } : { ...current, credentialSource: "direct", adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0" }); };
  const changeAdapter = (event) => { const adapter = event.target.value; setDraft((current) => ({ ...current, adapter, credentialSource: adapter === "openai" ? "direct" : current.credentialSource, baseUrl: adapter === "dashscope" ? "https://dashscope.aliyuncs.com/api/v1" : "https://api.openai.com/v1", modelId: adapter === "dashscope" ? "qwen-image-2.0" : "gpt-image-1.5" })); };
  const test = async () => { setTesting(true); setTestResult(null); try { setTestResult(await onTest(purpose, draft)); } finally { setTesting(false); } };
  const save = async (event) => { event.preventDefault(); setSaving(true); try { const ok = await onSave(purpose, draft); if (ok) setDraft((current) => ({ ...current, apiKey: "", reason: "" })); } finally { setSaving(false); } };
  const title = purpose === "image_upscaling" ? (locale === "en" ? "Image restoration and upscale" : "图片高清修复") : (locale === "en" ? "AI image editing" : "AI 图片编辑");
  return <><article className="admin-v2-panel platform-model-editor"><div className="platform-model-current"><span className={`admin-metric-state ${configuration?.configured && configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.configured ? configuration.modelId : t.notReporting}</strong><small>{configuration?.configured ? `${configuration.keyHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : (locale === "en" ? "No provider configured" : "尚未配置模型")}</small></div></div><form className="platform-model-form" onSubmit={save}>
    <label>{locale === "en" ? "Credential source" : "连接来源"}<select value={draft.credentialSource || "direct"} onChange={changeCredentialSource} disabled={!canManage}><option value="workspace" disabled={!workspace?.configured}>{locale === "en" ? "Inherit default Model Studio workspace" : "继承默认百炼工作空间"}</option><option value="direct">{locale === "en" ? "Independent API key" : "使用独立 API Key"}</option></select></label>
    <label>{locale === "en" ? "API format" : "接口格式"}<select value={draft.adapter || "dashscope"} onChange={changeAdapter} disabled={!canManage}><option value="dashscope">Alibaba Cloud Model Studio</option><option value="openai">OpenAI Images</option></select></label>
    <label>{t.modelId}<input list={`image-model-options-${purpose}`} value={draft.modelId || ""} onChange={change("modelId")} disabled={!canManage} required /><datalist id={`image-model-options-${purpose}`}><option value="qwen-image-2.0" /><option value="qwen-image-2.0-pro" /><option value="wan2.7-image-pro" /><option value="wan2.7-image" /><option value="qwen-image-3.0-pro" /></datalist></label>
    <label className="wide">{t.modelBaseUrl}<input type="url" value={draft.credentialSource === "workspace" ? (workspace?.baseUrl || draft.baseUrl || "") : (draft.baseUrl || "")} onChange={change("baseUrl")} disabled={!canManage || draft.credentialSource === "workspace"} required /></label>
    <label>{locale === "en" ? "Credits per result" : "每次处理积分"}<input type="number" min="1" max="10000" value={draft.creditCost || 20} onChange={change("creditCost")} disabled={!canManage} required /></label>
    <label>{t.musicStatus}<select value={draft.status || "active"} onChange={change("status")} disabled={!canManage}><option value="active">{t.musicActive}</option><option value="disabled">{t.musicDisabled}</option></select></label>
    {draft.credentialSource === "direct" && <label className="wide">{t.replaceApiKey}<input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={change("apiKey")} disabled={!canManage} required={!configuration?.configured || configuration?.credentialSource === "workspace"} /></label>}
    <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
    {testResult && <div className="platform-model-test healthy"><CheckCircle size={17} /><span>{t.modelTestHealthy}</span><em>{testResult.latencyMs} ms</em></div>}
    {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.testModel}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.saveModel}</button></div>}
  </form></article><aside className="admin-v2-panel platform-model-guidance"><ImageSquare size={25} /><h3>{title}</h3><p>{locale === "en" ? "One encrypted server-side connection powers the commercial image tools. Generated files are copied immediately into private user storage." : "一个后端加密连接统一服务商业图片工具；模型结果会立即转存到用户私有文件中心与 OSS。"}</p><ul><li>{locale === "en" ? "Stable default: qwen-image-2.0; quality: qwen-image-2.0-pro" : "稳定默认：qwen-image-2.0；画质优先：qwen-image-2.0-pro"}</li><li>{locale === "en" ? "A successful test can be saved for 10 minutes without another model call" : "测试成功后 10 分钟内保存不会重复调用模型"}</li><li>{locale === "en" ? "Wait at least one minute before retrying Pro model tests" : "Pro 模型测试失败后请至少间隔 1 分钟再试"}</li><li>{locale === "en" ? "The upscale tools fall back to the editing model when needed" : "未单独配置高清修复时，会安全回退到图片编辑模型"}</li></ul></aside></>;
}

function MusicProviderView({ data, locale, canManage, onTest, onSave, embedded = false }) {
  const t = copy[locale];
  const configuration = data?.configuration;
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setDraft({
      baseUrl: configuration?.baseUrl || "https://api.minimaxi.com",
      modelId: configuration?.modelId || "music-2.6", apiKey: "",
      outputFormat: configuration?.outputFormat || "mp3",
      creditCost: configuration?.creditCost || 30,
      maxDurationSeconds: configuration?.maxDurationSeconds || 300,
      status: configuration?.enabled === false && configuration?.configured ? "disabled" : "active",
      reason: "",
    });
    setTestResult(null);
  }, [configuration?.updatedAt, configuration?.configured]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const test = async () => { setTesting(true); setTestResult(null); try { setTestResult(await onTest(draft)); } finally { setTesting(false); } };
  const save = async (event) => { event.preventDefault(); setSaving(true); try { const ok = await onSave(draft); if (ok) setDraft((current) => ({ ...current, apiKey: "", reason: "" })); } finally { setSaving(false); } };
  const editor = <><article className="admin-v2-panel platform-model-editor">
      <div className="platform-model-current"><span className={`admin-metric-state ${configuration?.configured && configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.configured ? configuration.modelId : t.notReporting}</strong><small>{configuration?.configured ? `${configuration.keyHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : (locale === "en" ? "No music provider configured" : "尚未配置音乐模型")}</small></div></div>
      <form className="platform-model-form" onSubmit={save}>
        <label className="wide">{t.modelBaseUrl}<input type="url" value={draft.baseUrl || ""} onChange={change("baseUrl")} disabled={!canManage} required /></label>
        <label>{t.musicModel}<input value={draft.modelId || ""} onChange={change("modelId")} disabled={!canManage} required /></label>
        <label>{t.musicFormat}<select value={draft.outputFormat || "mp3"} onChange={change("outputFormat")} disabled={!canManage}><option value="mp3">MP3</option><option value="wav">WAV</option></select></label>
        <label>{t.musicCredits}<input type="number" min="1" max="10000" value={draft.creditCost || 30} onChange={change("creditCost")} disabled={!canManage} required /></label>
        <label>{t.musicDuration}<input type="number" min="15" max="600" value={draft.maxDurationSeconds || 300} onChange={change("maxDurationSeconds")} disabled={!canManage} required /></label>
        <label>{t.musicStatus}<select value={draft.status || "active"} onChange={change("status")} disabled={!canManage}><option value="active">{t.musicActive}</option><option value="disabled">{t.musicDisabled}</option></select></label>
        <label className="wide">{t.replaceApiKey}<input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={change("apiKey")} disabled={!canManage} required={!configuration?.configured} /></label>
        <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
        {testResult && <div className="platform-model-test healthy"><CheckCircle size={17} /><span>{t.modelTestHealthy}</span><em>{testResult.latencyMs} ms</em></div>}
        {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.testModel}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.saveModel}</button></div>}
      </form>
    </article><aside className="admin-v2-panel platform-model-guidance"><MusicNotes size={25} /><h3>OneShowMusic</h3><p>{locale === "en" ? "Customer requests are queued, billed through the credit ledger, and copied to private object storage before temporary provider URLs expire." : "用户请求将进入任务队列，通过积分账本计费，并在供应商临时地址失效前转存到私有 OSS。"}</p><ul><li>{locale === "en" ? "API keys never reach the client" : "API Key 不会下发到前端"}</li><li>{locale === "en" ? "Failed jobs refund credits automatically" : "失败任务自动退还积分"}</li><li>{locale === "en" ? "Provider identity is hidden from users" : "用户端统一显示 OneShowMusic"}</li></ul></aside></>;
  if (embedded) return editor;
  return <div className="admin-page-stack platform-model-page">
    <section className="admin-v2-panel platform-model-intro"><header><div><small>SERVER-SIDE MUSIC GENERATION</small><h2>{t.musicProviderTitle}</h2></div><MusicNotes size={24} /></header><p>{t.musicProviderHint}</p></section>
    <section className="platform-model-layout">{editor}</section>
  </div>;
}

function SingingProviderView({ configuration, locale, canManage, onTest, onSave }) {
  const t = copy[locale];
  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setDraft({ baseUrl: configuration?.baseUrl || "https://api.myvocal.ai", apiKey: "", creditCost: configuration?.creditCost || 80, status: configuration?.enabled === false && configuration?.configured ? "disabled" : "active", reason: "" });
    setTestResult(null);
  }, [configuration?.updatedAt, configuration?.configured]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const test = async () => { setTesting(true); setTestResult(null); try { setTestResult(await onTest(draft)); } finally { setTesting(false); } };
  const save = async (event) => { event.preventDefault(); setSaving(true); try { const ok = await onSave(draft); if (ok) setDraft((current) => ({ ...current, apiKey: "", reason: "" })); } finally { setSaving(false); } };
  return <><article className="admin-v2-panel platform-model-editor"><div className="platform-model-current"><span className={`admin-metric-state ${configuration?.configured && configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.configured ? "OneShowVoice" : t.notReporting}</strong><small>{configuration?.configured ? `${configuration.keyHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : (locale === "en" ? "Song cover provider not configured" : "尚未配置歌曲翻唱接口")}</small></div></div><form className="platform-model-form" onSubmit={save}>
    <label className="wide">API Base URL<input type="url" value={draft.baseUrl || ""} readOnly aria-readonly="true" /><small>{locale === "en" ? "Fixed MyVocal service address; no changes required." : "MyVocal 固定服务地址，无需修改。"}</small></label>
    <label>{locale === "en" ? "Credits per cover" : "每次翻唱积分"}<input type="number" min="1" max="10000" value={draft.creditCost || 80} onChange={change("creditCost")} disabled={!canManage} required /></label>
    <label>{t.musicStatus}<select value={draft.status || "active"} onChange={change("status")} disabled={!canManage}><option value="active">{t.musicActive}</option><option value="disabled">{t.musicDisabled}</option></select></label>
    <label className="wide">MyVocal Access Key（{locale === "en" ? "leave blank to keep current key" : "唯一需要配置的密钥；留空则保留现有密钥"}）<input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={change("apiKey")} disabled={!canManage} required={!configuration?.configured} /></label>
    <label className="wide">{t.changeReason}<input value={draft.reason || ""} onChange={change("reason")} disabled={!canManage} required /></label>
    {testResult && <div className="platform-model-test healthy"><CheckCircle size={17} /><span>{t.modelTestHealthy}</span><em>{testResult.latencyMs} ms</em></div>}
    {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.testModel}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.saveModel}</button></div>}
  </form></article><aside className="admin-v2-panel platform-model-guidance"><MusicNotes size={25} /><h3>{locale === "en" ? "Authorized song covers" : "授权歌曲翻唱"}</h3><p>{locale === "en" ? "Connects personal singing voices to target songs. Voice samples, source songs, and results remain owner-scoped in private storage." : "将用户授权的个人音色应用到目标歌曲。音色样本、原歌曲和结果均按用户隔离保存。"}</p><ul><li>{locale === "en" ? "Only one MyVocal Access Key is required" : "只需配置一个 MyVocal Access Key"}</li><li>{locale === "en" ? "Async training and cover callbacks" : "音色训练与翻唱均采用异步回调"}</li><li><a href="https://www.myvocal.ai/profile" target="_blank" rel="noreferrer">{locale === "en" ? "Get an Access Key" : "前往账户页面获取 Access Key"}</a></li></ul></aside></>;
}

function SeoSourcesView({ data, locale, canManage, onTest, onSave }) {
  const t = copy[locale];
  const configuration = data?.configuration;
  const [draft, setDraft] = useState({ login: "", password: "", status: "active", reason: "" });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setDraft({ login: "", password: "", status: configuration?.configured && configuration?.enabled === false ? "disabled" : "active", reason: "" });
    setTestResult(null);
  }, [configuration?.updatedAt]);
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const test = async () => {
    setTesting(true); setTestResult(null);
    try { setTestResult(await onTest(draft)); } finally { setTesting(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const result = await onSave(draft);
      if (result) setDraft((current) => ({ ...current, login: "", password: "", reason: "" }));
    } finally { setSaving(false); }
  };
  const balance = testResult?.balance ?? configuration?.balance;
  const currency = testResult?.currency || configuration?.currency || "USD";
  return <div className="admin-page-stack seo-source-page">
    <section className="admin-v2-panel platform-model-intro"><header><div><small>COMMERCIAL SEO DATA</small><h2>{t.seoSourceTitle}</h2></div><LinkSimple size={23} /></header><p>{t.seoSourceHint}</p></section>
    <section className="seo-source-layout">
      <article className="admin-v2-panel seo-source-editor">
        <div className="platform-model-current"><span className={`admin-metric-state ${configuration?.configured && configuration?.enabled ? "healthy" : "warning"}`} /><div><strong>{configuration?.configured ? configuration.loginHint : t.notReporting}</strong><small>{configuration?.configured ? `${configuration.passwordHint || "••••"} · ${configuration.lastTestStatus || t.pending}` : locale === "en" ? "No stored credential" : "尚未保存凭证"}</small></div></div>
        <form className="platform-model-form" onSubmit={save}>
          <label>{t.seoLogin}<input type="email" value={draft.login} onChange={change("login")} placeholder={configuration?.loginHint || "contact@example.com"} disabled={!canManage} required={!configuration?.configured} autoComplete="off" /></label>
          <label>{t.status}<select value={draft.status} onChange={change("status")} disabled={!canManage}><option value="active">{t.active}</option><option value="disabled">{locale === "en" ? "Disabled" : "停用"}</option></select></label>
          <label className="wide">{t.seoPassword}<input type="password" value={draft.password} onChange={change("password")} placeholder={configuration?.passwordHint || ""} disabled={!canManage} required={!configuration?.configured} autoComplete="new-password" /></label>
          <label className="wide">{t.changeReason}<input value={draft.reason} onChange={change("reason")} disabled={!canManage} required /></label>
          {testResult && <div className={`platform-model-test ${testResult.status === "healthy" ? "healthy" : "warning"}`}><CheckCircle size={17} /><span>{testResult.status === "healthy" ? t.seoProviderHealthy : testResult.status}</span><em>{testResult.latencyMs} ms</em></div>}
          {canManage && <div className="platform-model-actions"><button type="button" onClick={test} disabled={testing}>{testing ? <SpinnerGap className="spin" size={16} /> : <Pulse size={16} />}{t.seoConnectionTest}</button><button className="admin-primary" disabled={saving}>{saving ? <SpinnerGap className="spin" size={16} /> : <LockKey size={16} />}{t.seoConnectionSave}</button></div>}
        </form>
      </article>
      <aside className="admin-v2-panel seo-source-summary"><header><div><small>ACCOUNT & COVERAGE</small><h2>{t.seoBalance}</h2></div><Coins size={22} /></header><strong className="seo-source-balance">{balance == null ? "—" : `${currency} ${Number(balance).toLocaleString(locale, { maximumFractionDigits: 4 })}`}</strong><DetailRow label={t.seoUnlocked} value={`${data?.capabilities?.total || 13}`} /><DetailRow label={locale === "en" ? "Keyword metrics" : "关键词指标"} value={data?.capabilities?.keywordMetrics} /><DetailRow label={locale === "en" ? "Live SERP" : "实时排名"} value={data?.capabilities?.liveSerp} /><DetailRow label={locale === "en" ? "Backlinks" : "外链分析"} value={data?.capabilities?.backlinks} /><DetailRow label={locale === "en" ? "Competitors" : "竞争分析"} value={data?.capabilities?.competitors} /><p>{t.seoIpHint}{data?.ipWhitelist?.serverIp ? ` ${data.ipWhitelist.serverIp}` : ""}</p></aside>
    </section>
  </div>;
}

function metricDisplay(metric, locale) {
  if (metric.value == null) return "—";
  if (metric.unit === "percent") return `${metric.value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  if (metric.unit === "bytes") return bytes(metric.value, locale);
  if (metric.unit === "seconds") return `${Math.round(metric.value).toLocaleString(locale)}s`;
  return metric.value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

function InfrastructureView({ data, locale }) {
  const t = copy[locale];
  return <div className="admin-page-stack">
    <div className={`admin-data-freshness ${data?.heartbeat?.status || "not_reporting"}`}><Pulse size={18} />
      <strong>{t.monitoring}: {data?.heartbeat?.status || t.notReporting}</strong><span>{date(data?.heartbeat?.collectedAt, locale)}</span></div>
    <section className="admin-health-metric-grid">{data?.metrics?.map((metric) => <article className="admin-health-metric" key={metric.name}>
      <div><span className={`admin-metric-state ${metric.status}`} /><small>{locale === "en" ? metric.labelEn : metric.labelZh}</small></div>
      <strong>{metricDisplay(metric, locale)}</strong><footer><code>{metric.name}</code><span>{metric.status}</span></footer>
    </article>)}</section>
    <section className="admin-v2-panel admin-table-panel"><header><div><small>ACTIVE CONDITIONS</small><h2>{t.alerts}</h2></div><Bell size={22} /></header>
      <div className="admin-v2-table-wrap"><table><thead><tr><th>{t.status}</th><th>{t.metric}</th><th>{t.currentValue}</th><th>{t.time}</th></tr></thead><tbody>
        {data?.alerts?.filter((alert) => alert.status !== "resolved").map((alert) => <tr key={alert.id}><td><span className={`admin-badge ${alert.severity}`}>{alert.severity}</span></td><td>{alert.title}</td><td>{alert.details?.value ?? "—"} {alert.details?.unit}</td><td>{date(alert.createdAt, locale)}</td></tr>)}
        {!data?.alerts?.some((alert) => alert.status !== "resolved") && <tr><td colSpan="4" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div></section>
  </div>;
}

function Pager({ data, onPage, locale }) {
  const t = copy[locale];
  if (!data?.pages || data.pages <= 1) return null;
  return <div className="admin-pager"><button disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>{t.previous}</button>
    <span>{t.page} {data.page} / {data.pages}</span><button disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>{t.next}</button></div>;
}

function UsersView({ data, locale, query, setQuery, status, setStatus, onSearch, onSelect, onPage }) {
  const t = copy[locale];
  return <section className="admin-v2-panel admin-table-panel">
    <div className="admin-v2-toolbar"><div className="admin-search"><MagnifyingGlass size={18} /><input placeholder={t.searchUser} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSearch()} /></div>
      <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t.all}</option><option value="active">{t.active}</option><option value="suspended">{t.suspended}</option></select>
      <button className="admin-primary" onClick={onSearch}>{t.search}</button></div>
    <div className="admin-v2-table-wrap"><table><thead><tr><th>{t.account}</th><th>{t.status}</th><th>{t.membershipPlan}</th><th>{t.credits}</th><th>{t.tasks}/{t.files}</th><th>{t.lastSeen}</th><th /></tr></thead>
      <tbody>{data?.users?.map((user) => <tr key={user.id}><td><div className="admin-user-cell"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td>
        <td><div className="admin-status-stack"><span className={`admin-badge ${user.status}`}>{user.status === "active" ? t.active : t.suspended}</span><small>{user.emailVerified ? t.verified : t.unverified}</small></div></td>
        <td><span className={`admin-badge ${user.membershipCode === "free" ? "pending" : "active"}`}>{user.membershipCode}</span></td>
        <td><strong>{number(user.credits, locale)}</strong></td><td>{user.tasks} / {user.files}</td><td>{date(user.lastSeenAt, locale)}</td>
        <td><button className="admin-link" onClick={() => onSelect(user.id)}>{t.details}</button></td></tr>)}
      {!data?.users?.length && <tr><td colSpan="7" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div>
    <Pager data={data} onPage={onPage} locale={locale} />
  </section>;
}

function CustomerDrawer({ detail, locale, onClose, onMutate }) {
  const t = copy[locale];
  const [tab, setTab] = useState("account");
  const [form, setForm] = useState({ reason: "", amount: "", reasonCode: "customer_support", note: "", supportNote: "", membershipPlanId: detail.membership?.planId || "plan_free", membershipExpiry: detail.membership?.currentPeriodEnd ? new Date(detail.membership.currentPeriodEnd).toISOString().slice(0, 10) : "", membershipReason: "" });
  const user = detail.user;
  const mutate = async (action, payload) => {
    if (!form.reason.trim() && ["status", "sessions", "message"].includes(action)) return onMutate(null, t.reasonRequired);
    await onMutate(action, payload);
  };
  return <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="admin-customer-drawer"><header><div className="admin-user-cell large"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><small>{t.customer360}</small><h2>{user.name}</h2><p>{user.email}</p></div></div>
      <button className="admin-icon" onClick={onClose} aria-label={t.close}><X size={20} /></button></header>
      <div className="admin-drawer-summary"><div><small>{t.balance}</small><strong>{number(detail.balance, locale)}</strong></div><div><small>{t.sessions}</small><strong>{detail.sessions.length}</strong></div><div><small>{t.tasks}</small><strong>{detail.tasks.length}</strong></div><div><small>{t.files}</small><strong>{detail.files.length}</strong></div></div>
      <nav className="admin-drawer-tabs">{["account", "security", "billing", "activity", "support"].map((key) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{t[key]}</button>)}</nav>
      <div className="admin-drawer-body">
        {tab === "account" && <div className="admin-detail-stack"><DetailRow label="User ID" value={user.id} /><DetailRow label={t.status} value={user.status === "active" ? t.active : t.suspended} /><DetailRow label={t.emailStatus} value={user.emailVerified ? t.verified : t.unverified} /><DetailRow label={t.registered} value={date(user.createdAt, locale)} />
          <label className="admin-field">{t.reason}<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
          <div className="admin-action-grid"><button className={user.status === "active" ? "danger" : ""} onClick={() => mutate("status", { status: user.status === "active" ? "suspended" : "active", reason: form.reason })}>{user.status === "active" ? t.suspend : t.restore}</button>
            <button onClick={() => mutate("sessions", { reason: form.reason })}>{t.revoke}</button>
            {!user.emailVerified && <button onClick={() => mutate("message", { kind: "verify", reason: form.reason })}>{t.resendVerify}</button>}
            <button onClick={() => mutate("message", { kind: "reset", reason: form.reason })}>{t.sendReset}</button></div>
          <div className="admin-adjust-card"><h3>{t.adjust}</h3><div className="admin-form-grid"><label>{t.amount}<input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>{t.reasonCode}<select value={form.reasonCode} onChange={(event) => setForm({ ...form, reasonCode: event.target.value })}><option value="customer_support">customer_support</option><option value="service_compensation">service_compensation</option><option value="fraud_reversal">fraud_reversal</option><option value="manual_correction">manual_correction</option></select></label><label className="wide">{t.note}<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label></div>
            <button className="admin-primary" onClick={() => onMutate("credits", { amount: Number(form.amount), reasonCode: form.reasonCode, note: form.note })}>{t.adjust}</button></div></div>}
        {tab === "security" && <div className="admin-list">{detail.sessions.map((item) => <ListRow key={item.id} title={item.userAgent || "Unknown device"} meta={`${date(item.lastSeenAt, locale)} · ${item.id.slice(0, 8)}`} />)}{detail.securityEvents.map((item, index) => <ListRow key={`${item.correlationId}-${index}`} title={item.action} meta={`${item.result} · ${date(item.createdAt, locale)}`} />)}</div>}
        {tab === "billing" && <div className="admin-detail-stack"><section className="admin-adjust-card admin-membership-card"><h3>{t.membershipPlan}</h3><div className="admin-membership-current"><div><small>{t.membershipPlan}</small><strong>{locale === "en" ? detail.membership.nameEn : detail.membership.nameZh}</strong></div><div><small>{t.fileAllowance}</small><strong>{detail.fileQuota.used} / {detail.fileQuota.limit}</strong></div><div><small>{t.membershipExpiry}</small><strong>{detail.membership.currentPeriodEnd ? date(detail.membership.currentPeriodEnd, locale) : t.permanentMembership}</strong></div></div><div className="admin-form-grid"><label>{t.membershipPlan}<select value={form.membershipPlanId} onChange={(event) => setForm({ ...form, membershipPlanId: event.target.value })}>{detail.membershipPlans.map((plan) => <option key={plan.planId} value={plan.planId}>{locale === "en" ? plan.nameEn : plan.nameZh} · {plan.fileLimit} {t.files}</option>)}</select></label><label>{t.membershipExpiry}<input type="date" value={form.membershipExpiry} onChange={(event) => setForm({ ...form, membershipExpiry: event.target.value })} /></label><label className="wide">{t.membershipReason}<input value={form.membershipReason} onChange={(event) => setForm({ ...form, membershipReason: event.target.value })} /></label></div><button className="admin-primary" disabled={!form.membershipReason.trim()} onClick={() => onMutate("membership", { planId: form.membershipPlanId, expiresAt: form.membershipExpiry ? new Date(`${form.membershipExpiry}T23:59:59`).getTime() : null, reason: form.membershipReason })}>{t.assignMembership}</button></section><div className="admin-list"><ListRow title={t.balance} value={number(detail.balance, locale)} />{detail.subscriptions.map((item) => <ListRow key={item.id} title={locale === "en" ? item.nameEn : item.nameZh} meta={`${item.provider} · ${item.status}`} />)}{detail.invoices.map((item) => <ListRow key={item.id} title={`${item.amountPaid / 100} ${item.currency}`} meta={`${item.provider} · ${item.status}`} />)}{detail.credits.map((item) => <ListRow key={item.id} title={locale === "en" ? item.descriptionEn : item.descriptionZh} meta={`${item.type} · ${date(item.createdAt, locale)}`} value={`${item.amount > 0 ? "+" : ""}${item.amount}`} />)}</div></div>}
        {tab === "activity" && <div className="admin-list">{detail.tasks.map((item) => <ListRow key={item.id} title={locale === "en" ? item.toolNameEn : item.toolNameZh} meta={`${item.status} · ${date(item.createdAt, locale)}`} value={`-${item.creditCost}`} />)}{detail.files.map((item) => <ListRow key={item.id} title={item.name} meta={`${item.mimeType} · ${date(item.createdAt, locale)}`} value={bytes(item.sizeBytes, locale)} />)}</div>}
        {tab === "support" && <div className="admin-detail-stack"><label className="admin-field">{t.supportNote}<textarea rows="4" value={form.supportNote} onChange={(event) => setForm({ ...form, supportNote: event.target.value })} /></label><button className="admin-primary" onClick={() => onMutate("note", { category: "general", body: form.supportNote })}>{t.addNote}</button><div className="admin-list">{detail.notes.map((item) => <ListRow key={item.id} title={item.category} meta={`${item.authorEmail || "system"} · ${date(item.createdAt, locale)}`} body={item.body} />)}</div></div>}
      </div>
    </aside>
  </div>;
}
function DetailRow({ label, value }) { return <div className="admin-detail-row"><small>{label}</small><strong>{value || "—"}</strong></div>; }
function ListRow({ title, meta, value, body }) { return <div className="admin-list-row"><div><strong>{title}</strong>{meta && <small>{meta}</small>}{body && <p>{body}</p>}</div>{value != null && <b>{value}</b>}</div>; }

function SupportCenterView({ data, detail, locale, status, onStatus, onSelect, onReply, onResolve, busy }) {
  const t = copy[locale];
  const [reply, setReply] = useState("");
  const [priority, setPriority] = useState("normal");
  const [publish, setPublish] = useState(true);
  const [knowledge, setKnowledge] = useState({ title: "", question: "", answer: "", keywords: "", locale });
  useEffect(() => {
    if (!detail) return;
    const latestUser = [...(detail.messages || [])].reverse().find((item) => item.senderType === "user")?.body || "";
    const latestAdmin = [...(detail.messages || [])].reverse().find((item) => item.senderType === "admin")?.body || "";
    setPriority(detail.priority || "normal");
    setKnowledge({ title: detail.subject || "", question: latestUser, answer: latestAdmin, keywords: "", locale });
    setReply("");
  }, [detail?.id, detail?.messages?.length, locale]);
  const submitReply = async () => {
    if (!reply.trim()) return;
    if (await onReply(detail.id, { body: reply, priority })) setReply("");
  };
  return <div className="admin-support-page">
    <section className="admin-v2-metrics admin-v2-metrics-three support-metrics">
      <Metric icon={ChatCircleDots} label={t.awaitingAgent} value={data?.counts?.awaiting_agent || 0} tone="warn" />
      <Metric icon={Clock} label={t.inProgress} value={data?.counts?.in_progress || 0} tone="blue" />
      <Metric icon={CheckCircle} label={t.resolvedSupport} value={data?.counts?.resolved || 0} tone="green" />
    </section>
    <section className="admin-support-layout">
      <article className="admin-v2-panel support-ticket-list"><header><div><small>CUSTOMER SUPPORT</small><h2>{t.supportQueue}</h2></div><select value={status} onChange={(event) => onStatus(event.target.value)}><option value="">{t.all}</option><option value="awaiting_agent">{t.awaitingAgent}</option><option value="in_progress">{t.inProgress}</option><option value="open">{locale === "en" ? "AI conversations" : "AI 咨询"}</option><option value="resolved">{t.resolvedSupport}</option></select></header><div>
        {data?.conversations?.map((ticket) => <button key={ticket.id} className={detail?.id === ticket.id ? "active" : ""} onClick={() => onSelect(ticket.id)}><span className={`support-ticket-avatar ${ticket.status}`}>{ticket.userName?.slice(0,1).toUpperCase()}</span><div><strong>{ticket.subject}</strong><small>{ticket.userName} · {ticket.userEmail}</small><p>{ticket.latestMessage}</p></div><aside><em className={`admin-badge ${ticket.status}`}>{ticket.status === "awaiting_agent" ? t.awaitingAgent : ticket.status === "in_progress" ? t.inProgress : ticket.status === "resolved" ? t.resolvedSupport : ticket.status}</em><small>{date(ticket.updatedAt, locale)}</small></aside></button>)}
        {!data?.conversations?.length && <div className="admin-empty">{t.noTickets}</div>}
      </div></article>
      <article className="admin-v2-panel support-ticket-detail">{detail ? <>
        <header><div><small>{detail.userEmail}</small><h2>{detail.subject}</h2><p>{detail.userName} · {detail.messageCount} messages</p></div><label>{t.priority}<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></header>
        <div className="admin-support-messages">{detail.messages?.map((item) => <div className={`admin-support-message ${item.senderType}`} key={item.id}><span>{item.senderType === "user" ? detail.userName?.slice(0,1).toUpperCase() : item.senderType === "admin" ? <UserCircle size={16} /> : <Robot size={16} />}</span><div><small>{item.senderType === "user" ? detail.userName : item.senderType === "admin" ? (locale === "en" ? "Administrator reply" : "管理员回复") : item.senderType === "system" ? "System" : "OneShow AI"} · {date(item.createdAt, locale)}</small><p>{item.body}</p>{item.sourceType?.includes("knowledge") && <em>{locale === "en" ? "Knowledge assisted" : "知识库辅助"}</em>}</div></div>)}</div>
        <div className="admin-support-reply"><textarea rows="4" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={t.replyUser} /><button disabled={busy || !reply.trim()} onClick={submitReply}><PaperPlaneTilt size={17} />{t.replyUser}</button></div>
        <div className="support-resolution-box"><label className="support-publish-toggle"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />{t.publishKnowledge}</label>{publish && <div className="support-knowledge-form"><label>{t.knowledgeTitle}<input value={knowledge.title} onChange={(event) => setKnowledge({ ...knowledge, title: event.target.value })} /></label><label>{t.knowledgeQuestion}<textarea rows="2" value={knowledge.question} onChange={(event) => setKnowledge({ ...knowledge, question: event.target.value })} /></label><label>{t.knowledgeAnswer}<textarea rows="3" value={knowledge.answer} onChange={(event) => setKnowledge({ ...knowledge, answer: event.target.value })} /></label><label>{t.knowledgeKeywords}<input value={knowledge.keywords} onChange={(event) => setKnowledge({ ...knowledge, keywords: event.target.value })} /></label></div>}<button className="admin-support-resolve" disabled={busy || (publish && (!knowledge.title.trim() || !knowledge.question.trim() || !knowledge.answer.trim()))} onClick={() => onResolve(detail.id, { publishKnowledge: publish, knowledge })}><CheckCircle size={17} />{t.resolveTicket}</button></div>
      </> : <div className="support-detail-empty"><ChatCircleDots size={42} weight="duotone" /><p>{t.selectTicket}</p></div>}</article>
      <aside className="admin-v2-panel support-knowledge-list"><header><div><small>VERIFIED ANSWERS</small><h2>{t.supportKnowledge}</h2></div><BookOpenText size={22} /></header><div>{data?.knowledge?.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{item.locale} · {date(item.updatedAt, locale)}</small><p>{item.answer}</p></article>)}</div></aside>
    </section>
  </div>;
}

function CommerceView({ data, locale, onApprove }) {
  const t = copy[locale];
  const [tab, setTab] = useState("approvals");
  const sections = { approvals: data?.approvals, subscriptions: data?.subscriptions, invoices: data?.invoices, orders: data?.orders, refunds: data?.refunds, disputes: data?.disputes, exceptions: data?.exceptions };
  return <div className="admin-page-stack"><div className="admin-provider-strip">{data?.providers?.map((provider) => <div key={provider.id}><span className={provider.enabled ? "ok" : provider.configured ? "warn" : "off"} /><strong>{provider.id}</strong><small>{provider.enabled ? "enabled" : provider.configured ? "configured" : "not configured"}</small></div>)}</div>
    <section className="admin-v2-panel admin-table-panel"><nav className="admin-section-tabs">{Object.keys(sections).map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{t[key]} <span>{sections[key]?.length || 0}</span></button>)}</nav>
      <div className="admin-v2-table-wrap"><table><thead><tr><th>ID / {t.account}</th><th>{t.status}</th><th>{t.provider}</th><th>{t.time}</th><th /></tr></thead><tbody>
        {(sections[tab] || []).map((item) => <tr key={item.id}><td><strong>{item.email || item.requesterEmail || item.target_id || item.id}</strong><small>{item.id}</small></td><td><span className={`admin-badge ${item.status}`}>{item.status}</span></td><td>{item.provider || item.action || "—"}</td><td>{date(item.createdAt || item.created_at, locale)}</td><td>{tab === "approvals" && item.status === "pending" && <button className="admin-link" onClick={() => onApprove(item.id)}>{t.approve}</button>}</td></tr>)}
        {!sections[tab]?.length && <tr><td colSpan="5" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div></section></div>;
}

function ToolsView({ data, locale, onLifecycle, onBranding, onResetBranding }) {
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [brandingTool, setBrandingTool] = useState(null);
  const [branding, setBranding] = useState({ icon: null, iconColor: "#2768EB", iconBackground: "#EDF4FF", reason: "" });
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const tools = data?.tools || [];
  const onlineCount = tools.filter((tool) => tool.active).length;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTools = tools.filter((tool) => {
    if (filter === "online" && !tool.active) return false;
    if (filter === "offline" && tool.active) return false;
    if (!normalizedQuery) return true;
    return [tool.slug, tool.nameZh, tool.nameEn, tool.category].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
  useEffect(() => () => { if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const openBranding = (tool) => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setBrandingTool(tool);
    setPreviewUrl(tool.iconUrl || "");
    setBranding({ icon: null, iconColor: tool.iconColor || "#2768EB", iconBackground: tool.iconBackground || "#EDF4FF", reason: "" });
  };
  const chooseIcon = (file) => {
    if (!file) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setBranding((current) => ({ ...current, icon: file }));
  };
  const saveBranding = async (event) => {
    event.preventDefault();
    if (!branding.reason.trim()) return;
    const form = new FormData();
    form.set("reason", branding.reason.trim());
    form.set("iconColor", branding.iconColor);
    form.set("iconBackground", branding.iconBackground);
    if (branding.icon) form.set("icon", branding.icon);
    setSaving(true);
    try { if (await onBranding(brandingTool.id, form)) setBrandingTool(null); }
    finally { setSaving(false); }
  };
  return <div className="admin-tool-publication-page">
    <section className="admin-tool-publication-head">
      <div><small>TOOL PUBLICATION</small><h2>{t.publicationTitle}</h2><p>{t.publicationHint}</p></div>
      <div className="admin-tool-publication-counts"><article><span className="online" /><div><strong>{onlineCount}</strong><small>{t.onlineTools}</small></div></article><article><span /><div><strong>{tools.length - onlineCount}</strong><small>{t.offlineTools}</small></div></article></div>
    </section>
    <section className="admin-tool-publication-toolbar">
      <label><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchTools} /></label>
      <nav><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>{t.all} <span>{tools.length}</span></button><button className={filter === "online" ? "active" : ""} onClick={() => setFilter("online")}>{t.onlineOnly} <span>{onlineCount}</span></button><button className={filter === "offline" ? "active" : ""} onClick={() => setFilter("offline")}>{t.offlineOnly} <span>{tools.length - onlineCount}</span></button></nav>
    </section>
    <div className="admin-tool-admin-grid">{visibleTools.map((tool) => <article className={`admin-tool-admin-card ${tool.active ? "is-online" : "is-offline"}`} key={tool.id}>
      <header><span className="admin-product-icon" style={{ color: tool.iconColor || "#2768EB", background: tool.iconBackground || "#EDF4FF" }}>{tool.iconUrl ? <img src={tool.iconUrl} alt="" /> : <Wrench size={22} />}</span><div><small>{tool.slug}</small><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3></div><i className={`admin-badge ${tool.active ? "published" : "retired"}`}><span />{tool.active ? t.online : t.offline}</i></header>
      <p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p><div className="admin-tool-meta"><div><small>{t.cost}</small><strong>{tool.creditCost}</strong></div><div><small>{t.runtime}</small><strong>{tool.runtimeStatus}</strong></div><div><small>Health</small><strong>{tool.healthStatus || "—"}</strong></div></div>
      <footer className="admin-tool-publication-action"><span>{tool.category}</span><div><button onClick={() => openBranding(tool)}>{t.configureBranding}</button><button className={tool.active ? "danger" : "primary"} onClick={() => onLifecycle(tool.id, tool.active ? "retired" : "published")}>{tool.active ? t.takeOffline : t.putOnline}</button></div></footer>
    </article>)}{!visibleTools.length && <div className="admin-empty admin-tool-publication-empty">{t.noData}</div>}</div>
    {brandingTool && <div className="admin-branding-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBrandingTool(null); }}><form className="admin-branding-dialog" onSubmit={saveBranding}>
      <header><div><small>PRODUCT IDENTITY</small><h2>{t.brandingTitle}</h2><p>{locale === "en" ? brandingTool.nameEn : brandingTool.nameZh}</p></div><button type="button" onClick={() => setBrandingTool(null)} aria-label={t.close}><X size={20} /></button></header>
      <div className="admin-branding-preview"><span style={{ color: branding.iconColor, background: branding.iconBackground }}>{previewUrl ? <img src={previewUrl} alt="" /> : <Wrench size={30} weight="duotone" />}</span><div><strong>{locale === "en" ? brandingTool.nameEn : brandingTool.nameZh}</strong><p>{t.brandingHint}</p></div></div>
      <label className="admin-branding-upload"><ImageSquare size={20} /><span><strong>{t.iconUpload}</strong><small>PNG / JPG / WebP · 2MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseIcon(event.target.files?.[0])} /></label>
      <div className="admin-branding-colors"><label>{t.iconColor}<span><input type="color" value={branding.iconColor} onChange={(event) => setBranding({ ...branding, iconColor: event.target.value.toUpperCase() })} /><code>{branding.iconColor}</code></span></label><label>{t.iconBackground}<span><input type="color" value={branding.iconBackground} onChange={(event) => setBranding({ ...branding, iconBackground: event.target.value.toUpperCase() })} /><code>{branding.iconBackground}</code></span></label></div>
      <label>{t.brandingReason}<input value={branding.reason} onChange={(event) => setBranding({ ...branding, reason: event.target.value })} required maxLength="500" /></label>
      <footer><button type="button" className="danger" disabled={saving || (!brandingTool.iconUrl && !brandingTool.iconColor)} onClick={async () => { if (!branding.reason.trim()) return; setSaving(true); try { if (await onResetBranding(brandingTool.id, branding.reason.trim())) setBrandingTool(null); } finally { setSaving(false); } }}>{t.resetBranding}</button><button className="admin-primary" disabled={saving || !branding.reason.trim()}>{saving ? <SpinnerGap className="spin" size={16} /> : <Check size={16} />}{t.saveBranding}</button></footer>
    </form></div>}
  </div>;
}

function OperationsView({ data, locale, onRetry }) {
  const t = copy[locale];
  const [tab, setTab] = useState("jobs");
  const sections = { jobs: data?.jobs, alerts: data?.alerts, exceptions: data?.reconciliation };
  return <div className="admin-page-stack">{data?.modelRuntime && <section className="admin-v2-panel"><header><div><small>MODEL RUNTIME</small><h2>{data.modelRuntime.alias}</h2></div><Pulse size={22} /></header><div className="admin-health-list"><Health label={locale === "en" ? "Queued jobs" : "排队任务"} value={data.modelRuntime.queuedJobs} ok={!data.modelRuntime.queuedJobs} /><Health label={locale === "en" ? "24h invocations" : "24 小时调用"} value={data.modelRuntime.invocations24h} ok /><Health label={locale === "en" ? "24h failures" : "24 小时失败"} value={data.modelRuntime.failures24h} ok={!data.modelRuntime.failures24h} /><Health label={locale === "en" ? "Average latency" : "平均延迟"} value={`${data.modelRuntime.averageLatencyMs} ms`} ok /></div></section>}<section className="admin-v2-panel admin-table-panel"><nav className="admin-section-tabs">{Object.keys(sections).map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{t[key]} <span>{sections[key]?.length || 0}</span></button>)}</nav>
    <div className="admin-v2-table-wrap"><table><thead><tr><th>{t.action}</th><th>{t.status}</th><th>{t.target}</th><th>Correlation ID</th><th>{t.time}</th><th /></tr></thead><tbody>
      {(sections[tab] || []).map((item) => <tr key={item.id}><td><strong>{item.kind || item.title}</strong><small>{item.errorCode || item.severity}</small></td><td><span className={`admin-badge ${item.status}`}>{item.status}</span></td><td>{item.targetType || item.target_type || "—"} / {item.targetId || item.target_id || "—"}</td><td><code>{item.correlationId || "—"}</code></td><td>{date(item.createdAt, locale)}</td><td>{tab === "jobs" && ["failed", "quarantined", "retrying"].includes(item.status) && <button className="admin-link" onClick={() => onRetry(item.id)}>{t.retry}</button>}</td></tr>)}
      {!sections[tab]?.length && <tr><td colSpan="6" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div></section></div>;
}

function PrivacyView({ data, locale }) {
  const t = copy[locale];
  return <div className="admin-v2-grid two">
    <SimplePanel title={t.deletions} icon={UserCircle} rows={data?.deletions?.map((item) => ({ title: item.email, meta: `${item.status} · ${date(item.executeAfter, locale)}`, value: item.activeHolds ? `${item.activeHolds} holds` : "" }))} empty={t.noData} />
    <SimplePanel title={t.exports} icon={File} rows={data?.exports?.map((item) => ({ title: item.email, meta: `${item.status} · ${date(item.createdAt, locale)}`, value: date(item.expiresAt, locale) }))} empty={t.noData} />
    <SimplePanel title={t.policies} icon={Receipt} rows={data?.policies?.map((item) => ({ title: `${item.kind} ${item.version}`, meta: `${item.locale} · ${date(item.effectiveAt, locale)}`, value: item.active ? t.active : "" }))} empty={t.noData} />
    <SimplePanel title={t.holds} icon={LockKey} rows={data?.holds?.map((item) => ({ title: item.email, meta: item.reason, value: item.status }))} empty={t.noData} />
  </div>;
}
function SimplePanel({ title, icon: Icon, rows = [], empty }) { return <article className="admin-v2-panel"><header><div><small>OPERATIONS</small><h2>{title}</h2></div><Icon size={22} /></header><div className="admin-list">{rows.map((row, index) => <ListRow key={`${row.title}-${index}`} {...row} />)}{!rows.length && <div className="admin-empty">{empty}</div>}</div></article>; }

function AuditView({ data, locale, onPage }) {
  const t = copy[locale];
  return <section className="admin-v2-panel admin-table-panel"><div className="admin-v2-table-wrap"><table><thead><tr><th>{t.action}</th><th>{t.actor}</th><th>{t.target}</th><th>{t.result}</th><th>Correlation ID</th><th>{t.time}</th></tr></thead><tbody>
    {data?.events?.map((event) => <tr key={event.id}><td><strong>{event.action}</strong><small>{event.permission}</small></td><td>{event.actorEmail || "system"}<small>{event.roles?.join(", ")}</small></td><td>{event.targetType || "—"} / {event.targetId || "—"}<small>{event.reason}</small></td><td><span className={`admin-badge ${event.result}`}>{event.result}</span></td><td><code>{event.correlationId}</code></td><td>{date(event.createdAt, locale)}</td></tr>)}
    {!data?.events?.length && <tr><td colSpan="6" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div><Pager data={data} onPage={onPage} locale={locale} /></section>;
}

function AdminsView({ data, locale, currentAdminId, onCreate, onRole, onStatus }) {
  const t = copy[locale];
  const [drafts, setDrafts] = useState({});
  const [create, setCreate] = useState({ email: "", role: "operations", reason: "" });
  const roleLabel = (role) => t[role === "operations" ? "operationsRole" : role === "support" ? "supportRole" : role === "finance" ? "financeRole" : role === "privacy" ? "privacyRole" : role] || role;
  const submitCreate = async () => {
    const success = await onCreate(create);
    if (success) setCreate({ email: "", role: "operations", reason: "" });
  };
  return <div className="admin-access-stack">
    <section className="admin-v2-panel admin-add-admin"><header><div><small>ACCESS CONTROL</small><h2>{t.addAdmin}</h2></div><UserCircle size={22} /></header>
      <div className="admin-add-admin-body"><p>{t.addAdminHint}</p><div className="admin-add-admin-form">
        <label>{t.adminEmail}<input type="email" value={create.email} placeholder="name@example.com" onChange={(event) => setCreate({ ...create, email: event.target.value })} /></label>
        <label>{t.selectRole}<select value={create.role} onChange={(event) => setCreate({ ...create, role: event.target.value })}>{data?.roles?.map((role) => <option key={role.code} value={role.code}>{roleLabel(role.code)}</option>)}</select></label>
        <label>{t.auditReason}<input value={create.reason} placeholder={t.reason} onChange={(event) => setCreate({ ...create, reason: event.target.value })} /></label>
        <button onClick={submitCreate}><UserCircle size={17} />{t.addAdmin}</button>
      </div></div>
    </section>
    <section className="admin-v2-panel admin-table-panel"><div className="admin-v2-table-wrap"><table><thead><tr><th>{t.account}</th><th>{t.roles}</th><th>{t.status}</th><th>{t.changeRole}</th><th>{t.action}</th></tr></thead><tbody>
      {data?.administrators?.map((admin) => {
        const draft = drafts[admin.userId] || { role: admin.roles[0], reason: "" };
        const ownAccount = admin.userId === currentAdminId;
        return <tr key={admin.userId}><td><strong>{admin.name}</strong><small>{admin.email}</small></td><td>{admin.roles.map(roleLabel).join(", ")}</td><td><span className={`admin-badge ${admin.status}`}>{admin.status === "active" ? t.active : t.suspended}</span></td><td><div className="admin-inline-form"><select disabled={ownAccount} value={draft.role} onChange={(event) => setDrafts({ ...drafts, [admin.userId]: { ...draft, role: event.target.value } })}>{data.roles.map((role) => <option key={role.code} value={role.code}>{roleLabel(role.code)}</option>)}</select><input disabled={ownAccount} placeholder={t.reason} value={draft.reason} onChange={(event) => setDrafts({ ...drafts, [admin.userId]: { ...draft, reason: event.target.value } })} /><button disabled={ownAccount} onClick={() => onRole(admin.userId, draft)}>{t.changeRole}</button></div></td><td><button className={`admin-access-status ${admin.status === "active" ? "danger" : ""}`} disabled={ownAccount} onClick={() => onStatus(admin.userId, { status: admin.status === "active" ? "suspended" : "active", reason: draft.reason })}>{admin.status === "active" ? t.disableAdmin : t.enableAdmin}</button></td></tr>;
      })}
      {!data?.administrators?.length && <tr><td colSpan="5" className="admin-empty">{t.noData}</td></tr>}
    </tbody></table></div></section>
  </div>;
}

export function AdminApp() {
  const [locale, setLocale] = useState(localStorage.getItem("ost_admin_locale") === "en" ? "en" : "zh-CN");
  const t = copy[locale];
  const [session, setSession] = useState();
  const [view, setView] = useState("command");
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [intelligenceDate, setIntelligenceDate] = useState("");
  const [intelligenceRunning, setIntelligenceRunning] = useState(false);
  const [intelligenceChatRunning, setIntelligenceChatRunning] = useState(false);
  const [supportStatus, setSupportStatus] = useState("");
  const [selectedSupport, setSelectedSupport] = useState(null);

  const loadSession = useCallback(async () => {
    setBusy(true);
    try {
      const result = await api("/api/admin/v1/session");
      setSession(result); setMessage("");
      return result;
    } catch (error) {
      setSession(null);
      setMessage(error.code === "ADMIN_FORBIDDEN" ? t.noPermission : error.code === "UNAUTHENTICATED" ? "" : t.loadFailed);
      return null;
    } finally { setBusy(false); }
  }, [t.loadFailed, t.noPermission]);

  useEffect(() => { loadSession(); }, [loadSession]);
  const endpoint = useMemo(() => ({
    command: "/api/admin/v1/command-center?days=30",
    users: `/api/admin/v1/users?q=${encodeURIComponent(query)}&status=${userStatus}&page=${page}&pageSize=25`,
    creditLedger: `/api/admin/v1/credits/ledger?page=${page}&pageSize=25`,
    finance: "/api/admin/v1/finance",
    analytics: "/api/admin/v1/analytics/tools?days=30",
    supportCenter: `/api/admin/v1/support${supportStatus ? `?status=${encodeURIComponent(supportStatus)}` : ""}`,
    intelligence: `/api/admin/v1/market-intelligence${intelligenceDate ? `?date=${encodeURIComponent(intelligenceDate)}` : ""}`,
    models: "/api/admin/v1/platform-models",
    seoSources: "/api/admin/v1/seo-provider",
    infrastructure: "/api/admin/v1/infrastructure/overview",
    commerce: "/api/admin/v1/commerce", tools: "/api/admin/v1/tools",
    operations: "/api/admin/v1/operations", privacy: "/api/admin/v1/privacy",
    audit: `/api/admin/v1/audit?page=${page}&pageSize=25`, admins: "/api/admin/v1/administrators",
  })[view], [view, query, userStatus, page, intelligenceDate, supportStatus]);

  const loadView = useCallback(async () => {
    if (!session || (session.mfa.enforced && !session.mfa.verified) || !endpoint) return;
    setBusy(true);
    try {
      const result = await api(endpoint);
      setData((current) => ({ ...current, [view]: result }));
      setMessage("");
    }
    catch (error) { setMessage(error.code || t.loadFailed); }
    finally { setBusy(false); }
  }, [endpoint, session, t.loadFailed, view]);
  useEffect(() => { loadView(); }, [loadView]);

  const showToast = (text = t.success) => { setToast(text); setTimeout(() => setToast(""), 2600); };
  const adminError = (code) => ({
    ADMIN_ACCOUNT_NOT_FOUND: t.adminAccountNotFound,
    ADMIN_EMAIL_NOT_VERIFIED: t.adminEmailNotVerified,
    ADMIN_ALREADY_EXISTS: t.adminAlreadyExists,
    ADMIN_ACCOUNT_INACTIVE: t.adminInactive,
    LAST_SUPER_ADMIN_REQUIRED: t.lastSuperAdmin,
    CANNOT_CHANGE_OWN_ADMIN_ROLE: t.ownAdminLocked,
    CANNOT_CHANGE_OWN_ADMIN_STATUS: t.ownAdminLocked,
  })[code] || code;
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setSession(null); setData({}); setSelectedUser(null);
  };
  const changeLocale = () => {
    const next = locale === "en" ? "zh-CN" : "en";
    localStorage.setItem("ost_admin_locale", next); setLocale(next);
  };
  const openCustomer = async (id) => {
    setBusy(true);
    try { setSelectedUser(await api(`/api/admin/v1/users/${id}`)); }
    catch (error) { setMessage(error.code); } finally { setBusy(false); }
  };
  const mutateCustomer = async (action, payload) => {
    if (!action) return setMessage(payload);
    const id = selectedUser.user.id;
    const routes = {
      status: [`/api/admin/v1/users/${id}/status`, "POST"],
      sessions: [`/api/admin/v1/users/${id}/sessions/revoke`, "POST"],
      message: [`/api/admin/v1/users/${id}/message`, "POST"],
      credits: [`/api/admin/v1/users/${id}/credits`, "POST"],
      note: [`/api/admin/v1/users/${id}/notes`, "POST"],
      membership: [`/api/admin/v1/users/${id}/membership`, "POST"],
    };
    try {
      const headers = action === "credits" ? { "idempotency-key": crypto.randomUUID() } : {};
      await api(routes[action][0], json(routes[action][1], payload, headers));
      await openCustomer(id); await loadView(); showToast();
    } catch (error) { setMessage(error.code); }
  };
  const approve = async (id) => { try { await api(`/api/admin/v1/approvals/${id}/approve`, { method: "POST" }); await loadView(); showToast(); } catch (error) { setMessage(error.code); } };
  const lifecycle = async (id, state) => { try { await api(`/api/admin/v1/tools/${id}/lifecycle`, json("POST", { state, reason: "admin_console" })); await loadView(); showToast(); } catch (error) { setMessage(error.code); } };
  const saveToolBranding = async (id, form) => {
    try { await api(`/api/admin/v1/tools/${id}/branding`, { method: "PUT", body: form }); await loadView(); showToast(t.brandingSaved); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const resetToolBranding = async (id, reason) => {
    try { await api(`/api/admin/v1/tools/${id}/branding`, json("DELETE", { reason })); await loadView(); showToast(t.brandingSaved); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const retry = async (id) => { try { await api(`/api/admin/v1/jobs/${id}/retry`, json("POST", { reason: "operator_retry" })); await loadView(); showToast(); } catch (error) { setMessage(error.code); } };
  const createAdmin = async (draft) => {
    if (!draft.email?.trim() || !draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/administrators", json("POST", draft)); await loadView(); showToast(t.adminAdded); return true; }
    catch (error) { setMessage(adminError(error.code)); return false; }
  };
  const changeRole = async (id, draft) => { if (!draft.reason?.trim()) return setMessage(t.reasonRequired); try { await api(`/api/admin/v1/administrators/${id}/role`, json("POST", draft)); await loadView(); showToast(); } catch (error) { setMessage(adminError(error.code)); } };
  const changeAdminStatus = async (id, draft) => { if (!draft.reason?.trim()) return setMessage(t.reasonRequired); try { await api(`/api/admin/v1/administrators/${id}/status`, json("POST", draft)); await loadView(); showToast(); } catch (error) { setMessage(adminError(error.code)); } };
  const runIntelligence = async () => {
    setIntelligenceRunning(true); setMessage("");
    try { await api("/api/admin/v1/market-intelligence/run", { method: "POST" }); setIntelligenceDate(""); await loadView(); showToast(); }
    catch (error) { setMessage(error.code || t.loadFailed); }
    finally { setIntelligenceRunning(false); }
  };
  const askIntelligence = async (reportId, question) => {
    setIntelligenceChatRunning(true); setMessage("");
    try {
      const result = await api("/api/admin/v1/market-intelligence/chat", json("POST", { reportId, question }));
      setData((current) => ({ ...current, intelligence: { ...current.intelligence, conversation: result.conversation } }));
      return true;
    } catch (error) { setMessage(error.code || t.loadFailed); return false; }
    finally { setIntelligenceChatRunning(false); }
  };
  const openSupportConversation = async (id) => {
    setBusy(true); setMessage("");
    try { setSelectedSupport((await api(`/api/admin/v1/support/${id}`)).conversation); }
    catch (error) { setMessage(error.code || t.loadFailed); }
    finally { setBusy(false); }
  };
  const replySupportConversation = async (id, payload) => {
    setBusy(true); setMessage("");
    try {
      const result = await api(`/api/admin/v1/support/${id}/reply`, json("POST", payload));
      setSelectedSupport(result.conversation); await loadView(); showToast(); return true;
    } catch (error) { setMessage(error.code || t.loadFailed); return false; }
    finally { setBusy(false); }
  };
  const resolveSupportTicket = async (id, payload) => {
    setBusy(true); setMessage("");
    try {
      const result = await api(`/api/admin/v1/support/${id}/resolve`, json("POST", payload));
      setSelectedSupport(result.conversation); await loadView(); showToast(); return true;
    } catch (error) { setMessage(error.code || t.loadFailed); return false; }
    finally { setBusy(false); }
  };
  const testPlatformModel = async (purpose, draft) => {
    try { return await api(`/api/admin/v1/platform-models/${purpose}/test`, json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const savePlatformModel = async (purpose, draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api(`/api/admin/v1/platform-models/${purpose}`, json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testMusicProvider = async (draft) => {
    try { return await api("/api/admin/v1/music-provider/test", json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveMusicProvider = async (draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/music-provider", json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testSingingProvider = async (draft) => {
    try { return await api("/api/admin/v1/singing-provider/test", json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveSingingProvider = async (draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/singing-provider", json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testImageProvider = async (draft) => {
    try { return await api("/api/admin/v1/image-provider/test", json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveImageProvider = async (draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/image-provider", json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testImageEditProvider = async (purpose, draft) => {
    try { return await api(`/api/admin/v1/image-edit-provider/${purpose}/test`, json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveImageEditProvider = async (purpose, draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api(`/api/admin/v1/image-edit-provider/${purpose}`, json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testModelStudioWorkspace = async (draft) => {
    try { return await api("/api/admin/v1/model-studio-workspace/test", json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveModelStudioWorkspace = async (draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/model-studio-workspace", json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testObjectStorage = async (draft) => {
    try { return await api("/api/admin/v1/object-storage/test", json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveObjectStorage = async (draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/object-storage", json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };
  const testSeoProvider = async (draft) => {
    try { return await api("/api/admin/v1/seo-provider/test", json("POST", draft)); }
    catch (error) { setMessage(error.code || t.loadFailed); return null; }
  };
  const saveSeoProvider = async (draft) => {
    if (!draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/seo-provider", json("PUT", draft)); await loadView(); showToast(); return true; }
    catch (error) { setMessage(error.code || t.loadFailed); return false; }
  };

  if (session === undefined) return <div className="admin-loading"><SpinnerGap className="spin" size={28} />{t.loading}</div>;
  if (!session) return <Login locale={locale} onAuthenticated={loadSession} message={message} setMessage={setMessage} />;
  if (session.mfa.enforced && !session.mfa.verified) return <MfaGate locale={locale} session={session} onReady={loadSession} onLogout={logout} />;

  const nav = [
    ["command", Gauge, "dashboard.read"], ["users", Users, "users.read"],
    ["creditLedger", Coins, "credits.read"], ["finance", Bank, "finance.read"],
    ["analytics", ChartLineUp, "analytics.read"], ["infrastructure", HardDrives, "infrastructure.read"],
    ["supportCenter", ChatCircleDots, "support.read"],
    ["intelligence", Binoculars, "intelligence.read"],
    ["models", Gear, "models.read"],
    ["seoSources", LinkSimple, "seo_sources.read"],
    ["operations", Pulse, "jobs.read"], ["tools", Storefront, "tools.read"], ["commerce", CreditCard, "billing.read"],
    ["privacy", IdentificationCard, "privacy.read"],
    ["audit", ListChecks, "audit.read"], ["admins", ShieldCheck, "admins.manage"],
  ].filter((item) => allowed(session, item[2]));
  const content = {
    command: <CommandCenter data={data.command} locale={locale} />,
    users: <UsersView data={data.users} locale={locale} query={query} setQuery={setQuery} status={userStatus} setStatus={setUserStatus} onSearch={() => { setPage(1); loadView(); }} onSelect={openCustomer} onPage={setPage} />,
    creditLedger: <CreditLedgerView data={data.creditLedger} locale={locale} onPage={setPage} />,
    finance: <FinanceView data={data.finance} locale={locale} />,
    analytics: <ToolAnalyticsView data={data.analytics} locale={locale} />,
    supportCenter: <SupportCenterView data={data.supportCenter} detail={selectedSupport} locale={locale} status={supportStatus} onStatus={(next) => { setSupportStatus(next); setSelectedSupport(null); }} onSelect={openSupportConversation} onReply={replySupportConversation} onResolve={resolveSupportTicket} busy={busy} />,
    intelligence: <MarketIntelligenceView data={data.intelligence} locale={locale} onRun={runIntelligence} onSelectDate={setIntelligenceDate} onAsk={askIntelligence} running={intelligenceRunning} chatRunning={intelligenceChatRunning} />,
    models: <PlatformModelsView data={data.models} locale={locale} canManage={allowed(session, "models.manage")} canManageStorage={allowed(session, "storage.manage")} onTest={testPlatformModel} onSave={savePlatformModel} onMusicTest={testMusicProvider} onMusicSave={saveMusicProvider} onSingingTest={testSingingProvider} onSingingSave={saveSingingProvider} onImageTest={testImageProvider} onImageSave={saveImageProvider} onImageEditTest={testImageEditProvider} onImageEditSave={saveImageEditProvider} onWorkspaceTest={testModelStudioWorkspace} onWorkspaceSave={saveModelStudioWorkspace} onStorageTest={testObjectStorage} onStorageSave={saveObjectStorage} />,
    seoSources: <SeoSourcesView data={data.seoSources} locale={locale} canManage={allowed(session, "seo_sources.manage")} onTest={testSeoProvider} onSave={saveSeoProvider} />,
    infrastructure: <InfrastructureView data={data.infrastructure} locale={locale} />,
    commerce: <CommerceView data={data.commerce} locale={locale} onApprove={approve} />,
    tools: <ToolsView data={data.tools} locale={locale} onLifecycle={lifecycle} onBranding={saveToolBranding} onResetBranding={resetToolBranding} />,
    operations: <OperationsView data={data.operations} locale={locale} onRetry={retry} />,
    privacy: <PrivacyView data={data.privacy} locale={locale} />,
    audit: <AuditView data={data.audit} locale={locale} onPage={setPage} />,
    admins: <AdminsView data={data.admins} locale={locale} currentAdminId={session.admin.id} onCreate={createAdmin} onRole={changeRole} onStatus={changeAdminStatus} />,
  }[view];

  return <div className="admin-v2-shell"><aside className="admin-v2-sidebar">
    <div className="admin-v2-brand"><span><ShieldCheck size={25} weight="fill" /></span><div><strong>OneShowTools</strong><small>COMMERCIAL ADMIN</small></div></div>
    <nav>{nav.map(([key, Icon]) => <button key={key} className={view === key ? "active" : ""} onClick={() => { setView(key); setPage(1); }}><Icon size={19} weight={view === key ? "fill" : "regular"} /><span>{t[key]}</span></button>)}</nav>
    <div className="admin-v2-identity"><span>{session.admin.name.slice(0, 1).toUpperCase()}</span><div><strong>{session.admin.name}</strong><small>{session.roles.join(" · ")}</small></div></div>
  </aside><main className="admin-v2-main"><header className="admin-v2-header"><div><small>OneShowTools / {t.console}</small><h1>{t[view]}</h1></div><div className="admin-v2-header-actions">
    <button onClick={changeLocale}><Translate size={17} />{locale === "en" ? "中文" : "EN"}</button>
    <button onClick={loadView} disabled={busy}><ArrowClockwise className={busy ? "spin" : ""} size={17} />{t.refresh}</button>
    <button onClick={logout}><SignOut size={17} />{t.logout}</button></div></header>
    {message && <div className="admin-v2-message"><Warning size={18} />{message}<button onClick={() => setMessage("")}><X size={16} /></button></div>}
    {busy && !data[view] ? <div className="admin-page-loading"><SpinnerGap className="spin" size={26} />{t.loading}</div> : content}
  </main>{selectedUser && <CustomerDrawer detail={selectedUser} locale={locale} onClose={() => setSelectedUser(null)} onMutate={mutateCustomer} />}
    {toast && <div className="admin-toast"><CheckCircle size={19} />{toast}</div>}
  </div>;
}
