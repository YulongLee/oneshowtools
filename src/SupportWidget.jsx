import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ChatCircleDots, CheckCircle, Clock, PaperPlaneRight, Robot,
  SpinnerGap, UserCircle, X,
} from "@phosphor-icons/react";

const request = async (path, options = {}) => {
  const response = await fetch(path, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.code || "SUPPORT_REQUEST_FAILED");
  return data;
};
const json = (data) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });

const words = {
  "zh-CN": {
    label: "智能客服", online: "OneShow 客服在线", intro: "你好，我可以解答账户、积分、模型、任务和文件等问题。",
    placeholder: "请输入你的问题…", send: "发送", human: "仍未解决，转人工", newChat: "发起新咨询",
    history: "历史咨询", empty: "开始提问，我会先查询已审核的解决方案。", waiting: "已转人工，等待处理",
    resolved: "已解决", inProgress: "人工处理中", open: "智能客服处理中", error: "客服暂时不可用，请稍后重试。",
    typing: "正在查询解决方案…", back: "返回对话", close: "关闭客服", humanNote: "请补充希望人工处理的问题（可选）",
    handoffDone: "已经保存留言，人工客服会在后台处理。你可以稍后回到这里查看回复。",
  },
  en: {
    label: "Support", online: "OneShow Support", intro: "Hi! I can help with accounts, credits, models, tasks, and files.",
    placeholder: "Type your question…", send: "Send", human: "Still need help", newChat: "New conversation",
    history: "Conversation history", empty: "Ask a question and I will search verified solutions first.", waiting: "Waiting for an agent",
    resolved: "Resolved", inProgress: "Agent is helping", open: "AI support", error: "Support is temporarily unavailable.",
    typing: "Checking verified solutions…", back: "Back to chat", close: "Close support", humanNote: "Add a note for the agent (optional)",
    handoffDone: "Your message is saved. An agent will respond here, so you can check back later.",
  },
};

function statusText(status, t) {
  if (status === "awaiting_agent") return t.waiting;
  if (status === "in_progress") return t.inProgress;
  if (status === "resolved" || status === "closed") return t.resolved;
  return t.open;
}

