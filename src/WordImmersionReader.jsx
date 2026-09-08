import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, SpeakerHigh, X } from "@phosphor-icons/react";

function speak(word, onError) {
  if (!("speechSynthesis" in window)) return onError("当前浏览器暂不支持发音，请换用支持语音的浏览器。");
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(word);
  voice.lang = "en-US";
  voice.rate = 0.85;
  voice.onerror = (event) => { if (!["interrupted", "canceled"].includes(event.error)) onError("发音暂时不可用，请稍后重试。"); };
  window.speechSynthesis.speak(voice);
}

export function Reader({ document, onBack, onProgress, onWord, vocabulary = { words: [] } }) {
  const [chapterIndex, setChapterIndex] = useState(Math.min(document.readingChapter || 0, Math.max(0, document.chapters.length - 1)));
  const [wordCard, setWordCard] = useState(null);
  const [original, setOriginal] = useState(false);
  const [fontSize, setFontSize] = useState(21);
  const [percentage, setPercentage] = useState(document.readingProgress || 0);
  const [completed, setCompleted] = useState(() => new Set(document.chapters.filter((c) => c.completed).map((c) => c.index)));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const visit = useRef(Promise.resolve());
  const chapter = document.chapters[chapterIndex];
  useEffect(() => {
    let current = true;
    setError(""); setNotice(""); setWordCard(null);
    visit.current = onProgress(chapterIndex, false);
    visit.current.then((progress) => { if (current) setPercentage(progress.percentage); }).catch((cause) => { if (current) setError(cause.message); });
    return () => { current = false; };
  }, [chapterIndex, document.id, onProgress]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  function go(index) { setChapterIndex(index); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function action(word, kind) {
    setBusy(true); setError(""); setNotice("");
    try {
      await visit.current;
      await onWord(word, kind);
      if (kind !== "view") { setNotice(kind === "known" ? "已标记掌握，7 天后复习" : kind === "save" ? "已加入生词本，明天复习" : "已加入待复习词汇"); setWordCard(null); }
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  async function finish() {
    setBusy(true); setError("");
    try {
      await visit.current;
      const progress = await onProgress(chapterIndex, true);
      setPercentage(progress.percentage);
      setCompleted((previous) => new Set([...previous, chapterIndex]));
      setNotice("本章已读完，进度已保存");
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  if (!chapter) return <section className="wi-generating"><p>暂时没有可阅读的章节。</p><button onClick={onBack}>返回阅读库</button></section>;
  return <section className="wi-reader">
    <header><button className="wi-back-link" onClick={onBack}><ArrowLeft />阅读库</button><div><strong>{document.title}</strong><small>第 {chapterIndex + 1} / {document.chapters.length} 章</small></div><span>已读 {percentage}%</span></header>
    <div className="wi-reader-progress"><i style={{ width: `${percentage}%` }} /></div>
    <main>
      <div className="wi-reading-controls">
        <label>目录<select aria-label="章节目录" value={chapterIndex} onChange={(event) => go(Number(event.target.value))}>{document.chapters.map((item, index) => <option key={item.id} value={index}>{completed.has(index) ? "✓ " : ""}{index + 1}. {item.title}</option>)}</select></label>
        <button aria-pressed={original} onClick={() => { setOriginal(!original); setWordCard(null); }}>{original ? "返回沉浸阅读" : "查看原文"}</button>
        <div><button aria-label="缩小字号" disabled={fontSize <= 16} onClick={() => setFontSize(Math.max(16, fontSize - 2))}>A−</button><button aria-label="放大字号" disabled={fontSize >= 30} onClick={() => setFontSize(Math.min(30, fontSize + 2))}>A＋</button></div>
      </div>
      {error && <p className="wi-error" role="alert">{error}</p>}{notice && <p className="wi-notice" role="status">{notice}</p>}
      <div className="wi-reader-meta"><span>{original ? "原文对照" : "沉浸阅读"}</span><small>{document.vocabularyBook?.nameZh} · {document.immersionLevel}% 沉浸</small></div>
      <h1>{chapter.title}</h1>
      <article style={{ fontSize }}>{original ? chapter.sourceText : chapter.segments.map((segment, index) => segment.type === "word" ? <button key={index} className="wi-word" onClick={() => { setWordCard(segment); void action(segment.word, "view"); }}>{segment.english ? (vocabulary.words.find(w => w.word === segment.word)?.knownStatus === "known" ? segment.english : `${segment.english}（${segment.original}）`) : segment.text}</button> : <span key={index}>{segment.text}</span>)}</article>
      <footer><button disabled={chapterIndex === 0 || busy} onClick={() => go(chapterIndex - 1)}><ArrowLeft />上一章</button><button disabled={busy || completed.has(chapterIndex)} onClick={finish}><Check />{completed.has(chapterIndex) ? "本章已读完" : "标记本章读完"}</button><button disabled={chapterIndex === document.chapters.length - 1 || busy} onClick={() => go(chapterIndex + 1)}>下一章<ArrowRight /></button></footer>
    </main>
    {wordCard && <aside className="wi-word-card" aria-label="单词释义"><button className="wi-modal-close" aria-label="关闭释义" onClick={() => setWordCard(null)}><X /></button><div className="wi-word-title"><div><strong>{wordCard.word}</strong><small>{wordCard.phonetic}</small></div><button aria-label="播放单词发音" onClick={() => speak(wordCard.word, setError)}><SpeakerHigh /></button></div><p>{wordCard.translation || wordCard.original}</p><small>原文表达：{wordCard.original}</small><div><button disabled={busy} onClick={() => action(wordCard.word, "unknown")}>还不熟</button><button disabled={busy} onClick={() => action(wordCard.word, "save")}>加入生词本</button><button disabled={busy} className="active" onClick={() => action(wordCard.word, "known")}><Check />已掌握</button></div></aside>}
  </section>;
}

export function Vocabulary({ vocabulary, onBack, onAction }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const due = vocabulary.words.filter((word) => !word.nextReviewAt || word.nextReviewAt <= Date.now());
  const words = vocabulary.words.filter((word) => (filter === "all" || (filter === "due" ? due.includes(word) : word.knownStatus === filter)) && `${word.word} ${word.translation}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function act(word, action, reviewing = false) {
    setBusy(true); setError("");
    try { await onAction(word, action); if (reviewing) { setPosition(position + 1); setRevealed(false); } }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  if (queue) {
    const word = queue[position];
    return <section className="wi-vocabulary"><button className="wi-back-link" onClick={() => setQueue(null)}><ArrowLeft />返回词汇</button><div className="wi-review-card">{error && <p className="wi-error" role="alert">{error}</p>}{word ? <><small>今日复习 · {position + 1} / {queue.length}</small><h2>{word.word}</h2><button aria-label="播放单词发音" onClick={() => speak(word.word, setError)}><SpeakerHigh />听发音</button>{revealed ? <><h3>{word.translation || "暂无释义"}</h3>{word.context && <blockquote>{word.context}</blockquote>}<div className="wi-review-actions"><button disabled={busy} onClick={() => act(word.word, "unknown", true)}>还不熟 · 明天再看</button><button disabled={busy} onClick={() => act(word.word, "known", true)}>记住了 · 7 天后复习</button></div></> : <><p>先试着回忆这个词的意思。</p><button className="wi-primary" onClick={() => setRevealed(true)}>查看释义与原文语境</button></>}</> : <><Check size={40} /><h2>本轮复习完成</h2><p>已复习 {queue.length} 个词，学习记录已保存。</p><button className="wi-primary" onClick={() => setQueue(null)}>回到我的词汇</button></>}</div></section>;
  }
  return <section className="wi-vocabulary"><header><button className="wi-back-link" onClick={onBack}><ArrowLeft />返回阅读库</button><h2>我的词汇</h2><p>在阅读中遇见，在复习中记住。</p></header>
    <div className="wi-stat-grid">{[[vocabulary.stats.encountered,"遇见词汇"],[vocabulary.stats.known,"已掌握"],[due.length,"到期复习"]].map(([value,label]) => <article key={label}><strong>{value}</strong><small>{label}</small></article>)}</div>
    <div className="wi-vocabulary-tools"><input aria-label="搜索单词或释义" placeholder="搜索单词或释义" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="wi-primary" disabled={!due.length} onClick={() => { setQueue(due.slice(0, 20)); setPosition(0); setRevealed(false); }}>开始今日复习（{Math.min(20, due.length)}）</button></div>
    {error && <p className="wi-error" role="alert">{error}</p>}
    <nav>{[["all","全部"],["learning","学习中"],["unknown","还不熟"],["known","已掌握"],["due","到期复习"]].map(([key,label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}</nav>
    <div className="wi-word-list">{words.length ? words.map((word) => <article key={word.id}><div><strong>{word.word}</strong><small>{word.phonetic}</small></div><p>{word.translation || "暂无释义"}</p><span>遇见 {word.exposureCount} 次</span><small>{word.nextReviewAt > Date.now() ? `${new Date(word.nextReviewAt).toLocaleDateString("zh-CN")} 复习` : "待复习"}</small><button disabled={busy} onClick={() => act(word.word, word.knownStatus === "known" ? "unknown" : "known")}>{word.knownStatus === "known" ? "重新学习" : "标记掌握"}</button></article>) : <div className="wi-list-empty">{vocabulary.words.length ? "没有符合条件的词汇。" : "打开一篇沉浸读物后，章节里的目标词会出现在这里。"}</div>}</div>
  </section>;
}
