import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise, ArrowRight, Check, CheckCircle, Clock, CloudArrowUp,
  Coins, CreditCard, Database, File, FilePdf, FolderOpen, GridFour,
  House, ImageSquare, ListChecks, LockKey, MagicWand, MagnifyingGlass, Microphone,
  ArrowLeft, Copy, DownloadSimple, Play, RocketLaunch, SignOut, Sparkle, SpinnerGap,
  SquaresFour, StopCircle, Translate, Trash, User, UserCircle, Warning, Wrench, X,
  GearSix, Plus, PlugsConnected, ShieldCheck, PenNib, ChartLineUp, Megaphone, Code,
  Lightbulb, Briefcase, ShareNetwork, ChartBar, Binoculars, VideoCamera, Robot,
  NotePencil, Article, ArrowsClockwise, TrendUp, MegaphoneSimple, Palette, TextAa,
  PaperPlaneRight, CheckSquare, FileText,
} from "@phosphor-icons/react";
import { SeoAgentWorkspace } from "./SeoAgentWorkspace.jsx";

const iconMap = {
  MagicWand, Sparkle, FilePdf, ImageSquare, Microphone, NotePencil, ChartLineUp, Robot,
  MagnifyingGlass, Binoculars, ShareNetwork, FileText, Article, PaperPlaneRight,
  Database, TrendUp, ChartBar, ArrowsClockwise,
};
const writingIconMap = { Article, ArrowsClockwise, TrendUp, MegaphoneSimple, ShareNetwork, Briefcase, Palette };
const seoIconMap = { MagnifyingGlass, Article, Pulse: ChartLineUp, TrendUp, Link: ShareNetwork, Binoculars, FileText };
const seoSpecialistFor = (catalog, slug) => catalog?.specialists?.find((item) => item.slug === slug) || null;
const seoCatalogForTool = (catalog, tool) => {
  if (!catalog || tool?.slug === "seo-workbench") return catalog;
  const specialist = seoSpecialistFor(catalog, tool?.slug);
  if (!specialist) return null;
  const allowed = new Set(specialist.templateIds);
  return {
    ...catalog,
    specialist,
    modules: catalog.modules
      .map((module) => ({ ...module, templates: module.templates.filter((template) => allowed.has(template.id)) }))
      .filter((module) => module.templates.length),
  };
};
const marketplaceCategories = [
  { id: "all", icon: SquaresFour, accepts: [] },
  { id: "writing", icon: PenNib, accepts: ["writing"] },
  { id: "seo", icon: ChartLineUp, accepts: ["seo"] },
  { id: "marketing", icon: Megaphone, accepts: ["marketing"] },
  { id: "developer", icon: Code, accepts: ["developer"] },
  { id: "startup", icon: Lightbulb, accepts: ["startup"] },
  { id: "productivity", icon: Briefcase, accepts: ["document", "productivity"] },
  { id: "social", icon: ShareNetwork, accepts: ["social"] },
  { id: "data", icon: ChartBar, accepts: ["data"] },
  { id: "searchCategory", icon: Binoculars, accepts: ["search"] },
  { id: "image", icon: ImageSquare, accepts: ["image"] },
  { id: "video", icon: VideoCamera, accepts: ["video"] },
  { id: "audio", icon: Microphone, accepts: ["audio"] },
  { id: "agent", icon: Robot, accepts: ["agent"] },
];

const dictionary = {
  "zh-CN": {
    nav: { dashboard: "仪表盘", marketplace: "工具市场", runtime: "AI Runtime", credits: "积分", billing: "计费", tasks: "任务中心", files: "文件中心", account: "用户系统" },
    search: "搜索工具或输入你想完成的任务", searchAction: "搜索", popularTools: "常用工具", today: "今天想完成什么？", todaySub: "搜索你需要的能力，快速找到合适的 AI 工具。",
    login: "登录", signup: "注册", logout: "退出登录", language: "EN", overview: "平台概览", recentTasks: "最近任务", openMarketplace: "打开工具市场",
    creditsBalance: "可用积分", taskCount: "任务总数", fileCount: "文件数量", completed: "已完成", noTasks: "还没有任务", noTasksHint: "从工具市场选择一个工具，创建你的第一个任务。",
    marketplace: "工具市场", marketplaceSub: "按场景发现工具，用一个账户完成从创作到交付的工作。", all: "全部工具", image: "图片工具", document: "文档工具", audio: "音频工具", writing: "写作工具",
    seo: "SEO 工具", marketing: "营销工具", developer: "开发工具", startup: "创业工具", productivity: "办公工具", social: "社媒工具", data: "数据工具", searchCategory: "AI 搜索", video: "视频工具", agent: "AI Agent",
    categoryDirectory: "工具分类", availableTools: "个可用工具", marketplaceResults: "工具目录", toolsFound: "个结果", comingSoon: "该分类的工具正在接入", comingSoonHint: "你可以先查看其他分类，或搜索已经上线的能力。",
    ready: "可运行", config: "待配置", creditsUnit: "积分 / 次", run: "打开工具", runTitle: "创建 AI 任务", inputLabel: "任务内容", inputPlaceholder: "输入需要处理的文本或任务要求…",
    attach: "关联文件", createTask: "创建任务", taskCreated: "任务已创建，可在任务中心查看状态。", runtime: "AI Runtime", runtimeSub: "管理平台托管模型、个人模型连接与工具运行方式。",
    provider: "运行提供商", model: "模型", status: "状态", configured: "已配置", notConfigured: "未配置", runtimeNote: "未配置的运行服务不会伪造结果；任务会保留真实状态并自动退回积分。",
    credits: "Credits", creditsSub: "每一笔获取与消耗都有可追踪的真实账本记录。", ledger: "积分流水", amount: "变动", balance: "余额", description: "说明", time: "时间",
    billing: "Billing", billingSub: "管理订阅方案、付款能力与当前订阅状态。", currentPlan: "当前方案", free: "免费版", monthly: "每月", subscribe: "订阅专业版",
    billingUnavailable: "Stripe 尚未配置，当前不会发起真实扣款。", billingReady: "Stripe 已配置，可以创建真实结账会话。",
    tasks: "Task Center", tasksSub: "查看所有真实任务的状态、输入、输出和积分消耗。", retry: "刷新状态", cancel: "取消任务", taskOutput: "任务结果",
    files: "File Center", filesSub: "上传、下载和管理 AI 任务使用的真实文件。", upload: "上传文件", uploadHint: "单个文件最大 25MB", fileName: "文件名", size: "大小", download: "下载", delete: "删除", emptyFiles: "还没有上传文件",
    account: "用户系统", accountSub: "管理你的 OneShowTools Platform 账户与语言偏好。", emailStatus: "邮箱状态", pendingVerify: "待验证", verified: "已验证", memberSince: "注册时间",
    system: "平台状态", database: "SQLite 数据库", online: "运行正常", signInTitle: "登录 OneShowTools", signUpTitle: "创建 OneShowTools 账户", authSub: "一个账户，统一使用所有 AI 工具。",
    name: "姓名", email: "邮箱", password: "密码", passwordHint: "至少 10 位", noAccount: "还没有账户？", hasAccount: "已有账户？",
    invalid: "请检查输入信息后重试。", welcome: "登录后使用完整平台", welcomeSub: "注册即可获得真实记录的 200 欢迎积分。",
    recentEmpty: "登录后，这里会显示你的真实任务和账户状态。", signInAction: "登录或注册", planPro: "专业版", planDesc: "适合持续使用多个 AI 工具的个人与团队。",
    error: "操作失败，请稍后重试。", insufficient: "积分不足，请先充值或订阅。", loading: "正在加载真实数据…", inputRequired: "请输入任务内容，或选择一个文件。", noResults: "没有找到匹配的工具",
    backToMarket: "返回工具市场", toolWorkspace: "工具工作区", chooseFile: "选择文件", selectedFile: "已选择", startProcessing: "开始处理", processing: "正在处理",
    result: "处理结果", downloadResult: "下载结果", copyResult: "复制结果", copied: "已复制", imageTolerance: "背景容差", imageQuality: "压缩质量",
    textInput: "输入原始文案", pdfInput: "上传 PDF 文件", imageInput: "上传图片", speechInput: "实时语音识别", startSpeech: "开始识别", stopSpeech: "停止识别",
    browserUnsupported: "当前浏览器不支持实时语音识别。", loginToUse: "登录后即可运行此工具并保存任务记录。", localMode: "本地处理", aiMode: "AI 增强",
    registrationUnavailable: "邮箱注册尚未开放，请稍后再试。", verificationPending: "验证邮件已发送", verificationPendingBody: "验证邮箱后即可登录并领取欢迎积分。", resendVerification: "重新发送验证邮件",
    forgotPassword: "忘记密码？", recoveryTitle: "找回密码", recoveryBody: "如果该邮箱已注册，你将收到重置邮件。", sendRecovery: "发送重置邮件", resetTitle: "设置新密码", newPassword: "新密码", resetSuccess: "密码已更新，请重新登录。",
    accountProfile: "账户资料", saveProfile: "保存资料", accountSecurity: "账户安全", currentPassword: "当前密码", changePassword: "修改密码", newEmail: "新邮箱", changeEmail: "验证新邮箱",
    activeSessions: "登录设备", revokeOthers: "退出其他设备", privacyControls: "隐私与数据", exportData: "导出账户数据", deleteAccount: "删除账户", deletionUnavailable: "账户删除需完成政策配置后开放。",
    billingPortal: "管理付款与发票", invoices: "发票记录", noInvoices: "暂无发票记录", pendingConfirmation: "付款完成后需要等待安全回调确认。",
    managedModel: "平台托管模型", personalModels: "我的模型连接", addModel: "添加模型连接", connectionName: "连接名称", providerTemplate: "接口协议", baseUrl: "API 地址（Base URL）", baseUrlPlaceholder: "例如：https://api.deepseek.com", apiKey: "API Key", saveConnection: "安全保存",
    keyPrivacy: "API Key 会加密保存，提交后仅显示末四位，平台和管理员都无法再次查看明文。", noConnections: "尚未添加个人模型连接", testConnection: "测试", setDefault: "设为默认", disable: "停用", enable: "启用", rotateKey: "更换 Key", deleteConnection: "删除",
    selectModel: "运行模型", useManaged: "OneShowModel（平台托管）", connectionHealthy: "连接可用", testBeforeSave: "测试连接", testingConnection: "正在测试", testPassed: "连接测试成功", testFailed: "连接测试失败", testRequired: "请先测试连接，成功后再保存。", modelRouteSaved: "工具模型配置已保存", localTool: "本地工具，无需配置模型", toolSettings: "工具设置", toolSettingsHint: "选择这个工具运行时使用的平台模型或个人模型连接。", saveSettings: "保存设置", currentModel: "当前模型",
    runtimeReady: "模型服务运行正常", managedDescription: "无需配置 API Key，登录后即可在支持的工具中使用。", connectionCount: "个人连接", enabledTools: "可用工具", addFirstConnection: "添加第一个连接", connectionsHint: "接入你自己的模型账户，并自由设置工具的运行来源。", toolRouting: "工具运行方式", toolRoutingHint: "每个工具都明确显示当前处理方式。", close: "关闭",
  },
  en: {
    nav: { dashboard: "Dashboard", marketplace: "Tool Marketplace", runtime: "AI Runtime", credits: "Credits", billing: "Billing", tasks: "Task Center", files: "File Center", account: "Account" },
    search: "Search tools or describe what you want to do", searchAction: "Search", popularTools: "Popular tools", today: "What would you like to accomplish?", todaySub: "Search by capability and quickly find the right AI tool.",
    login: "Sign in", signup: "Sign up", logout: "Sign out", language: "中文", overview: "Platform overview", recentTasks: "Recent tasks", openMarketplace: "Open marketplace",
    creditsBalance: "Available credits", taskCount: "Total tasks", fileCount: "Files", completed: "Completed", noTasks: "No tasks yet", noTasksHint: "Choose a tool in the marketplace to create your first task.",
    marketplace: "Tool Marketplace", marketplaceSub: "Discover tools by workflow and get work done with one account.", all: "All tools", image: "Image", document: "Documents", audio: "Audio", writing: "Writing",
    seo: "SEO", marketing: "Marketing", developer: "Developer", startup: "Startup", productivity: "Productivity", social: "Social", data: "Data", searchCategory: "AI Search", video: "Video", agent: "AI Agent",
    categoryDirectory: "Categories", availableTools: "tools available", marketplaceResults: "Tool directory", toolsFound: "results", comingSoon: "Tools in this category are on the way", comingSoonHint: "Browse another category or search the capabilities already available.",
    ready: "Ready", config: "Setup required", creditsUnit: "credits / run", run: "Open tool", runTitle: "Create AI task", inputLabel: "Task content", inputPlaceholder: "Enter the text or instructions to process…",
    attach: "Attach files", createTask: "Create task", taskCreated: "Task created. Track it in Task Center.", runtime: "AI Runtime", runtimeSub: "Manage the hosted model, personal connections, and tool routing.",
    provider: "Provider", model: "Model", status: "Status", configured: "Configured", notConfigured: "Not configured", runtimeNote: "Unconfigured runtimes never fabricate results. Tasks retain their real state and credits are refunded.",
    credits: "Credits", creditsSub: "Every grant and charge is recorded in a traceable ledger.", ledger: "Credit ledger", amount: "Change", balance: "Balance", description: "Description", time: "Time",
    billing: "Billing", billingSub: "Manage plans, payment capability, and subscription status.", currentPlan: "Current plan", free: "Free", monthly: "month", subscribe: "Subscribe to Pro",
    billingUnavailable: "Stripe is not configured, so no real charge can be created.", billingReady: "Stripe is configured and can create a real checkout session.",
    tasks: "Task Center", tasksSub: "Review real task status, input, output, and credit usage.", retry: "Refresh status", cancel: "Cancel task", taskOutput: "Task output",
    files: "File Center", filesSub: "Upload, download, and manage real files used by AI tasks.", upload: "Upload file", uploadHint: "25MB maximum per file", fileName: "File name", size: "Size", download: "Download", delete: "Delete", emptyFiles: "No files uploaded yet",
    account: "User system", accountSub: "Manage your OneShowTools Platform account and language.", emailStatus: "Email status", pendingVerify: "Pending verification", verified: "Verified", memberSince: "Member since",
    system: "Platform status", database: "SQLite database", online: "Operational", signInTitle: "Sign in to OneShowTools", signUpTitle: "Create your OneShowTools account", authSub: "One account for every AI tool.",
    name: "Name", email: "Email", password: "Password", passwordHint: "10 characters minimum", noAccount: "New to OneShowTools?", hasAccount: "Already have an account?",
    invalid: "Check your details and try again.", welcome: "Sign in for the complete platform", welcomeSub: "New accounts receive 200 credits recorded in the real ledger.",
    recentEmpty: "Your real tasks and account state will appear here after sign-in.", signInAction: "Sign in or sign up", planPro: "Pro", planDesc: "For individuals and teams using multiple AI tools regularly.",
    error: "Something went wrong. Please try again.", insufficient: "Not enough credits. Top up or subscribe first.", loading: "Loading live data…", inputRequired: "Enter task content or select a file.", noResults: "No matching tools found",
    backToMarket: "Back to marketplace", toolWorkspace: "Tool workspace", chooseFile: "Choose file", selectedFile: "Selected", startProcessing: "Start processing", processing: "Processing",
    result: "Result", downloadResult: "Download result", copyResult: "Copy result", copied: "Copied", imageTolerance: "Background tolerance", imageQuality: "Compression quality",
    textInput: "Enter original copy", pdfInput: "Upload PDF", imageInput: "Upload image", speechInput: "Live speech recognition", startSpeech: "Start recognition", stopSpeech: "Stop recognition",
    browserUnsupported: "Live speech recognition is not supported in this browser.", loginToUse: "Sign in to run this tool and save its task record.", localMode: "Local processing", aiMode: "AI enhanced",
    registrationUnavailable: "Email registration is not open yet.", verificationPending: "Verification email sent", verificationPendingBody: "Verify your email before signing in and receiving welcome credits.", resendVerification: "Resend verification",
    forgotPassword: "Forgot password?", recoveryTitle: "Recover your account", recoveryBody: "If the email is registered, a reset message is on the way.", sendRecovery: "Send reset email", resetTitle: "Choose a new password", newPassword: "New password", resetSuccess: "Password updated. Sign in again.",
    accountProfile: "Profile", saveProfile: "Save profile", accountSecurity: "Account security", currentPassword: "Current password", changePassword: "Change password", newEmail: "New email", changeEmail: "Verify new email",
    activeSessions: "Signed-in devices", revokeOthers: "Sign out other devices", privacyControls: "Privacy and data", exportData: "Export account data", deleteAccount: "Delete account", deletionUnavailable: "Account deletion opens after the retention policy is configured.",
    billingPortal: "Manage payments and invoices", invoices: "Invoices", noInvoices: "No invoices yet", pendingConfirmation: "Payment access updates only after secure provider confirmation.",
    managedModel: "Managed model", personalModels: "My model connections", addModel: "Add model connection", connectionName: "Connection name", providerTemplate: "API protocol", baseUrl: "API Base URL", baseUrlPlaceholder: "For example: https://api.deepseek.com", apiKey: "API Key", saveConnection: "Save securely",
    keyPrivacy: "API keys are encrypted and cannot be displayed again. Only the last four characters remain visible.", noConnections: "No personal model connections yet", testConnection: "Test", setDefault: "Set default", disable: "Disable", enable: "Enable", rotateKey: "Rotate key", deleteConnection: "Delete",
    selectModel: "Runtime model", useManaged: "OneShowModel (managed)", connectionHealthy: "Connection ready", testBeforeSave: "Test connection", testingConnection: "Testing", testPassed: "Connection test passed", testFailed: "Connection test failed", testRequired: "Test the connection successfully before saving.", modelRouteSaved: "Tool model setting saved", localTool: "Local tool · no model setup needed", toolSettings: "Tool settings", toolSettingsHint: "Choose the managed model or a personal connection for this tool.", saveSettings: "Save settings", currentModel: "Current model",
    runtimeReady: "Model service operational", managedDescription: "No API key setup required. Use it immediately in supported tools.", connectionCount: "Personal connections", enabledTools: "Available tools", addFirstConnection: "Add your first connection", connectionsHint: "Connect your own model account and choose how supported tools run.", toolRouting: "Tool routing", toolRoutingHint: "See the processing route for every tool at a glance.", close: "Close",
  },
};

