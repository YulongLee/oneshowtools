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
    label: "智能客服", online: "OneShow 智能客服", intro: "你好，我可以解答账户、积分、模型、任务和文件等问题。",
    placeholder: "请输入你的问题…", send: "发送", human: "提交客服工单", newChat: "发起新咨询",
    history: "历史咨询", empty: "开始提问，我会先查询已审核的解决方案。", waiting: "工单待处理",
    resolved: "已解决", inProgress: "工单处理中", open: "AI 客服", error: "客服暂时不可用，请稍后重试。",
    typing: "正在查询解决方案…", back: "返回对话", close: "关闭客服",
    ticketTitle: "提交异步客服工单", ticketBody: "请补充问题、任务时间或相关工具名称。管理员会定期处理，并在本对话中回复。",
    ticketPlaceholder: "补充问题细节（必填）", cancel: "取消", submitTicket: "确认提交",
    handoffDone: "留言已经保存为工单。无需在线等待，稍后回到这里即可查看管理员回复。",
    adminReply: "工单回复",
  },
  en: {
    label: "Support", online: "OneShow Support", intro: "Hi! I can help with accounts, credits, models, tasks, and files.",
    placeholder: "Type your question…", send: "Send", human: "Submit support ticket", newChat: "New conversation",
    history: "Conversation history", empty: "Ask a question and I will search verified solutions first.", waiting: "Ticket pending",
    resolved: "Resolved", inProgress: "Ticket in progress", open: "AI support", error: "Support is temporarily unavailable.",
    typing: "Checking verified solutions…", back: "Back to chat", close: "Close support",
    ticketTitle: "Submit an asynchronous ticket", ticketBody: "Add the issue details, task time, or tool name. An administrator will review it and reply in this conversation.",
    ticketPlaceholder: "Add issue details (required)", cancel: "Cancel", submitTicket: "Submit ticket",
    handoffDone: "Your message is saved as a ticket. You do not need to wait online; check this conversation later for the administrator's reply.",
    adminReply: "Ticket reply",
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
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketDraft, setTicketDraft] = useState("");
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

  const submitTicket = async () => {
    const note = ticketDraft.trim();
    if (!conversation?.id || !note || busy) return;
    setBusy(true); setError("");
    try {
      const data = await request(`/api/support/conversations/${conversation.id}/ticket`, json({ message: note }));
      setConversation(data.conversation); setTicketDraft(""); setTicketOpen(false); await load();
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
        <header className="support-panel-header"><div className="support-bot-avatar"><Robot size={27} weight="duotone" /></div><div><strong>{t.online}</strong><small><i />OneShowModel · {locale === "en" ? "Asynchronous ticket support" : "支持异步工单跟进"}</small></div><button onClick={() => setOpen(false)} aria-label={t.close}><X size={20} /></button></header>
        <nav className="support-panel-nav"><button className={!historyOpen ? "active" : ""} onClick={() => setHistoryOpen(false)}><ChatCircleDots size={16} />{t.back}</button><button className={historyOpen ? "active" : ""} onClick={() => setHistoryOpen(true)}><Clock size={16} />{t.history}<span>{conversations.length}</span></button></nav>
        {historyOpen ? <div className="support-history-list">
          <button className="support-new-chat" onClick={() => { setConversation(null); setHistoryOpen(false); setMessage(""); }}><span>+</span>{t.newChat}</button>
          {conversations.map((item) => <button key={item.id} onClick={() => selectConversation(item.id)}><span className={`support-history-icon ${item.status}`}><ChatCircleDots size={18} /></span><div><strong>{item.subject}</strong><small>{item.latestMessage || t.empty}</small></div><em>{statusText(item.status, t)}</em></button>)}
        </div> : <>
          <div className="support-conversation-status"><span className={`support-status-dot ${conversation?.status || "open"}`} />{statusText(conversation?.status, t)}{conversation?.status === "awaiting_agent" && <small>{t.handoffDone}</small>}</div>
          <div className="support-messages" ref={messagesRef}>
            <article className="support-message assistant"><span><Robot size={18} weight="duotone" /></span><div><p>{t.intro}</p></div></article>
            {!conversation?.messages?.length && <div className="support-empty"><ChatCircleDots size={30} weight="duotone" /><p>{t.empty}</p></div>}
            {conversation?.messages?.map((item) => item.senderType === "system" ? <div className="support-system-message" key={item.id}><CheckCircle size={14} />{item.body}</div> : <article className={`support-message ${item.senderType}`} key={item.id}><span>{item.senderType === "user" ? <UserCircle size={18} /> : <Robot size={18} weight="duotone" />}</span><div><p>{item.body}</p><small>{item.senderType === "admin" ? t.adminReply : item.senderType === "assistant" ? "OneShow AI" : ""}</small></div></article>)}
            {busy && <article className="support-message assistant typing"><span><Robot size={18} weight="duotone" /></span><div><SpinnerGap className="spin" size={17} />{t.typing}</div></article>}
          </div>
          {error && <div className="support-error">{error === "SUPPORT_REQUEST_FAILED" ? t.error : error}</div>}
          <footer className="support-composer">{ticketOpen && <section className="support-ticket-form"><strong>{t.ticketTitle}</strong><p>{t.ticketBody}</p><textarea rows="3" maxLength="2000" value={ticketDraft} onChange={(event) => setTicketDraft(event.target.value)} placeholder={t.ticketPlaceholder} /><div><button onClick={() => { setTicketOpen(false); setTicketDraft(""); }}>{t.cancel}</button><button className="primary" disabled={busy || !ticketDraft.trim()} onClick={submitTicket}>{t.submitTicket}</button></div></section>}<form onSubmit={send}><textarea rows="2" maxLength="2000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t.placeholder} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(event); } }} /><button disabled={busy || !message.trim()} aria-label={t.send}><PaperPlaneRight size={20} weight="fill" /></button></form>{conversation?.id && !ticketOpen && !["awaiting_agent", "resolved", "closed"].includes(conversation.status) && <button className="support-handoff" disabled={busy} onClick={() => setTicketOpen(true)}><ChatCircleDots size={16} />{t.human}</button>}</footer>
        </>}
      </section>
    </div>}
  </>;
}
