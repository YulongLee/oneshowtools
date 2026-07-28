import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Clock, FilePdf, GridFour, Image, MagicWand, MagnifyingGlass,
  GoogleLogo, MicrophoneStage, Sparkle, Translate, UserCircle, X,
} from "@phosphor-icons/react";
import { catalogs, formatCurrency, formatDate, formatNumber, resolveLocale } from "./i18n.js";

const toolContent = [
  { id: "background-remover", zh: ["图片背景移除", "智能识别主体，一键去除图片背景，支持透明背景导出。"], en: ["Background Remover", "Detect the subject and export a clean transparent background."], icon: MagicWand, tone: "blue", keywords: "图片 去背景 抠图 transparent background remove" },
  { id: "copy-polish", zh: ["文案润色", "优化语句表达，提升文案质量，让内容更专业、更自然。"], en: ["Copy Polisher", "Refine wording and make content clearer, professional, and natural."], icon: Sparkle, tone: "green", keywords: "文字 文案 写作 润色 writing polish copy" },
  { id: "pdf-summary", zh: ["PDF 摘要", "快速提炼 PDF 核心内容，生成结构化摘要，节省阅读时间。"], en: ["PDF Summarizer", "Extract key points and create a structured summary from a PDF."], icon: FilePdf, tone: "red", keywords: "PDF 文档 摘要 总结 summarize document" },
  { id: "image-compressor", zh: ["图片压缩", "在保持清晰度的同时减小图片体积，支持批量压缩。"], en: ["Image Compressor", "Reduce image size while preserving clarity, including batch jobs."], icon: Image, tone: "orange", keywords: "图片 压缩 体积 batch image compress" },
  { id: "speech-to-text", zh: ["语音转文字", "高准确率识别语音内容，快速转换为可编辑的文本。"], en: ["Speech to Text", "Turn spoken audio into accurate, editable text."], icon: MicrophoneStage, tone: "purple", keywords: "语音 音频 转文字 transcription speech audio" },
];

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.error?.code || data?.message || "REQUEST_FAILED"), { status: response.status });
  return data;
};

function AuthDialog({ copy, mode: initialMode, onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode || "signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [state, setState] = useState({ busy: false, message: "" });
  const headingRef = useRef(null);
  useEffect(() => headingRef.current?.focus(), []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, message: "" });
    try {
      if (mode === "signup") {
        await api("/api/auth/sign-up/email", { method: "POST", body: JSON.stringify({ name: form.name || form.email.split("@")[0], email: form.email, password: form.password, callbackURL: "/" }) });
        setState({ busy: false, message: copy.genericRegister });
        setMode("pending");
      } else if (mode === "forgot") {
        await api("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email: form.email, redirectTo: "/" }) });
        setState({ busy: false, message: copy.genericRecovery });
      } else {
        await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password, callbackURL: "/" }) });
        await onAuthenticated();
        onClose();
      }
    } catch {
      setState({ busy: false, message: copy.invalid });
    }
  };

  const continueWithGoogle = async () => {
    setState({ busy: true, message: "" });
    try {
      const result = await api("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/?auth=google-success",
          errorCallbackURL: "/?auth=google-error",
          newUserCallbackURL: "/?auth=google-new",
          disableRedirect: true,
        }),
      });
      if (!result.url) throw new Error("GOOGLE_UNAVAILABLE");
      location.assign(result.url);
    } catch {
      setState({ busy: false, message: copy.googleUnavailable });
    }
  };

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="login-modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" type="button" onClick={onClose} aria-label={copy.close}><X size={20} /></button>
      <span className="brand-mark large" aria-hidden="true"><GridFour weight="fill" size={21} /></span>
      <h2 id="auth-title" tabIndex="-1" ref={headingRef}>{mode === "forgot" ? copy.resetTitle : mode === "pending" ? copy.pending : copy.title}</h2>
      {mode === "pending" ? <>
        <p>{copy.pendingBody}</p><p className="form-message success">{state.message}</p>
        <button className="continue-button" type="button" onClick={() => setMode("signin")}>{copy.signIn}</button>
      </> : <>
        {mode !== "forgot" && <>
          <button className="google-button" type="button" disabled={state.busy} onClick={continueWithGoogle}>
            <GoogleLogo size={21} weight="bold" aria-hidden="true" />
            {copy.google}
          </button>
          <div className="auth-divider"><span>{copy.or}</span></div>
        </>}
        <form onSubmit={submit}>
        {mode === "signup" && <label>{copy.name}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>}
        <label>{copy.email}<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" autoFocus /></label>
        {mode !== "forgot" && <label>{copy.password}<input type="password" required minLength={10} maxLength={128} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
        {state.message && <p className="form-message" role="status">{state.message}</p>}
        <button className="continue-button" disabled={state.busy} type="submit">{state.busy ? "…" : mode === "signup" ? copy.signUp : mode === "forgot" ? copy.resetAction : copy.signIn}</button>
        <div className="auth-switches">
          {mode === "signin" && <button type="button" onClick={() => setMode("forgot")}>{copy.forgot}</button>}
          <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? copy.signIn : copy.signUp}</button>
        </div>
      </form></>}
    </section>
  </div>;
}