const api = async (path, options = {}) => {
  const response = await fetch(path, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.code || "REQUEST_FAILED");
    error.status = response.status;
    throw error;
  }
  return data;
};
const jsonOptions = (method, data) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
const formatDate = (value, locale) => value ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";
const formatBytes = (bytes) => bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const statusLabel = (status, locale) => ({
  queued: locale === "en" ? "Queued" : "排队中", running: locale === "en" ? "Running" : "运行中",
  completed: locale === "en" ? "Completed" : "已完成", failed: locale === "en" ? "Failed" : "失败",
  waiting_for_runtime: locale === "en" ? "Runtime required" : "等待运行服务", cancelled: locale === "en" ? "Cancelled" : "已取消",
})[status] || status;
const modelTestLabel = (status, locale) => ({
  healthy: locale === "en" ? "Connection ready" : "连接正常",
  model_auth_failed: locale === "en" ? "Authentication failed" : "密钥认证失败",
  model_rate_limited: locale === "en" ? "Rate limited" : "调用频率受限",
  model_timeout: locale === "en" ? "Timed out" : "连接超时",
  model_or_endpoint_invalid: locale === "en" ? "Model name or endpoint is invalid" : "模型名称或接口地址不正确",
  model_quota_exceeded: locale === "en" ? "Insufficient provider balance or quota" : "模型账户余额或额度不足",
  model_endpoint_blocked: locale === "en" ? "Endpoint blocked by security policy" : "接口地址未通过安全校验",
  invalid_model_endpoint: locale === "en" ? "Enter a valid HTTPS API base URL" : "请输入有效的 HTTPS API 地址",
  unavailable: locale === "en" ? "Model unavailable" : "模型暂不可用",
})[status] || (locale === "en" ? "Not tested" : "尚未测试");

function Brand() {
  return <div className="brand-lockup"><span className="brand-mark"><GridFour weight="fill" size={18} /></span><span><strong>OneShowTools</strong><small>Platform</small></span></div>;
}

function StatusPill({ status, locale }) {
  return <span className={`status-pill ${status}`}>{["completed", "ready"].includes(status) ? <CheckCircle size={14} weight="fill" /> : ["running", "queued"].includes(status) ? <SpinnerGap className="spin" size={14} /> : <Clock size={14} />}{status === "ready" ? dictionary[locale].ready : status === "configuration_required" ? dictionary[locale].config : statusLabel(status, locale)}</span>;
}

function SectionTitle({ title, action }) {
  return <div className="section-title"><h2>{title}</h2>{action}</div>;
}
function PageHeading({ title, subtitle, action }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>;
}
function Loading({ locale }) {
  return <div className="loading-state"><SpinnerGap className="spin" size={24} />{dictionary[locale].loading}</div>;
}
function EmptyState({ icon: Icon = ListChecks, title, body, action }) {
  return <div className="empty-state"><span><Icon size={28} /></span><h3>{title}</h3>{body && <p>{body}</p>}{action}</div>;
}

function AuthDialog({ locale, registrationEnabled, onClose, onAuthenticated }) {
  const t = dictionary[locale];
  const resetToken = new URLSearchParams(location.search).get("resetToken");
  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        await api("/api/auth/register", jsonOptions("POST", { ...form, locale }));
        setMode("pending");
      } else if (mode === "forgot") {
        await api("/api/auth/forgot-password", jsonOptions("POST", { email: form.email }));
        setMessage(t.recoveryBody);
      } else if (mode === "reset") {
        await api("/api/auth/reset-password", jsonOptions("POST", { token: resetToken, password: form.password }));
        history.replaceState({}, "", location.pathname);
        setMode("login");
        setMessage(t.resetSuccess);
      } else {
        const result = await api("/api/auth/login", jsonOptions("POST", { ...form, locale }));
        onAuthenticated(result.user);
        onClose();
      }
    } catch (error) {
      setMessage(error.message === "EMAIL_UNVERIFIED" ? t.verificationPendingBody : t.invalid);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true);
    await api("/api/auth/resend-verification", jsonOptions("POST", { email: form.email })).catch(() => {});
    setMessage(t.verificationPendingBody);
    setBusy(false);
  };
  const title = mode === "signup" ? t.signUpTitle : mode === "forgot" ? t.recoveryTitle : mode === "reset" ? t.resetTitle : mode === "pending" ? t.verificationPending : t.signInTitle;
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal" role="dialog" aria-modal="true">
    <button className="icon-button modal-close" onClick={onClose}><X size={20} /></button><Brand />
    <h2>{title}</h2><p className="modal-subtitle">{mode === "pending" ? t.verificationPendingBody : mode === "forgot" ? t.recoveryBody : t.authSub}</p>
    {mode === "pending" ? <div className="auth-form"><button className="secondary-button full" disabled={busy || !form.email} onClick={resend}>{t.resendVerification}</button><button className="primary-button full" onClick={() => setMode("login")}>{t.login}</button>{message && <p className="form-note">{message}</p>}</div> : <form onSubmit={submit} className="auth-form">{mode === "signup" && <label>{t.name}<input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
      {mode !== "reset" && <label>{t.email}<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>}
      {!["forgot"].includes(mode) && <label>{mode === "reset" ? t.newPassword : t.password}<input type="password" required minLength={10} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>{t.passwordHint}</small></label>}
      {message && <p className="form-note" role="status"><Warning size={17} />{message}</p>}<button className="primary-button full" disabled={busy || (mode === "signup" && !registrationEnabled)}>{busy ? <SpinnerGap className="spin" size={20} /> : mode === "signup" ? t.signup : mode === "forgot" ? t.sendRecovery : mode === "reset" ? t.changePassword : t.login}</button>
      {mode === "login" && <button className="text-button" type="button" onClick={() => { setMode("forgot"); setMessage(""); }}>{t.forgotPassword}</button>}
      {mode === "signup" && !registrationEnabled && <p className="config-caption">{t.registrationUnavailable}</p>}
    </form>}
    {["login", "signup"].includes(mode) && <p className="auth-switch">{mode === "signup" ? t.hasAccount : t.noAccount}{(registrationEnabled || mode === "signup") && <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? t.login : t.signup}</button>}</p>}
    {mode === "forgot" && <p className="auth-switch"><button onClick={() => { setMode("login"); setMessage(""); }}>{t.login}</button></p>}
  </section></div>;
}

function RunToolDialog({ tool, files, locale, onClose, onCreated }) {
  const t = dictionary[locale];
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const Icon = iconMap[tool.icon] || Wrench;
  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() && !selectedFiles.length) return setMessage(t.inputRequired);
    setBusy(true);
    try {
      await api("/api/tasks", jsonOptions("POST", { toolId: tool.id, text, fileIds: selectedFiles, locale }));
      onCreated();
      onClose();
    } catch (error) {
      setMessage(error.status === 402 ? t.insufficient : t.error);
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="run-modal" role="dialog" aria-modal="true">
    <button className="icon-button modal-close" onClick={onClose}><X size={20} /></button><div className="tool-modal-heading"><span className="tool-icon"><Icon size={25} /></span><div><small>{t.runTitle}</small><h2>{locale === "en" ? tool.nameEn : tool.nameZh}</h2></div></div>
    <form onSubmit={submit}><label className="field-label">{t.inputLabel}<textarea rows={7} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} /></label>
      {!!files.length && <fieldset className="file-picker"><legend>{t.attach}</legend>{files.map((file) => <label key={file.id}><input type="checkbox" checked={selectedFiles.includes(file.id)} onChange={(event) => setSelectedFiles(event.target.checked ? [...selectedFiles, file.id] : selectedFiles.filter((id) => id !== file.id))} /><File size={17} />{file.name}</label>)}</fieldset>}
      {message && <p className="form-error"><Warning size={17} />{message}</p>}<div className="modal-actions"><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span><button className="primary-button" disabled={busy}>{busy ? <SpinnerGap className="spin" size={19} /> : <><Play size={18} weight="fill" />{t.createTask}</>}</button></div>
    </form>
  </section></div>;
}

