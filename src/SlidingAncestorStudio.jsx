import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CaretDown, CaretLeft, CaretRight, CheckCircle, CloudArrowUp, Coins,
  DownloadSimple, ImageSquare, LockKey, Pause, Play, ShieldCheck, SlidersHorizontal,
  Sparkle, SpinnerGap, Warning, X, ClockCounterClockwise,
} from "@phosphor-icons/react";
import { apiErrorCode, slidingAncestorErrorMessage } from "./toolErrorMessages.js";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = apiErrorCode(payload);
    throw Object.assign(new Error(code), { code, status: response.status });
  }
  return payload;
}

const styles = [
  ["realistic", "写实进化", "从普通状态逐级强化，人物变化自然"],
  ["cinematic", "硬汉电影", "更硬朗、更有力量感和电影光影"],
  ["chaos", "抽象爆改", "后段变化更夸张，更适合整活分享"],
  ["custom", "自定义序列", "分别定义 10 张图片的提示词和参考图"],
];

const defaultCustomPromptsZh = [
  "最虚弱的初始形态：身形单薄、姿态拘谨、气场很弱，保持同一个人的脸和构图。",
  "比第1级稍强：身形仍偏瘦弱，但姿态稍微舒展，变化清晰且连续。",
  "弱势成长形态：肩背略有改善，眼神开始坚定，整体仍低于普通状态。",
  "接近普通状态：体态逐渐自然，轻微增强力量感，保持服装和背景连续。",
  "普通偏弱形态：接近原图，只保留轻微虚弱感，作为前半段的收束。",
  "普通偏强形态：在原图基础上略微变强，肩部更宽，姿态更加自信。",
  "明显强化形态：体格健壮、眼神坚定、气场增强，与第6级形成连续变化。",
  "强力进化形态：身形更有力量，光影更硬朗，呈现清晰的高阶状态。",
  "接近最终形态：体格和气场非常强大，视觉冲击明显但人物身份不变。",
  "最夯最终形态：达到整组最强状态，极具力量感和压迫感，适合最终展示。",
];

const stageNames = {
  zh: ["初始", "蓄力", "觉醒", "强化", "突破", "进阶", "重塑", "升华", "极境", "巅峰"],
  en: ["Origin", "Charge", "Awaken", "Build", "Break", "Advance", "Reforge", "Ascend", "Limit", "Apex"],
};

const normalizeStyle = (value) => value === "dynasty" ? "realistic" : value === "clan" ? "cinematic" : value;

function sourceFromTask(task) {
  const files = task?.output?.resultFiles || [];
  return files.length ? { task: { id: task.id, status: task.status }, output: task.output, files } : null;
}

const styleName = (value, zh) => ({
  realistic: zh ? "写实进化" : "Realistic",
  cinematic: zh ? "硬汉电影" : "Cinematic",
  chaos: zh ? "抽象爆改" : "Chaos",
  custom: zh ? "自定义序列" : "Custom sequence",
})[normalizeStyle(value)] || (zh ? "写实进化" : "Realistic");

const taskTime = (task, locale) => new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
}).format(new Date(task?.completedAt || task?.updatedAt || task?.createdAt || Date.now()));

