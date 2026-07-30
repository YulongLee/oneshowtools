import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwise, CheckCircle, Coins, File, ListChecks, LockKey, MagnifyingGlass,
  ShieldCheck, SignOut, SpinnerGap, User, Users, Warning,
} from "@phosphor-icons/react";

const api = async (path, options = {}) => {
  const response = await fetch(path, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.code || "REQUEST_FAILED");
  return data;
};
const json = (method, data) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});
const date = (value) => new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium", timeStyle: "short",
}).format(new Date(value));

export function AdminApp() {
  const [session, setSession] = useState();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("users");
  const [query, setQuery] = useState("");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [adjustments, setAdjustments] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (search = query) => {
    setBusy(true);
    try {
      const [summary, userData, taskData, auditData] = await Promise.all([
        api("/api/admin/overview"),
        api(`/api/admin/users?q=${encodeURIComponent(search)}`),
        api("/api/admin/tasks"),
        api("/api/admin/audit"),
      ]);
      setOverview(summary);
      setUsers(userData.users);
      setTasks(taskData.tasks);
      setEvents(auditData.events);
      setSession(summary.admin);
      setMessage("");
    } catch (error) {
      if (error.message === "UNAUTHENTICATED") setSession(null);
      else if (error.message === "ADMIN_FORBIDDEN") {
        setSession(null);
        setMessage("当前账户没有管理员权限。");
      } else {
        setSession(null);
        setMessage("管理数据加载失败，请稍后重试。");
      }
    } finally {
      setBusy(false);
    }
  }, [query]);

  useEffect(() => { load(""); }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/auth/login", json("POST", login));
      await load("");
    } catch {
      setMessage("登录失败，请检查邮箱、密码和邮箱验证状态。");
      setBusy(false);
    }
  };
  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setSession(null);
    setOverview(null);
  };
  const changeStatus = async (user) => {
    const status = user.status === "active" ? "suspended" : "active";
    await api(`/api/admin/users/${user.id}/status`, json("PATCH", { status }));
    await load();
  };
  const adjustCredits = async (user) => {
    const draft = adjustments[user.id] || {};
    await api(`/api/admin/users/${user.id}/credits`, json("POST", {
      amount: Number(draft.amount),
      note: draft.note,
    }));
    setAdjustments((current) => ({ ...current, [user.id]: { amount: "", note: "" } }));
    await load();
  };

  if (session === undefined) return <div className="admin-loading"><SpinnerGap className="spin" size={28} />加载管理员后台…</div>;
  if (!session) return <main className="admin-login-page"><section className="admin-login-card">
    <span className="admin-mark"><ShieldCheck size={30} weight="fill" /></span>
    <small>OneShowTools Platform</small><h1>管理员后台</h1>
    <p>使用已验证并获得管理员授权的邮箱账户登录。</p>
    <form onSubmit={signIn}><label>管理员邮箱<input type="email" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
      <label>密码<input type="password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
      {message && <div className="admin-alert"><Warning size={18} />{message}</div>}
      <button disabled={busy}>{busy ? <SpinnerGap className="spin" size={20} /> : <LockKey size={19} />}安全登录</button>
    </form><a href="/">返回 OneShowTools</a>
  </section></main>;

  const metrics = overview?.metrics || {};
  return <div className="admin-shell"><aside className="admin-sidebar">
    <div className="admin-brand"><ShieldCheck size={26} weight="fill" /><div><strong>OneShowTools</strong><small>ADMIN CONSOLE</small></div></div>
    <nav><button className={view === "users" ? "active" : ""} onClick={() => setView("users")}><Users size={19} />用户管理</button>
      <button className={view === "tasks" ? "active" : ""} onClick={() => setView("tasks")}><ListChecks size={19} />任务记录</button>
      <button className={view === "audit" ? "active" : ""} onClick={() => setView("audit")}><ShieldCheck size={19} />操作审计</button></nav>
    <div className="admin-identity"><span>{session.name.slice(0, 1).toUpperCase()}</span><div><strong>{session.name}</strong><small>{session.email}</small></div></div>
  </aside><main className="admin-main"><header><div><small>平台管理</small><h1>{view === "users" ? "用户管理" : view === "tasks" ? "任务记录" : "操作审计"}</h1></div>
    <div><button className="admin-secondary" onClick={() => load()}><ArrowClockwise size={18} />刷新</button><button className="admin-secondary" onClick={signOut}><SignOut size={18} />退出</button></div></header>
    {message && <div className="admin-alert"><Warning size={18} />{message}</div>}
    <section className="admin-metrics">
      <article><span><Users size={20} /></span><small>用户总数</small><strong>{metrics.users ?? "—"}</strong></article>
      <article><span><CheckCircle size={20} /></span><small>已验证用户</small><strong>{metrics.verifiedUsers ?? "—"}</strong></article>
      <article><span><ListChecks size={20} /></span><small>任务总数</small><strong>{metrics.tasks ?? "—"}</strong></article>
      <article><span><Coins size={20} /></span><small>平台积分</small><strong>{metrics.credits ?? "—"}</strong></article>
      <article><span><File size={20} /></span><small>文件总数</small><strong>{metrics.files ?? "—"}</strong></article>
    </section>
    {view === "users" && <section className="admin-panel"><div className="admin-toolbar"><div><MagnifyingGlass size={18} /><input placeholder="搜索姓名或邮箱" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load(query)} /></div><button onClick={() => load(query)}>搜索</button></div>
      <div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>状态</th><th>邮箱</th><th>积分</th><th>任务/文件</th><th>注册时间</th><th>管理</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}>
        <td><strong>{user.name}</strong><small>{user.email}</small></td><td><span className={`admin-status ${user.status}`}>{user.status === "active" ? "正常" : "已封禁"}</span></td>
        <td>{user.emailVerified ? "已验证" : "待验证"}</td><td>{user.credits}</td><td>{user.tasks} / {user.files}</td><td>{date(user.createdAt)}</td>
        <td><div className="admin-actions"><button className="admin-secondary" onClick={() => changeStatus(user)}>{user.status === "active" ? "封禁" : "解封"}</button>
          <input type="number" placeholder="+/-积分" value={adjustments[user.id]?.amount || ""} onChange={(event) => setAdjustments({ ...adjustments, [user.id]: { ...adjustments[user.id], amount: event.target.value } })} />
          <input placeholder="调整原因" value={adjustments[user.id]?.note || ""} onChange={(event) => setAdjustments({ ...adjustments, [user.id]: { ...adjustments[user.id], note: event.target.value } })} />
          <button onClick={() => adjustCredits(user)}>调整</button></div></td></tr>)}</tbody></table></div></section>}
    {view === "tasks" && <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>工具</th><th>用户</th><th>状态</th><th>积分</th><th>创建时间</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.toolNameZh}</td><td><strong>{task.name}</strong><small>{task.email}</small></td><td><span className={`admin-status ${task.status}`}>{task.status}</span></td><td>{task.creditCost}</td><td>{date(task.createdAt)}</td></tr>)}</tbody></table></div></section>}
    {view === "audit" && <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>操作</th><th>操作者</th><th>目标</th><th>详情</th><th>时间</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.action}</td><td>{event.actorEmail || "系统"}</td><td>{event.targetType || "—"}</td><td><code>{event.metadataJson}</code></td><td>{date(event.createdAt)}</td></tr>)}</tbody></table></div></section>}
  </main></div>;
}