function AiWriterPage({ tool, catalog, locale, authenticated, runtime, onBack, onAuth, onCompleted, onModelChange }) {
  const zh = locale !== "en";
  const labels = zh ? {
    back: "返回工具市场", eyebrow: "AI WRITING STUDIO", title: "AI 写作工作台", subtitle: "从 49 个专业模板开始，也可以加入自己的提示词。每次生成都会经过质量自检。",
    modules: "写作能力", templates: "选择模板", input: "写作信息", output: "生成结果", setup: "输出设置", language: "输出语言", length: "内容长度", tone: "写作语气", model: "运行模型", custom: "补充要求（可选）", customHint: "例如：使用更多案例，结尾加入行动建议…", generate: "生成并自检", generating: "正在生成与质量自检", waiting: "长文章通常需要 1–2 分钟，请保持页面开启", delayed: "等待时间较长，后台可能仍在生成。请稍后到任务中心查看结果。", empty: "选择模板并填写信息，完成的 Markdown 内容会显示在这里。", quality: "质量自检", copy: "复制 Markdown", download: "下载 .md", copied: "已复制", required: "请填写所有必填项", login: "登录后即可生成并保存任务记录", auto: "跟随输入", chinese: "简体中文", english: "English", short: "精简", medium: "标准", long: "深度", professional: "专业", friendly: "亲和", concise: "简洁", persuasive: "有说服力", creative: "创意", chars: "字", credits: "积分 / 次", passed: "项通过", issue: "项建议",
  } : {
    back: "Back to marketplace", eyebrow: "AI WRITING STUDIO", title: "AI Writing Workspace", subtitle: "Start with 49 professional templates or add your own instructions. Every generation includes a quality review.",
    modules: "Capabilities", templates: "Choose a template", input: "Writing brief", output: "Result", setup: "Output settings", language: "Language", length: "Length", tone: "Tone", model: "Runtime model", custom: "Additional instructions (optional)", customHint: "For example: add more examples and end with next steps…", generate: "Generate & review", generating: "Generating and reviewing", waiting: "Long-form writing usually takes 1–2 minutes. Keep this page open.", delayed: "The request is taking longer than expected and may still finish in the background. Check Task Center shortly.", empty: "Choose a template and complete the brief. Your Markdown result will appear here.", quality: "Quality review", copy: "Copy Markdown", download: "Download .md", copied: "Copied", required: "Complete all required fields", login: "Sign in to generate and save a task record", auto: "Match input", chinese: "Simplified Chinese", english: "English", short: "Short", medium: "Standard", long: "In-depth", professional: "Professional", friendly: "Friendly", concise: "Concise", persuasive: "Persuasive", creative: "Creative", chars: "chars", credits: "credits / run", passed: "checks passed", issue: "suggestions",
  };
  const modules = catalog?.modules || [];
  const [moduleId, setModuleId] = useState(modules[0]?.id || "content-creation");
  const activeModule = modules.find((item) => item.id === moduleId) || modules[0];
  const [templateId, setTemplateId] = useState(activeModule?.templates?.[0]?.id || "ai-article");
  const activeTemplate = activeModule?.templates?.find((item) => item.id === templateId) || activeModule?.templates?.[0];
  const [values, setValues] = useState({});
  const [settings, setSettings] = useState({ outputLanguage: zh ? "zh-CN" : "en", length: "medium", tone: "professional", customInstructions: "" });
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);

  useEffect(() => { if (!moduleId && modules[0]) setModuleId(modules[0].id); }, [moduleId, modules]);
  useEffect(() => { if (activeModule && !activeModule.templates.some((item) => item.id === templateId)) setTemplateId(activeModule.templates[0]?.id); }, [activeModule, templateId]);
  useEffect(() => { setModelConnectionId(runtimeTool?.modelConnectionId || "managed"); }, [runtimeTool?.modelConnectionId]);
  useEffect(() => { if (!busy) return undefined; const started = Date.now(); setElapsed(0); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  const selectModule = (id) => { const next = modules.find((item) => item.id === id); setModuleId(id); setTemplateId(next?.templates?.[0]?.id); setValues({}); setError(""); };
  const selectTemplate = (id) => { setTemplateId(id); setValues({}); setError(""); };
  const changeModel = async (value) => { const previous = modelConnectionId; setModelConnectionId(value); try { await onModelChange?.(tool.id, value); } catch { setModelConnectionId(previous); setError(dictionary[locale].error); } };
  const generate = async () => {
    if (!authenticated) return onAuth();
    if (activeTemplate?.fields?.some((item) => item.required && !String(values[item.id] || "").trim())) return setError(labels.required);
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await api(`/api/tool-actions/${tool.slug}`, jsonOptions("POST", { templateId: activeTemplate.id, values, ...settings, modelConnectionId }));
      setResult(response.output); onCompleted?.(response); requestAnimationFrame(() => document.querySelector(".writer-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) { setError(caught.status === 402 ? dictionary[locale].insufficient : [502, 504].includes(caught.status) ? labels.delayed : dictionary[locale].error); }
    finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(result?.markdown || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => { const blob = new Blob([result?.markdown || ""], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${activeTemplate?.id || "writing"}.md`; anchor.click(); URL.revokeObjectURL(url); };
  if (!activeModule || !activeTemplate) return <Loading locale={locale} />;

  return <div className="writer-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{labels.back}</button>
    <header className="writer-hero"><span className="writer-product-icon"><NotePencil size={34} weight="duotone" /><Sparkle className="writer-spark" size={17} weight="fill" /></span><div><p className="eyebrow">{labels.eyebrow}</p><h1>{labels.title}</h1><p>{labels.subtitle}</p></div><div className="writer-meta"><span><CheckCircle size={16} weight="fill" />{modules.reduce((sum, item) => sum + item.templates.length, 0)} Templates</span><span><Coins size={16} />{tool.creditCost} {labels.credits}</span></div></header>
    <div className="writer-shell">
      {busy && <div className="writer-progress" role="status"><span><SpinnerGap className="spin" size={20} /></span><div><strong>{labels.generating} · {elapsed}s</strong><small>{labels.waiting}</small></div><i><b style={{ width: `${Math.min(92, 12 + elapsed * .85)}%` }} /></i></div>}
      <aside className="writer-library"><header><strong>{labels.modules}</strong><small>7 MODULES</small></header><nav>{modules.map((module) => { const Icon = writingIconMap[module.icon] || Article; return <button key={module.id} className={`${module.id === activeModule.id ? "active" : ""} ${module.accent}`} onClick={() => selectModule(module.id)}><span><Icon size={19} weight={module.id === activeModule.id ? "duotone" : "regular"} /></span><div><strong>{module.label[zh ? "zh" : "en"]}</strong><small>{module.templates.length} {zh ? "个模板" : "templates"}</small></div><ArrowRight size={14} /></button>; })}</nav></aside>
      <main className="writer-canvas">
        <section className="writer-template-section"><header><div><span>{activeModule.label[zh ? "zh" : "en"]}</span><h2>{labels.templates}</h2></div><p>{activeModule.description[zh ? "zh" : "en"]}</p></header><div className="writer-template-grid">{activeModule.templates.map((template) => <button key={template.id} className={template.id === activeTemplate.id ? "active" : ""} onClick={() => selectTemplate(template.id)}><span><FileText size={18} /></span><div><strong>{template.label[zh ? "zh" : "en"]}</strong><small>{template.description[zh ? "zh" : "en"]}</small></div>{template.id === activeTemplate.id && <CheckCircle size={17} weight="fill" />}</button>)}</div></section>
        <section className="writer-editor"><header><span className={`writer-template-mark ${activeModule.accent}`}><TextAa size={22} weight="duotone" /></span><div><small>{activeModule.label[zh ? "zh" : "en"]}</small><h2>{activeTemplate.label[zh ? "zh" : "en"]}</h2></div></header><div className="writer-fields">{activeTemplate.fields.map((field) => <label key={field.id} className={field.type === "textarea" ? "wide" : ""}><span>{field.label[zh ? "zh" : "en"]}{field.required && <em>*</em>}</span>{field.type === "textarea" ? <textarea rows={field.id === "sourceContent" ? 9 : 5} value={values[field.id] || ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} /> : field.type === "select" ? <select value={values[field.id] || ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })}><option value="">{zh ? "请选择" : "Select"}</option><option value="beginner">{zh ? "基础/通用" : "General"}</option><option value="advanced">{zh ? "专业/进阶" : "Advanced"}</option><option value="friendly">{zh ? "亲和" : "Friendly"}</option><option value="professional">{zh ? "专业" : "Professional"}</option></select> : <input value={values[field.id] || ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} />}</label>)}</div></section>
        <section className="writer-result"><header><div><span className="writer-result-icon"><Sparkle size={19} weight="fill" /></span><div><small>MARKDOWN</small><h2>{labels.output}</h2></div></div>{result && <div className="writer-result-actions"><button onClick={copy}><Copy size={16} />{copied ? labels.copied : labels.copy}</button><button onClick={download}><DownloadSimple size={16} />{labels.download}</button></div>}</header>{!result ? <div className="writer-result-empty"><NotePencil size={35} weight="duotone" /><strong>{labels.output}</strong><p>{labels.empty}</p></div> : <><pre>{result.markdown}</pre><div className="writer-review"><div><strong>{result.review?.score ?? 0}</strong><span>/100<br />{labels.quality}</span></div><section><p>{result.review?.checks?.map((item) => <span key={item}><CheckSquare size={15} weight="fill" />{item}</span>)}</p>{result.review?.issues?.length > 0 && <small>{result.review.issues.length} {labels.issue}：{result.review.issues.join("；")}</small>}</section><em>{result.wordCount} {labels.chars}</em></div></>}</section>
      </main>
      <aside className="writer-settings"><header><GearSix size={19} /><strong>{labels.setup}</strong></header><label><span>{labels.language}</span><select value={settings.outputLanguage} onChange={(event) => setSettings({ ...settings, outputLanguage: event.target.value })}><option value="zh-CN">{labels.chinese}</option><option value="en">{labels.english}</option><option value="auto">{labels.auto}</option></select></label><label><span>{labels.length}</span><div className="writer-segment">{["short", "medium", "long"].map((value) => <button className={settings.length === value ? "active" : ""} onClick={() => setSettings({ ...settings, length: value })} key={value}>{labels[value]}</button>)}</div></label><label><span>{labels.tone}</span><select value={settings.tone} onChange={(event) => setSettings({ ...settings, tone: event.target.value })}>{["professional", "friendly", "concise", "persuasive", "creative"].map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select></label>{authenticated && <label><span>{labels.model}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">{dictionary[locale].useManaged}</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}<label><span>{labels.custom}</span><textarea rows={6} value={settings.customInstructions} onChange={(event) => setSettings({ ...settings, customInstructions: event.target.value })} placeholder={labels.customHint} /></label>{!authenticated && <div className="writer-login"><LockKey size={18} /><span>{labels.login}</span></div>}{error && <p className="form-error"><Warning size={16} />{error}</p>}<button className="writer-generate" onClick={generate} disabled={busy}>{busy ? <><SpinnerGap className="spin" size={18} />{labels.generating}</> : <><PaperPlaneRight size={18} weight="fill" />{labels.generate}</>}</button><small className="writer-review-note"><ShieldCheck size={15} />{zh ? "生成后自动检查准确性、结构、可读性与模板规范" : "Automatically checks accuracy, structure, readability, and template fit"}</small></aside>
    </div>
  </div>;
}

const seoResultNames = {
  zh: { keywords: "关键词结果", content: "内容交付结果", audit: "诊断结果", ranking: "排名数据", backlinks: "外链数据", comparison: "差距对比", scorecard: "评分结果", report: "SEO 报告" },
  en: { keywords: "Keyword results", content: "Content deliverable", audit: "Audit findings", ranking: "Ranking data", backlinks: "Backlink data", comparison: "Gap comparison", scorecard: "Scorecard", report: "SEO report" },
};

function seoFailureMessage(caught, locale) {
  const zh = locale !== "en";
  const messages = {
    MODEL_TIMEOUT: zh ? "模型分析超时，本次不会扣除积分。请点击重试。" : "Model analysis timed out. No credits were charged; please retry.",
    SEO_PROVIDER_TIMEOUT: zh ? "SEO 数据供应商响应超时，本次不会扣除积分。请稍后重试。" : "The SEO data provider timed out. No credits were charged; please retry later.",
    SEO_DATA_SOURCE_REQUIRED: zh ? "该功能所需的数据源尚未配置，请联系管理员。" : "The required data source is not configured. Contact an administrator.",
    SEO_PROVIDER_UNREACHABLE: zh ? "暂时无法连接 SEO 数据供应商，请稍后重试。" : "The SEO data provider is temporarily unreachable. Please retry later.",
    SEO_PROVIDER_FAILED: zh ? "SEO 数据供应商返回异常，本次不会扣除积分。" : "The SEO data provider returned an error. No credits were charged.",
    SEO_INVALID_URL: zh ? "网址格式不正确，请输入完整的 HTTP 或 HTTPS 地址。" : "The URL is invalid. Enter a complete HTTP or HTTPS address.",
    SEO_HTTP_REQUIRED: zh ? "仅支持公开的 HTTP 或 HTTPS 网站。" : "Only public HTTP or HTTPS websites are supported.",
    SEO_URL_BLOCKED: zh ? "该网址不符合安全抓取规则，请使用公开的 HTTP 或 HTTPS 网站。" : "This URL does not meet safe-crawling rules. Use a public HTTP or HTTPS website.",
    SEO_HOST_NOT_FOUND: zh ? "无法找到该网站，请检查域名是否填写正确。" : "The website could not be found. Check the domain name.",
    SEO_FETCH_TIMEOUT: zh ? "网站抓取超时，本次不会扣除积分。请稍后重试。" : "Website crawling timed out. No credits were charged; please retry later.",
    SEO_FETCH_FAILED: zh ? "网站暂时无法访问，请检查网址或网站的访问限制。" : "The website could not be reached. Check its URL or access restrictions.",
    SEO_HTML_REQUIRED: zh ? "该地址不是可分析的网页，请输入网站页面地址。" : "This address is not an analyzable web page. Enter a website page URL.",
    SEO_RESPONSE_TOO_LARGE: zh ? "网页内容过大，暂时无法完成分析。" : "The page is too large to analyze.",
    SEO_REDIRECT_LIMIT: zh ? "网站重定向次数过多，请检查最终访问地址。" : "The website redirects too many times. Check its final URL.",
    ONESHOW_MODEL_UNAVAILABLE: zh ? "OneShowModel 当前不可用，可稍后重试或选择个人模型。" : "OneShowModel is unavailable. Retry later or select a personal model.",
  };
  if (caught?.status === 402) return dictionary[locale].insufficient;
  return messages[caught?.message] || (zh ? "运行失败，未扣除积分。请检查输入后重试。" : "The run failed and no credits were charged. Check the inputs and retry.");
}

function seoCell(value, zh) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? (zh ? "是" : "Yes") : (zh ? "否" : "No");
  if (typeof value === "object") return Array.isArray(value) ? value.join("、") : JSON.stringify(value);
  return String(value);
}

function SeoResultView({ result, zh }) {
  const presentation = result.presentation || { type: result.resultType || "report", markdown: result.markdown };
  const rows = presentation.rows || [];
  const columns = presentation.columns || [];
  const cards = presentation.cards || [];
  const issues = presentation.issues || [];
  const isReport = presentation.type === "report";
  return <div className={`seo-presentation ${presentation.type}`}>
    {cards.length > 0 && <div className="seo-presentation-cards">{cards.map((card, index) => <article key={`${card.label}-${index}`}><small>{card.label}</small><strong>{seoCell(card.value, zh)}</strong></article>)}</div>}
    {rows.length > 0 && columns.length > 0 && <div className="seo-data-table-wrap"><table className="seo-data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.key} title={seoCell(row[column.key], zh)}>{seoCell(row[column.key], zh)}</td>)}</tr>)}</tbody></table></div>}
    {presentation.type === "audit" && issues.length > 0 && <div className="seo-issue-list">{issues.map((issue, index) => <article className={issue.severity || "medium"} key={`${issue.title}-${index}`}><span>{String(issue.severity || "medium").toUpperCase()}</span><div><strong>{issue.title}</strong><p>{issue.detail}</p>{issue.evidenceId && <small>{zh ? "证据" : "Evidence"} · {issue.evidenceId}</small>}</div></article>)}</div>}
    {!rows.length && !cards.length && !issues.length && !isReport && <pre className="seo-artifact-body">{presentation.markdown || result.markdown}</pre>}
    {isReport && <pre className="seo-artifact-body report">{presentation.markdown || result.markdown}</pre>}
    {!isReport && (rows.length > 0 || cards.length > 0 || issues.length > 0) && <details className="seo-full-notes"><summary>{zh ? "查看完整说明与数据边界" : "View full notes and data boundaries"}</summary><pre>{presentation.markdown || result.markdown}</pre></details>}
  </div>;
}

function SeoWorkbenchPage({ tool, catalog, locale, authenticated, runtime, onBack, onAuth, onCompleted, onModelChange }) {
  const zh = locale !== "en";
  const labels = zh ? {
    back: "返回工具市场", eyebrow: "EVIDENCE-DRIVEN SEO", title: "SEO 工作台", subtitle: "真实抓取网站，结合模型分析；没有数据源的指标不会编造。",
    modules: "SEO 能力", templates: "选择任务", input: "任务参数", output: "运行结果", settings: "运行设置", model: "分析模型", custom: "补充要求（可选）", customHint: "例如：重点分析中文市场和转化型关键词…",
    run: "开始运行", running: "正在获取与处理数据", waiting: "网站抓取可能需要 30–90 秒，请保持页面开启", empty: "选择任务并填写参数，对应的结果会显示在这里。", copy: "复制 Markdown", download: "下载 .md", downloadCsv: "导出 CSV", downloadHtml: "下载 HTML", copied: "已复制", required: "请填写所有必填项", login: "登录后即可运行并保存任务记录", credits: "积分 / 次", locked: "需要数据源", lockedBody: "该能力依赖真实关键词、SERP 或外链供应商，配置后才会开放。", score: "规则评分", source: "数据来源", quality: "数据质量", error: "运行失败，请检查网址、数据源或模型配置。",
  } : {
    back: "Back to marketplace", eyebrow: "EVIDENCE-DRIVEN SEO", title: "SEO Workspace", subtitle: "Crawl real websites and interpret evidence with AI. Missing provider metrics are never fabricated.",
    modules: "SEO capabilities", templates: "Choose an analysis", input: "Analysis inputs", output: "SEO report", settings: "Run settings", model: "Analysis model", custom: "Additional instructions (optional)", customHint: "For example: focus on commercial intent and the US market…",
    run: "Run task", running: "Collecting and processing data", waiting: "Website crawls may take 30–90 seconds. Keep this page open.", empty: "Choose a task and complete the inputs. Its result will appear here.", copy: "Copy Markdown", download: "Download .md", downloadCsv: "Export CSV", downloadHtml: "Download HTML", copied: "Copied", required: "Complete all required fields", login: "Sign in to run and save task history", credits: "credits / run", locked: "Data source required", lockedBody: "This capability requires a real keyword, SERP, or backlink provider and opens only after configuration.", score: "Rule score", source: "Data source", quality: "Data quality", error: "Run failed. Check the URL, data source, or model setup.",
  };
  const modules = catalog?.modules || [];
  const specialist = catalog?.specialist || null;
  const pageTitle = specialist ? (zh ? specialist.nameZh : specialist.nameEn) : labels.title;
  const pageSubtitle = specialist ? (zh ? specialist.descriptionZh : specialist.descriptionEn) : labels.subtitle;
  const PageIcon = iconMap[tool.icon] || ChartLineUp;
  const [moduleId, setModuleId] = useState(modules[0]?.id || "keyword-research");
  const activeModule = modules.find((item) => item.id === moduleId) || modules[0];
  const [templateId, setTemplateId] = useState(activeModule?.templates?.[0]?.id || "keyword-discovery");
  const activeTemplate = activeModule?.templates?.find((item) => item.id === templateId) || activeModule?.templates?.[0];
  const [lastTemplateByModule, setLastTemplateByModule] = useState({});
  const [draftsByTemplate, setDraftsByTemplate] = useState({});
  const [instructionsByTemplate, setInstructionsByTemplate] = useState({});
  const [resultsByTemplate, setResultsByTemplate] = useState({});
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const [busy, setBusy] = useState(false); const [elapsed, setElapsed] = useState(0); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);
  const values = draftsByTemplate[templateId] || {};
  const fieldValue = (field) => values[field.id] ?? field.defaultValue ?? "";
  const resolvedValues = Object.fromEntries((activeTemplate?.fields || []).map((field) => [field.id, fieldValue(field)]));
  const customInstructions = instructionsByTemplate[templateId] || "";
  const result = resultsByTemplate[templateId] || null;
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);
  useEffect(() => { if (!moduleId && modules[0]) setModuleId(modules[0].id); }, [moduleId, modules]);
  useEffect(() => { if (activeModule && !activeModule.templates.some((item) => item.id === templateId)) setTemplateId(activeModule.templates[0]?.id); }, [activeModule, templateId]);
  useEffect(() => { setModelConnectionId(runtimeTool?.modelConnectionId || "managed"); }, [runtimeTool?.modelConnectionId]);
  useEffect(() => { if (!busy) return undefined; const started = Date.now(); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  const selectModule = (id) => {
    const next = modules.find((item) => item.id === id);
    setLastTemplateByModule((previous) => ({ ...previous, [activeModule.id]: templateId }));
    setModuleId(id);
    setTemplateId(lastTemplateByModule[id] || next?.templates?.[0]?.id);
    setError("");
  };
  const selectTemplate = (template) => {
    setTemplateId(template.id);
    setLastTemplateByModule((previous) => ({ ...previous, [activeModule.id]: template.id }));
    setError(template.available ? "" : labels.lockedBody);
  };
  const setFieldValue = (fieldId, value) => setDraftsByTemplate((previous) => {
    const next = { ...(previous[templateId] || {}), [fieldId]: value };
    if (fieldId === "searchEngine" && value === "baidu") Object.assign(next, { country: "China", language: "Chinese (Simplified)" });
    if (fieldId === "searchEngine" && value === "google" && next.language === "Chinese (Simplified)") Object.assign(next, { country: "United States", language: "English" });
    return { ...previous, [templateId]: next };
  });
  const setCustomInstructions = (value) => setInstructionsByTemplate((previous) => ({ ...previous, [templateId]: value }));
  const changeModel = async (value) => { const previous = modelConnectionId; setModelConnectionId(value); try { await onModelChange?.(tool.id, value); } catch { setModelConnectionId(previous); setError(dictionary[locale].error); } };
  const run = async () => {
    if (!authenticated) return onAuth();
    if (!activeTemplate.available) return setError(labels.lockedBody);
    if (activeTemplate.fields.some((field) => field.required && !String(resolvedValues[field.id] || "").trim())) return setError(labels.required);
    setBusy(true); setElapsed(0); setError("");
    try { const response = await api(`/api/tool-actions/${tool.slug}`, jsonOptions("POST", { templateId: activeTemplate.id, values: resolvedValues, locale, customInstructions, modelConnectionId })); setResultsByTemplate((previous) => ({ ...previous, [activeTemplate.id]: response.output })); onCompleted?.(response); requestAnimationFrame(() => document.querySelector(".seo-result")?.scrollIntoView({ behavior: "smooth", block: "start" })); }
    catch (caught) { setError(seoFailureMessage(caught, locale)); } finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(result?.markdown || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => { const blob = new Blob([result?.markdown || ""], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${activeTemplate?.id || "seo-report"}.md`; a.click(); URL.revokeObjectURL(url); };
  const downloadCsv = () => { const presentation = result?.presentation; if (!presentation?.rows?.length || !presentation?.columns?.length) return; const quote = (value) => `"${seoCell(value, zh).replace(/"/g, '""')}"`; const csv = [presentation.columns.map((column) => quote(column.label)).join(","), ...presentation.rows.map((row) => presentation.columns.map((column) => quote(row[column.key])).join(","))].join("\n"); const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${activeTemplate?.id || "seo-result"}.csv`; a.click(); URL.revokeObjectURL(url); };
  const downloadHtml = () => { const blob = new Blob([result?.html || ""], { type: "text/html;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${activeTemplate?.id || "seo-report"}.html`; a.click(); URL.revokeObjectURL(url); };
  if (!activeModule || !activeTemplate) return <Loading locale={locale} />;
  return <div className="writer-page seo-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{labels.back}</button>
    <header className="writer-hero seo-hero"><span className="writer-product-icon seo-product-icon"><PageIcon size={34} weight="duotone" /><MagnifyingGlass className="writer-spark" size={17} weight="bold" /></span><div><p className="eyebrow">{specialist ? "SEO SPECIALIST AGENT" : labels.eyebrow}</p><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div><div className="writer-meta"><span><CheckCircle size={16} weight="fill" />{modules.reduce((sum, item) => sum + item.templates.length, 0)} Templates</span><span><Coins size={16} />{tool.creditCost} {labels.credits}</span></div></header>
    <div className="writer-shell seo-shell">
      {busy && <div className="writer-progress"><span><SpinnerGap className="spin" size={20} /></span><div><strong>{labels.running} · {elapsed}s</strong><small>{labels.waiting}</small></div><i><b style={{ width: `${Math.min(92, 10 + elapsed * .75)}%` }} /></i></div>}
      <aside className="writer-library seo-library"><header><strong>{labels.modules}</strong><small>{modules.length} {modules.length === 1 ? "MODULE" : "MODULES"}</small></header><nav>{modules.map((module) => { const Icon = seoIconMap[module.icon] || ChartLineUp; return <button key={module.id} className={`${module.id === activeModule.id ? "active" : ""} ${module.accent}`} onClick={() => selectModule(module.id)}><span><Icon size={19} weight={module.id === activeModule.id ? "duotone" : "regular"} /></span><div><strong>{module.label[zh ? "zh" : "en"]}</strong><small>{module.templates.length} {zh ? "个工具" : module.templates.length === 1 ? "tool" : "tools"}</small></div><ArrowRight size={14} /></button>; })}</nav></aside>
      <main className="writer-canvas">
        <section className="writer-template-section"><header><div><span>{activeModule.label[zh ? "zh" : "en"]}</span><h2>{labels.templates}</h2></div><p>{activeModule.description[zh ? "zh" : "en"]}</p></header><div className="writer-template-grid">{activeModule.templates.map((template) => <button key={template.id} className={`${template.id === activeTemplate.id ? "active" : ""} ${!template.available ? "locked" : ""}`} onClick={() => selectTemplate(template)}><span>{template.available ? <FileText size={18} /> : <LockKey size={18} />}</span><div><strong>{template.label[zh ? "zh" : "en"]}</strong><small>{template.available ? template.description[zh ? "zh" : "en"] : labels.locked}</small></div>{template.id === activeTemplate.id ? <CheckCircle size={17} weight="fill" /> : resultsByTemplate[template.id] ? <CheckCircle className="seo-saved-result" title={zh ? "报告已保留" : "Report preserved"} size={17} weight="fill" /> : null}</button>)}</div></section>
        <section className="writer-editor"><header><span className={`writer-template-mark ${activeModule.accent}`}><MagnifyingGlass size={22} weight="duotone" /></span><div><small>{activeModule.label[zh ? "zh" : "en"]}</small><h2>{activeTemplate.label[zh ? "zh" : "en"]}</h2></div>{!activeTemplate.available && <span className="seo-source-required"><LockKey size={14} />{labels.locked}</span>}</header><div className="writer-fields">{activeTemplate.fields.map((field) => <label key={field.id} className={field.type === "textarea" ? "wide" : ""}><span>{field.label[zh ? "zh" : "en"]}{field.required && <em>*</em>}</span>{field.type === "textarea" ? <textarea rows={field.id === "content" ? 10 : 5} value={fieldValue(field)} onChange={(event) => setFieldValue(field.id, event.target.value)} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} /> : field.type === "select" ? <select value={fieldValue(field)} onChange={(event) => setFieldValue(field.id, event.target.value)}>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label?.[zh ? "zh" : "en"] || option.value}</option>)}</select> : <input type={field.type === "url" ? "url" : "text"} value={fieldValue(field)} onChange={(event) => setFieldValue(field.id, event.target.value)} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} disabled={resolvedValues.searchEngine === "baidu" && field.id === "language"} />}</label>)}</div></section>
        <section className="writer-result seo-result"><header><div><span className="writer-result-icon"><ChartLineUp size={19} weight="fill" /></span><div><small>{String(result?.presentation?.type || activeTemplate.resultType || "result").toUpperCase()}</small><h2>{result ? (seoResultNames[zh ? "zh" : "en"][result.presentation?.type || result.resultType] || labels.output) : (seoResultNames[zh ? "zh" : "en"][activeTemplate.resultType] || labels.output)}</h2></div></div>{result && <div className="writer-result-actions"><button onClick={copy}><Copy size={16} />{copied ? labels.copied : labels.copy}</button>{result.presentation?.rows?.length > 0 && <button onClick={downloadCsv}><DownloadSimple size={16} />{labels.downloadCsv}</button>}<button onClick={download}><DownloadSimple size={16} />{labels.download}</button>{result.html && <button onClick={downloadHtml}><DownloadSimple size={16} />{labels.downloadHtml}</button>}</div>}</header>{!result ? <div className="writer-result-empty"><ChartLineUp size={35} weight="duotone" /><strong>{seoResultNames[zh ? "zh" : "en"][activeTemplate.resultType] || labels.output}</strong><p>{labels.empty}</p></div> : <><div className="seo-result-metrics"><span><small>{labels.score}</small><strong>{result.score ?? "—"}{result.score != null ? "/100" : ""}</strong></span><span><small>{labels.source}</small><strong>{result.dataSource}</strong></span><span><small>{labels.quality}</small><strong>{result.dataQuality}</strong></span></div><SeoResultView result={result} zh={zh} /></>}</section>
      </main>
      <aside className="writer-settings"><header><GearSix size={19} /><strong>{labels.settings}</strong></header><div className="seo-source-card"><ShieldCheck size={18} /><div><strong>{zh ? "数据真实性保护" : "Evidence guard"}</strong><small>{zh ? "缺失指标显示暂无数据，不由模型补齐" : "Missing metrics stay unavailable, never model-filled"}</small></div></div>{authenticated && tool.runtimeKind === "openai" && <label><span>{labels.model}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">{dictionary[locale].useManaged}</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}<label><span>{labels.custom}</span><textarea rows={7} value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} placeholder={labels.customHint} /></label>{!authenticated && <div className="writer-login"><LockKey size={18} /><span>{labels.login}</span></div>}{error && <p className="form-error"><Warning size={16} />{error}</p>}<button className="writer-generate" onClick={run} disabled={busy || !activeTemplate.available}>{busy ? <><SpinnerGap className="spin" size={18} />{labels.running}</> : <><PaperPlaneRight size={18} weight="fill" />{activeTemplate.available ? labels.run : labels.locked}</>}</button><small className="writer-review-note"><ShieldCheck size={15} />{zh ? "网站抓取有严格的内网地址与跳转安全限制" : "Crawling blocks private addresses and unsafe redirects"}</small></aside>
    </div>
  </div>;
}

function SeoAgentPage({ tool, locale, authenticated, account, onBack, onAuth }) {
  const zh = locale !== "en";
  const copy = zh ? {
    back: "返回工具市场", eyebrow: "AUTONOMOUS SEO WORKSPACE", title: "OneShow SEO Agent", domain: "oneshowseo.com",
    subtitle: "从发现机会到执行优化，让 SEO 每天持续向前。高风险变更始终由你批准。", running: "Agent 运行中", prototype: "产品原型 · 尚未连接网站写入权限",
    credits: "可用积分", today: "今日行动", plan: "自动化计划", growth: "增长监控", history: "变更记录", review: "3 项待审批",
    actionTitle: "修复 12 个页面的 Meta Description", actionBody: "这些页面已有稳定曝光，但摘要缺失或重复。补全后可改善搜索结果中的点击意愿。",
    evidence: "机会依据", evidenceValue: "来自 28 天 Search Console 数据", impact: "预计影响", impactValue: "+6%～11% 点击率", risk: "风险", riskValue: "低风险，可一键回滚", pages: "影响页面", pagesValue: "12 个 URL", cost: "预计消耗", costValue: "24 积分",
    approve: "批准并执行", executing: "正在执行", done: "执行完成", changes: "查看变更", hideChanges: "收起变更", safe: "安全模式", safeBody: "页面发布、重定向和删除操作必须人工审批。", on: "已开启", off: "已关闭",
    scope: "自动化范围", scopeBody: "Agent 可以自主研究和生成草稿，写入网站前需要你的确认。", discover: "发现机会", draft: "生成优化草稿", publish: "发布网站变更", approval: "需要审批",
    week: "近 7 天增长", impressions: "自然曝光", clicks: "自然点击", health: "技术健康度", next: "下次巡检", nextValue: "今天 18:30",
    faq: "为 6 个教程页生成 FAQ Schema", faqBody: "页面已包含问答内容，可补充结构化数据帮助搜索引擎理解。", refresh: "更新 3 篇表现下滑的文章", refreshBody: "排名从前 10 位跌至 11–20 位，建议补充过时段落与引用。",
    inspect: "检查详情", queued: "等待审批", medium: "中风险", low: "低风险", connect: "连接我的网站", login: "登录后开始配置 Agent",
  } : {
    back: "Back to marketplace", eyebrow: "AUTONOMOUS SEO WORKSPACE", title: "OneShow SEO Agent", domain: "oneshowseo.com",
    subtitle: "Move SEO forward every day—from opportunity discovery to safe execution. You approve every high-risk change.", running: "Agent running", prototype: "Product prototype · site write access not connected",
    credits: "Available credits", today: "Today's actions", plan: "Automation plan", growth: "Growth monitor", history: "Change log", review: "3 awaiting approval",
    actionTitle: "Fix meta descriptions on 12 pages", actionBody: "These pages have steady impressions but missing or duplicate snippets. Better descriptions can improve search-result CTR.",
    evidence: "Evidence", evidenceValue: "28 days of Search Console data", impact: "Expected impact", impactValue: "+6%–11% CTR", risk: "Risk", riskValue: "Low, one-click rollback", pages: "Affected", pagesValue: "12 URLs", cost: "Estimated cost", costValue: "24 credits",
    approve: "Approve & execute", executing: "Executing", done: "Completed", changes: "Review changes", hideChanges: "Hide changes", safe: "Safe mode", safeBody: "Publishing, redirects, and deletion always require human approval.", on: "On", off: "Off",
    scope: "Automation scope", scopeBody: "The Agent researches and drafts independently, but asks before writing to your site.", discover: "Discover opportunities", draft: "Create optimization drafts", publish: "Publish site changes", approval: "Approval required",
    week: "Last 7 days", impressions: "Organic impressions", clicks: "Organic clicks", health: "Technical health", next: "Next scan", nextValue: "Today, 18:30",
    faq: "Generate FAQ schema for 6 guides", faqBody: "The pages already contain Q&A content and can benefit from structured data.", refresh: "Refresh 3 declining articles", refreshBody: "Rankings slipped from the top 10 to positions 11–20; update stale sections and citations.",
    inspect: "View details", queued: "Awaiting approval", medium: "Medium risk", low: "Low risk", connect: "Connect my website", login: "Sign in to configure the Agent",
  };
  const [tab, setTab] = useState("today");
  const [safeMode, setSafeMode] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("idle");
  const approve = () => {
    if (!authenticated) return onAuth();
    setStatus("running");
    setTimeout(() => setStatus("done"), 900);
  };
  const tabs = [["today", copy.today], ["plan", copy.plan], ["growth", copy.growth], ["history", copy.history]];
  const balance = account?.credits?.balance;
  return <div className="seo-agent-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{copy.back}</button>
    <header className="seo-agent-hero">
      <div className="seo-agent-brand"><span className="seo-agent-logo"><Robot size={31} weight="duotone" /></span><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></div>
      <div className="seo-agent-hero-meta"><span className="agent-domain"><PlugsConnected size={16} />{copy.domain}</span><span className="agent-live"><i />{copy.running}</span>{authenticated && <span className="agent-credit"><Coins size={17} />{copy.credits} <strong>{balance?.toLocaleString() ?? "—"}</strong></span>}</div>
    </header>
    <div className="agent-prototype-note"><ShieldCheck size={16} />{copy.prototype}</div>
    <nav className="seo-agent-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "today" && <span>3</span>}</button>)}</nav>
    <div className="seo-agent-layout">
      <main className="seo-agent-main">
        {tab === "today" && <>
          <section className="agent-section-head"><div><p>{copy.today}</p><h2>{copy.review}</h2></div><span><Clock size={16} />{copy.next} · {copy.nextValue}</span></section>
          <article className={`agent-primary-action ${status}`}>
            <header><span className="agent-action-icon"><MagicWand size={24} weight="duotone" /></span><div><span className="agent-recommend">{zh ? "优先推荐" : "Top recommendation"}</span><h3>{copy.actionTitle}</h3><p>{copy.actionBody}</p></div><span className="agent-risk low"><ShieldCheck size={14} />{copy.low}</span></header>
            <div className="agent-evidence-grid">{[[MagnifyingGlass, copy.evidence, copy.evidenceValue], [TrendUp, copy.impact, copy.impactValue], [ShieldCheck, copy.risk, copy.riskValue], [FileText, copy.pages, copy.pagesValue]].map(([Icon, label, value]) => <div key={label}><Icon size={18} /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>
            {expanded && <div className="agent-change-preview"><header><strong>{zh ? "变更预览" : "Change preview"}</strong><span>{copy.pagesValue}</span></header><div><small>/blog/ai-seo-guide</small><p>{zh ? "自动化 SEO 指南：从诊断、内容优化到安全发布，让网站持续获得自然流量。" : "Automated SEO guide: audit, optimize, and publish safely to grow organic traffic."}</p></div><div><small>/tools/seo-workbench</small><p>{zh ? "一站式关键词研究、网站诊断与排名跟踪工具，支持中国与全球搜索市场。" : "Keyword research, site audits, and rank tracking for Chinese and global search markets."}</p></div></div>}
            <footer><div><small>{copy.cost}</small><strong>{copy.costValue}</strong></div><button className="agent-secondary" onClick={() => setExpanded(!expanded)}>{expanded ? copy.hideChanges : copy.changes}<ArrowRight size={16} /></button><button className="agent-primary" onClick={approve} disabled={status === "running" || status === "done"}>{status === "running" ? <><SpinnerGap className="spin" size={17} />{copy.executing}</> : status === "done" ? <><CheckCircle size={17} weight="fill" />{copy.done}</> : <><Play size={17} weight="fill" />{copy.approve}</>}</button></footer>
          </article>
          <div className="agent-action-list">{[[FileText, copy.faq, copy.faqBody, copy.low, "12"], [ArrowsClockwise, copy.refresh, copy.refreshBody, copy.medium, "18"]].map(([Icon, title, body, risk, credits]) => <article key={title}><span><Icon size={21} weight="duotone" /></span><div><h3>{title}</h3><p>{body}</p><small><ShieldCheck size={13} />{risk} · {credits} {zh ? "积分" : "credits"}</small></div><button>{copy.inspect}<ArrowRight size={15} /></button></article>)}</div>
        </>}
        {tab === "plan" && <section className="agent-panel"><header><p>{copy.plan}</p><h2>{zh ? "一周自动化节奏" : "Weekly automation rhythm"}</h2></header><div className="agent-plan-list">{[[zh ? "每天" : "Daily", zh ? "扫描技术问题与排名变化" : "Scan technical issues and ranking changes", copy.nextValue], [zh ? "周二" : "Tuesday", zh ? "生成内容更新建议" : "Generate content refresh suggestions", "09:30"], [zh ? "周四" : "Thursday", zh ? "发现关键词与内容缺口" : "Find keyword and content gaps", "10:00"], [zh ? "周五" : "Friday", zh ? "生成本周增长复盘" : "Generate weekly growth review", "17:00"]].map(([day, task, time]) => <div key={task}><span><Clock size={18} /></span><div><small>{day}</small><strong>{task}</strong></div><time>{time}</time></div>)}</div></section>}
        {tab === "growth" && <section className="agent-panel"><header><p>{copy.growth}</p><h2>{copy.week}</h2></header><div className="agent-growth-grid">{[[TrendUp, copy.impressions, "28,420", "+14.2%"], [ChartLineUp, copy.clicks, "1,836", "+9.8%"], [ShieldCheck, copy.health, "92 / 100", "+4"], [CheckCircle, zh ? "已完成行动" : "Actions completed", "17", zh ? "本周" : "this week"]].map(([Icon, label, value, delta]) => <div key={label}><Icon size={20} weight="duotone" /><small>{label}</small><strong>{value}</strong><span>{delta}</span></div>)}</div><div className="agent-insight"><Lightbulb size={22} weight="duotone" /><div><strong>{zh ? "本周洞察" : "Weekly insight"}</strong><p>{zh ? "教程类页面贡献了 63% 的新增自然点击。建议下一轮优先补充高意图 FAQ 与内部链接。" : "Tutorial pages drove 63% of new organic clicks. Prioritize high-intent FAQs and internal links next."}</p></div></div></section>}
        {tab === "history" && <section className="agent-panel"><header><p>{copy.history}</p><h2>{zh ? "所有变更均可追溯" : "Every change is traceable"}</h2></header><div className="agent-history-list">{[[CheckCircle, zh ? "更新 8 个页面标题" : "Updated 8 page titles", zh ? "你批准 · 昨天 16:42" : "Approved by you · Yesterday 16:42"], [ArrowsClockwise, zh ? "回滚 /pricing 的描述更新" : "Rolled back /pricing description", zh ? "自动保护 · 3 天前" : "Automatic safeguard · 3 days ago"], [MagnifyingGlass, zh ? "完成全站技术巡检" : "Completed technical site scan", zh ? "Agent · 4 天前" : "Agent · 4 days ago"]].map(([Icon, title, meta]) => <div key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{meta}</small></div><button>{zh ? "查看" : "View"}</button></div>)}</div></section>}
      </main>
      <aside className="seo-agent-side">
        <section className="agent-safety"><header><span><ShieldCheck size={20} weight="duotone" /></span><div><strong>{copy.safe}</strong><small>{safeMode ? copy.on : copy.off}</small></div><button className={safeMode ? "active" : ""} onClick={() => setSafeMode(!safeMode)} aria-label={copy.safe}><i /></button></header><p>{copy.safeBody}</p></section>
        <section className="agent-scope"><header><strong>{copy.scope}</strong><GearSix size={18} /></header><p>{copy.scopeBody}</p><ul><li><Check size={15} />{copy.discover}</li><li><Check size={15} />{copy.draft}</li><li className="approval"><LockKey size={15} />{copy.publish}<span>{copy.approval}</span></li></ul></section>
        <section className="agent-side-growth"><header><strong>{copy.week}</strong><TrendUp size={18} /></header><div><span><small>{copy.impressions}</small><strong>+14.2%</strong></span><span><small>{copy.clicks}</small><strong>+9.8%</strong></span></div></section>
        <button className="agent-connect" onClick={() => authenticated ? setTab("plan") : onAuth()}><PlugsConnected size={18} />{authenticated ? copy.connect : copy.login}</button>
      </aside>
    </div>
  </div>;
}

function SeoAgentCommercialPage({ tool, locale, authenticated, account, onBack, onAuth }) {
  const zh = locale !== "en";
  const c = zh ? {
    back: "返回工具市场", kicker: "SEO 增长驾驶舱", title: "OneShowSEO", sub: "让 Agent 每天发现增长机会，你负责做最终决定。", demo: "演示数据", prototype: "当前为产品原型，尚未获得任何网站写入权限",
    site: "网站项目", verified: "演示项目", connect: "连接真实网站", credits: "可用积分", overview: "今日概览", opportunities: "机会队列", automation: "自动化", changes: "变更与回滚",
    data: "数据连接", dataSub: "决定 Agent 能看到什么、能否证明优化结果。", connected: "已连接", pending: "待接入", today: "今日最值得处理", waiting: "3 项等待你决定", scan: "下次巡检 18:30",
    action: "修复 12 个高曝光页面的搜索摘要", actionBody: "这些页面过去 28 天获得 18,420 次曝光，但摘要缺失或重复。Agent 已根据页面内容生成独立描述。", evidence: "数据依据", evidenceValue: "Search Console · 28 天", impact: "预计影响", impactValue: "CTR +6%～11%", confidence: "可信度", confidenceValue: "高 · 87%", affected: "影响范围", affectedValue: "12 个 URL", cost: "本次预计消耗", costValue: "24 积分", risk: "低风险", snapshot: "执行前自动保存快照，可随时回滚", preview: "预览 12 项变更", hide: "收起变更", approve: "批准并执行", executing: "正在安全执行", completed: "执行完成",
    before: "修改前", after: "修改后", queue: "下一批机会", all: "查看全部机会", baseline: "增长基线", baselineSub: "执行后的结果会与此基线比较。", impressions: "自然曝光", clicks: "自然点击", health: "网站健康度", guard: "Agent 安全边界", guardSub: "研究和生成可自动进行，网站写入受策略保护。", mode: "当前模式", modeValue: "逐项审批", protected: "发布、跳转、删除均需人工确认", recent: "最近一次变更", recentValue: "更新 8 个页面标题", rollback: "可回滚",
    setupTitle: "连接网站项目", setupSub: "完成所有权和数据授权后，Agent 才会使用真实数据。", domain: "网站域名", domainHint: "例如：https://example.com", next: "继续", close: "关闭", step1: "网站信息", step2: "验证所有权", step3: "连接数据", finish: "完成演示配置", verifyBody: "正式版本将提供 DNS、HTML 文件与 Search Console 三种验证方式。", sourceBody: "正式版本将在此授权 GSC、GA4、百度搜索资源平台和 CMS。",
    modeRecommend: "仅建议", modeApprove: "逐项审批", modeAuto: "低风险自动", schedule: "自动巡检计划", daily: "每日 08:30 · 技术与排名巡检", weekly: "每周五 17:00 · 增长复盘", historyTitle: "所有操作均有证据和快照", rollbackDone: "已完成回滚", view: "查看详情",
  } : {
    back: "Back to marketplace", kicker: "SEO GROWTH COMMAND CENTER", title: "OneShowSEO", sub: "The Agent finds growth opportunities every day. You make the final call.", demo: "Demo data", prototype: "Product prototype — no website write access has been granted",
    site: "Website project", verified: "Demo project", connect: "Connect live site", credits: "Available credits", overview: "Today", opportunities: "Opportunity queue", automation: "Automation", changes: "Changes & rollback",
    data: "Data connections", dataSub: "These determine what the Agent can see and prove.", connected: "Connected", pending: "Pending", today: "Best action today", waiting: "3 decisions waiting", scan: "Next scan 18:30",
    action: "Fix search snippets on 12 high-impression pages", actionBody: "These pages received 18,420 impressions over 28 days but have missing or duplicate descriptions. The Agent created a unique draft for each page.", evidence: "Evidence", evidenceValue: "Search Console · 28 days", impact: "Expected impact", impactValue: "CTR +6%–11%", confidence: "Confidence", confidenceValue: "High · 87%", affected: "Affected", affectedValue: "12 URLs", cost: "Estimated cost", costValue: "24 credits", risk: "Low risk", snapshot: "A snapshot is saved before execution and can be rolled back", preview: "Preview 12 changes", hide: "Hide changes", approve: "Approve & execute", executing: "Executing safely", completed: "Completed",
    before: "Before", after: "After", queue: "Next opportunities", all: "View all opportunities", baseline: "Growth baseline", baselineSub: "Post-action results will be compared with this baseline.", impressions: "Organic impressions", clicks: "Organic clicks", health: "Site health", guard: "Agent guardrails", guardSub: "Research and drafting can run automatically; site writes stay policy protected.", mode: "Current mode", modeValue: "Approval required", protected: "Publishing, redirects, and deletion require approval", recent: "Latest change", recentValue: "Updated 8 page titles", rollback: "Rollback ready",
    setupTitle: "Connect website project", setupSub: "The Agent uses live data only after ownership and data authorization are complete.", domain: "Website domain", domainHint: "For example: https://example.com", next: "Continue", close: "Close", step1: "Website", step2: "Verify ownership", step3: "Connect data", finish: "Finish demo setup", verifyBody: "The production flow will support DNS, HTML file, and Search Console verification.", sourceBody: "The production flow will authorize GSC, GA4, Baidu Search Resource Platform, and your CMS here.",
    modeRecommend: "Recommend only", modeApprove: "Approval required", modeAuto: "Auto low-risk", schedule: "Scan schedule", daily: "Daily 08:30 · technical and rank scan", weekly: "Friday 17:00 · growth review", historyTitle: "Every action has evidence and a snapshot", rollbackDone: "Rolled back", view: "View details",
  };
  const [tab, setTab] = useState("overview");
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [domain, setDomain] = useState("https://mianshiwen.cn");
  const [preview, setPreview] = useState(false);
  const [actionState, setActionState] = useState("idle");
  const [agentMode, setAgentMode] = useState("approval");
  const [rollbackState, setRollbackState] = useState("ready");
  const balance = account?.credits?.balance;
  const approve = () => { if (!authenticated) return onAuth(); setActionState("running"); setTimeout(() => setActionState("done"), 950); };
  const tabs = [["overview", c.overview], ["opportunities", c.opportunities], ["automation", c.automation], ["changes", c.changes]];
  const sources = [["Google Search Console", c.connected, true], ["GA4", c.connected, true], ["DataForSEO", c.connected, true], [zh ? "百度搜索资源平台" : "Baidu Search", c.pending, false], ["WordPress", c.pending, false]];
  const opportunities = [
    [zh ? "内容衰退" : "Content decay", zh ? "更新 3 篇排名下滑的教程" : "Refresh 3 declining guides", zh ? "排名从前 10 位跌至 11–20 位" : "Rankings fell from top 10 to positions 11–20", "18", "medium"],
    [zh ? "结构化数据" : "Structured data", zh ? "为 6 个教程页补充 HowTo Schema" : "Add HowTo schema to 6 guides", zh ? "页面具备完整步骤，但搜索引擎尚未识别" : "Pages contain steps that search engines do not yet recognize", "12", "low"],
    [zh ? "内部链接" : "Internal links", zh ? "连接 9 个孤立内容页面" : "Connect 9 orphaned content pages", zh ? "页面已有曝光，但站内链接入口不足" : "Pages have impressions but too few internal entry points", "9", "low"],
  ];
  const historyRows = [
    [zh ? "更新 8 个页面标题" : "Updated 8 page titles", zh ? "你批准 · 昨天 16:42" : "Approved by you · Yesterday 16:42", "+4.8% CTR", true],
    [zh ? "修复 14 个失效内部链接" : "Fixed 14 broken internal links", zh ? "你批准 · 3 天前" : "Approved by you · 3 days ago", zh ? "健康度 +3" : "Health +3", true],
    [zh ? "全站技术巡检" : "Full technical scan", zh ? "Agent · 4 天前" : "Agent · 4 days ago", zh ? "发现 7 个问题" : "7 issues found", false],
  ];
  return <div className="seo-growth-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{c.back}</button>
    <header className="seo-growth-header">
      <div className="seo-growth-title"><span><Robot size={28} weight="duotone" /></span><div><p className="eyebrow">{c.kicker}</p><h1>{c.title}</h1><p>{c.sub}</p></div></div>
      <div className="seo-growth-account"><span><Coins size={17} />{c.credits}<strong>{balance?.toLocaleString() ?? "—"}</strong></span><button onClick={() => setSetupOpen(true)}><PlugsConnected size={17} />{c.connect}</button></div>
    </header>
    <div className="seo-growth-projectbar">
      <div><small>{c.site}</small><strong>mianshiwen.cn</strong><span><CheckCircle size={14} weight="fill" />{c.verified}</span><em>{c.demo}</em></div>
      <p><ShieldCheck size={15} />{c.prototype}</p>
    </div>
    <section className="seo-growth-sources"><div><strong>{c.data}</strong><small>{c.dataSub}</small></div><ul>{sources.map(([name, status, ready]) => <li key={name} className={ready ? "ready" : "pending"}><i />{name}<span>{status}</span></li>)}</ul><button onClick={() => setSetupOpen(true)}><GearSix size={16} /></button></section>
    <nav className="seo-growth-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "opportunities" && <span>3</span>}</button>)}</nav>
    {tab === "overview" && <div className="seo-growth-layout"><main>
      <div className="seo-growth-sectionhead"><div><p>{c.today}</p><h2>{c.waiting}</h2></div><span><Clock size={15} />{c.scan}</span></div>
      <article className={`seo-growth-focus ${actionState}`}>
        <header><span><MagicWand size={23} weight="duotone" /></span><div><small>{zh ? "最高优先级 · 快速增长机会" : "TOP PRIORITY · QUICK WIN"}</small><h3>{c.action}</h3><p>{c.actionBody}</p></div><em><ShieldCheck size={14} />{c.risk}</em></header>
        <dl>{[[c.evidence,c.evidenceValue],[c.impact,c.impactValue],[c.confidence,c.confidenceValue],[c.affected,c.affectedValue]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {preview && <div className="seo-growth-diff"><div><small>{c.before}</small><p>AI SEO 工具：自动提升你的网站排名。</p></div><ArrowRight size={18} /><div><small>{c.after}</small><p>自动化 SEO 指南：持续诊断、优化并安全发布，让网站获得稳定自然流量。</p></div></div>}
        <div className="seo-growth-safety"><ShieldCheck size={16} /><span>{c.snapshot}</span></div>
        <footer><div><small>{c.cost}</small><strong>{c.costValue}</strong></div><button className="secondary" onClick={() => setPreview(!preview)}>{preview ? c.hide : c.preview}</button><button className="primary" onClick={approve} disabled={actionState !== "idle"}>{actionState === "running" ? <><SpinnerGap className="spin" size={17} />{c.executing}</> : actionState === "done" ? <><CheckCircle size={17} weight="fill" />{c.completed}</> : <><Play size={17} weight="fill" />{c.approve}</>}</button></footer>
      </article>
      <section className="seo-growth-queue"><header><div><strong>{c.queue}</strong><small>{zh ? "按影响、可信度和成本自动排序" : "Prioritized by impact, confidence, and cost"}</small></div><button onClick={() => setTab("opportunities")}>{c.all}<ArrowRight size={14} /></button></header>{opportunities.slice(0,2).map(([type,title,body,cost,risk]) => <div key={title}><span className={risk}><FileText size={18} /></span><div><small>{type}</small><strong>{title}</strong><p>{body}</p></div><em>{cost} {zh ? "积分" : "credits"}</em><button>{c.view}<ArrowRight size={14} /></button></div>)}</section>
    </main><aside>
      <section className="seo-growth-baseline"><header><div><strong>{c.baseline}</strong><small>{c.baselineSub}</small></div><ChartLineUp size={19} /></header><dl><div><dt>{c.impressions}</dt><dd>28,420</dd><span>+14.2%</span></div><div><dt>{c.clicks}</dt><dd>1,836</dd><span>+9.8%</span></div><div><dt>{c.health}</dt><dd>92/100</dd><span>+4</span></div></dl></section>
      <section className="seo-growth-guard"><header><ShieldCheck size={20} weight="duotone" /><strong>{c.guard}</strong></header><p>{c.guardSub}</p><div><small>{c.mode}</small><strong>{c.modeValue}</strong></div><span><LockKey size={14} />{c.protected}</span></section>
      <section className="seo-growth-recent"><small>{c.recent}</small><strong>{c.recentValue}</strong><span><ArrowsClockwise size={14} />{c.rollback}</span></section>
    </aside></div>}
    {tab === "opportunities" && <section className="seo-growth-wide"><header><div><p>{c.opportunities}</p><h2>{zh ? "由真实数据排序的增长机会" : "Growth opportunities ranked by evidence"}</h2></div><span>{zh ? "3 项待处理 · 39 积分" : "3 pending · 39 credits"}</span></header><div className="seo-growth-table">{opportunities.map(([type,title,body,cost,risk], index) => <div key={title}><b>{index + 1}</b><span className={risk}><FileText size={19} /></span><div><small>{type}</small><strong>{title}</strong><p>{body}</p></div><em>{risk === "low" ? c.risk : (zh ? "中风险" : "Medium risk")}</em><span>{cost} {zh ? "积分" : "credits"}</span><button>{c.view}<ArrowRight size={14} /></button></div>)}</div></section>}
    {tab === "automation" && <section className="seo-growth-wide"><header><div><p>{c.automation}</p><h2>{zh ? "决定 Agent 可以自主做到哪一步" : "Choose how far the Agent can act"}</h2></div></header><div className="seo-growth-modes">{[["recommend",c.modeRecommend,zh?"只发现机会并生成草稿":"Discover and draft only"],["approval",c.modeApprove,zh?"所有网站变更由你批准":"You approve every site change"],["auto",c.modeAuto,zh?"仅自动执行可回滚的低风险任务":"Auto-run reversible low-risk actions"]].map(([id,title,body]) => <button key={id} className={agentMode === id ? "active" : ""} onClick={() => setAgentMode(id)}><span>{agentMode === id ? <CheckCircle size={20} weight="fill" /> : <ShieldCheck size={20} />}</span><strong>{title}</strong><small>{body}</small></button>)}</div><div className="seo-growth-schedule"><header><strong>{c.schedule}</strong><GearSix size={17} /></header><div><Clock size={18} /><span>{c.daily}</span><em>{zh ? "已开启" : "On"}</em></div><div><ChartLineUp size={18} /><span>{c.weekly}</span><em>{zh ? "已开启" : "On"}</em></div></div></section>}
    {tab === "changes" && <section className="seo-growth-wide"><header><div><p>{c.changes}</p><h2>{c.historyTitle}</h2></div></header><div className="seo-growth-history">{historyRows.map(([title,meta,result,canRollback],index) => <div key={title}><span><CheckCircle size={18} weight="fill" /></span><div><strong>{title}</strong><small>{meta}</small></div><em>{result}</em>{canRollback && <button onClick={() => index === 0 && setRollbackState("done")}>{index === 0 && rollbackState === "done" ? c.rollbackDone : c.rollback}</button>}<button>{c.view}</button></div>)}</div></section>}
    {setupOpen && <div className="seo-growth-modal-backdrop" role="presentation"><section className="seo-growth-modal" role="dialog" aria-modal="true" aria-label={c.setupTitle}><header><div><span><PlugsConnected size={22} /></span><div><h2>{c.setupTitle}</h2><p>{c.setupSub}</p></div></div><button onClick={() => setSetupOpen(false)} aria-label={c.close}><X size={20} /></button></header><nav>{[[1,c.step1],[2,c.step2],[3,c.step3]].map(([step,label]) => <span key={step} className={setupStep >= step ? "active" : ""}><i>{step}</i>{label}</span>)}</nav>{setupStep === 1 && <label><span>{c.domain}</span><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={c.domainHint} /></label>}{setupStep === 2 && <div className="seo-growth-setup-info"><ShieldCheck size={26} weight="duotone" /><strong>{c.step2}</strong><p>{c.verifyBody}</p></div>}{setupStep === 3 && <div className="seo-growth-setup-info"><Database size={26} weight="duotone" /><strong>{c.step3}</strong><p>{c.sourceBody}</p></div>}<footer><button className="secondary" onClick={() => setSetupOpen(false)}>{c.close}</button><button className="primary" onClick={() => setupStep < 3 ? setSetupStep(setupStep + 1) : setSetupOpen(false)}>{setupStep < 3 ? c.next : c.finish}<ArrowRight size={15} /></button></footer></section></div>}
  </div>;
}

function ToolPage({ tool, catalog, locale, authenticated, runtime, account, onBack, onAuth, onCompleted, onModelChange }) {
  if (tool.slug === "seo-agent") return <SeoAgentWorkspace locale={locale} account={account} onBack={onBack} onCompleted={onCompleted} />;
  if (tool.slug === "ai-writer") return <AiWriterPage tool={tool} catalog={catalog} locale={locale} authenticated={authenticated} runtime={runtime} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} onModelChange={onModelChange} />;
  if (tool.slug === "seo-workbench" || catalog?.specialist) return <SeoWorkbenchPage tool={tool} catalog={catalog} locale={locale} authenticated={authenticated} runtime={runtime} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} onModelChange={onModelChange} />;
  const t = dictionary[locale];
  const Icon = iconMap[tool.icon] || Wrench;
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [quality, setQuality] = useState(75);
  const [tolerance, setTolerance] = useState(48);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [recording, setRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const recognitionRef = useRef(null);
  const name = locale === "en" ? tool.nameEn : tool.nameZh;
  const description = locale === "en" ? tool.descriptionEn : tool.descriptionZh;
  const isImage = ["background-remover", "image-compressor"].includes(tool.slug);
  const isFile = isImage || tool.slug === "pdf-summary";
  const isText = tool.slug === "copy-polish";
  const isSpeech = tool.slug === "speech-to-text";
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);
  useEffect(() => {
    setModelConnectionId(runtimeTool?.modelConnectionId || "managed");
  }, [runtimeTool?.modelConnectionId, tool.id]);

  const run = async () => {
    if (!authenticated) return onAuth();
    if ((isFile && !file) || (!isFile && !text.trim())) return setError(t.inputRequired);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      let options;
      if (isFile) {
        const form = new FormData();
        form.append("file", file);
        if (modelConnectionId) form.append("modelConnectionId", modelConnectionId);
        if (tool.slug === "background-remover") form.append("tolerance", String(tolerance));
        if (tool.slug === "image-compressor") form.append("quality", String(quality));
        options = { method: "POST", body: form };
      } else {
        options = jsonOptions("POST", { text, modelConnectionId });
      }
      const response = await api(`/api/tool-actions/${tool.slug}`, options);
      setResult(response);
      onCompleted?.(response);
    } catch (caught) {
      setError(caught.status === 402 ? t.insufficient : t.error);
    } finally {
      setBusy(false);
    }
  };

  const toggleSpeech = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setError(t.browserUnsupported);
    const recognition = new SpeechRecognition();
    recognition.lang = locale === "en" ? "en-US" : "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      setText(transcript);
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => { setRecording(false); setError(t.error); };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setError("");
  };

  const copyOutput = async () => {
    if (!result?.output?.text) return;
    await navigator.clipboard.writeText(result.output.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const changeModel = async (value) => {
    const previous = modelConnectionId;
    setModelConnectionId(value);
    try {
      await onModelChange?.(tool.id, value);
    } catch {
      setModelConnectionId(previous);
      setError(t.error);
    }
  };

  return <div className="tool-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{t.backToMarket}</button>
    <header className="tool-page-header"><span className={`tool-icon large ${tool.category}`}><Icon size={31} /></span><div><p className="eyebrow">{t.toolWorkspace}</p><h1>{name}</h1><p>{description}</p></div><div className="tool-run-meta"><StatusPill status={tool.runtimeStatus} locale={locale} /><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span></div></header>
    <div className="tool-workspace-grid">
      <section className="surface tool-input-panel">
        <h2>{isImage ? t.imageInput : tool.slug === "pdf-summary" ? t.pdfInput : isSpeech ? t.speechInput : t.textInput}</h2>
        {isFile && <label className={`tool-dropzone ${file ? "selected" : ""}`}><input type="file" accept={isImage ? "image/*" : "application/pdf"} onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); }} /><CloudArrowUp size={30} /><strong>{file ? `${t.selectedFile}: ${file.name}` : t.chooseFile}</strong><span>{file ? formatBytes(file.size) : isImage ? "PNG · JPG · WEBP" : "PDF"}</span></label>}
        {isText && <textarea className="tool-textarea" rows={12} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} />}
        {isSpeech && <><div className={`speech-pad ${recording ? "recording" : ""}`}><button onClick={toggleSpeech}>{recording ? <StopCircle size={28} weight="fill" /> : <Microphone size={28} weight="fill" />}<span>{recording ? t.stopSpeech : t.startSpeech}</span></button></div><textarea className="tool-textarea" rows={7} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} /></>}
        {authenticated && tool.runtimeKind === "openai" && <label className="model-select-field"><span>{t.selectModel}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">{t.useManaged}</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}
        {tool.slug === "background-remover" && <label className="range-field"><span>{t.imageTolerance}<strong>{tolerance}</strong></span><input type="range" min="12" max="120" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} /></label>}
        {tool.slug === "image-compressor" && <label className="range-field"><span>{t.imageQuality}<strong>{quality}%</strong></span><input type="range" min="30" max="95" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>}
        {!authenticated && <div className="tool-auth-notice"><LockKey size={18} /><span>{t.loginToUse}</span><button onClick={onAuth}>{t.signInAction}</button></div>}
        {error && <p className="form-error"><Warning size={17} />{error}</p>}
        <button className="primary-button tool-run-button" onClick={isSpeech && !text.trim() ? toggleSpeech : run} disabled={busy}>{busy ? <><SpinnerGap className="spin" size={19} />{t.processing}</> : <><Play size={18} weight="fill" />{isSpeech && !text.trim() ? t.startSpeech : t.startProcessing}</>}</button>
      </section>
      <section className="surface tool-result-panel">
        <div className="tool-result-heading"><h2>{t.result}</h2>{result?.output?.mode && <span>{result.output.mode === "ai" ? t.aiMode : t.localMode}</span>}</div>
        {!result && <EmptyState icon={Icon} title={t.result} body={locale === "en" ? "Your processed result will appear here." : "处理完成后，结果会显示在这里。"} />}
        {result?.file && <div className="file-result">{result.file.mimeType.startsWith("image/") && <div className="result-preview"><img src={result.file.downloadUrl} alt={result.file.name} /></div>}<div className="result-file-row"><span className="file-icon"><File size={19} /></span><div><strong>{result.file.name}</strong><small>{formatBytes(result.file.sizeBytes)}</small></div><a className="primary-button" href={result.file.downloadUrl}><DownloadSimple size={17} />{t.downloadResult}</a></div>{result.output.savedPercent !== undefined && <div className="result-stats"><span>{locale === "en" ? "Original" : "原始大小"}<strong>{formatBytes(result.output.originalBytes)}</strong></span><span>{locale === "en" ? "Compressed" : "压缩后"}<strong>{formatBytes(result.output.compressedBytes)}</strong></span><span>{locale === "en" ? "Saved" : "节省空间"}<strong>{result.output.savedPercent}%</strong></span></div>}</div>}
        {result?.output?.text && <div className="text-result"><pre>{result.output.text}</pre><button className="secondary-button" onClick={copyOutput}><Copy size={17} />{copied ? t.copied : t.copyResult}</button></div>}
      </section>
    </div>
  </div>;
}