export function SupportWidget({ locale = "zh-CN" }) {
  const t = words[locale] || words["zh-CN"];
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);

  const load = async () => {
    try {
      const data = await request("/api/support/conversations");
      setConversations(data.conversations || []);
      if (!conversation && data.conversations?.[0]) {
        const detail = await request(`/api/support/conversations/${data.conversations[0].id}`);
        setConversation(detail.conversation);
      }
    } catch (caught) { setError(caught.message); }
  };

  useEffect(() => { if (open) load(); }, [open]);
  useEffect(() => {
    if (!open || !conversation || !["awaiting_agent", "in_progress"].includes(conversation.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const detail = await request(`/api/support/conversations/${conversation.id}`);
        setConversation(detail.conversation);
      } catch { /* keep the last visible conversation */ }
    }, 15000);
    return () => clearInterval(timer);
  }, [open, conversation?.id, conversation?.status]);
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages?.length, busy]);

  const send = async (event) => {
    event?.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true); setError(""); setMessage("");
    const optimistic = {
      ...(conversation || { id: null, status: "open", messages: [] }),
      messages: [...(conversation?.messages || []), { id: `draft-${Date.now()}`, senderType: "user", body: text, createdAt: Date.now() }],
    };
    setConversation(optimistic);
    try {
      const data = await request("/api/support/messages", json({ conversationId: conversation?.id || null, message: text, locale }));
      setConversation(data.conversation);
      await load();
    } catch (caught) { setConversation(conversation); setMessage(text); setError(caught.message || t.error); }
    finally { setBusy(false); }
  };

  const handoff = async () => {
    if (!conversation?.id || busy) return;
    const note = window.prompt(t.humanNote, "") ?? null;
    if (note == null) return;
    setBusy(true); setError("");
    try {
      const data = await request(`/api/support/conversations/${conversation.id}/handoff`, json({ message: note }));
      setConversation(data.conversation); await load();
    } catch (caught) { setError(caught.message || t.error); }
    finally { setBusy(false); }
  };

  const selectConversation = async (id) => {
    setBusy(true); setError("");
    try { setConversation((await request(`/api/support/conversations/${id}`)).conversation); setHistoryOpen(false); }
    catch (caught) { setError(caught.message || t.error); }
    finally { setBusy(false); }
  };

  return <>
    <button className="support-robot-entry" onClick={() => setOpen(true)} aria-label={t.label} title={t.label}>
      <span><Robot size={26} weight="duotone" /></span><div><strong>{t.label}</strong><small><i />{locale === "en" ? "Online" : "在线"}</small></div>
    </button>
    {open && <div className="support-panel-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="support-panel" role="dialog" aria-modal="true" aria-label={t.label}>
        <header className="support-panel-header"><div className="support-bot-avatar"><Robot size={27} weight="duotone" /></div><div><strong>{t.online}</strong><small><i />OneShowModel · {locale === "en" ? "Human handoff available" : "可转人工处理"}</small></div><button onClick={() => setOpen(false)} aria-label={t.close}><X size={20} /></button></header>
        <nav className="support-panel-nav"><button className={!historyOpen ? "active" : ""} onClick={() => setHistoryOpen(false)}><ChatCircleDots size={16} />{t.back}</button><button className={historyOpen ? "active" : ""} onClick={() => setHistoryOpen(true)}><Clock size={16} />{t.history}<span>{conversations.length}</span></button></nav>
        {historyOpen ? <div className="support-history-list">
          <button className="support-new-chat" onClick={() => { setConversation(null); setHistoryOpen(false); setMessage(""); }}><span>+</span>{t.newChat}</button>
          {conversations.map((item) => <button key={item.id} onClick={() => selectConversation(item.id)}><span className={`support-history-icon ${item.status}`}><ChatCircleDots size={18} /></span><div><strong>{item.subject}</strong><small>{item.latestMessage || t.empty}</small></div><em>{statusText(item.status, t)}</em></button>)}
        </div> : <>
          <div className="support-conversation-status"><span className={`support-status-dot ${conversation?.status || "open"}`} />{statusText(conversation?.status, t)}{conversation?.status === "awaiting_agent" && <small>{t.handoffDone}</small>}</div>
          <div className="support-messages" ref={messagesRef}>
            <article className="support-message assistant"><span><Robot size={18} weight="duotone" /></span><div><p>{t.intro}</p></div></article>
            {!conversation?.messages?.length && <div className="support-empty"><ChatCircleDots size={30} weight="duotone" /><p>{t.empty}</p></div>}
            {conversation?.messages?.map((item) => item.senderType === "system" ? <div className="support-system-message" key={item.id}><CheckCircle size={14} />{item.body}</div> : <article className={`support-message ${item.senderType}`} key={item.id}><span>{item.senderType === "user" ? <UserCircle size={18} /> : <Robot size={18} weight="duotone" />}</span><div><p>{item.body}</p><small>{item.senderType === "admin" ? (locale === "en" ? "Human agent" : "人工客服") : item.senderType === "assistant" ? "OneShow AI" : ""}</small></div></article>)}
            {busy && <article className="support-message assistant typing"><span><Robot size={18} weight="duotone" /></span><div><SpinnerGap className="spin" size={17} />{t.typing}</div></article>}
          </div>
          {error && <div className="support-error">{error === "SUPPORT_REQUEST_FAILED" ? t.error : error}</div>}
          <footer className="support-composer"><form onSubmit={send}><textarea rows="2" maxLength="2000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t.placeholder} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(event); } }} /><button disabled={busy || !message.trim()} aria-label={t.send}><PaperPlaneRight size={20} weight="fill" /></button></form>{conversation?.id && !["awaiting_agent", "resolved", "closed"].includes(conversation.status) && <button className="support-handoff" disabled={busy} onClick={handoff}><UserCircle size={16} />{t.human}</button>}</footer>
        </>}
      </section>
    </div>}
  </>;
}