export function App() {
  const [locale, setLocale] = useState(resolveLocale);
  const [view, setView] = useState("market");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [offers, setOffers] = useState([]);
  const [notice, setNotice] = useState("");
  const t = catalogs[locale];
  const SelectedIcon = selectedTool?.icon;

  const refreshSession = async () => {
    const result = await api("/api/auth/get-session").catch(() => null);
    setSession(result?.session ? result : result?.user ? result : null);
    return result;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("ost_locale", locale);
    document.cookie = `ost_locale=${encodeURIComponent(locale)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    document.title = locale === "zh-CN" ? "OneShowTools｜实用 AI 小工具" : "OneShowTools | Practical AI tools";
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.hero.subtitle);
  }, [locale, t.hero.subtitle]);

  useEffect(() => {
    refreshSession();
    api("/api/offers").then((data) => setOffers(data.offers || [])).catch(() => {});
    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "true") setNotice(t.status.verified);
    if (params.get("auth") === "google-error") setNotice(t.auth.invalid);
    if (params.get("billing") === "success") setNotice(t.status.billingSuccess);
    if (params.get("billing") === "cancelled") setNotice(t.status.cancelled);
  }, []);

  useEffect(() => {
    if (!session?.user) return setAccount(null);
    api("/api/account").then(setAccount).catch(() => setAccount(null));
  }, [session, view]);

  const tools = useMemo(() => toolContent.map((tool) => ({
    ...tool, name: tool[locale === "en" ? "en" : "zh"][0], description: tool[locale === "en" ? "en" : "zh"][1],
  })), [locale]);
  const visibleTools = tools.filter((tool) => !submittedQuery.trim() || `${tool.name} ${tool.description} ${tool.keywords}`.toLowerCase().includes(submittedQuery.trim().toLowerCase()));
  const quickSearches = locale === "zh-CN" ? ["去除图片背景", "PDF 摘要", "图片压缩", "语音转文字", "文案润色"] : ["Remove background", "PDF summary", "Image compression", "Speech to text", "Polish copy"];

  const switchLocale = async () => {
    const next = locale === "zh-CN" ? "en" : "zh-CN";
    setLocale(next);
    if (session?.user) await api("/api/account/locale", { method: "PUT", body: JSON.stringify({ locale: next }) }).catch(() => {});
  };
  const signOut = async () => {
    await api("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(() => {});
    setSession(null); setAccount(null); setView("market");
  };
  const beginCheckout = async (offerId) => {
    if (!session?.user) return setAuthOpen(true);
    try {
      const result = await api("/api/billing/checkout", { method: "POST", body: JSON.stringify({ offerId }) });
      location.assign(result.url);
    } catch (error) {
      setNotice(error.message === "BILLING_DISABLED" ? t.pricing.disabled : t.status.error);
    }
  };

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => setView("market")}><span className="brand-mark"><GridFour weight="fill" size={18} /></span><span className="brand-copy"><strong>OneShowTools</strong><small>by OneShow AI Lab</small></span></a>
      <nav className="main-nav" aria-label="Main navigation">
        {["market", "workspace", "pricing"].map((item) => <button className={view === item ? "nav-item active" : "nav-item"} key={item} onClick={() => setView(item)}>{t.nav[item]}</button>)}
      </nav>
      <div className="header-actions">
        <button className="locale-button" type="button" onClick={switchLocale}><Translate size={18} />{locale === "zh-CN" ? "EN" : "中文"}</button>
        {session?.user ? <button className="login-button account-button" onClick={() => setView("workspace")}><UserCircle size={19} />{session.user.name || t.nav.account}</button> : <button className="login-button" onClick={() => setAuthOpen(true)}>{t.nav.login}</button>}
      </div>
    </header>

    {notice && <div className="global-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label={t.auth.close}><X size={16} /></button></div>}

    {view === "market" && <>
      <section className="hero" id="top"><p className="eyebrow">{t.hero.eyebrow}</p><h1>{t.hero.title}</h1><p className="hero-copy">{t.hero.subtitle}</p>
        <form className="search-form" role="search" onSubmit={(e) => { e.preventDefault(); setSubmittedQuery(query); }}><MagnifyingGlass size={25} /><input aria-label={t.hero.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.hero.placeholder} /><button>{t.hero.search}</button></form>
        <div className="quick-searches"><span>{t.hero.popular}</span><div>{quickSearches.map((item) => <button key={item} onClick={() => { setQuery(item); setSubmittedQuery(item); }}>{item}</button>)}</div></div>
      </section>
      {selectedTool && <div className="tool-feedback" tabIndex="-1" role="status"><span className={`mini-icon ${selectedTool.tone}`}><SelectedIcon size={18} /></span><p><strong>{selectedTool.name}</strong><span>{t.discovery.ready}</span></p><button onClick={() => setSelectedTool(null)}><X size={18} /></button></div>}
      <section className="content-grid">
        <section className="panel tools-panel"><header className="panel-header"><span className="panel-icon"><GridFour size={23} /></span><h2>{submittedQuery ? t.discovery.results : t.discovery.library}</h2>{submittedQuery && <button className="clear-search" onClick={() => { setQuery(""); setSubmittedQuery(""); }}>{t.discovery.all}</button>}</header>
          <div className="tool-list">{visibleTools.map((tool) => { const Icon = tool.icon; return <button className="tool-row" key={tool.id} onClick={() => setSelectedTool(tool)}><span className={`tool-icon ${tool.tone}`}><Icon size={31} /></span><span className="tool-copy"><strong>{tool.name}</strong><small>{tool.description}</small></span><ArrowRight className="row-arrow" size={27} /></button>; })}{!visibleTools.length && <div className="empty-state"><MagnifyingGlass size={28} /><strong>{t.discovery.empty}</strong><span>{t.discovery.emptyHint}</span></div>}</div>
        </section>
        <aside className="panel recent-panel"><header className="panel-header"><span className="panel-icon muted"><Clock size={24} /></span><h2>{t.discovery.recent}</h2></header>
          {session?.user && account ? <><div className="account-summary"><span>{t.workspace.subscription}</span><strong>{account.billing.subscription?.[locale === "en" ? "nameEn" : "nameZh"] || t.workspace.free}</strong><span>{t.workspace.credits}</span><strong>{formatNumber(account.billing.balance, locale)}</strong></div><button className="workspace-link" onClick={() => setView("workspace")}>{t.nav.workspace}<ArrowRight size={18} /></button></> : <div className="visitor-card"><UserCircle size={34} /><strong>{t.visitor.title}</strong><p>{t.visitor.body}</p><button onClick={() => setAuthOpen(true)}>{t.visitor.action}</button></div>}
        </aside>
      </section>
    </>}

    {view === "workspace" && <section className="page-section">
      <header className="page-heading"><h1>{t.workspace.title}</h1></header>
      {!session?.user ? <div className="panel signed-out-panel"><UserCircle size={42} /><h2>{t.workspace.signInTitle}</h2><p>{t.visitor.body}</p><button className="primary-action" onClick={() => setAuthOpen(true)}>{t.visitor.action}</button></div> :
      <div className="workspace-grid"><section className="panel profile-card"><h2>{t.workspace.profile}</h2><strong>{session.user.name}</strong><span>{session.user.email}</span><button className="secondary-action" onClick={signOut}>{t.nav.logout}</button></section><section className="panel metric-card"><span>{t.workspace.subscription}</span><strong>{account?.billing.subscription?.[locale === "en" ? "nameEn" : "nameZh"] || t.workspace.free}</strong></section><section className="panel metric-card"><span>{t.workspace.credits}</span><strong>{formatNumber(account?.billing.balance || 0, locale)}</strong></section><section className="panel ledger-card"><h2>{t.workspace.history}</h2>{account?.billing.ledger?.length ? account.billing.ledger.map((entry) => <div key={entry.id}><span>{entry.type}</span><strong className={entry.amount >= 0 ? "positive" : ""}>{entry.amount >= 0 ? "+" : ""}{formatNumber(entry.amount, locale)}</strong><small>{formatDate(entry.createdAt, locale)}</small></div>) : <p>{t.workspace.noHistory}</p>}</section></div>}
    </section>}

    {view === "pricing" && <section className="page-section pricing-page"><header className="page-heading"><h1>{t.pricing.title}</h1><p>{t.pricing.subtitle}</p></header><div className="pricing-grid">{offers.map((offer) => <article className="panel pricing-card" key={offer.id}><span className="offer-kind">{offer.kind === "subscription" ? t.pricing.monthly : t.pricing.oneTime}</span><h2>{offer[locale === "en" ? "nameEn" : "nameZh"] || `${formatNumber(offer.credits, locale)} ${t.pricing.credits}`}</h2><strong className="price">{formatCurrency(offer.amountMinor, offer.currency, locale)}<small>{offer.kind === "subscription" ? ` / ${t.pricing.monthly}` : ""}</small></strong><p>{formatNumber(offer.credits, locale)} {t.pricing.credits}</p><button className="primary-action" onClick={() => beginCheckout(offer.id)}>{offer.kind === "subscription" ? t.pricing.subscribe : t.pricing.topup}</button></article>)}</div><p className="pricing-note">{t.pricing.limitations}</p></section>}
    {authOpen && <AuthDialog copy={t.auth} onClose={() => setAuthOpen(false)} onAuthenticated={refreshSession} />}
  </main>;
}