function PublicToolShell({ tool, catalog, locale, authenticated, onBack, onAuth, onLocale, onCompleted }) {
  const t = dictionary[locale];
  return <div className="guest-shell"><header className="guest-header"><Brand /><nav><button onClick={onBack}>{t.marketplace}</button><span>{locale === "en" ? tool.nameEn : tool.nameZh}</span></nav><div><button className="locale-button" onClick={onLocale}><Translate size={17} />{t.language}</button><button className="primary-button" onClick={onAuth}>{t.login}</button></div></header><main className="public-tool-main"><ToolPage tool={tool} catalog={catalog} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} /></main></div>;
}

function TaskRow({ task, locale, onCancel }) {
  const Icon = iconMap[task.icon] || Wrench;
  return <div className="task-row"><span className="tool-icon compact"><Icon size={20} /></span><div className="task-main"><strong>{locale === "en" ? task.toolNameEn : task.toolNameZh}</strong><small>{formatDate(task.createdAt, locale)}</small></div><span className="task-cost">−{task.creditCost}</span><StatusPill status={task.status} locale={locale} />{onCancel && ["queued", "waiting_for_runtime"].includes(task.status) && <button className="icon-button" onClick={(event) => { event.stopPropagation(); onCancel(task.id); }}><X size={18} /></button>}</div>;
}

