import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpenText, Books, Brain, Check, Clock,
  CloudArrowUp, Coins, FileDoc, FilePdf, FileText, Headphones, MagicWand,
  Plus, SpeakerHigh, SpinnerGap, Trash, TrendUp, UploadSimple, X,
} from "@phosphor-icons/react";
import "./word-immersion.css";

const errorText = {
  IMMERSION_SOURCE_REQUIRED: "请粘贴至少 20 个字符，或上传一份文档。",
  IMMERSION_FILE_TOO_LARGE: "文件不能超过 12 MB。",
  IMMERSION_FILE_UNSUPPORTED: "支持 PDF、DOCX、TXT 和 Markdown 文件。",
  IMMERSION_TEXT_NOT_FOUND: "没有从文档中识别到可阅读的文字。",
  IMMERSION_DOCUMENT_TOO_LONG: "当前测试版单份内容最多 5 万字。",
  IMMERSION_DOCUMENT_PARSE_FAILED: "文档解析失败，请换成 PDF、DOCX 或纯文本重试。",
  IMMERSION_VOCABULARY_NOT_FOUND: "请选择一个有效词库。",
  IMMERSION_CUSTOM_VOCABULARY_INVALID: "没有识别到有效英文单词，请每行输入一个单词。",
  INSUFFICIENT_CREDITS: "积分不足，请先充值后再生成。",
  MODEL_PROVIDER_NOT_CONFIGURED: "当前生成模型尚未配置，请联系管理员。",
};

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data?.error?.code || "REQUEST_FAILED";
    throw Object.assign(new Error(errorText[code] || "操作失败，请稍后重试。"), { code });
  }
  return data;
}
const json = (method, payload) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
const statusLabel = { draft: "待生成", queued: "排队中", generating: "正在生成", ready: "可阅读", failed: "生成失败" };

function EmptyLibrary({ onCreate }) {
  return <div className="wi-empty">
    <span><BookOpenText size={42} weight="duotone" /></span>
    <h2>把熟悉的内容，变成你的英语读物</h2>
    <p>上传文章或粘贴文本，AI 会在不改变原意的前提下，自然融入你的目标词汇。</p>
    <button onClick={onCreate}><Plus size={18} weight="bold" />创建第一篇沉浸阅读</button>
  </div>;
}

function DocumentCard({ item, onOpen, onDelete }) {
  const ready = item.status === "ready";
  return <article className="wi-document-card">
    <div className="wi-document-icon"><FileText size={24} weight="duotone" /></div>
    <div className="wi-document-copy">
      <div><strong>{item.title}</strong><span className={`wi-status ${item.status}`}>{statusLabel[item.status] || item.status}</span></div>
      <p>{item.vocabularyBook?.nameZh || "尚未选择词库"} · {item.immersionLevel}% 沉浸 · {item.chapterCount} 章</p>
      <div className="wi-progress"><i style={{ width: `${item.readingProgress || 0}%` }} /></div>
      <small>{ready ? `已读 ${Math.round(item.readingProgress || 0)}%` : item.status === "failed" ? "可重新配置生成" : "内容处理中"}</small>
    </div>
    <button className="wi-card-open" onClick={() => onOpen(item)}>{ready ? "继续阅读" : "查看"}<ArrowRight size={15} /></button>
    <button className="wi-icon-button danger" title="删除" onClick={() => onDelete(item)}><Trash size={17} /></button>
  </article>;
}

