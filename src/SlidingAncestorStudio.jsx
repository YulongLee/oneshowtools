import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle, CloudArrowUp, Coins, DownloadSimple, ImageSquare,
  LockKey, Play, ShieldCheck, Sparkle, SpinnerGap, Warning, X,
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
  return files.length === 10 ? { task: { id: task.id }, output: task.output, files } : null;
}

export function SlidingAncestorStudio({ tool, task, historyTasks, locale, authenticated, onBack, onAuth, onCompleted }) {
  const zh = locale !== "en";
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState("realistic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [intensity, setIntensity] = useState(5);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const match = task ? sourceFromTask(task) : (historyTasks || []).map(sourceFromTask).find(Boolean);
    if (match) {
      setResult(match);
      setStyle(normalizeStyle(match.output?.style) || "realistic");
      setIntensity(5);
    }
  }, [task, historyTasks]);

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
      setResult(data);
      setIntensity(5);
      onCompleted?.(data);
    } catch (runError) {
      setError(slidingAncestorErrorMessage(runError.code, locale));
    } finally {
      setBusy(false);
    }
  };

  const intensityLabel = `${zh ? (intensity <= 5 ? "虚" : "夯") : (intensity <= 5 ? "Fragile" : "Powerful")} ${String(intensity).padStart(2, "0")}`;

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
        <button className="ancestor-run" onClick={run} disabled={busy}>{busy ? <><SpinnerGap className="spin" />{zh ? "正在逐级生成 10 种形态，预计 3–12 分钟…" : "Creating ten ordered stages, about 3–12 minutes…"}</> : <><Play weight="fill" />{zh ? "生成 10 级形态变化" : "Generate 10 power stages"}</>}</button>
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
  </div>;
}