function Dashboard({ data, tools, locale, onNavigate, onSearch }) {
  const t = dictionary[locale];
  const [homeQuery, setHomeQuery] = useState("");
  if (!data) return <Loading locale={locale} />;
  const metrics = [
    [t.creditsBalance, data.metrics.credits, Coins, "blue"], [t.taskCount, data.metrics.tasks, ListChecks, "purple"],
    [t.fileCount, data.metrics.files, FolderOpen, "green"], [t.completed, data.metrics.completed, CheckCircle, "orange"],
  ];
  const submitSearch = (event) => {
    event.preventDefault();
    onSearch(homeQuery.trim());
  };
  return <div className="page-stack"><section className="welcome-panel home-discovery"><div className="welcome-copy"><p className="eyebrow">ONESH​OWTOOLS PLATFORM</p><h1>{t.today}</h1><p>{t.todaySub}</p></div>
    <form className="home-search" onSubmit={submitSearch}><MagnifyingGlass size={21} /><input value={homeQuery} onChange={(event) => setHomeQuery(event.target.value)} placeholder={t.search} /><button>{t.searchAction}</button></form>
    <div className="home-suggestions"><span>{t.popularTools}</span><div>{tools.slice(0, 5).map((tool) => { const Icon = iconMap[tool.icon] || Wrench; const name = locale === "en" ? tool.nameEn : tool.nameZh; return <button key={tool.id} onClick={() => onSearch(name)}><Icon size={15} />{name}</button>; })}<button className="browse-all-chip" onClick={() => onNavigate("marketplace")}><SquaresFour size={15} />{t.openMarketplace}</button></div></div>
  </section>
    <section><SectionTitle title={t.overview} /><div className="metric-grid">{metrics.map(([label, value, Icon, tone]) => <article className="metric-card" key={label}><span className={`metric-icon ${tone}`}><Icon size={22} /></span><div><strong>{value.toLocaleString()}</strong><span>{label}</span></div></article>)}</div></section>
    <section><SectionTitle title={t.recentTasks} action={<button className="text-button" onClick={() => onNavigate("tasks")}>{t.nav.tasks}<ArrowRight size={16} /></button>} /><div className="surface">{data.recentTasks.length ? <div className="task-list">{data.recentTasks.map((task) => <TaskRow task={task} locale={locale} key={task.id} />)}</div> : <EmptyState title={t.noTasks} body={t.noTasksHint} action={<button className="secondary-button" onClick={() => onNavigate("marketplace")}>{t.openMarketplace}</button>} />}</div></section>
  </div>;
}

