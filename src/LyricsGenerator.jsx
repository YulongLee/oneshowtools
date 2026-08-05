import { useEffect, useState } from "react";
import {
  ArrowLeft, CheckCircle, Coins, Copy, DownloadSimple, LockKey, MusicNotes,
  NotePencil, PaperPlaneRight, ShieldCheck, Sparkle, SpinnerGap, Warning,
} from "@phosphor-icons/react";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "REQUEST_FAILED"), { status: response.status });
  return payload;
}
const json = (value) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });

const copies = {
  "zh-CN": {
    back: "返回工具市场", kicker: "ONESH​OW LYRIC LAB", title: "AI 歌词生成器", sub: "从一句灵感出发，生成结构完整、适合演唱的原创歌词。完成后可直接带入音乐工作室。",
    original: "原创歌词", continue: "续写歌词", rewrite: "改写歌词", brief: "创作信息", result: "歌词成稿", settings: "创作设置",
    topic: "主题、故事或画面", topicHint: "例如：在雨夜最后一班地铁上，终于决定与过去告别……", source: "原始歌词", sourceHint: "粘贴需要续写或改写的歌词……",
    language: "歌词语言", genre: "音乐风格", mood: "情绪氛围", audience: "目标听众（可选）", perspective: "叙事视角", structure: "歌曲结构", rhyme: "押韵方式", custom: "补充要求（可选）",
    customHint: "例如：副歌需要一句容易记住的短句；避免陈词滥调……", generate: "生成歌词", generating: "正在创作歌词", waiting: "通常需要 20～60 秒，请保持页面开启。",
    empty: "填写创作信息后，歌词会在这里显示。", copy: "复制歌词", copied: "已复制", download: "下载 .md", compose: "带入音乐工作室", quality: "创作自检",
    login: "登录后即可生成歌词并保存到任务中心。", required: "请先填写创作主题。", sourceRequired: "请粘贴需要处理的原始歌词。", failed: "生成失败，本次不会扣除积分，请稍后重试。", credits: "积分 / 次",
  },
  en: {
    back: "Back to marketplace", kicker: "ONESH​OW LYRIC LAB", title: "AI Lyrics Generator", sub: "Turn one idea into original, singable lyrics with a complete song structure, then take them straight into the Music Studio.",
    original: "Original", continue: "Continue", rewrite: "Rewrite", brief: "Creative brief", result: "Lyrics", settings: "Writing settings",
    topic: "Theme, story, or scene", topicHint: "For example: on the last train in the rain, finally deciding to let the past go…", source: "Source lyrics", sourceHint: "Paste the lyrics you want to continue or rewrite…",
    language: "Language", genre: "Genre", mood: "Mood", audience: "Audience (optional)", perspective: "Point of view", structure: "Song structure", rhyme: "Rhyme", custom: "Additional direction (optional)",
    customHint: "For example: give the chorus a short memorable line and avoid clichés…", generate: "Generate lyrics", generating: "Writing lyrics", waiting: "This usually takes 20–60 seconds. Keep this page open.",
    empty: "Complete the brief and your lyrics will appear here.", copy: "Copy lyrics", copied: "Copied", download: "Download .md", compose: "Use in Music Studio", quality: "Creative checks",
    login: "Sign in to generate lyrics and save the task.", required: "Describe the song you want to write.", sourceRequired: "Paste the source lyrics first.", failed: "Generation failed and no credits were charged. Please retry.", credits: "credits / run",
  },
};

const initial = { mode: "original", topic: "", sourceLyrics: "", language: "简体中文", genre: "流行", mood: "真挚", audience: "", perspective: "第一人称", structure: "pop", rhyme: "自然押韵", customInstructions: "" };

