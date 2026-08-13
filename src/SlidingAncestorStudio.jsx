import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle, CloudArrowUp, Coins, DownloadSimple, ImageSquare,
  LockKey, Play, ShieldCheck, Sparkle, SpinnerGap, Warning, X, ClockCounterClockwise,
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
];

const normalizeStyle = (value) => value === "dynasty" ? "realistic" : value === "clan" ? "cinematic" : value;

function sourceFromTask(task) {
  const files = task?.output?.resultFiles || [];
  return files.length ? { task: { id: task.id, status: task.status }, output: task.output, files } : null;
}

const styleName = (value, zh) => ({
  realistic: zh ? "写实进化" : "Realistic",
  cinematic: zh ? "硬汉电影" : "Cinematic",
  chaos: zh ? "抽象爆改" : "Chaos",
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
  const [selectedHistoryId, setSelectedHistoryId] = useState("");

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
  const leftFrames = useMemo(() => frames.slice(0, 5), [frames]);
  const rightFrames = useMemo(() => frames.slice(5, 10), [frames]);
  const selected = frames[intensity - 1] || null;

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
    const form = new FormData();
    form.append("file", file);
    form.append("style", style);
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
    setIntensity(Math.min(10, Math.max(1, entry.source.files.length >= 10 ? 5 : entry.source.files.length)));
    setError("");
  };

  return <div className="ancestor-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{zh ? "返回工具市场" : "Back to marketplace"}</button>
    <header className="ancestor-header">
      <div className="ancestor-title-lockup"><span><Sparkle size={28} weight="duotone" /></span><div><p>ONESHOWTOOLS · AI 形态进化玩法</p><h1>{zh ? "滑动变祖器" : "Sliding Power-Up Generator"}</h1><small>{zh ? "“变祖”就是变强：同一个人从虚到夯，一次生成 10 种强度明确、顺序一致的连续形态。" : "Power up the same person through ten clearly ordered stages, from fragile to formidable."}</small></div></div>
      <aside><Coins size={18} /><strong>{tool.creditCost}</strong><small>{zh ? "积分 / 组" : "credits / set"}</small></aside>
    </header>

    <div className="ancestor-layout">
      <section className="ancestor-control">
        <div className="ancestor-section-title"><span>01</span><div><strong>{zh ? "上传人物" : "Upload portrait"}</strong><small>{zh ? "建议使用正面或半身清晰照片" : "A clear front-facing or half-body photo works best"}</small></div></div>
        <label className={`ancestor-uploader ${preview ? "has-image" : ""}`}>
          <input type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0])} />
          {preview ? <><img src={preview} alt={zh ? "上传预览" : "Upload preview"} /><button type="button" onClick={(event) => { event.preventDefault(); setFile(null); setResult(null); }}><X size={16} /></button><span>{zh ? "点击更换图片" : "Click to replace"}</span></> : <><CloudArrowUp size={30} /><strong>{zh ? "上传一张人物照片" : "Upload a portrait"}</strong><span>JPG · PNG · WEBP · 25 MB</span></>}
        </label>

        <div className="ancestor-section-title"><span>02</span><div><strong>{zh ? "选择变化风格" : "Choose transformation style"}</strong><small>{zh ? "身份和构图保持连续，只改变人物强弱形态" : "Keep identity and framing continuous while changing power level"}</small></div></div>
        <div className="ancestor-style-list">{styles.map(([value, name, description]) => <button key={value} type="button" className={style === value ? "active" : ""} onClick={() => setStyle(value)}><span>{style === value ? <CheckCircle weight="fill" /> : <Sparkle />}</span><div><strong>{zh ? name : value}</strong><small>{zh ? description : value === "realistic" ? "Natural realistic power progression" : value === "cinematic" ? "Rugged cinematic transformation" : "Exaggerated meme-ready evolution"}</small></div></button>)}</div>

        <p className="ancestor-safety"><ShieldCheck size={17} />{zh ? "请仅上传你有权使用的图片。结果属于虚构娱乐性的形态变化，不评价人物真实能力或身份。" : "Only upload images you may use. Results are fictional transformations and do not judge real ability or identity."}</p>
        {error && <div className="form-error ancestor-error"><Warning size={17} /><span>{error}</span>{error.includes("100") && <a href="/?view=files">{zh ? "前往文件中心" : "Open File Center"}</a>}</div>}
        {!authenticated && <div className="tool-auth-notice"><LockKey size={18} /><span>{zh ? "登录后可生成并保存结果" : "Sign in to generate and save"}</span><button onClick={onAuth}>{zh ? "登录" : "Sign in"}</button></div>}
        <button className="ancestor-run" onClick={run} disabled={busy}>{busy ? <><SpinnerGap className="spin" />{zh ? `后台生成中 ${result?.files?.length || activeTask?.output?.progress?.completed || 0}/10，可离开页面` : `Generating in background ${result?.files?.length || activeTask?.output?.progress?.completed || 0}/10 · safe to leave`}</> : <><Play weight="fill" />{zh ? "生成 10 级形态变化" : "Generate 10 power stages"}</>}</button>
        <small className="ancestor-quota-note">{zh ? "10 张均由模型独立生成并保存；每位用户最多保存 100 个文件。" : "All ten frames are model-generated and saved; each account can store up to 100 files."}</small>
      </section>

      <section className="ancestor-stage">
        <header><div><p>{zh ? "生成结果" : "RESULT PREVIEW"}</p><h2>{frames.length ? intensityLabel : (zh ? "等待生成" : "Waiting")}</h2></div><span>{frames.length ? `${frames.length} / 10` : "00 / 10"}</span></header>
        <div className={`ancestor-portrait ${!preview && !frames.length ? "empty" : ""}`}>
          {frames.length ? <div className="ancestor-frame-stack">{frames.map((frame) => <img key={frame.id} className={frame.id === selected?.id ? "active" : ""} src={frame.downloadUrl} alt={`${zh ? "形态" : "Stage"} ${frame.level}`} />)}</div> : preview ? <img src={preview} alt={zh ? "上传预览" : "Upload preview"} /> : <><ImageSquare size={42} /><strong>{zh ? "等待人物图像" : "Waiting for portrait"}</strong><span>{zh ? "上传后会在这里显示原图预览" : "Your source preview will appear here"}</span></>}
          {(preview || frames.length) && <div className="ancestor-frame-corners" />}
        </div>
        <div className="ancestor-scale-copy"><span>{zh ? "最虚 · 01" : "Weakest · 01"}</span><strong>{frames.length ? intensityLabel : (zh ? "从虚到夯" : "Weak to strong")}</strong><span>{zh ? "最夯 · 10" : "Strongest · 10"}</span></div>
        <input className="ancestor-slider" type="range" min="1" max="10" step="1" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} disabled={!frames.length} />
        <div className="ancestor-ticks ancestor-ticks-ten">{Array.from({ length: 10 }, (_, index) => <i key={index} className={index === intensity - 1 ? "active" : index === 4 || index === 5 ? "origin" : ""} />)}</div>
        {frames.length ? <div className="ancestor-series">
          <div><header><strong>{zh ? "偏虚形态 · 01–05" : "Fragile · 01–05"}</strong><span>{zh ? "逐级接近原始状态" : "gradually approaches neutral"}</span></header><div>{leftFrames.map((item) => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setIntensity(item.level)}><img src={item.downloadUrl} alt={`虚 ${item.level}`} loading="eager" /><span>{String(item.level).padStart(2, "0")}</span></button>)}</div></div>
          <div><header><strong>{zh ? "偏夯形态 · 06–10" : "Powerful · 06–10"}</strong><span>{zh ? "逐级增强体格和气场" : "steadily gains power"}</span></header><div>{rightFrames.map((item) => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setIntensity(item.level)}><img src={item.downloadUrl} alt={`夯 ${item.level}`} loading="eager" /><span>{String(item.level).padStart(2, "0")}</span></button>)}</div></div>
        </div> : <div className="ancestor-empty-series"><span>{zh ? "生成后，10 张从虚到夯的真实模型结果会按顺序显示在这里。" : "Ten real model outputs will appear here in weak-to-strong order."}</span></div>}
        {selected && <a className="ancestor-download" href={selected.downloadUrl} download><DownloadSimple size={18} />{zh ? "下载当前图片" : "Download selected image"}</a>}
      </section>
    </div>
    <section className="ancestor-history">
      <header><div><span><ClockCounterClockwise size={20} /></span><div><h2>{zh ? "生成历史" : "Generation history"}</h2><p>{zh ? "每次生成均按任务保存，可随时回来继续查看和下载。" : "Every generation is saved as a task so you can reopen and download it later."}</p></div></div><strong>{history.length} {zh ? "组" : "sets"}</strong></header>
      {history.length ? <div className="ancestor-history-grid">{history.map((entry) => {
        const cover = [...entry.source.files].sort((a, b) => a.level - b.level)[4] || entry.source.files[0];
        const active = result?.task?.id === entry.task.id;
        return <article key={entry.task.id} className={active ? "active" : ""}>
          <button type="button" className="ancestor-history-open" onClick={() => openHistory(entry)}>
            <span className="ancestor-history-cover"><img src={cover.downloadUrl} alt={styleName(entry.source.output?.style, zh)} loading="lazy" /><i>{entry.source.files.length}/10</i></span>
            <span className="ancestor-history-copy"><strong>{styleName(entry.source.output?.style, zh)}</strong><small>{taskTime(entry.task, locale)}</small><em>{active ? (zh ? "正在查看" : "Viewing") : (zh ? "打开结果" : "Open result")}</em></span>
          </button>
          <a href={cover.downloadUrl} download title={zh ? "下载封面图" : "Download cover"}><DownloadSimple size={17} /></a>
        </article>;
      })}</div> : <div className="ancestor-history-empty"><ImageSquare size={28} /><strong>{zh ? "还没有生成记录" : "No generations yet"}</strong><span>{zh ? "完成第一组生成后，历史结果会显示在这里。" : "Your completed sets will appear here."}</span></div>}
    </section>
  </div>;
}