function Marketplace({ tools, locale, query, onQuery, onRun }) {
  const t = dictionary[locale];
  const [category, setCategory] = useState("all");
  const selectedCategory = marketplaceCategories.find((item) => item.id === category) || marketplaceCategories[0];
  const visible = tools.filter((tool) => {
    const text = `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase();
    return (category === "all" || selectedCategory.accepts.includes(tool.category)) && (!query || text.includes(query.toLowerCase()));
  });
  const categoryCount = (item) => item.id === "all" ? tools.length : tools.filter((tool) => item.accepts.includes(tool.category)).length;
  return <div className="page-stack marketplace-page">
    <section className="marketplace-intro">
      <PageHeading title={t.marketplace} subtitle={t.marketplaceSub} />
      <div className="marketplace-search"><MagnifyingGlass size={22} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t.search} />{query ? <button aria-label={t.close} onClick={() => onQuery("")}><X size={16} /></button> : <kbd>⌘ K</kbd>}</div>
    </section>
    <div className="marketplace-browser">
      <aside className="marketplace-categories">
        <header><span>{t.categoryDirectory}</span><small>{tools.length} {t.availableTools}</small></header>
        <nav>{marketplaceCategories.map((item) => { const CategoryIcon = item.icon; const count = categoryCount(item); return <button className={category === item.id ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)}><span><CategoryIcon size={17} />{t[item.id]}</span><small>{count}</small></button>; })}</nav>
      </aside>
      <section className="marketplace-directory">
        <header><div><span>{t.marketplaceResults}</span><h2>{t[selectedCategory.id]}</h2></div><small>{visible.length} {t.toolsFound}</small></header>
        {visible.length ? <div className="marketplace-tool-list">{visible.map((tool) => { const Icon = iconMap[tool.icon] || Wrench; const usesModel = tool.modelConfigurable || ["document", "writing"].includes(tool.category); return <article className="marketplace-tool-row" key={tool.id}><span className={`tool-icon compact ${tool.category}`}><Icon size={21} /></span><div><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3><p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p></div><div className="marketplace-tool-meta">{usesModel ? <span className="status-pill ready"><CheckCircle size={14} weight="fill" />{t.configured}</span> : <StatusPill status={tool.runtimeStatus} locale={locale} />}<span><Coins size={14} />{tool.creditCost}</span></div><button className="marketplace-open" aria-label={t.run} onClick={() => onRun(tool)}><ArrowRight size={19} /></button></article>; })}</div> : <EmptyState icon={selectedCategory.icon} title={query ? t.noResults : t.comingSoon} body={query ? undefined : t.comingSoonHint} action={!query && <button className="secondary-button" onClick={() => setCategory("all")}>{t.all}</button>} />}
      </section>
    </div>
  </div>;
}

function Runtime({ data, locale, onRefresh, onNotice }) {
  const t = dictionary[locale];
  const [form, setForm] = useState({ name: "", providerTemplate: "openai", baseUrl: "", modelId: "", apiKey: "" });
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [settingsTool, setSettingsTool] = useState(null);
  const [toolModelDraft, setToolModelDraft] = useState("managed");
  useEffect(() => {
    if (!showForm && !settingsTool) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setShowForm(false);
      setSettingsTool(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showForm, settingsTool]);
  if (!data) return <Loading locale={locale} />;
  const mutate = async (path, options, success) => {
    setBusy(true);
    try {
      await api(path, options);
      await onRefresh();
      onNotice(success);
      return true;
    } catch {
      onNotice(t.error);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (testResult?.status !== "healthy") return onNotice(t.testRequired);
    const saved = await mutate("/api/model-connections", jsonOptions("POST", form), t.configured);
    if (saved) {
      setForm({ name: "", providerTemplate: "openai", baseUrl: "", modelId: "", apiKey: "" });
      setTestResult(null);
      setShowForm(false);
    }
  };
  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setTestResult(null);
  };
  const updateProvider = (providerTemplate) => {
    setForm((current) => ({ ...current, providerTemplate }));
    setTestResult(null);
  };
  const testDraftConnection = async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const result = await api("/api/model-connections/validate", jsonOptions("POST", form));
      setTestResult(result);
      onNotice(result.status === "healthy" ? t.testPassed : `${t.testFailed}：${modelTestLabel(result.status, locale)}`);
    } catch (error) {
      const status = String(error.message || "unavailable").toLowerCase();
      setTestResult({ status });
      onNotice(`${t.testFailed}：${modelTestLabel(status, locale)}`);
    } finally {
      setBusy(false);
    }
  };
  const testSavedConnection = async (connection) => {
    setBusy(true);
    try {
      const result = await api(`/api/model-connections/${connection.id}/test`, { method: "POST" });
      await onRefresh();
      onNotice(result.status === "healthy" ? t.testPassed : `${t.testFailed}：${modelTestLabel(result.status, locale)}`);
    } catch {
      onNotice(t.testFailed);
    } finally {
      setBusy(false);
    }
  };
  const openToolSettings = (tool) => {
    setSettingsTool(tool);
    setToolModelDraft(tool.modelConnectionId || "managed");
  };
  const saveToolSettings = async (event) => {
    event.preventDefault();
    const saved = await mutate(`/api/tools/${settingsTool.id}/model`, jsonOptions("PATCH", {
      modelConnectionId: toolModelDraft,
    }), t.modelRouteSaved);
    if (saved) setSettingsTool(null);
  };
  const orderedTools = [...data.tools].sort(
    (first, second) => Number(second.modelConfigurable) - Number(first.modelConfigurable),
  );
  return <div className="page-stack runtime-page"><PageHeading title={t.runtime} subtitle={t.runtimeSub} action={data.byokEnabled ? <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={18} />{t.addModel}</button> : null} />
    <article className="runtime-hero surface"><div className="runtime-identity"><span className="runtime-hero-icon"><Sparkle size={27} weight="fill" /></span><div><span className="runtime-kicker">{t.managedModel}</span><h2>{data.managed.name}</h2><p>{t.managedDescription}</p></div></div><div className="runtime-health"><span className={`runtime-live-dot ${data.managed.configured ? "on" : ""}`} /><div><strong>{data.managed.configured ? t.runtimeReady : t.notConfigured}</strong><small>{data.managed.configured ? t.online : t.runtimeNote}</small></div></div><div className="runtime-stats"><div><strong>{data.connections.length}</strong><span>{t.connectionCount}</span></div><div><strong>{data.tools.length}</strong><span>{t.enabledTools}</span></div></div></article>
    <div className="runtime-security-note"><ShieldCheck size={18} weight="fill" /><span>{t.keyPrivacy}</span></div>
    <section className="runtime-section"><div className="runtime-section-heading"><div><h2>{t.personalModels}</h2><p>{t.connectionsHint}</p></div>{data.byokEnabled && <button className="secondary-button" onClick={() => setShowForm(true)}><Plus size={17} />{t.addModel}</button>}</div>
      <div className="connection-list">{data.connections.length ? data.connections.map((connection) => <article className="connection-card surface" key={connection.id}><span className="connection-icon"><PlugsConnected size={21} /></span><div className="connection-copy"><h3>{connection.name}</h3><p>{connection.modelId} · {connection.keyHint}</p><small className="connection-endpoint">{connection.baseUrl}</small><small><span className={`connection-state ${connection.lastTestStatus === "healthy" ? "active" : connection.status}`} />{modelTestLabel(connection.lastTestStatus, locale)}{connection.lastTestLatencyMs ? ` · ${connection.lastTestLatencyMs}ms` : ""}</small></div><div className="connection-actions"><button disabled={busy} onClick={() => testSavedConnection(connection)}>{t.testConnection}</button><button disabled={busy} onClick={() => { const apiKey = window.prompt(t.apiKey); if (apiKey) mutate(`/api/model-connections/${connection.id}/rotate`, jsonOptions("POST", { apiKey }), t.configured); }}>{t.rotateKey}</button><button disabled={busy} onClick={() => mutate(`/api/model-connections/${connection.id}`, jsonOptions("PATCH", { status: connection.status === "active" ? "disabled" : "active" }), t.configured)}>{connection.status === "active" ? t.disable : t.enable}</button><button className="danger-link" disabled={busy} onClick={() => mutate(`/api/model-connections/${connection.id}`, { method: "DELETE" }, t.deleteConnection)}>{t.deleteConnection}</button></div></article>) : <div className="surface empty-connection"><span><PlugsConnected size={25} /></span><div><h3>{t.noConnections}</h3><p>{t.connectionsHint}</p></div>{data.byokEnabled && <button className="secondary-button" onClick={() => setShowForm(true)}><Plus size={17} />{t.addFirstConnection}</button>}</div>}</div>
    </section>
    <section className="runtime-section"><div className="runtime-section-heading"><div><h2>{t.toolRouting}</h2><p>{t.toolRoutingHint}</p></div></div><div className="runtime-tool-grid">{orderedTools.map((tool) => { const Icon = iconMap[tool.icon] || Wrench; const toolName = locale === "en" ? tool.nameEn : tool.nameZh; const selectedConnection = data.connections.find((item) => item.id === tool.modelConnectionId); return <article className={`runtime-tool-card surface ${tool.modelConfigurable ? "configurable" : "local"}`} key={tool.id}><span className={`tool-icon compact ${tool.category}`}><Icon size={20} /></span><div className="runtime-tool-copy"><strong>{toolName}</strong><small>{tool.modelConfigurable ? `${t.currentModel}：${selectedConnection?.name || "OneShowModel"}` : t.localTool}</small></div>{tool.modelConfigurable ? <div className="runtime-tool-actions"><span className="status-pill ready"><CheckCircle size={14} weight="fill" />{t.configured}</span><button onClick={() => openToolSettings(tool)}><GearSix size={15} />{t.toolSettings}</button></div> : <StatusPill status={tool.runtimeStatus} locale={locale} />}</article>; })}</div></section>
    {showForm && <div className="runtime-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><div className="runtime-dialog surface" role="dialog" aria-modal="true" aria-labelledby="runtime-dialog-title"><header><div><span className="runtime-dialog-icon"><PlugsConnected size={21} /></span><div><h2 id="runtime-dialog-title">{t.addModel}</h2><p>{t.keyPrivacy}</p></div></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label={t.close}><X size={19} /></button></header><form className="connection-form" onSubmit={submit}><label><span>{t.connectionName}</span><input autoFocus required maxLength={80} value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label><label><span>{t.providerTemplate}</span><select value={form.providerTemplate} onChange={(event) => updateProvider(event.target.value)}><option value="" disabled>{t.providerTemplate}</option>{data.supportedTemplates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="connection-base-url"><span>{t.baseUrl}</span><input required type="url" placeholder={t.baseUrlPlaceholder} value={form.baseUrl} onChange={(event) => updateForm("baseUrl", event.target.value)} /></label><label><span>{t.model}</span><input required value={form.modelId} onChange={(event) => updateForm("modelId", event.target.value)} /></label><label><span>{t.apiKey}</span><input required type="password" autoComplete="new-password" value={form.apiKey} onChange={(event) => updateForm("apiKey", event.target.value)} /></label>{testResult && <div className={`connection-test-result ${testResult.status === "healthy" ? "success" : "error"}`}><span>{testResult.status === "healthy" ? <CheckCircle size={17} weight="fill" /> : <Warning size={17} weight="fill" />}</span><strong>{modelTestLabel(testResult.status, locale)}</strong>{testResult.latencyMs ? <small>{testResult.latencyMs}ms</small> : null}</div>}<footer><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>{t.close}</button><button type="button" className="secondary-button" disabled={busy || !form.name || !form.baseUrl || !form.modelId || !form.apiKey} onClick={testDraftConnection}>{busy ? <SpinnerGap className="spin" size={17} /> : <PlugsConnected size={17} />}{busy ? t.testingConnection : t.testBeforeSave}</button><button className="primary-button" disabled={busy || testResult?.status !== "healthy"}>{busy ? <SpinnerGap className="spin" size={18} /> : <LockKey size={18} />}{t.saveConnection}</button></footer></form></div></div>}
    {settingsTool && <div className="runtime-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsTool(null); }}><div className="runtime-dialog tool-settings-dialog surface" role="dialog" aria-modal="true" aria-labelledby="tool-settings-title"><header><div><span className="runtime-dialog-icon"><GearSix size={21} /></span><div><h2 id="tool-settings-title">{locale === "en" ? settingsTool.nameEn : settingsTool.nameZh} · {t.toolSettings}</h2><p>{t.toolSettingsHint}</p></div></div><button className="icon-button" onClick={() => setSettingsTool(null)} aria-label={t.close}><X size={19} /></button></header><form className="tool-settings-form" onSubmit={saveToolSettings}><label><span>{t.selectModel}</span><select autoFocus value={toolModelDraft} onChange={(event) => setToolModelDraft(event.target.value)}><option value="managed">{t.useManaged}</option>{data.connections.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label><div className="tool-settings-default"><Sparkle size={19} weight="fill" /><div><strong>OneShowModel</strong><small>{t.managedDescription}</small></div></div><footer><button type="button" className="secondary-button" onClick={() => setSettingsTool(null)}>{t.close}</button><button className="primary-button" disabled={busy}><Check size={17} />{t.saveSettings}</button></footer></form></div></div>}
  </div>;
}

function Credits({ data, locale }) {
  const t = dictionary[locale];
  if (!data) return <Loading locale={locale} />;
  let running = data.balance;
  const ledger = data.ledger.map((entry) => { const item = { ...entry, balanceAfter: running }; running -= entry.amount; return item; });
  return <div className="page-stack"><PageHeading title={t.credits} subtitle={t.creditsSub} /><article className="balance-card"><span><Coins size={24} /></span><div><small>{t.creditsBalance}</small><strong>{data.balance.toLocaleString()}</strong></div></article>
    <section><SectionTitle title={t.ledger} /><div className="surface data-table"><div className="table-head credits-head"><span>{t.description}</span><span>{t.time}</span><span>{t.amount}</span><span>{t.balance}</span></div>{ledger.map((entry) => <div className="table-row credits-row" key={entry.id}><strong>{locale === "en" ? entry.descriptionEn : entry.descriptionZh}</strong><span>{formatDate(entry.createdAt, locale)}</span><span className={entry.amount > 0 ? "positive" : "negative"}>{entry.amount > 0 ? "+" : ""}{entry.amount}</span><span>{entry.balanceAfter}</span></div>)}</div></section>
  </div>;
}

function Billing({ plans, status, locale, onCheckout, onPortal }) {
  const t = dictionary[locale];
  if (!status) return <Loading locale={locale} />;
  return <div className="page-stack"><PageHeading title={t.billing} subtitle={t.billingSub} /><div className={`notice-card ${status.configured ? "success" : "warning"}`}>{status.configured ? <CheckCircle size={21} /> : <Warning size={21} />}<p>{status.configured ? t.billingReady : t.billingUnavailable}</p></div>
    <section><SectionTitle title={t.currentPlan} action={status.subscription && status.configured ? <button className="secondary-button" onClick={onPortal}>{t.billingPortal}</button> : null} /><article className="current-plan surface"><div><span className="plan-icon"><CreditCard size={24} /></span><div><small>{t.currentPlan}</small><h3>{status.subscription ? (locale === "en" ? status.subscription.nameEn : status.subscription.nameZh) : t.free}</h3></div></div><span className="status-pill completed"><CheckCircle size={14} weight="fill" />{status.subscription?.status || "active"}</span></article><p className="billing-note">{t.pendingConfirmation}</p></section>
    <div className="plan-grid">{plans.map((plan) => <article className={`plan-card surface ${plan.code === "pro-monthly" ? "featured" : ""}`} key={plan.id}><span className="plan-badge">{plan.code === "pro-monthly" ? t.planPro : t.free}</span><h2>{locale === "en" ? plan.nameEn : plan.nameZh}</h2><p>{plan.code === "pro-monthly" ? t.planDesc : t.welcomeSub}</p><strong className="plan-price">{new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", { style: "currency", currency: plan.currency }).format(plan.amountMinor / 100)}<small> / {t.monthly}</small></strong><div className="plan-credit"><Coins size={18} />{plan.recurringCredits.toLocaleString()} {t.credits}</div>{plan.code === "pro-monthly" && <button className="primary-button full" disabled={!status.configured} onClick={() => onCheckout(plan.id)}>{t.subscribe}</button>}</article>)}</div>
    <section><SectionTitle title={t.invoices} /><div className="surface account-list">{status.invoices?.length ? status.invoices.map((invoice) => <div className="account-list-row" key={invoice.id}><div><strong>{invoice.status}</strong><small>{formatDate(invoice.createdAt, locale)}</small></div><span>{new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", { style: "currency", currency: invoice.currency }).format(invoice.amountPaid / 100)}</span>{invoice.hostedUrl && <a href={invoice.hostedUrl} target="_blank" rel="noreferrer">{t.download}</a>}</div>) : <p className="account-empty">{t.noInvoices}</p>}</div></section>
  </div>;
}

function Tasks({ tasks, locale, onRefresh, onCancel }) {
  const t = dictionary[locale];
  const [selected, setSelected] = useState(null);
  return <div className="page-stack"><PageHeading title={t.tasks} subtitle={t.tasksSub} action={<button className="secondary-button" onClick={onRefresh}><ArrowClockwise size={17} />{t.retry}</button>} /><div className="surface task-center">{tasks.length ? tasks.map((task) => <div className="task-row-button" role="button" tabIndex="0" key={task.id} onClick={() => setSelected(task)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(task); }}><TaskRow task={task} locale={locale} onCancel={onCancel} /></div>) : <EmptyState title={t.noTasks} body={t.noTasksHint} />}</div>
    {selected && <div className="detail-drawer"><header><div><small>{selected.id}</small><h3>{locale === "en" ? selected.toolNameEn : selected.toolNameZh}</h3></div><button className="icon-button" onClick={() => setSelected(null)}><X size={19} /></button></header><StatusPill status={selected.status} locale={locale} /><section><h4>{t.inputLabel}</h4><pre>{selected.input?.text || "—"}</pre></section><section><h4>{t.taskOutput}</h4><pre>{selected.output?.text || selected.errorCode || "—"}</pre></section></div>}
  </div>;
}

function Files({ files, locale, onUpload, onDelete }) {
  const t = dictionary[locale];
  const inputRef = useRef(null);
  return <div className="page-stack"><PageHeading title={t.files} subtitle={t.filesSub} action={<><input ref={inputRef} className="visually-hidden" type="file" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} /><button className="primary-button" onClick={() => inputRef.current?.click()}><CloudArrowUp size={18} />{t.upload}</button></>} />
    <div className="upload-zone" onClick={() => inputRef.current?.click()}><CloudArrowUp size={28} /><strong>{t.upload}</strong><span>{t.uploadHint}</span></div><div className="surface files-table">{files.length ? <><div className="table-head files-head"><span>{t.fileName}</span><span>{t.size}</span><span>{t.time}</span><span /></div>{files.map((file) => <div className="table-row file-row" key={file.id}><div><span className="file-icon"><File size={19} /></span><strong>{file.name}</strong></div><span>{formatBytes(file.sizeBytes)}</span><span>{formatDate(file.createdAt, locale)}</span><div><a className="icon-button" href={`/api/files/${file.id}/download`} title={t.download}><CloudArrowUp size={18} className="download-icon" /></a><button className="icon-button danger" onClick={() => onDelete(file.id)} title={t.delete}><Trash size={18} /></button></div></div>)}</> : <EmptyState icon={FolderOpen} title={t.emptyFiles} body={t.uploadHint} />}</div>
  </div>;
}

function Account({ user, health, locale, onLogout, onUserChange, onLocaleChange, onNotice }) {
  const t = dictionary[locale];
  const [profile, setProfile] = useState({ name: user.name, locale });
  const [credentials, setCredentials] = useState({ currentPassword: "", newPassword: "", email: "" });
  const [sessions, setSessions] = useState([]);
  const refreshSessions = useCallback(() => api("/api/account/sessions").then((result) => setSessions(result.sessions)).catch(() => setSessions([])), []);
  useEffect(() => { refreshSessions(); }, [refreshSessions]);
  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const result = await api("/api/account/profile", jsonOptions("PATCH", profile));
      onUserChange(result.user);
      onLocaleChange(result.user.locale);
      onNotice(t.saveProfile);
    } catch { onNotice(t.error); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    try {
      await api("/api/account/password", jsonOptions("POST", credentials));
      setCredentials({ ...credentials, currentPassword: "", newPassword: "" });
      onNotice(t.changePassword);
      refreshSessions();
    } catch { onNotice(t.error); }
  };
  const changeEmail = async (event) => {
    event.preventDefault();
    try {
      await api("/api/account/email", jsonOptions("POST", { email: credentials.email, password: credentials.currentPassword }));
      onNotice(t.verificationPending);
    } catch { onNotice(t.error); }
  };
  const exportData = async () => {
    try {
      const result = await api("/api/account/export", { method: "POST" });
      location.assign(`/api/account/exports/${result.export.id}/download`);
    } catch { onNotice(t.error); }
  };
  const deleteAccount = async () => {
    if (!credentials.currentPassword) return onNotice(t.invalid);
    try {
      await api("/api/account/deletion", jsonOptions("POST", { password: credentials.currentPassword }));
      onLogout();
    } catch { onNotice(health.accountDeletionEnabled ? t.error : t.deletionUnavailable); }
  };
  return <div className="page-stack"><PageHeading title={t.account} subtitle={t.accountSub} /><div className="account-grid"><article className="surface profile-panel"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><h2>{user.name}</h2><p>{user.email}</p><dl><div><dt>{t.emailStatus}</dt><dd>{user.emailVerified ? t.verified : t.pendingVerify}</dd></div><div><dt>{t.memberSince}</dt><dd>{formatDate(user.createdAt, locale)}</dd></div></dl><button className="secondary-button full" onClick={onLogout}><SignOut size={17} />{t.logout}</button></article>
    <div className="account-settings"><article className="surface settings-panel"><SectionTitle title={t.accountProfile} /><form className="auth-form" onSubmit={saveProfile}><label>{t.name}<input required maxLength={80} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>{t.language}<select value={profile.locale} onChange={(event) => setProfile({ ...profile, locale: event.target.value })}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label><button className="primary-button" type="submit">{t.saveProfile}</button></form></article>
      <article className="surface settings-panel"><SectionTitle title={t.accountSecurity} /><form className="auth-form" onSubmit={changePassword}><label>{t.currentPassword}<input type="password" required value={credentials.currentPassword} onChange={(event) => setCredentials({ ...credentials, currentPassword: event.target.value })} /></label><label>{t.newPassword}<input type="password" required minLength={10} value={credentials.newPassword} onChange={(event) => setCredentials({ ...credentials, newPassword: event.target.value })} /></label><button className="secondary-button" type="submit">{t.changePassword}</button></form><form className="auth-form compact-form" onSubmit={changeEmail}><label>{t.newEmail}<input type="email" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label><button className="secondary-button" type="submit">{t.changeEmail}</button></form></article>
      <article className="surface settings-panel"><SectionTitle title={t.activeSessions} action={sessions.length > 1 ? <button className="text-button" onClick={async () => { await api("/api/account/sessions/others", { method: "DELETE" }); refreshSessions(); }}>{t.revokeOthers}</button> : null} /><div className="account-list">{sessions.map((session) => <div className="account-list-row" key={session.id}><div><strong>{session.current ? t.online : session.userAgent || "Browser"}</strong><small>{formatDate(session.lastSeenAt || session.createdAt, locale)}</small></div><span>{formatDate(session.expiresAt, locale)}</span></div>)}</div></article>
      <article className="surface settings-panel"><SectionTitle title={t.privacyControls} /><div className="privacy-actions"><button className="secondary-button" onClick={exportData}><DownloadSimple size={17} />{t.exportData}</button><button className="secondary-button danger" disabled={!health.accountDeletionEnabled} onClick={deleteAccount}><Trash size={17} />{t.deleteAccount}</button></div>{!health.accountDeletionEnabled && <p className="account-empty">{t.deletionUnavailable}</p>}</article>
      <article className="surface system-panel"><SectionTitle title={t.system} /><SystemRow icon={Database} name={t.database} detail={t.online} ok /><SystemRow icon={Sparkle} name="OneShowModel" detail={health.oneShowModelEnabled ? t.configured : t.notConfigured} ok={health.oneShowModelEnabled} /><SystemRow icon={CreditCard} name="Billing" detail={health.billingEnabled ? t.configured : t.notConfigured} ok={health.billingEnabled} /></article></div></div>
  </div>;
}
function SystemRow({ icon: Icon, name, detail, ok }) {
  return <div className="system-row"><span className="system-icon"><Icon size={20} /></span><div><strong>{name}</strong><small>{detail}</small></div>{ok ? <CheckCircle size={20} weight="fill" /> : <Warning size={20} />}</div>;
}

function CapabilityNetwork({ locale }) {
  const canvasRef = useRef(null);
  const visualRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const visual = visualRef.current;
    if (!canvas || !visual) return undefined;
    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = visual.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      const motionTime = reducedMotion ? 0 : time * 0.00018;
      const centerX = width * 0.53 + pointerRef.current.x * 8;
      const centerY = height * 0.5 + pointerRef.current.y * 6;
      const rings = [
        { rx: width * 0.22, ry: height * 0.18, speed: 0.7, alpha: 0.32 },
        { rx: width * 0.32, ry: height * 0.27, speed: -0.45, alpha: 0.24 },
        { rx: width * 0.42, ry: height * 0.36, speed: 0.3, alpha: 0.18 },
      ];
      const ringRotation = -0.08;

      context.lineWidth = 1;
      rings.forEach((ring, index) => {
        context.strokeStyle = `rgba(23, 105, 232, ${ring.alpha})`;
        context.setLineDash(index === 2 ? [4, 5] : []);
        context.beginPath();
        context.ellipse(centerX, centerY, ring.rx, ring.ry, ringRotation, 0, Math.PI * 2);
        context.stroke();

        const packetCount = index === 1 ? 4 : 3;
        for (let packet = 0; packet < packetCount; packet += 1) {
          const angle = motionTime * ring.speed * Math.PI * 2 + packet * (Math.PI * 2 / packetCount) + index;
          const localX = Math.cos(angle) * ring.rx;
          const localY = Math.sin(angle) * ring.ry;
          const x = centerX + localX * Math.cos(ringRotation) - localY * Math.sin(ringRotation);
          const y = centerY + localX * Math.sin(ringRotation) + localY * Math.cos(ringRotation);
          const colors = ["#1769e8", "#8eb8f4", "#a7e8d3", "#f4c7ce"];
          context.fillStyle = colors[(packet + index) % colors.length];
          context.globalAlpha = packet === 0 ? 0.95 : 0.7;
          context.beginPath();
          context.roundRect(x - 4, y - 4, 8, 8, 2.5);
          context.fill();
        }
      });

      context.globalAlpha = 1;
      context.setLineDash([]);

      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      const bounds = visual.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - bounds.left) / bounds.width - 0.5,
        y: (event.clientY - bounds.top) / bounds.height - 0.5,
      };
    };
    const onPointerLeave = () => { pointerRef.current = { x: 0, y: 0 }; };
    const observer = new ResizeObserver(() => { resize(); if (reducedMotion) draw(); });
    observer.observe(visual);
    visual.addEventListener("pointermove", onPointerMove);
    visual.addEventListener("pointerleave", onPointerLeave);
    resize();
    draw();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      visual.removeEventListener("pointermove", onPointerMove);
      visual.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const labels = locale === "en"
    ? [["discover", MagnifyingGlass, "Discover capabilities", "Always expanding"], ["run", RocketLaunch, "Run tasks", "Smart routing"], ["result", CheckCircle, "Generate results", "Reliable output"]]
    : [["discover", MagnifyingGlass, "发现能力", "持续接入中"], ["run", RocketLaunch, "运行任务", "智能处理"], ["result", CheckCircle, "生成结果", "高效输出"]];

  return <div className="capability-visual" ref={visualRef} aria-label={locale === "en" ? "Animated OneShowTools capability network" : "OneShowTools 平台能力网络动效"}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <div className="capability-core"><span><SquaresFour size={31} weight="fill" /></span><strong>OneShowTools</strong></div>
    <div className="capability-statuses">{labels.map(([key, Icon, title, detail]) => <div className={`capability-status ${key}`} key={key}><span><Icon size={17} /></span><div><strong>{title}</strong><small><i />{detail}</small></div></div>)}</div>
  </div>;
}

function GuestHome({ locale, tools, onAuth, onLocale, onRun }) {
  const t = dictionary[locale];
  const [guestQuery, setGuestQuery] = useState("");
  const visibleTools = useMemo(() => tools.filter((tool) => {
    const haystack = `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase();
    return !guestQuery.trim() || haystack.includes(guestQuery.trim().toLowerCase());
  }), [guestQuery, tools]);
  const showResults = (event) => {
    event.preventDefault();
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };
  return <div className="guest-shell"><header className="guest-header"><Brand /><nav><a href="#tools">{t.marketplace}</a><a href="#tools">{t.runtime}</a><a href="#tools">{t.billing}</a></nav><div><button className="locale-button" onClick={onLocale}><Translate size={17} />{t.language}</button><button className="primary-button" onClick={onAuth}>{t.login}</button></div></header>
    <main><section className="guest-hero"><div className="guest-hero-copy"><span className="eyebrow">ONESH​OWTOOLS PLATFORM</span><h1>{t.today}</h1><p>{t.todaySub}</p>
      <form className="home-search guest-home-search" onSubmit={showResults}><MagnifyingGlass size={21} /><input value={guestQuery} onChange={(event) => setGuestQuery(event.target.value)} placeholder={t.search} /><button>{t.searchAction}</button></form>
      <div className="hero-actions"><button className="primary-button" onClick={onAuth}>{t.signInAction}<ArrowRight size={18} /></button><a className="secondary-button" href="#tools">{t.marketplace}</a></div></div><CapabilityNetwork locale={locale} /></section>
      <section id="tools" className="guest-tools"><SectionTitle title={t.marketplace} />{visibleTools.length ? <div className="tool-grid">{visibleTools.slice(0, 5).map((tool) => { const Icon = iconMap[tool.icon] || Wrench; return <article className="tool-card" key={tool.id}><header><span className={`tool-icon ${tool.category}`}><Icon size={24} /></span><StatusPill status={tool.runtimeStatus} locale={locale} /></header><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3><p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p><footer><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span><button onClick={() => onRun(tool)}>{t.run}<ArrowRight size={17} /></button></footer></article>; })}</div> : <EmptyState icon={MagnifyingGlass} title={t.noResults} />}</section>
    </main>
  </div>;
}

