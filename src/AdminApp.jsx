import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pulse, ArrowClockwise, Bank, Bell, Check, CheckCircle, Coins, CreditCard,
  File, Gauge, Gear, Globe, IdentificationCard, Key, ListChecks, LockKey,
  MagnifyingGlass, Package, Receipt, ShieldCheck, SignOut, SpinnerGap, Storefront,
  Translate, User, UserCircle, Users, Warning, Wrench, X,
} from "@phosphor-icons/react";

const copy = {
  "zh-CN": {
    console: "商业管理后台", loading: "正在加载安全管理后台…", signIn: "管理员登录",
    signInBody: "使用已验证并获得管理员授权的邮箱账户登录。", email: "管理员邮箱", emailStatus: "邮箱状态",
    password: "密码", secureLogin: "安全登录", back: "返回 OneShowTools",
    noPermission: "当前账户没有管理员权限。", loginFailed: "登录失败，请检查邮箱、密码和验证状态。",
    loadFailed: "管理数据加载失败，请稍后重试。", overview: "经营概览", users: "用户运营",
    commerce: "支付与积分", tools: "工具治理", operations: "运营中心", privacy: "隐私合规",
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
  },
  en: {
    console: "Commercial Admin", loading: "Loading secure administration…", signIn: "Administrator sign in",
    signInBody: "Use a verified email account with administrator access.", email: "Administrator email", emailStatus: "Email status",
    password: "Password", secureLogin: "Secure sign in", back: "Back to OneShowTools",
    noPermission: "This account does not have administrator access.", loginFailed: "Sign in failed. Check the email, password, and verification status.",
    loadFailed: "Admin data could not be loaded.", overview: "Overview", users: "Customers",
    commerce: "Commerce & Credits", tools: "Tool Governance", operations: "Operations", privacy: "Privacy",
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
    <div className="admin-v2-table-wrap"><table><thead><tr><th>{t.account}</th><th>{t.status}</th><th>{t.credits}</th><th>{t.tasks}/{t.files}</th><th>{t.lastSeen}</th><th /></tr></thead>
      <tbody>{data?.users?.map((user) => <tr key={user.id}><td><div className="admin-user-cell"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td>
        <td><div className="admin-status-stack"><span className={`admin-badge ${user.status}`}>{user.status === "active" ? t.active : t.suspended}</span><small>{user.emailVerified ? t.verified : t.unverified}</small></div></td>
        <td><strong>{number(user.credits, locale)}</strong></td><td>{user.tasks} / {user.files}</td><td>{date(user.lastSeenAt, locale)}</td>
        <td><button className="admin-link" onClick={() => onSelect(user.id)}>{t.details}</button></td></tr>)}
      {!data?.users?.length && <tr><td colSpan="6" className="admin-empty">{t.noData}</td></tr>}</tbody></table></div>
    <Pager data={data} onPage={onPage} locale={locale} />
  </section>;
}

function CustomerDrawer({ detail, locale, onClose, onMutate }) {
  const t = copy[locale];
  const [tab, setTab] = useState("account");
  const [form, setForm] = useState({ reason: "", amount: "", reasonCode: "customer_support", note: "", supportNote: "" });
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
        {tab === "billing" && <div className="admin-list"><ListRow title={t.balance} value={number(detail.balance, locale)} />{detail.subscriptions.map((item) => <ListRow key={item.id} title={locale === "en" ? item.nameEn : item.nameZh} meta={`${item.provider} · ${item.status}`} />)}{detail.invoices.map((item) => <ListRow key={item.id} title={`${item.amountPaid / 100} ${item.currency}`} meta={`${item.provider} · ${item.status}`} />)}{detail.credits.map((item) => <ListRow key={item.id} title={locale === "en" ? item.descriptionEn : item.descriptionZh} meta={`${item.type} · ${date(item.createdAt, locale)}`} value={`${item.amount > 0 ? "+" : ""}${item.amount}`} />)}</div>}
        {tab === "activity" && <div className="admin-list">{detail.tasks.map((item) => <ListRow key={item.id} title={locale === "en" ? item.toolNameEn : item.toolNameZh} meta={`${item.status} · ${date(item.createdAt, locale)}`} value={`-${item.creditCost}`} />)}{detail.files.map((item) => <ListRow key={item.id} title={item.name} meta={`${item.mimeType} · ${date(item.createdAt, locale)}`} value={bytes(item.sizeBytes, locale)} />)}</div>}
        {tab === "support" && <div className="admin-detail-stack"><label className="admin-field">{t.supportNote}<textarea rows="4" value={form.supportNote} onChange={(event) => setForm({ ...form, supportNote: event.target.value })} /></label><button className="admin-primary" onClick={() => onMutate("note", { category: "general", body: form.supportNote })}>{t.addNote}</button><div className="admin-list">{detail.notes.map((item) => <ListRow key={item.id} title={item.category} meta={`${item.authorEmail || "system"} · ${date(item.createdAt, locale)}`} body={item.body} />)}</div></div>}
      </div>
    </aside>
  </div>;
}
function DetailRow({ label, value }) { return <div className="admin-detail-row"><small>{label}</small><strong>{value || "—"}</strong></div>; }
function ListRow({ title, meta, value, body }) { return <div className="admin-list-row"><div><strong>{title}</strong>{meta && <small>{meta}</small>}{body && <p>{body}</p>}</div>{value != null && <b>{value}</b>}</div>; }

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

function ToolsView({ data, locale, onLifecycle }) {
  const t = copy[locale];
  return <div className="admin-tool-admin-grid">{data?.tools?.map((tool) => <article className="admin-tool-admin-card" key={tool.id}>
    <header><span><Wrench size={22} /></span><div><small>{tool.slug}</small><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3></div><i className={`admin-badge ${tool.lifecycleState}`}>{tool.lifecycleState}</i></header>
    <p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p><div className="admin-tool-meta"><div><small>{t.cost}</small><strong>{tool.creditCost}</strong></div><div><small>{t.runtime}</small><strong>{tool.runtimeStatus}</strong></div><div><small>Health</small><strong>{tool.healthStatus || "—"}</strong></div></div>
    <footer><button onClick={() => onLifecycle(tool.id, "staged")}>{t.staged}</button><button className="primary" onClick={() => onLifecycle(tool.id, "published")}>{t.publish}</button><button onClick={() => onLifecycle(tool.id, "maintenance")}>{t.maintenance}</button><button className="danger" onClick={() => onLifecycle(tool.id, "retired")}>{t.retire}</button></footer>
  </article>)}</div>;
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
  const [view, setView] = useState("overview");
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

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
    overview: "/api/admin/v1/overview?days=30",
    users: `/api/admin/v1/users?q=${encodeURIComponent(query)}&status=${userStatus}&page=${page}&pageSize=25`,
    commerce: "/api/admin/v1/commerce", tools: "/api/admin/v1/tools",
    operations: "/api/admin/v1/operations", privacy: "/api/admin/v1/privacy",
    audit: `/api/admin/v1/audit?page=${page}&pageSize=25`, admins: "/api/admin/v1/administrators",
  })[view], [view, query, userStatus, page]);

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
    };
    try {
      const headers = action === "credits" ? { "idempotency-key": crypto.randomUUID() } : {};
      await api(routes[action][0], json(routes[action][1], payload, headers));
      await openCustomer(id); await loadView(); showToast();
    } catch (error) { setMessage(error.code); }
  };
  const approve = async (id) => { try { await api(`/api/admin/v1/approvals/${id}/approve`, { method: "POST" }); await loadView(); showToast(); } catch (error) { setMessage(error.code); } };
  const lifecycle = async (id, state) => { try { await api(`/api/admin/v1/tools/${id}/lifecycle`, json("POST", { state, reason: "admin_console" })); await loadView(); showToast(); } catch (error) { setMessage(error.code); } };
  const retry = async (id) => { try { await api(`/api/admin/v1/jobs/${id}/retry`, json("POST", { reason: "operator_retry" })); await loadView(); showToast(); } catch (error) { setMessage(error.code); } };
  const createAdmin = async (draft) => {
    if (!draft.email?.trim() || !draft.reason?.trim()) { setMessage(t.reasonRequired); return false; }
    try { await api("/api/admin/v1/administrators", json("POST", draft)); await loadView(); showToast(t.adminAdded); return true; }
    catch (error) { setMessage(adminError(error.code)); return false; }
  };
  const changeRole = async (id, draft) => { if (!draft.reason?.trim()) return setMessage(t.reasonRequired); try { await api(`/api/admin/v1/administrators/${id}/role`, json("POST", draft)); await loadView(); showToast(); } catch (error) { setMessage(adminError(error.code)); } };
  const changeAdminStatus = async (id, draft) => { if (!draft.reason?.trim()) return setMessage(t.reasonRequired); try { await api(`/api/admin/v1/administrators/${id}/status`, json("POST", draft)); await loadView(); showToast(); } catch (error) { setMessage(adminError(error.code)); } };

  if (session === undefined) return <div className="admin-loading"><SpinnerGap className="spin" size={28} />{t.loading}</div>;
  if (!session) return <Login locale={locale} onAuthenticated={loadSession} message={message} setMessage={setMessage} />;
  if (session.mfa.enforced && !session.mfa.verified) return <MfaGate locale={locale} session={session} onReady={loadSession} onLogout={logout} />;

  const nav = [
    ["overview", Gauge, "dashboard.read"], ["users", Users, "users.read"], ["commerce", CreditCard, "billing.read"],
    ["tools", Storefront, "tools.read"], ["operations", Pulse, "jobs.read"], ["privacy", IdentificationCard, "privacy.read"],
    ["audit", ListChecks, "audit.read"], ["admins", ShieldCheck, "admins.manage"],
  ].filter((item) => allowed(session, item[2]));
  const content = {
    overview: <Overview data={data.overview} locale={locale} />,
    users: <UsersView data={data.users} locale={locale} query={query} setQuery={setQuery} status={userStatus} setStatus={setUserStatus} onSearch={() => { setPage(1); loadView(); }} onSelect={openCustomer} onPage={setPage} />,
    commerce: <CommerceView data={data.commerce} locale={locale} onApprove={approve} />,
    tools: <ToolsView data={data.tools} locale={locale} onLifecycle={lifecycle} />,
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