function CreateWorkspace({ catalog, tool, onCancel, onCreated }) {
  const [mode, setMode] = useState("paste");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [bookId, setBookId] = useState(catalog.books?.[0]?.id || "");
  const [level, setLevel] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customWords, setCustomWords] = useState("");
  const inputRef = useRef(null);
  const levelMeta = catalog.levels?.find((item) => item.value === level);

  async function addBook() {
    setBusy(true); setError("");
    try {
      const { book } = await request("/api/word-immersion/vocabulary-books", json("POST", { name: customName, words: customWords }));
      catalog.books.push(book); setBookId(book.id); setCustomOpen(false);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  async function generate() {
    setBusy(true); setError("");
    try {
      let response;
      if (mode === "file") {
        if (!file) throw new Error("请先上传文档。");
        const form = new FormData(); form.append("file", file); if (title) form.append("title", title);
        response = await request("/api/word-immersion/documents", { method: "POST", body: form });
      } else {
        response = await request("/api/word-immersion/documents", json("POST", { title, text }));
      }
      await request(`/api/word-immersion/documents/${response.document.id}/generate`, json("POST", { vocabularyBookId: bookId, immersionLevel: level }));
      onCreated(response.document.id);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  return <section className="wi-create">
    <header><button className="wi-back-link" onClick={onCancel}><ArrowLeft size={16} />返回阅读库</button><div><small>CREATE · 3 STEPS</small><h2>创建沉浸阅读</h2><p>原文、词库和沉浸度都可以在生成前确认。</p></div></header>
    <div className="wi-create-grid">
      <article className="wi-create-panel wi-source-panel">
        <div className="wi-step-title"><span>01</span><div><h3>添加阅读内容</h3><p>支持粘贴文本或上传常见文档</p></div></div>
        <div className="wi-segment"><button className={mode === "paste" ? "active" : ""} onClick={() => setMode("paste")}>粘贴文本</button><button className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}>上传文件</button></div>
        <label className="wi-field"><span>读物标题（可选）</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：我的第一篇沉浸阅读" /></label>
        {mode === "paste" ? <label className="wi-field"><span>原文内容</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="粘贴中文文章、学习资料或你真正想读的内容……" /><small>{text.length.toLocaleString()} / 50,000 字符</small></label> : <button className={`wi-upload ${file ? "has-file" : ""}`} onClick={() => inputRef.current?.click()}><input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md,text/plain,application/pdf" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />{file ? <><FileDoc size={32} weight="duotone" /><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · 点击更换</span></> : <><CloudArrowUp size={34} weight="duotone" /><strong>拖拽或点击上传文档</strong><span>PDF · DOCX · TXT · Markdown，最大 12 MB</span></>}</button>}
      </article>
      <article className="wi-create-panel">
        <div className="wi-step-title"><span>02</span><div><h3>选择目标词库</h3><p>生成内容会自然融入这些词汇</p></div></div>
        <div className="wi-book-grid">{catalog.books.map((book) => <button key={book.id} className={bookId === book.id ? "active" : ""} onClick={() => setBookId(book.id)}><span>{book.kind === "custom" ? <FileText size={18} /> : <Books size={18} />}</span><div><strong>{book.nameZh}</strong><small>{book.wordCount} 个词</small></div>{bookId === book.id && <Check size={16} weight="bold" />}</button>)}</div>
        <button className="wi-add-book" onClick={() => setCustomOpen(true)}><Plus size={16} />导入自定义词库</button>
      </article>
      <article className="wi-create-panel wi-level-panel">
        <div className="wi-step-title"><span>03</span><div><h3>设置沉浸度</h3><p>决定目标词汇在正文中的出现密度</p></div></div>
        <div className="wi-level-value"><strong>{level}%</strong><span>{levelMeta?.name}</span></div>
        <input className="wi-range" type="range" min="0" max="4" value={[10,20,30,50,70].indexOf(level)} onChange={(event) => setLevel([10,20,30,50,70][Number(event.target.value)])} />
        <div className="wi-level-labels"><span>轻度</span><span>日常</span><span>进阶</span><span>深度</span><span>挑战</span></div>
        <p className="wi-level-note"><MagicWand size={17} weight="duotone" />{levelMeta?.description}</p>
        <div className="wi-generate-summary"><span><Coins size={17} />本次生成</span><strong>{tool.creditCost} 积分</strong></div>
        {error && <p className="wi-error">{error}</p>}
        <button className="wi-primary" disabled={busy || !bookId || (mode === "paste" ? text.trim().length < 20 : !file)} onClick={generate}>{busy ? <SpinnerGap className="wi-spin" size={18} /> : <MagicWand size={18} weight="fill" />}{busy ? "正在创建…" : "开始生成沉浸阅读"}</button>
        <small className="wi-safe-note">AI 只调整语言呈现，不改变原文事实与逻辑。</small>
      </article>
    </div>
    {customOpen && <div className="wi-modal"><div><button className="wi-modal-close" onClick={() => setCustomOpen(false)}><X /></button><h3>导入自定义词库</h3><p>每行一个英文单词，可用冒号补充中文释义。</p><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="词库名称" /><textarea value={customWords} onChange={(event) => setCustomWords(event.target.value)} placeholder={"momentum：动力\nresilient：有韧性的\ninsight：洞见"} /><button className="wi-primary" disabled={busy} onClick={addBook}>保存并使用</button></div></div>}
  </section>;
}

function Generating({ document, onBack }) {
  const total = document?.generation?.totalChapters || document?.chapterCount || 1;
  const completed = document?.generation?.completedChapters || document?.generatedChapters || 0;
  const percent = Math.max(6, Math.round(completed / total * 100));
  return <section className="wi-generating"><button className="wi-back-link" onClick={onBack}><ArrowLeft size={16} />返回阅读库</button><div className="wi-orbit"><span><BookOpenText size={48} weight="duotone" /></span><i /><i /></div><small>AI IMMERSION ENGINE</small><h2>{document?.status === "failed" ? "这次生成没有完成" : "正在为你重写阅读体验"}</h2><p>{document?.status === "failed" ? "可以返回后重新创建，原始内容不会丢失。" : `正在处理第 ${Math.min(completed + 1, total)} / ${total} 章，通常需要几十秒。`}</p><div className="wi-generating-progress"><i style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></section>;
}

function Reader({ document, initialChapter = 0, onBack, onProgress, onWord }) {
  const [chapterIndex, setChapterIndex] = useState(Math.min(initialChapter, Math.max(0, document.chapters.length - 1)));
  const [wordCard, setWordCard] = useState(null);
  const chapter = document.chapters[chapterIndex];
  const percentage = Math.round((chapterIndex + 1) / document.chapters.length * 100);
  function go(next) { const index = Math.max(0, Math.min(document.chapters.length - 1, next)); setChapterIndex(index); setWordCard(null); onProgress(index, Math.round((index + 1) / document.chapters.length * 100)); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openWord(segment) { setWordCard(segment); onWord(segment.word, "view"); }
  function speak(word) { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word); utterance.lang = "en-US"; utterance.rate = .82; speechSynthesis.speak(utterance); }
  return <section className="wi-reader">
    <header><button className="wi-back-link" onClick={onBack}><ArrowLeft size={16} />我的阅读库</button><div><strong>{document.title}</strong><small>{chapterIndex + 1} / {document.chapters.length}</small></div><span>{percentage}%</span></header>
    <div className="wi-reader-progress"><i style={{ width: `${percentage}%` }} /></div>
    <main><div className="wi-reader-meta"><span>CHAPTER {String(chapterIndex + 1).padStart(2,"0")}</span><small>{document.vocabularyBook?.nameZh} · {document.immersionLevel}% 沉浸</small></div><h1>{chapter.title}</h1><article>{chapter.segments.map((segment, index) => segment.type === "word" ? <button key={index} className="wi-word" onClick={() => openWord(segment)}>{segment.text}</button> : <span key={index}>{segment.text}</span>)}</article><footer><button disabled={chapterIndex === 0} onClick={() => go(chapterIndex - 1)}><ArrowLeft />上一章</button><button disabled={chapterIndex === document.chapters.length - 1} onClick={() => go(chapterIndex + 1)}>下一章<ArrowRight /></button></footer></main>
    {wordCard && <aside className="wi-word-card"><button className="wi-modal-close" onClick={() => setWordCard(null)}><X /></button><div className="wi-word-title"><div><strong>{wordCard.word}</strong><small>{wordCard.phonetic || "点击发音，加深记忆"}</small></div><button onClick={() => speak(wordCard.word)}><SpeakerHigh size={19} /></button></div><p>{wordCard.translation || wordCard.original}</p>{wordCard.original && <small>原文表达：{wordCard.original}</small>}<div><button onClick={() => onWord(wordCard.word, "unknown")}>还不熟</button><button onClick={() => onWord(wordCard.word, "save")}>加入生词本</button><button className="active" onClick={() => { onWord(wordCard.word, "known"); setWordCard(null); }}><Check />已掌握</button></div></aside>}
  </section>;
}

function Vocabulary({ vocabulary, onBack, onAction }) {
  const [filter, setFilter] = useState("all");
  const words = vocabulary.words.filter((word) => filter === "all" || word.knownStatus === filter);
  return <section className="wi-vocabulary"><header><button className="wi-back-link" onClick={onBack}><ArrowLeft size={16} />返回词浸</button><small>MY VOCABULARY</small><h2>我的词汇轨迹</h2><p>每次自然遇见、点击和复习，都会沉淀为真实的学习记录。</p></header><div className="wi-stat-grid"><article><span><Books /></span><strong>{vocabulary.stats.encountered}</strong><small>遇见词汇</small></article><article><span><Brain /></span><strong>{vocabulary.stats.learning}</strong><small>正在学习</small></article><article><span><TrendUp /></span><strong>{vocabulary.stats.known}</strong><small>已掌握</small></article></div><nav>{[["all","全部"],["learning","学习中"],["unknown","待复习"],["known","已掌握"]].map(([key,label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}</nav><div className="wi-word-list">{words.length ? words.map((word) => <article key={word.id}><div><strong>{word.word}</strong><small>{word.phonetic}</small></div><p>{word.translation || "释义将在持续阅读中完善"}</p><span>遇见 {word.exposureCount} 次</span><i style={{ "--score": `${word.familiarityScore}%` }} /><button onClick={() => onAction(word.word, word.knownStatus === "known" ? "unknown" : "known")}>{word.knownStatus === "known" ? "重新学习" : "标记掌握"}</button></article>) : <div className="wi-list-empty">开始阅读后，你遇见的目标词会出现在这里。</div>}</div></section>;
}

export function WordImmersion({ tool, onBack, onCompleted }) {
  const [view, setView] = useState("library");
  const [catalog, setCatalog] = useState({ books: [], levels: [] });
  const [documents, setDocuments] = useState([]);
  const [vocabulary, setVocabulary] = useState({ words: [], stats: { encountered: 0, learning: 0, known: 0, unknown: 0 } });
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeId = active?.id;
  const refresh = useCallback(async () => {
    const [catalogData, documentData, vocabularyData] = await Promise.all([request("/api/word-immersion/catalog"), request("/api/word-immersion/documents"), request("/api/word-immersion/vocabulary")]);
    setCatalog(catalogData); setDocuments(documentData.documents); setVocabulary(vocabularyData);
  }, []);
  useEffect(() => { refresh().catch((cause) => setError(cause.message)).finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [view]);
  useEffect(() => {
    if (view !== "generating" || !activeId) return undefined;
    const poll = async () => {
      try { const { document } = await request(`/api/word-immersion/documents/${activeId}`); setActive(document); if (document.status === "ready") { setView("reader"); refresh(); onCompleted?.(); } }
      catch (cause) { setError(cause.message); }
    };
    poll(); const timer = window.setInterval(poll, 2200); return () => window.clearInterval(timer);
  }, [view, activeId, refresh, onCompleted]);
  async function openDocument(item) { try { const { document } = await request(`/api/word-immersion/documents/${item.id}`); setActive(document); setView(document.status === "ready" ? "reader" : "generating"); } catch (cause) { setError(cause.message); } }
  async function removeDocument(item) { if (!window.confirm(`确定删除《${item.title}》吗？`)) return; await request(`/api/word-immersion/documents/${item.id}`, { method: "DELETE" }); refresh(); }
  async function wordAction(word, action) { try { await request("/api/word-immersion/vocabulary/action", json("POST", { word, action })); setVocabulary(await request("/api/word-immersion/vocabulary")); } catch {} }
  async function saveProgress(chapterIndex, percentage) { if (!activeId) return; request(`/api/word-immersion/documents/${activeId}/progress`, json("PATCH", { chapterIndex, percentage })).catch(() => {}); }
  if (view === "create") return <CreateWorkspace catalog={catalog} tool={tool} onCancel={() => setView("library")} onCreated={(id) => { setActive({ id }); setView("generating"); }} />;
  if (view === "generating") return <Generating document={active} onBack={() => { setView("library"); refresh(); }} />;
  if (view === "reader" && active) return <Reader document={active} initialChapter={active.readingChapter} onBack={() => { setView("library"); refresh(); }} onProgress={saveProgress} onWord={wordAction} />;
  if (view === "vocabulary") return <Vocabulary vocabulary={vocabulary} onBack={() => setView("library")} onAction={wordAction} />;
  return <section className="wi-shell">
    <button className="wi-top-back" onClick={onBack}><ArrowLeft size={17} />返回工具市场</button>
    <header className="wi-hero"><div className="wi-brand-icon"><img src="/word-immersion/wordin-icon-v2.png" alt="词浸应用图标" /></div><div><span>WORDIN · AI 沉浸式英语阅读 <i>测试中</i></span><h1>读你真正想读的，顺便学会英语</h1><p>将任何文章转化为循序渐进的沉浸式英文读物，让词汇在真实语境中自然发生。</p><div><small><Check weight="bold" />保留原意</small><small><Check weight="bold" />个性化词库</small><small><Check weight="bold" />学习轨迹</small></div></div><aside><strong>{tool.creditCost}</strong><span>积分 / 次</span></aside></header>
    <nav className="wi-main-tabs"><button className="active"><BookOpenText />我的阅读</button><button onClick={() => setView("vocabulary")}><Brain />我的词汇 <span>{vocabulary.stats.encountered}</span></button><button className="wi-new-button" onClick={() => setView("create")}><Plus />创建沉浸阅读</button></nav>
    <div className="wi-overview"><article><span><Books /></span><div><strong>{documents.length}</strong><small>我的读物</small></div></article><article><span><Clock /></span><div><strong>{documents.filter((item) => item.readingProgress > 0).length}</strong><small>正在阅读</small></div></article><article><span><Brain /></span><div><strong>{vocabulary.stats.encountered}</strong><small>累计遇词</small></div></article><article><span><TrendUp /></span><div><strong>{vocabulary.stats.known}</strong><small>已掌握</small></div></article></div>
    <main className="wi-library"><header><div><small>MY READING</small><h2>阅读库</h2></div><button onClick={() => setView("create")}><UploadSimple />导入新内容</button></header>{error && <p className="wi-error">{error}</p>}{loading ? <div className="wi-loading"><SpinnerGap className="wi-spin" />正在加载…</div> : documents.length ? <div className="wi-document-list">{documents.map((item) => <DocumentCard key={item.id} item={item} onOpen={openDocument} onDelete={removeDocument} />)}</div> : <EmptyLibrary onCreate={() => setView("create")} />}</main>
    <footer className="wi-footer"><Headphones size={18} /><span>阅读中遇到问题？可在右下角联系智能客服。</span><span>测试版 · 生成内容请结合原文核对</span></footer>
  </section>;
}

export default WordImmersion;