export function App() {
  const [locale, setLocale] = useState(() => localStorage.getItem("ost_locale") === "en" ? "en" : "zh-CN");
  const [view, setView] = useState(() => location.pathname.startsWith("/tools/") ? "tool" : "dashboard");
  const [session, setSession] = useState(undefined);
  const [health, setHealth] = useState({});
  const [tools, setTools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [writingCatalog, setWritingCatalog] = useState(null);
  const [seoCatalog, setSeoCatalog] = useState(null);
  const [privateData, setPrivateData] = useState({ dashboard: null, runtime: null, credits: null, billing: null, tasks: [], files: [] });
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(() => Boolean(new URLSearchParams(location.search).get("resetToken")));
  const [routeSlug, setRouteSlug] = useState(() => location.pathname.match(/^\/tools\/([^/]+)$/)?.[1] || null);
  const [toast, setToast] = useState("");
  const t = dictionary[locale];

  const loadPublic = useCallback(async () => {
    const [sessionResult, healthResult, toolsResult, plansResult, writingResult, seoResult] = await Promise.all([
      api("/api/auth/session").catch(() => ({ user: null })), api("/api/health").catch(() => ({})),
      api("/api/tools").catch(() => ({ tools: [] })), api("/api/plans").catch(() => ({ plans: [] })), api("/api/writing/catalog").catch(() => null), api("/api/seo/catalog").catch(() => null),
    ]);
    setSession(sessionResult.user || null); setHealth(healthResult); setTools(toolsResult.tools); setPlans(plansResult.plans); setWritingCatalog(writingResult); setSeoCatalog(seoResult);
  }, []);
  const loadPrivate = useCallback(async () => {
    if (!session) return;
    const [dashboard, runtime, credits, billing, tasks, files] = await Promise.all([
      api("/api/dashboard"), api("/api/runtime/status"), api("/api/credits"), api("/api/billing/status"), api("/api/tasks"), api("/api/files"),
    ]);
    setPrivateData({ dashboard, runtime, credits, billing, tasks: tasks.tasks, files: files.files });
  }, [session]);

  useEffect(() => { loadPublic(); }, [loadPublic]);
  useEffect(() => { if (session) loadPrivate().catch(() => setToast(t.error)); }, [session, loadPrivate, t.error]);
  useEffect(() => { document.documentElement.lang = locale; localStorage.setItem("ost_locale", locale); document.title = "OneShowTools Platform"; }, [locale]);
  useEffect(() => {
    const authStatus = new URLSearchParams(location.search).get("auth");
    if (!authStatus) return;
    setToast(authStatus === "verified" ? t.verified : authStatus === "email-changed" ? t.verified : t.invalid);
    history.replaceState({}, "", location.pathname + location.hash);
  }, [t.invalid, t.verified]);
  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (location.pathname.startsWith("/tools/")) {
          history.pushState({}, "", "/");
          setRouteSlug(null);
        }
        setView("marketplace");
        setTimeout(() => document.querySelector(".command-search input")?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const updateRoute = () => {
      const slug = location.pathname.match(/^\/tools\/([^/]+)$/)?.[1] || null;
      setRouteSlug(slug);
      if (slug) setView("tool");
    };
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const normalized = query.trim();
    if (!session || view !== "marketplace" || normalized.length < 2) return undefined;
    const resultCount = tools.filter((tool) => `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase().includes(normalized.toLowerCase())).length;
    const timer = setTimeout(() => api("/api/marketplace/search-events", jsonOptions("POST", { query: normalized, resultCount })).catch(() => {}), 900);
    return () => clearTimeout(timer);
  }, [query, session, tools, view]);

  const logout = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); setSession(null); setView("dashboard"); setPrivateData({ dashboard: null, runtime: null, credits: null, billing: null, tasks: [], files: [] }); };
  const openTool = (tool) => {
    if (session) api("/api/marketplace/behavior-events", jsonOptions("POST", { eventKind: "tool_open", toolSlug: tool.slug, category: tool.category, query: query.trim() || null })).catch(() => {});
    history.pushState({}, "", `/tools/${tool.slug}`);
    setRouteSlug(tool.slug);
    setView("tool");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const leaveTool = () => {
    history.pushState({}, "", session ? "/" : "/#tools");
    setRouteSlug(null);
    setView(session ? "marketplace" : "dashboard");
    if (!session) setTimeout(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }), 0);
  };
  const navigateView = (nextView) => {
    if (routeSlug) {
      history.pushState({}, "", "/");
      setRouteSlug(null);
    }
    setView(nextView);
  };
  const upload = async (file) => {
    const form = new FormData(); form.append("file", file);
    try { await api("/api/files", { method: "POST", body: form }); await loadPrivate(); } catch { setToast(t.error); }
  };
  const deleteFile = async (id) => { await api(`/api/files/${id}`, { method: "DELETE" }).catch(() => setToast(t.error)); await loadPrivate(); };
  const cancelTask = async (id) => { await api(`/api/tasks/${id}/cancel`, { method: "POST" }).catch(() => setToast(t.error)); await loadPrivate(); };
  const checkout = async (planId) => { try { const result = await api("/api/billing/checkout", jsonOptions("POST", { planId })); location.assign(result.url); } catch { setToast(t.billingUnavailable); } };
  const openBillingPortal = async () => { try { const result = await api("/api/billing/portal", { method: "POST" }); location.assign(result.url); } catch { setToast(t.billingUnavailable); } };

  if (session === undefined) return <Loading locale={locale} />;
  const routeTool = routeSlug ? tools.find((tool) => tool.slug === routeSlug) : null;
  if (!session && routeSlug && !routeTool) return <Loading locale={locale} />;
  const specialistCatalog = seoCatalogForTool(seoCatalog, routeTool);
  const activeCatalog = routeTool?.slug === "ai-writer" ? writingCatalog : (specialistCatalog || writingCatalog);
  if (!session) return <>{routeTool ? <PublicToolShell tool={routeTool} catalog={activeCatalog} locale={locale} authenticated={false} onBack={leaveTool} onAuth={() => setAuthOpen(true)} onLocale={() => setLocale(locale === "en" ? "zh-CN" : "en")} /> : <GuestHome locale={locale} tools={tools} onAuth={() => setAuthOpen(true)} onLocale={() => setLocale(locale === "en" ? "zh-CN" : "en")} onRun={openTool} />}{authOpen && <AuthDialog locale={locale} registrationEnabled={health.registrationEnabled} onClose={() => setAuthOpen(false)} onAuthenticated={setSession} />}</>;

  const navItems = [["dashboard", House], ["marketplace", SquaresFour], ["runtime", RocketLaunch], ["credits", Coins], ["billing", CreditCard], ["tasks", ListChecks], ["files", FolderOpen], ["account", User]];
  const content = {
    dashboard: <Dashboard data={privateData.dashboard} tools={tools} locale={locale} onNavigate={setView} onSearch={(value) => { setQuery(value); setView("marketplace"); }} />,
    marketplace: <Marketplace tools={tools} locale={locale} query={query} onQuery={setQuery} onRun={openTool} />,
    runtime: <Runtime data={privateData.runtime} locale={locale} onRefresh={loadPrivate} onNotice={setToast} />,
    credits: <Credits data={privateData.credits} locale={locale} />,
    billing: <Billing plans={plans} status={privateData.billing} locale={locale} onCheckout={checkout} onPortal={openBillingPortal} />,
    tasks: <Tasks tasks={privateData.tasks} locale={locale} onRefresh={loadPrivate} onCancel={cancelTask} />,
    files: <Files files={privateData.files} locale={locale} onUpload={upload} onDelete={deleteFile} />,
    account: <Account user={session} health={health} locale={locale} onLogout={logout} onUserChange={setSession} onLocaleChange={setLocale} onNotice={setToast} />,
    tool: routeTool ? <ToolPage tool={routeTool} catalog={activeCatalog} locale={locale} authenticated runtime={privateData.runtime} account={{ session, credits: privateData.credits }} onBack={leaveTool} onAuth={() => setAuthOpen(true)} onModelChange={async (toolId, modelConnectionId) => { await api(`/api/tools/${toolId}/model`, jsonOptions("PATCH", { modelConnectionId })); await loadPrivate(); setToast(t.modelRouteSaved); }} onCompleted={async () => { api("/api/marketplace/behavior-events", jsonOptions("POST", { eventKind: "tool_complete", toolSlug: routeTool.slug, category: routeTool.category })).catch(() => {}); setToast(t.taskCreated); await loadPrivate(); }} /> : <Marketplace tools={tools} locale={locale} query={query} onQuery={setQuery} onRun={openTool} />,
  }[view];

  const isWriter = ["ai-writer", "seo-workbench", "seo-agent"].includes(routeTool?.slug) || Boolean(seoSpecialistFor(seoCatalog, routeTool?.slug));
  return <div className="platform-shell"><aside className="sidebar"><Brand /><nav>{navItems.map(([key, Icon]) => <button className={view === key ? "active" : ""} onClick={() => navigateView(key)} key={key}><Icon size={20} weight={view === key ? "fill" : "regular"} /><span>{t.nav[key]}</span></button>)}</nav><div className="sidebar-footer"><div className="mini-profile"><span>{session.name.slice(0, 1).toUpperCase()}</span><div><strong>{session.name}</strong><small>{session.email}</small></div></div></div></aside>
    <div className="main-column"><header className="platform-header"><button className="global-search" onClick={() => navigateView("marketplace")}><MagnifyingGlass size={19} /><span>{t.search}</span><kbd>⌘ K</kbd></button><div className="header-actions"><button className="locale-button" onClick={() => setLocale(locale === "en" ? "zh-CN" : "en")}><Translate size={17} />{t.language}</button><button className="profile-button" onClick={() => navigateView("account")}><span>{session.name.slice(0, 1).toUpperCase()}</span></button></div></header>
      <div className={`workspace-layout ${view === "marketplace" || isWriter ? "marketplace-layout" : ""}`}><main className={`workspace-main ${view === "marketplace" ? "marketplace-workspace" : isWriter ? "writer-workspace" : ""}`}>{content}</main>{view !== "marketplace" && !isWriter && <aside className="context-panel"><div className="account-summary"><span className="avatar small">{session.name.slice(0, 1).toUpperCase()}</span><h3>{session.name}</h3><p>{session.email}</p></div><div className="context-stat"><span>{t.creditsBalance}</span><strong><Coins size={18} />{privateData.credits?.balance?.toLocaleString() ?? "—"}</strong></div><div className="context-stat"><span>{t.currentPlan}</span><strong><CreditCard size={18} />{privateData.billing?.subscription ? (locale === "en" ? privateData.billing.subscription.nameEn : privateData.billing.subscription.nameZh) : t.free}</strong></div><div className="context-divider" /><SectionTitle title={t.recentTasks} />{privateData.tasks.slice(0, 4).map((task) => <div className="mini-task" key={task.id}><span className={`dot ${task.status}`} /><div><strong>{locale === "en" ? task.toolNameEn : task.toolNameZh}</strong><small>{statusLabel(task.status, locale)}</small></div></div>)}{!privateData.tasks.length && <p className="context-empty">{t.recentEmpty}</p>}<button className="secondary-button full context-action" onClick={() => setView("tasks")}>{t.nav.tasks}<ArrowRight size={16} /></button></aside>}</div>
    </div>{toast && <div className="toast"><CheckCircle size={19} weight="fill" />{toast}</div>}</div>;
}
