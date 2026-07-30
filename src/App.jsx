import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise, ArrowRight, Bell, Check, CheckCircle, Clock, CloudArrowUp,
  Coins, CreditCard, Database, File, FilePdf, FolderOpen, GoogleLogo, GridFour,
  House, ImageSquare, ListChecks, LockKey, MagicWand, MagnifyingGlass, Microphone,
  ArrowLeft, Copy, DownloadSimple, Play, RocketLaunch, SignOut, Sparkle, SpinnerGap,
  SquaresFour, StopCircle, Translate, Trash, User, UserCircle, Warning, Wrench, X,
} from "@phosphor-icons/react";

const iconMap = { MagicWand, Sparkle, FilePdf, ImageSquare, Microphone };

const dictionary = {
  "zh-CN": {
    nav: { dashboard: "仪表盘", marketplace: "工具市场", runtime: "AI Runtime", credits: "积分", billing: "计费", tasks: "任务中心", files: "文件中心", account: "用户系统" },
    search: "搜索工具或输入你想完成的任务", searchAction: "搜索", popularTools: "常用工具", today: "今天想完成什么？", todaySub: "搜索你需要的能力，快速找到合适的 AI 工具。",
    login: "登录", signup: "注册", logout: "退出登录", language: "EN", overview: "平台概览", recentTasks: "最近任务", openMarketplace: "打开工具市场",
    creditsBalance: "可用积分", taskCount: "任务总数", fileCount: "文件数量", completed: "已完成", noTasks: "还没有任务", noTasksHint: "从工具市场选择一个工具，创建你的第一个任务。",
    marketplace: "Tool Marketplace", marketplaceSub: "发现并使用接入 OneShowTools Platform 的 AI 工具。", all: "全部", image: "图像工具", document: "文档工具", audio: "音频工具", writing: "写作工具",
    ready: "可运行", config: "待配置", creditsUnit: "积分 / 次", run: "打开工具", runTitle: "创建 AI 任务", inputLabel: "任务内容", inputPlaceholder: "输入需要处理的文本或任务要求…",
    attach: "关联文件", createTask: "创建任务", taskCreated: "任务已创建，可在任务中心查看状态。", runtime: "AI Runtime", runtimeSub: "统一管理模型提供商和各工具的运行能力。",
    provider: "运行提供商", model: "模型", status: "状态", configured: "已配置", notConfigured: "未配置", runtimeNote: "未配置的运行服务不会伪造结果；任务会保留真实状态并自动退回积分。",
    credits: "Credits", creditsSub: "每一笔获取与消耗都有可追踪的真实账本记录。", ledger: "积分流水", amount: "变动", balance: "余额", description: "说明", time: "时间",
    billing: "Billing", billingSub: "管理订阅方案、付款能力与当前订阅状态。", currentPlan: "当前方案", free: "免费版", monthly: "每月", subscribe: "订阅专业版",
    billingUnavailable: "Stripe 尚未配置，当前不会发起真实扣款。", billingReady: "Stripe 已配置，可以创建真实结账会话。",
    tasks: "Task Center", tasksSub: "查看所有真实任务的状态、输入、输出和积分消耗。", retry: "刷新状态", cancel: "取消任务", taskOutput: "任务结果",
    files: "File Center", filesSub: "上传、下载和管理 AI 任务使用的真实文件。", upload: "上传文件", uploadHint: "单个文件最大 25MB", fileName: "文件名", size: "大小", download: "下载", delete: "删除", emptyFiles: "还没有上传文件",
    account: "用户系统", accountSub: "管理你的 OneShowTools Platform 账户与语言偏好。", emailStatus: "邮箱状态", pendingVerify: "待验证", verified: "已验证", memberSince: "注册时间",
    system: "平台状态", database: "SQLite 数据库", online: "运行正常", signInTitle: "登录 OneShowTools", signUpTitle: "创建 OneShowTools 账户", authSub: "一个账户，统一使用所有 AI 工具。",
    name: "姓名", email: "邮箱", password: "密码", passwordHint: "至少 10 位", google: "使用 Google 继续", or: "或使用邮箱", noAccount: "还没有账户？", hasAccount: "已有账户？",
    invalid: "请检查输入信息后重试。", googleDisabled: "Google 登录尚未配置。", welcome: "登录后使用完整平台", welcomeSub: "注册即可获得真实记录的 200 欢迎积分。",
    recentEmpty: "登录后，这里会显示你的真实任务和账户状态。", signInAction: "登录或注册", planPro: "专业版", planDesc: "适合持续使用多个 AI 工具的个人与团队。",
    error: "操作失败，请稍后重试。", insufficient: "积分不足，请先充值或订阅。", loading: "正在加载真实数据…", inputRequired: "请输入任务内容，或选择一个文件。", noResults: "没有找到匹配的工具",
    backToMarket: "返回工具市场", toolWorkspace: "工具工作区", chooseFile: "选择文件", selectedFile: "已选择", startProcessing: "开始处理", processing: "正在处理",
    result: "处理结果", downloadResult: "下载结果", copyResult: "复制结果", copied: "已复制", imageTolerance: "背景容差", imageQuality: "压缩质量",
    textInput: "输入原始文案", pdfInput: "上传 PDF 文件", imageInput: "上传图片", speechInput: "实时语音识别", startSpeech: "开始识别", stopSpeech: "停止识别",
    browserUnsupported: "当前浏览器不支持实时语音识别。", loginToUse: "登录后即可运行此工具并保存任务记录。", localMode: "本地处理", aiMode: "AI 增强",
  },
  en: {
    nav: { dashboard: "Dashboard", marketplace: "Tool Marketplace", runtime: "AI Runtime", credits: "Credits", billing: "Billing", tasks: "Task Center", files: "File Center", account: "Account" },
    search: "Search tools or describe what you want to do", searchAction: "Search", popularTools: "Popular tools", today: "What would you like to accomplish?", todaySub: "Search by capability and quickly find the right AI tool.",
    login: "Sign in", signup: "Sign up", logout: "Sign out", language: "中文", overview: "Platform overview", recentTasks: "Recent tasks", openMarketplace: "Open marketplace",
    creditsBalance: "Available credits", taskCount: "Total tasks", fileCount: "Files", completed: "Completed", noTasks: "No tasks yet", noTasksHint: "Choose a tool in the marketplace to create your first task.",
    marketplace: "Tool Marketplace", marketplaceSub: "Discover AI tools connected to OneShowTools Platform.", all: "All", image: "Image", document: "Documents", audio: "Audio", writing: "Writing",
    ready: "Ready", config: "Setup required", creditsUnit: "credits / run", run: "Open tool", runTitle: "Create AI task", inputLabel: "Task content", inputPlaceholder: "Enter the text or instructions to process…",
    attach: "Attach files", createTask: "Create task", taskCreated: "Task created. Track it in Task Center.", runtime: "AI Runtime", runtimeSub: "Manage model providers and runtime availability for every tool.",
    provider: "Provider", model: "Model", status: "Status", configured: "Configured", notConfigured: "Not configured", runtimeNote: "Unconfigured runtimes never fabricate results. Tasks retain their real state and credits are refunded.",
    credits: "Credits", creditsSub: "Every grant and charge is recorded in a traceable ledger.", ledger: "Credit ledger", amount: "Change", balance: "Balance", description: "Description", time: "Time",
    billing: "Billing", billingSub: "Manage plans, payment capability, and subscription status.", currentPlan: "Current plan", free: "Free", monthly: "month", subscribe: "Subscribe to Pro",
    billingUnavailable: "Stripe is not configured, so no real charge can be created.", billingReady: "Stripe is configured and can create a real checkout session.",
    tasks: "Task Center", tasksSub: "Review real task status, input, output, and credit usage.", retry: "Refresh status", cancel: "Cancel task", taskOutput: "Task output",
    files: "File Center", filesSub: "Upload, download, and manage real files used by AI tasks.", upload: "Upload file", uploadHint: "25MB maximum per file", fileName: "File name", size: "Size", download: "Download", delete: "Delete", emptyFiles: "No files uploaded yet",
    account: "User system", accountSub: "Manage your OneShowTools Platform account and language.", emailStatus: "Email status", pendingVerify: "Pending verification", verified: "Verified", memberSince: "Member since",
    system: "Platform status", database: "SQLite database", online: "Operational", signInTitle: "Sign in to OneShowTools", signUpTitle: "Create your OneShowTools account", authSub: "One account for every AI tool.",
    name: "Name", email: "Email", password: "Password", passwordHint: "10 characters minimum", google: "Continue with Google", or: "or use email", noAccount: "New to OneShowTools?", hasAccount: "Already have an account?",
    invalid: "Check your details and try again.", googleDisabled: "Google sign-in is not configured.", welcome: "Sign in for the complete platform", welcomeSub: "New accounts receive 200 credits recorded in the real ledger.",
    recentEmpty: "Your real tasks and account state will appear here after sign-in.", signInAction: "Sign in or sign up", planPro: "Pro", planDesc: "For individuals and teams using multiple AI tools regularly.",
    error: "Something went wrong. Please try again.", insufficient: "Not enough credits. Top up or subscribe first.", loading: "Loading live data…", inputRequired: "Enter task content or select a file.", noResults: "No matching tools found",
    backToMarket: "Back to marketplace", toolWorkspace: "Tool workspace", chooseFile: "Choose file", selectedFile: "Selected", startProcessing: "Start processing", processing: "Processing",
    result: "Result", downloadResult: "Download result", copyResult: "Copy result", copied: "Copied", imageTolerance: "Background tolerance", imageQuality: "Compression quality",
    textInput: "Enter original copy", pdfInput: "Upload PDF", imageInput: "Upload image", speechInput: "Live speech recognition", startSpeech: "Start recognition", stopSpeech: "Stop recognition",
    browserUnsupported: "Live speech recognition is not supported in this browser.", loginToUse: "Sign in to run this tool and save its task record.", localMode: "Local processing", aiMode: "AI enhanced",
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

function AuthDialog({ locale, googleEnabled, onClose, onAuthenticated }) {
  const t = dictionary[locale];
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await api(mode === "signup" ? "/api/auth/register" : "/api/auth/login", jsonOptions("POST", { ...form, locale }));
      onAuthenticated(result.user);
      onClose();
    } catch {
      setMessage(t.invalid);
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal" role="dialog" aria-modal="true">
    <button className="icon-button modal-close" onClick={onClose}><X size={20} /></button><Brand />
    <h2>{mode === "signup" ? t.signUpTitle : t.signInTitle}</h2><p className="modal-subtitle">{t.authSub}</p>
    <button className="google-button" type="button" disabled={!googleEnabled} onClick={() => googleEnabled ? location.assign("/api/auth/google/start") : setMessage(t.googleDisabled)}><GoogleLogo size={20} weight="bold" />{t.google}</button>
    {!googleEnabled && <span className="config-caption">{t.googleDisabled}</span>}<div className="auth-divider"><span>{t.or}</span></div>
    <form onSubmit={submit} className="auth-form">{mode === "signup" && <label>{t.name}<input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
      <label>{t.email}<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>{t.password}<input type="password" required minLength={10} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>{t.passwordHint}</small></label>
      {message && <p className="form-error"><Warning size={17} />{message}</p>}<button className="primary-button full" disabled={busy}>{busy ? <SpinnerGap className="spin" size={20} /> : mode === "signup" ? t.signup : t.login}</button>
    </form><p className="auth-switch">{mode === "signup" ? t.hasAccount : t.noAccount}<button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? t.login : t.signup}</button></p>
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

function ToolPage({ tool, locale, authenticated, onBack, onAuth, onCompleted }) {
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
  const recognitionRef = useRef(null);
  const name = locale === "en" ? tool.nameEn : tool.nameZh;
  const description = locale === "en" ? tool.descriptionEn : tool.descriptionZh;
  const isImage = ["background-remover", "image-compressor"].includes(tool.slug);
  const isFile = isImage || tool.slug === "pdf-summary";
  const isText = tool.slug === "copy-polish";
  const isSpeech = tool.slug === "speech-to-text";

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

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
        if (tool.slug === "background-remover") form.append("tolerance", String(tolerance));
        if (tool.slug === "image-compressor") form.append("quality", String(quality));
        options = { method: "POST", body: form };
      } else {
        options = jsonOptions("POST", { text });
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

  return <div className="tool-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{t.backToMarket}</button>
    <header className="tool-page-header"><span className={`tool-icon large ${tool.category}`}><Icon size={31} /></span><div><p className="eyebrow">{t.toolWorkspace}</p><h1>{name}</h1><p>{description}</p></div><div className="tool-run-meta"><StatusPill status={tool.runtimeStatus} locale={locale} /><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span></div></header>
    <div className="tool-workspace-grid">
      <section className="surface tool-input-panel">
        <h2>{isImage ? t.imageInput : tool.slug === "pdf-summary" ? t.pdfInput : isSpeech ? t.speechInput : t.textInput}</h2>
        {isFile && <label className={`tool-dropzone ${file ? "selected" : ""}`}><input type="file" accept={isImage ? "image/*" : "application/pdf"} onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); }} /><CloudArrowUp size={30} /><strong>{file ? `${t.selectedFile}: ${file.name}` : t.chooseFile}</strong><span>{file ? formatBytes(file.size) : isImage ? "PNG · JPG · WEBP" : "PDF"}</span></label>}
        {isText && <textarea className="tool-textarea" rows={12} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} />}
        {isSpeech && <><div className={`speech-pad ${recording ? "recording" : ""}`}><button onClick={toggleSpeech}>{recording ? <StopCircle size={28} weight="fill" /> : <Microphone size={28} weight="fill" />}<span>{recording ? t.stopSpeech : t.startSpeech}</span></button></div><textarea className="tool-textarea" rows={7} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} /></>}
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