export function LyricsGenerator({ tool, locale = "zh-CN", authenticated, runtime, onBack, onAuth, onCompleted, onModelChange }) {
  const t = copies[locale] || copies["zh-CN"];
  const zh = locale !== "en";
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);
  const [draft, setDraft] = useState({ ...initial, language: zh ? "简体中文" : "English" });
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  useEffect(() => { setModelConnectionId(runtimeTool?.modelConnectionId || "managed"); }, [runtimeTool?.modelConnectionId]);
  useEffect(() => { if (!busy) return undefined; const started = Date.now(); setElapsed(0); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);

  const selectMode = (mode) => { setDraft((current) => ({ ...current, mode })); setError(""); };
  const changeModel = async (value) => { const old = modelConnectionId; setModelConnectionId(value); try { await onModelChange?.(tool.id, value); } catch { setModelConnectionId(old); setError(t.failed); } };
  const generate = async () => {
    if (!authenticated) return onAuth();
    if (draft.mode === "original" && !draft.topic.trim()) return setError(t.required);
    if (draft.mode !== "original" && !draft.sourceLyrics.trim()) return setError(t.sourceRequired);
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await request(`/api/tool-actions/${tool.slug}`, json({ ...draft, modelConnectionId }));
      setResult(response.output); onCompleted?.(response);
      requestAnimationFrame(() => document.querySelector(".lyrics-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) { setError(caught.status === 402 ? (zh ? "积分不足，请先充值或订阅。" : "Insufficient credits.") : t.failed); }
    finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(result?.lyricsMarkdown || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => { const blob = new Blob([`# ${result?.title || t.result}\n\n${result?.lyricsMarkdown || ""}`], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${result?.title || "lyrics"}.md`; anchor.click(); URL.revokeObjectURL(url); };
  const compose = () => { sessionStorage.setItem("oneshow-music-lyrics-draft", JSON.stringify({ title: result?.title || "", lyrics: result?.lyricsMarkdown || "", idea: result?.creativeNote || "" })); location.assign("/tools/ai-music-studio"); };

  return <div className="lyrics-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{t.back}</button>
    <header className="lyrics-hero"><span><NotePencil size={34} weight="duotone" /><Sparkle size={16} weight="fill" /></span><div><p className="eyebrow">{t.kicker}</p><h1>{t.title}</h1><p>{t.sub}</p></div><aside><Coins size={18} /><strong>{tool.creditCost}</strong><small>{t.credits}</small></aside></header>
    {busy && <div className="lyrics-progress"><SpinnerGap className="spin" size={20} /><div><strong>{t.generating} · {elapsed}s</strong><small>{t.waiting}</small></div><i><b style={{ width: `${Math.min(92, 14 + elapsed * 1.2)}%` }} /></i></div>}
    <main className="lyrics-layout">
      <section className="lyrics-form-card">
        <nav>{[["original", t.original], ["continue", t.continue], ["rewrite", t.rewrite]].map(([id, label]) => <button className={draft.mode === id ? "active" : ""} onClick={() => selectMode(id)} key={id}>{label}</button>)}</nav>
        <header><span><MusicNotes size={20} weight="duotone" /></span><div><small>CREATIVE BRIEF</small><h2>{t.brief}</h2></div></header>
        <div className="lyrics-fields">
          {draft.mode === "original" ? <label className="wide"><span>{t.topic}<em>*</em></span><textarea rows="7" value={draft.topic} onChange={update("topic")} placeholder={t.topicHint} /></label> : <label className="wide"><span>{t.source}<em>*</em></span><textarea rows="10" value={draft.sourceLyrics} onChange={update("sourceLyrics")} placeholder={t.sourceHint} /></label>}
          <label><span>{t.language}</span><select value={draft.language} onChange={update("language")}><option>简体中文</option><option>English</option><option>日本語</option><option>한국어</option><option>Español</option></select></label>
          <label><span>{t.genre}</span><select value={draft.genre} onChange={update("genre")}><option>{zh ? "流行" : "Pop"}</option><option>R&B</option><option>Hip-Hop</option><option>Rock</option><option>Folk</option><option>Electronic</option><option>Country</option></select></label>
          <label><span>{t.mood}</span><input value={draft.mood} onChange={update("mood")} placeholder={zh ? "治愈、热烈、克制……" : "Warm, energetic, restrained…"} /></label>
          <label><span>{t.audience}</span><input value={draft.audience} onChange={update("audience")} placeholder={zh ? "例如：正在异乡奋斗的人" : "e.g. people building a life far from home"} /></label>
          <label><span>{t.perspective}</span><select value={draft.perspective} onChange={update("perspective")}><option value="第一人称">{zh ? "第一人称" : "First person"}</option><option value="第二人称">{zh ? "第二人称" : "Second person"}</option><option value="第三人称">{zh ? "第三人称" : "Third person"}</option><option value="双人对唱">{zh ? "双人对唱" : "Duet"}</option></select></label>
          <label><span>{t.structure}</span><select value={draft.structure} onChange={update("structure")}><option value="pop">{zh ? "标准流行结构" : "Standard pop"}</option><option value="story">{zh ? "叙事型结构" : "Story-driven"}</option><option value="short">{zh ? "短歌结构" : "Short-form"}</option><option value="custom">{zh ? "根据内容决定" : "Adaptive"}</option></select></label>
          <label><span>{t.rhyme}</span><select value={draft.rhyme} onChange={update("rhyme")}><option>{zh ? "自然押韵" : "Natural rhyme"}</option><option>{zh ? "强化尾韵" : "Strong end rhyme"}</option><option>{zh ? "不强制押韵" : "Free verse"}</option></select></label>
          <label className="wide"><span>{t.custom}</span><textarea rows="4" value={draft.customInstructions} onChange={update("customInstructions")} placeholder={t.customHint} /></label>
        </div>
        {authenticated && <label className="lyrics-model"><span>{zh ? "运行模型" : "Runtime model"}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">OneShowModel（{zh ? "平台托管" : "managed"}）</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option value={item.id} key={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}
        {!authenticated && <div className="lyrics-login"><LockKey size={18} />{t.login}</div>}
        {error && <p className="form-error"><Warning size={16} />{error}</p>}
        <button className="lyrics-generate" onClick={generate} disabled={busy}>{busy ? <SpinnerGap className="spin" size={18} /> : <PaperPlaneRight size={18} weight="fill" />}{busy ? t.generating : t.generate}</button>
      </section>
      <section className="lyrics-result">
        <header><div><span><Sparkle size={20} weight="fill" /></span><div><small>LYRICS</small><h2>{result?.title || t.result}</h2></div></div>{result && <div><button onClick={copy}><Copy size={16} />{copied ? t.copied : t.copy}</button><button onClick={download}><DownloadSimple size={16} />{t.download}</button></div>}</header>
        {!result ? <div className="lyrics-empty"><MusicNotes size={42} weight="duotone" /><strong>{t.result}</strong><p>{t.empty}</p></div> : <><div className="lyrics-hook"><small>{zh ? "核心记忆点" : "HOOK"}</small><strong>“{result.hook}”</strong></div><pre>{result.lyricsMarkdown}</pre>{result.creativeNote && <p className="lyrics-note">{result.creativeNote}</p>}<div className="lyrics-checks"><header><ShieldCheck size={18} weight="duotone" /><strong>{t.quality}</strong></header>{result.checks?.map((item) => <span key={item}><CheckCircle size={15} weight="fill" />{item}</span>)}</div><button className="lyrics-compose" onClick={compose}><MusicNotes size={18} weight="fill" />{t.compose}</button></>}
      </section>
    </main>
  </div>;
}