export function SlidingAncestorStudio({ tool, task, historyTasks, locale, authenticated, onBack, onAuth, onCompleted }) {
  const zh = locale !== "en";
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState("realistic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [intensity, setIntensity] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [customPrompts, setCustomPrompts] = useState(defaultCustomPromptsZh);
  const [references, setReferences] = useState(() => Array(10).fill(null));
  const referenceUrls = useRef(new Set());

  useEffect(() => () => { for (const url of referenceUrls.current) URL.revokeObjectURL(url); }, []);

  const history = useMemo(() => (historyTasks || [])
    .map((item) => ({ task: item, source: sourceFromTask(item) }))
    .filter((item) => item.source)
    .sort((a, b) => Number(b.task.completedAt || b.task.updatedAt || b.task.createdAt || 0) - Number(a.task.completedAt || a.task.updatedAt || a.task.createdAt || 0)), [historyTasks]);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const pending = [task, ...(historyTasks || [])].find((item) => item && ["queued", "running"].includes(item.status));
    if (pending) {
      setActiveTask(pending);
      setBusy(true);
    }
    if (!pending && selectedHistoryId === "draft") return;
    const selectedHistory = selectedHistoryId && selectedHistoryId !== "draft" ? history.find((item) => item.task.id === selectedHistoryId)?.source : null;
    const match = pending ? sourceFromTask(pending) : (selectedHistory || (task ? sourceFromTask(task) : history[0]?.source));
    if (pending && !match) setResult(null);
    if (match) {
      setResult(match);
      setSelectedHistoryId(match.task.id);
      setStyle(normalizeStyle(match.output?.style) || "realistic");
      if (Array.isArray(match.output?.customPrompts) && match.output.customPrompts.length === 10) setCustomPrompts(match.output.customPrompts);
      setIntensity(5);
    }
  }, [task, history, selectedHistoryId]);

  useEffect(() => {
    if (!activeTask?.id || !["queued", "running"].includes(activeTask.status)) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await request(`/api/tasks/${activeTask.id}`);
        if (cancelled) return;
        const next = data.task;
        setActiveTask(next);
        const partial = sourceFromTask(next);
        if (partial) {
          setResult(partial);
          setIntensity(Math.max(1, Math.min(10, partial.files.length)));
        }
        if (next.status === "completed") {
          setBusy(false);
          setError("");
          onCompleted?.(next);
        } else if (next.status === "failed" || next.status === "cancelled") {
          setBusy(false);
          setError(slidingAncestorErrorMessage(next.errorCode || "TASK_EXECUTION_FAILED", locale));
        }
      } catch (pollError) {
        if (!cancelled) setError(slidingAncestorErrorMessage(pollError.code, locale));
      }
    };
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeTask?.id, activeTask?.status, locale, onCompleted]);

  const frames = useMemo(() => [...(result?.files || result?.output?.resultFiles || [])].sort((a, b) => a.level - b.level), [result]);
  const selected = frames[intensity - 1] || null;
  const previous = frames[Math.max(0, intensity - 2)] || null;
  const next = frames[Math.min(frames.length - 1, intensity)] || null;

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIntensity((current) => current >= frames.length ? 1 : current + 1);
    }, 850);
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);

  useEffect(() => {
    if (!frames.length) setPlaying(false);
  }, [frames.length]);

  useEffect(() => {
    for (const frame of frames) {
      const image = new Image();
      image.src = frame.downloadUrl;
    }
  }, [frames]);

  const chooseFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    setSelectedHistoryId("draft");
    setIntensity(5);
    setError("");
  };

  const run = async () => {
    if (!authenticated) return onAuth?.();
    if (!file) return setError(slidingAncestorErrorMessage("IMAGE_REQUIRED", locale));
    if (style === "custom" && customPrompts.some((item) => !item.trim())) return setError(slidingAncestorErrorMessage("ANCESTOR_CUSTOM_PROMPT_REQUIRED", locale));
    const form = new FormData();
    form.append("file", file);
    form.append("style", style);
    if (style === "custom") {
      form.append("customPrompts", JSON.stringify(customPrompts));
      references.forEach((item, index) => { if (item?.file) form.append(`reference${index + 1}`, item.file); });
    }
    setBusy(true);
    setError("");
    try {
      const data = await request(`/api/tool-actions/${tool.slug}`, { method: "POST", body: form });
      setActiveTask(data.task);
      setResult(sourceFromTask(data.task));
      setSelectedHistoryId(data.task.id);
      setIntensity(1);
    } catch (runError) {
      setBusy(false);
      setError(slidingAncestorErrorMessage(runError.code, locale));
    }
  };

  const intensityLabel = `${zh ? (intensity <= 5 ? "虚" : "夯") : (intensity <= 5 ? "Fragile" : "Powerful")} ${String(intensity).padStart(2, "0")}`;
  const openHistory = (entry) => {
    setSelectedHistoryId(entry.task.id);
    setActiveTask(["queued", "running"].includes(entry.task.status) ? entry.task : null);
    setResult(entry.source);
    setStyle(normalizeStyle(entry.source.output?.style) || "realistic");
    if (Array.isArray(entry.source.output?.customPrompts) && entry.source.output.customPrompts.length === 10) setCustomPrompts(entry.source.output.customPrompts);
    setIntensity(Math.min(10, Math.max(1, entry.source.files.length >= 10 ? 5 : entry.source.files.length)));
    setError("");
  };
  const updateCustomPrompt = (index, value) => setCustomPrompts((current) => current.map((item, itemIndex) => itemIndex === index ? value.slice(0, 1200) : item));
  const updateReference = (index, selectedFile) => {
    if (!selectedFile) return;
    const previewUrl = URL.createObjectURL(selectedFile);
    referenceUrls.current.add(previewUrl);
    setReferences((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (item?.previewUrl) { URL.revokeObjectURL(item.previewUrl); referenceUrls.current.delete(item.previewUrl); }
      return { file: selectedFile, previewUrl };
    }));
    setError("");
  };
  const clearReference = (index) => setReferences((current) => current.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    if (item?.previewUrl) { URL.revokeObjectURL(item.previewUrl); referenceUrls.current.delete(item.previewUrl); }
    return null;
  }));

  const downloadAll = async () => {
    if (!frames.length) return;
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const blobs = await Promise.all(frames.map(async (frame) => {
        const response = await fetch(frame.downloadUrl, { credentials: "include" });
        if (!response.ok) throw new Error("DOWNLOAD_FAILED");
        return response.blob();
      }));
      blobs.forEach((blob, index) => zip.file(`oneshowtools-ancestor-${String(frames[index].level).padStart(2, "0")}.png`, blob));
      const archive = await zip.generateAsync({ type: "blob" });
      const archiveUrl = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = archiveUrl;
      anchor.download = "oneshowtools-ancestor-10-frames.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(archiveUrl), 1000);
    } catch {
      setError(zh ? "整组下载失败，请稍后重试或逐帧下载。" : "The archive could not be downloaded. Try again or download each frame.");
    }
  };

  const journeyStep = busy || frames.length ? 3 : preview ? 2 : 1;
  const steps = zh
    ? [["上传人物", "清晰、光线均匀的正面人像"], ["选择进化风格", "同一身份，呈现多样演化"], ["生成与预览", "生成 10 帧，预览动效与下载"]]
    : [["Upload portrait", "A clear front-facing portrait"], ["Choose evolution style", "One identity, multiple evolutions"], ["Generate & preview", "Create ten frames and download"]];

  return <div className="ancestor-page ancestor-studio-v2">
    <button className="tool-back ancestor-page-back" onClick={onBack}><ArrowLeft size={18} />{zh ? "返回工具市场" : "Back to marketplace"}</button>
    <header className="ancestor-studio-bar">
      <div className="ancestor-brand-row">
        <img src="/tool-icons-v2/optimized/sliding-ancestor-generator.png" alt="" />
        <div className="ancestor-brand-copy">
          <span className="ancestor-brand-kicker">ONESHOW AI EVOLUTION</span>
          <div className="ancestor-brand-title"><h1>{zh ? "一张照片，生成 10 帧连续进化" : "Turn one portrait into ten evolution stages"}</h1></div>
          <p>{zh ? "保持人物身份与构图一致，从初始形态一路滑动到巅峰状态。" : "Keep identity and framing consistent from the original portrait to its final form."}</p>
          <div className="ancestor-hero-trust"><span><CheckCircle size={14} weight="fill" />{zh ? "项目自动保存" : "Auto-saved"}</span><span><Sparkle size={14} weight="fill" />{zh ? "10 帧连续生成" : "10 continuous frames"}</span><span><ShieldCheck size={14} weight="fill" />{zh ? "素材隐私保护" : "Private assets"}</span></div>
        </div>
      </div>
      <div className="ancestor-hero-visual" aria-hidden="true"><img src="/tool-icons-v2/optimized/sliding-ancestor-generator.png" alt="" /></div>
      <aside className="ancestor-price"><span className="ancestor-price-icon"><Coins size={19} weight="duotone" /></span><span><strong>{tool.creditCost}</strong><small>{zh ? "积分 / 组" : "credits / set"}</small></span></aside>
    </header>

    <nav className="ancestor-journey" aria-label={zh ? "生成步骤" : "Generation steps"}>{steps.map(([title, detail], index) => {
      const number = index + 1;
      const complete = journeyStep > number;
      return <div key={title} className={`${journeyStep === number ? "active" : ""} ${complete ? "complete" : ""}`}>
        <span>{complete ? <CheckCircle size={22} weight="fill" /> : number}</span><p><strong>{title}</strong><small>{detail}</small></p>
      </div>;
    })}</nav>

    <main className="ancestor-workspace">
      <section className="ancestor-builder">
        <header><div><div><h2>{zh ? "上传人物" : "Upload portrait"}</h2><p>{zh ? "建议使用正面、清晰、光线均匀的人像" : "Use a clear, front-facing portrait"}</p></div></div>{preview && <em><CheckCircle size={13} weight="fill" />{zh ? "已就绪" : "Ready"}</em>}</header>
        <label className={`ancestor-uploader ${preview ? "has-image" : ""}`}>
          <input type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0])} />
          {preview ? <><img src={preview} alt={zh ? "上传预览" : "Upload preview"} /><button type="button" onClick={(event) => { event.preventDefault(); setFile(null); setResult(null); }}><X size={16} /></button><span>{zh ? "点击更换人物照片" : "Click to replace portrait"}</span></> : <><span className="ancestor-upload-icon"><CloudArrowUp size={28} /></span><strong>{zh ? "上传人物照片" : "Upload portrait"}</strong><small>{zh ? "拖拽或点击上传" : "Drop or click to upload"}</small><em>JPG · PNG · WEBP · 25 MB</em></>}
        </label>

        <header className="ancestor-style-heading"><div><div><h2>{zh ? "选择进化风格" : "Choose a style"}</h2><p>{zh ? "同一身份、同一构图，生成连续十帧" : "One identity, one framing, ten stages"}</p></div></div></header>
        <div className="ancestor-template-grid">{styles.slice(0, 3).map(([value, name, description], index) => <button key={value} type="button" className={style === value ? "active" : ""} onClick={() => setStyle(value)}>
          <span className={`ancestor-template-visual style-${value}`}>{preview ? <img src={preview} alt="" /> : <Sparkle size={23} weight="duotone" />}<i>{String(index + 1).padStart(2, "0")}</i></span>
          <strong>{zh ? name : value}</strong><small>{zh ? description : value === "realistic" ? "Natural progression" : value === "cinematic" ? "Cinematic power" : "Bold social style"}</small>
          {style === value && <CheckCircle size={18} weight="fill" />}
        </button>)}</div>

        <button type="button" className={`ancestor-advanced-toggle ${style === "custom" ? "active" : ""}`} onClick={() => setStyle(style === "custom" ? "realistic" : "custom")}><span><SlidersHorizontal size={18} /><strong>{zh ? "高级编辑" : "Advanced editor"}</strong><small>{zh ? "逐帧提示词与参考图" : "Per-frame prompts and references"}</small></span><CaretDown size={17} /></button>

        {style === "custom" && <section className="ancestor-custom-editor">
          <header><div><strong>{zh ? "自定义 10 帧" : "Customize ten frames"}</strong><small>{zh ? "为每一帧编写要求，也可以添加独立参考图。" : "Describe each frame and add optional references."}</small></div><span>{customPrompts.filter((item) => item.trim()).length}/10</span></header>
          <div className="ancestor-custom-grid">{customPrompts.map((prompt, index) => <article key={index}>
            <div className="ancestor-custom-number"><strong>{String(index + 1).padStart(2, "0")}</strong><span>{stageNames[zh ? "zh" : "en"][index]}</span></div>
            <textarea value={prompt} onChange={(event) => updateCustomPrompt(index, event.target.value)} placeholder={zh ? `填写第 ${index + 1} 帧的生成要求` : `Describe frame ${index + 1}`} />
            <label className={`ancestor-reference-input ${references[index] ? "has-reference" : ""}`}><input type="file" accept="image/*" onChange={(event) => updateReference(index, event.target.files?.[0])} />{references[index] ? <><img src={references[index].previewUrl} alt="" /><span>{zh ? "更换" : "Replace"}</span></> : <><ImageSquare size={18} /><span>{zh ? "参考图" : "Reference"}</span></>}</label>
            {references[index] && <button type="button" className="ancestor-reference-clear" onClick={() => clearReference(index)}><X size={13} />{zh ? "移除" : "Remove"}</button>}
          </article>)}</div>
        </section>}

        {error && <div className="form-error ancestor-error"><Warning size={17} /><span>{error}</span>{error.includes("100") && <a href="/?view=files">{zh ? "前往文件中心" : "Open File Center"}</a>}</div>}
        {!authenticated && <div className="tool-auth-notice"><LockKey size={18} /><span>{zh ? "登录后可生成并保存结果" : "Sign in to generate and save"}</span><button onClick={onAuth}>{zh ? "登录" : "Sign in"}</button></div>}
      </section>

      <section className="ancestor-preview-workspace">
        <header className="ancestor-preview-head"><div><p>{zh ? "形态序列" : "EVOLUTION SEQUENCE"}</p><h2>{zh ? "从初始到巅峰" : "From origin to apex"}</h2><span>{frames.length ? `${styleName(style, zh)} · ${frames.length}/10 ${zh ? "已完成" : "complete"}` : (zh ? "生成后可连续滑动查看每一帧变化" : "Slide through every stage after generation")}</span></div><div className="ancestor-preview-actions"><button type="button" onClick={() => setPlaying((value) => !value)} disabled={frames.length < 2}>{playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}{zh ? (playing ? "暂停预览" : "预览动效") : (playing ? "Pause" : "Preview")}</button><button type="button" onClick={downloadAll} disabled={!frames.length}><DownloadSimple size={17} />{zh ? "下载全部" : "Download all"}</button></div></header>

        <div className={`ancestor-carousel ${!preview && !frames.length ? "empty" : ""}`}>
          <button type="button" className="ancestor-carousel-arrow left" disabled={!frames.length} onClick={() => setIntensity((value) => Math.max(1, value - 1))}><CaretLeft size={20} /></button>
          {previous && previous.id !== selected?.id ? <button type="button" className="ancestor-side-frame previous" onClick={() => setIntensity(previous.level)}><img src={previous.downloadUrl} alt="" /><span>{String(previous.level).padStart(2, "0")} · {stageNames[zh ? "zh" : "en"][previous.level - 1]}</span></button> : <span className="ancestor-side-placeholder" />}
          <div className="ancestor-primary-frame">{selected ? <><img key={selected.id} src={selected.downloadUrl} alt={`${zh ? "形态" : "Stage"} ${selected.level}`} /><div><strong>{String(selected.level).padStart(2, "0")}</strong><span>{stageNames[zh ? "zh" : "en"][selected.level - 1]}</span></div></> : preview ? <><img src={preview} alt={zh ? "原始人物" : "Original portrait"} /><div><strong>00</strong><span>{zh ? "原图预览" : "Source"}</span></div></> : <div className="ancestor-preview-empty"><span><ImageSquare size={34} /></span><strong>{zh ? "从一张照片开始" : "Start with one portrait"}</strong><p>{zh ? "上传后可在这里预览十帧连续变化" : "Your ten-stage sequence will appear here"}</p></div>}</div>
          {next && next.id !== selected?.id ? <button type="button" className="ancestor-side-frame next" onClick={() => setIntensity(next.level)}><img src={next.downloadUrl} alt="" /><span>{String(next.level).padStart(2, "0")} · {stageNames[zh ? "zh" : "en"][next.level - 1]}</span></button> : <span className="ancestor-side-placeholder" />}
          <button type="button" className="ancestor-carousel-arrow right" disabled={!frames.length} onClick={() => setIntensity((value) => Math.min(frames.length || 10, value + 1))}><CaretRight size={20} /></button>
        </div>

        <div className="ancestor-timeline-shell"><div className="ancestor-timeline-label"><strong>{zh ? "形态时间轴" : "Stage timeline"}</strong><span>{frames.length ? intensityLabel : (zh ? "01 初始 — 10 巅峰" : "01 Origin — 10 Apex")}</span></div><div className="ancestor-timeline">{Array.from({ length: 10 }, (_, index) => {
          const item = frames[index];
          return <button key={index} type="button" className={`${index + 1 === intensity ? "active" : ""} ${item ? "complete" : ""}`} disabled={!item} onClick={() => setIntensity(index + 1)}><span>{item ? <img src={item.downloadUrl} alt="" /> : preview ? <img src={preview} alt="" /> : <i />}</span><strong>{String(index + 1).padStart(2, "0")}</strong><small>{stageNames[zh ? "zh" : "en"][index]}</small></button>;
        })}</div></div>

        <div className="ancestor-playback"><button type="button" onClick={() => setPlaying((value) => !value)} disabled={frames.length < 2}>{playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}</button><input type="range" min="1" max="10" step="1" value={intensity} onChange={(event) => { setPlaying(false); setIntensity(Number(event.target.value)); }} disabled={!frames.length} /><span>{String(intensity).padStart(2, "0")} / 10</span>{selected && <a href={selected.downloadUrl} download><DownloadSimple size={17} />{zh ? "下载当前帧" : "Download frame"}</a>}</div>

      </section>
    </main>

    <footer className="ancestor-bottom-dock">
      <div className="ancestor-dock-safety"><ShieldCheck size={24} /><span><strong>{zh ? "仅上传你有权使用的照片" : "Only upload images you may use"}</strong><small>{zh ? "生成即表示你已拥有或获得授权" : "By generating, you confirm you have permission"}</small></span></div>
      <div className="ancestor-dock-action"><button className="ancestor-run" onClick={run} disabled={busy}>{busy ? <><SpinnerGap className="spin" />{zh ? `生成中 ${result?.files?.length || activeTask?.output?.progress?.completed || 0}/10` : `Generating ${result?.files?.length || activeTask?.output?.progress?.completed || 0}/10`}</> : <><Sparkle weight="fill" /><span>{zh ? "生成 10 张" : "Generate 10"}</span><strong>{tool.creditCost} {zh ? "积分" : "credits"}</strong></>}</button><small>{zh ? "后台生成，完成后自动保存" : "Runs in background and saves automatically"}</small></div>
      <section className="ancestor-projects"><header><div><ClockCounterClockwise size={19} /><span><strong>{zh ? "最近项目" : "Recent projects"}</strong><small>{zh ? "已完成的序列保存在这里" : "Completed sets are saved here"}</small></span></div><em>{history.length} {zh ? "组" : "sets"}</em></header>{history.length ? <div>{history.slice(0, 6).map((entry) => { const cover = [...entry.source.files].sort((a, b) => a.level - b.level)[4] || entry.source.files[0]; const active = result?.task?.id === entry.task.id; return <button type="button" key={entry.task.id} className={active ? "active" : ""} onClick={() => openHistory(entry)}><img src={cover.downloadUrl} alt={styleName(entry.source.output?.style, zh)} loading="lazy" /><span><strong>{styleName(entry.source.output?.style, zh)}</strong><small>{taskTime(entry.task, locale)}</small></span><i>{entry.source.files.length}/10</i></button>; })}</div> : <div className="ancestor-project-empty"><ImageSquare size={20} /><span>{zh ? "首个项目完成后会显示在这里" : "Your first project will appear here"}</span></div>}</section>
    </footer>
  </div>;
}