function PublicToolShell({ tool, locale, authenticated, onBack, onAuth, onLocale, onCompleted }) {
  const t = dictionary[locale];
  return <div className="guest-shell"><header className="guest-header"><Brand /><nav><button onClick={onBack}>{t.marketplace}</button><span>{locale === "en" ? tool.nameEn : tool.nameZh}</span></nav><div><button className="locale-button" onClick={onLocale}><Translate size={17} />{t.language}</button><button className="primary-button" onClick={onAuth}>{t.login}</button></div></header><main className="public-tool-main"><ToolPage tool={tool} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} /></main></div>;
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
  const visible = tools.filter((tool) => {
    const text = `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase();
    return (category === "all" || tool.category === category) && (!query || text.includes(query.toLowerCase()));
  });
  return <div className="page-stack"><PageHeading title={t.marketplace} subtitle={t.marketplaceSub} /><div className="command-search"><MagnifyingGlass size={22} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t.search} /><kbd>⌘ K</kbd></div>
    <div className="category-tabs">{["all", "image", "document", "audio", "writing"].map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{t[item]}</button>)}</div>
    {visible.length ? <div className="tool-grid">{visible.map((tool) => { const Icon = iconMap[tool.icon] || Wrench; return <article className="tool-card" key={tool.id}><header><span className={`tool-icon ${tool.category}`}><Icon size={25} /></span><StatusPill status={tool.runtimeStatus} locale={locale} /></header><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3><p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p><footer><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span><button onClick={() => onRun(tool)}>{t.run}<ArrowRight size={17} /></button></footer></article>; })}</div> : <EmptyState icon={MagnifyingGlass} title={t.noResults} />}
  </div>;
}

function Runtime({ data, locale }) {
  const t = dictionary[locale];
  if (!data) return <Loading locale={locale} />;
  return <div className="page-stack"><PageHeading title={t.runtime} subtitle={t.runtimeSub} /><div className="notice-card"><LockKey size={21} /><p>{t.runtimeNote}</p></div>
    <section><SectionTitle title={t.provider} /><div className="provider-grid">{data.providers.map((provider) => <article className="provider-card surface" key={provider.id}><span className="provider-logo">{provider.id === "openai" ? <Sparkle size={23} /> : <RocketLaunch size={23} />}</span><div><h3>{provider.name}</h3><p>{provider.model || provider.endpoint || "—"}</p></div><span className={`config-status ${provider.configured ? "on" : ""}`}>{provider.configured ? <Check size={15} /> : <Warning size={15} />}{provider.configured ? t.configured : t.notConfigured}</span></article>)}</div></section>
    <section><SectionTitle title={t.marketplace} /><div className="surface runtime-table"><div className="table-head"><span>{t.marketplace}</span><span>{t.provider}</span><span>{t.status}</span></div>{data.tools.map((tool) => <div className="table-row" key={tool.id}><strong>{locale === "en" ? tool.nameEn : tool.nameZh}</strong><span>{tool.runtimeKind === "openai" ? "OpenAI" : "Tool Runtime"}</span><StatusPill status={tool.runtimeStatus} locale={locale} /></div>)}</div></section>
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

function Billing({ plans, status, locale, onCheckout }) {
  const t = dictionary[locale];
  if (!status) return <Loading locale={locale} />;
  return <div className="page-stack"><PageHeading title={t.billing} subtitle={t.billingSub} /><div className={`notice-card ${status.configured ? "success" : "warning"}`}>{status.configured ? <CheckCircle size={21} /> : <Warning size={21} />}<p>{status.configured ? t.billingReady : t.billingUnavailable}</p></div>
    <section><SectionTitle title={t.currentPlan} /><article className="current-plan surface"><div><span className="plan-icon"><CreditCard size={24} /></span><div><small>{t.currentPlan}</small><h3>{status.subscription ? (locale === "en" ? status.subscription.nameEn : status.subscription.nameZh) : t.free}</h3></div></div><span className="status-pill completed"><CheckCircle size={14} weight="fill" />{status.subscription?.status || "active"}</span></article></section>
    <div className="plan-grid">{plans.map((plan) => <article className={`plan-card surface ${plan.code === "pro-monthly" ? "featured" : ""}`} key={plan.id}><span className="plan-badge">{plan.code === "pro-monthly" ? t.planPro : t.free}</span><h2>{locale === "en" ? plan.nameEn : plan.nameZh}</h2><p>{plan.code === "pro-monthly" ? t.planDesc : t.welcomeSub}</p><strong className="plan-price">{new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", { style: "currency", currency: plan.currency }).format(plan.amountMinor / 100)}<small> / {t.monthly}</small></strong><div className="plan-credit"><Coins size={18} />{plan.recurringCredits.toLocaleString()} {t.credits}</div>{plan.code === "pro-monthly" && <button className="primary-button full" disabled={!status.configured} onClick={() => onCheckout(plan.id)}>{t.subscribe}</button>}</article>)}</div>
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

function Account({ user, health, locale, onLogout }) {
  const t = dictionary[locale];
  return <div className="page-stack"><PageHeading title={t.account} subtitle={t.accountSub} /><div className="account-grid"><article className="surface profile-panel"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><h2>{user.name}</h2><p>{user.email}</p><dl><div><dt>{t.emailStatus}</dt><dd>{user.emailVerified ? t.verified : t.pendingVerify}</dd></div><div><dt>{t.memberSince}</dt><dd>{formatDate(user.createdAt, locale)}</dd></div></dl><button className="secondary-button full" onClick={onLogout}><SignOut size={17} />{t.logout}</button></article>
    <article className="surface system-panel"><SectionTitle title={t.system} /><SystemRow icon={Database} name={t.database} detail={t.online} ok /><SystemRow icon={Sparkle} name="OpenAI Runtime" detail={health.openAiEnabled ? t.configured : t.notConfigured} ok={health.openAiEnabled} /><SystemRow icon={CreditCard} name="Stripe Billing" detail={health.billingEnabled ? t.configured : t.notConfigured} ok={health.billingEnabled} /></article></div>
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
      const streams = [
        {
          start: [width * 0.06, centerY - height * 0.17],
          controlA: [width * 0.22, centerY - height * 0.22],
          controlB: [centerX - width * 0.18, centerY - height * 0.1],
          end: [centerX - 54, centerY - 20],
        },
        {
          start: [width * 0.07, centerY + height * 0.2],
          controlA: [width * 0.24, centerY + height * 0.24],
          controlB: [centerX - width * 0.18, centerY + height * 0.1],
          end: [centerX - 54, centerY + 20],
        },
        {
          start: [width * 0.94, centerY - height * 0.19],
          controlA: [width * 0.8, centerY - height * 0.24],
          controlB: [centerX + width * 0.18, centerY - height * 0.1],
          end: [centerX + 54, centerY - 20],
        },
        {
          start: [width * 0.93, centerY + height * 0.18],
          controlA: [width * 0.78, centerY + height * 0.23],
          controlB: [centerX + width * 0.18, centerY + height * 0.1],
          end: [centerX + 54, centerY + 20],
        },
      ];
      const pointOnCurve = ({ start, controlA, controlB, end }, progress) => {
        const inverse = 1 - progress;
        return [
          inverse ** 3 * start[0] + 3 * inverse ** 2 * progress * controlA[0]
            + 3 * inverse * progress ** 2 * controlB[0] + progress ** 3 * end[0],
          inverse ** 3 * start[1] + 3 * inverse ** 2 * progress * controlA[1]
            + 3 * inverse * progress ** 2 * controlB[1] + progress ** 3 * end[1],
        ];
      };
      streams.forEach((stream, index) => {
        context.strokeStyle = "rgba(23, 105, 232, 0.34)";
        context.lineWidth = 1.35;
        context.beginPath();
        context.moveTo(...stream.start);
        context.bezierCurveTo(...stream.controlA, ...stream.controlB, ...stream.end);
        context.stroke();

        const progress = reducedMotion ? 0.68 : (motionTime * (1.25 + index * 0.08) + index * 0.21) % 1;
        const [x, y] = pointOnCurve(stream, progress);
        context.fillStyle = "#1769e8";
        context.beginPath();
        context.arc(x, y, 3.2, 0, Math.PI * 2);
        context.fill();
      });

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
  const [privateData, setPrivateData] = useState({ dashboard: null, runtime: null, credits: null, billing: null, tasks: [], files: [] });
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [routeSlug, setRouteSlug] = useState(() => location.pathname.match(/^\/tools\/([^/]+)$/)?.[1] || null);
  const [toast, setToast] = useState("");
  const t = dictionary[locale];

  const loadPublic = useCallback(async () => {
    const [sessionResult, healthResult, toolsResult, plansResult] = await Promise.all([
      api("/api/auth/session").catch(() => ({ user: null })), api("/api/health").catch(() => ({})),
      api("/api/tools").catch(() => ({ tools: [] })), api("/api/plans").catch(() => ({ plans: [] })),
    ]);
    setSession(sessionResult.user || null); setHealth(healthResult); setTools(toolsResult.tools); setPlans(plansResult.plans);
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

  const logout = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); setSession(null); setView("dashboard"); setPrivateData({ dashboard: null, runtime: null, credits: null, billing: null, tasks: [], files: [] }); };
  const openTool = (tool) => {
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

  if (session === undefined) return <Loading locale={locale} />;
  const routeTool = routeSlug ? tools.find((tool) => tool.slug === routeSlug) : null;
  if (!session && routeSlug && !routeTool) return <Loading locale={locale} />;
  if (!session) return <>{routeTool ? <PublicToolShell tool={routeTool} locale={locale} authenticated={false} onBack={leaveTool} onAuth={() => setAuthOpen(true)} onLocale={() => setLocale(locale === "en" ? "zh-CN" : "en")} /> : <GuestHome locale={locale} tools={tools} onAuth={() => setAuthOpen(true)} onLocale={() => setLocale(locale === "en" ? "zh-CN" : "en")} onRun={openTool} />}{authOpen && <AuthDialog locale={locale} googleEnabled={health.googleAuthEnabled} onClose={() => setAuthOpen(false)} onAuthenticated={setSession} />}</>;

  const navItems = [["dashboard", House], ["marketplace", SquaresFour], ["runtime", RocketLaunch], ["credits", Coins], ["billing", CreditCard], ["tasks", ListChecks], ["files", FolderOpen], ["account", User]];
  const content = {
    dashboard: <Dashboard data={privateData.dashboard} tools={tools} locale={locale} onNavigate={setView} onSearch={(value) => { setQuery(value); setView("marketplace"); }} />,
    marketplace: <Marketplace tools={tools} locale={locale} query={query} onQuery={setQuery} onRun={openTool} />,
    runtime: <Runtime data={privateData.runtime} locale={locale} />,
    credits: <Credits data={privateData.credits} locale={locale} />,
    billing: <Billing plans={plans} status={privateData.billing} locale={locale} onCheckout={checkout} />,
    tasks: <Tasks tasks={privateData.tasks} locale={locale} onRefresh={loadPrivate} onCancel={cancelTask} />,
    files: <Files files={privateData.files} locale={locale} onUpload={upload} onDelete={deleteFile} />,
    account: <Account user={session} health={health} locale={locale} onLogout={logout} />,
    tool: routeTool ? <ToolPage tool={routeTool} locale={locale} authenticated onBack={leaveTool} onAuth={() => setAuthOpen(true)} onCompleted={async () => { setToast(t.taskCreated); await loadPrivate(); }} /> : <Marketplace tools={tools} locale={locale} query={query} onQuery={setQuery} onRun={openTool} />,
  }[view];

  return <div className="platform-shell"><aside className="sidebar"><Brand /><nav>{navItems.map(([key, Icon]) => <button className={view === key ? "active" : ""} onClick={() => navigateView(key)} key={key}><Icon size={20} weight={view === key ? "fill" : "regular"} /><span>{t.nav[key]}</span></button>)}</nav><div className="sidebar-footer"><div className="mini-profile"><span>{session.name.slice(0, 1).toUpperCase()}</span><div><strong>{session.name}</strong><small>{session.email}</small></div></div></div></aside>
    <div className="main-column"><header className="platform-header"><button className="global-search" onClick={() => navigateView("marketplace")}><MagnifyingGlass size={19} /><span>{t.search}</span><kbd>⌘ K</kbd></button><div className="header-actions"><button className="icon-button"><Bell size={20} /></button><button className="locale-button" onClick={() => setLocale(locale === "en" ? "zh-CN" : "en")}><Translate size={17} />{t.language}</button><button className="profile-button" onClick={() => navigateView("account")}><span>{session.name.slice(0, 1).toUpperCase()}</span></button></div></header>
      <div className="workspace-layout"><main className="workspace-main">{content}</main><aside className="context-panel"><div className="account-summary"><span className="avatar small">{session.name.slice(0, 1).toUpperCase()}</span><h3>{session.name}</h3><p>{session.email}</p></div><div className="context-stat"><span>{t.creditsBalance}</span><strong><Coins size={18} />{privateData.credits?.balance?.toLocaleString() ?? "—"}</strong></div><div className="context-stat"><span>{t.currentPlan}</span><strong><CreditCard size={18} />{privateData.billing?.subscription ? (locale === "en" ? privateData.billing.subscription.nameEn : privateData.billing.subscription.nameZh) : t.free}</strong></div><div className="context-divider" /><SectionTitle title={t.recentTasks} />{privateData.tasks.slice(0, 4).map((task) => <div className="mini-task" key={task.id}><span className={`dot ${task.status}`} /><div><strong>{locale === "en" ? task.toolNameEn : task.toolNameZh}</strong><small>{statusLabel(task.status, locale)}</small></div></div>)}{!privateData.tasks.length && <p className="context-empty">{t.recentEmpty}</p>}<button className="secondary-button full context-action" onClick={() => setView("tasks")}>{t.nav.tasks}<ArrowRight size={16} /></button></aside></div>
    </div>{toast && <div className="toast"><CheckCircle size={19} weight="fill" />{toast}</div>}</div>;
}
