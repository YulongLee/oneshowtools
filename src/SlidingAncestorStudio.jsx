import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle, CloudArrowUp, Coins, DownloadSimple, ImageSquare,
  LockKey, Play, ShieldCheck, Sparkle, SpinnerGap, Warning, X,
} from "@phosphor-icons/react";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "REQUEST_FAILED"), { code: payload.error, status: response.status });
  return payload;
}

const messages = {
  IMAGE_REQUIRED: "请先上传一张清晰的人物照片。",
  IMAGE_TOO_LARGE: "图片不能超过 25 MB。",
  IMAGE_PROVIDER_RATE_LIMITED: "图片模型当前繁忙，请稍后再试。",
  IMAGE_PROVIDER_AUTH_FAILED: "图片模型认证失败，请联系管理员检查图片编辑模型。",
  USER_FILE_LIMIT_REACHED: "文件中心已达到 100 个文件，请先删除部分旧文件。",
  INSUFFICIENT_CREDITS: "积分不足，请先充值积分。",
};

const styles = [
  ["dynasty", "帝王祖系", "庄重金铜、电影感礼服"],
  ["clan", "宗祠古画", "矿物颜料、纸本与水墨"],
  ["chaos", "混沌抽象", "更夸张、更适合做梗图"],
];

function sourceFromTask(task) {
  const files = task?.output?.resultFiles || [];
  return files.length === 24 ? { task: { id: task.id }, output: task.output, files } : null;
}

export function SlidingAncestorStudio({ tool, task, historyTasks, locale, authenticated, onBack, onAuth, onCompleted }) {
  const zh = locale !== "en";
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState("dynasty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [intensity, setIntensity] = useState(0);

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
      setStyle(match.output?.style || "dynasty");
      setIntensity(1);
    }
  }, [task, historyTasks]);

  const frames = result?.files || result?.output?.resultFiles || [];
  const leftFrames = useMemo(() => frames.filter((item) => item.direction === "xu").sort((a, b) => a.level - b.level), [frames]);
  const rightFrames = useMemo(() => frames.filter((item) => item.direction === "han").sort((a, b) => a.level - b.level), [frames]);
  const selected = intensity < 0 ? leftFrames[Math.abs(intensity) - 1] : intensity > 0 ? rightFrames[intensity - 1] : null;
  const displayImage = selected?.downloadUrl || preview;

  const chooseFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    setIntensity(0);
    setError("");
  };

  const run = async () => {
    if (!authenticated) return onAuth?.();
    if (!file) return setError(zh ? messages.IMAGE_REQUIRED : "Upload a clear portrait first.");
    const form = new FormData();
    form.append("file", file);
    form.append("style", style);
    setBusy(true);
    setError("");
    try {
      const data = await request(`/api/tool-actions/${tool.slug}`, { method: "POST", body: form });
      setResult(data);
      setIntensity(1);
      onCompleted?.(data);
    } catch (runError) {
      setError(zh ? (messages[runError.code] || "生成失败，请检查图片模型配置后重试。") : (runError.code || "Generation failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const intensityLabel = intensity === 0
    ? (zh ? "原始状态" : "Original")
    : intensity < 0
      ? `${zh ? "虚" : "Ethereal"} ${String(Math.abs(intensity)).padStart(2, "0")}`
      : `${zh ? "夯" : "Mighty"} ${String(intensity).padStart(2, "0")}`;

  return <div className="ancestor-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{zh ? "返回工具市场" : "Back to marketplace"}</button>
    <header className="ancestor-header">
      <div><p>LIANG INTENSITY CALIBRATOR · AI IMAGE LAB</p><h1>{zh ? "滑动变祖器" : "Sliding Ancestor Generator"}</h1><span>{zh ? "一张人像，左右各 12 级；越往左越虚，越往右越夯。" : "One portrait, 12 ethereal stages and 12 mighty stages."}</span></div>
      <aside><Coins size={18} /><strong>{tool.creditCost}</strong><small>{zh ? "积分 / 组" : "credits / set"}</small></aside>
    </header>

    <div className="ancestor-layout">
      <section className="ancestor-control">
        <div className="ancestor-section-title"><span>01</span><div><strong>{zh ? "上传人物" : "Upload portrait"}</strong><small>{zh ? "建议使用正面或半身清晰照片" : "A clear front-facing or half-body photo works best"}</small></div></div>
        <label className={`ancestor-uploader ${preview ? "has-image" : ""}`}>
          <input type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0])} />
          {preview ? <><img src={preview} alt={zh ? "上传预览" : "Upload preview"} /><button type="button" onClick={(event) => { event.preventDefault(); setFile(null); setResult(null); }}><X size={16} /></button><span>{zh ? "点击更换图片" : "Click to replace"}</span></> : <><CloudArrowUp size={30} /><strong>{zh ? "上传一张人物照片" : "Upload a portrait"}</strong><span>JPG · PNG · WEBP · 25 MB</span></>}
        </label>

        <div className="ancestor-section-title"><span>02</span><div><strong>{zh ? "选择祖系画风" : "Choose a visual style"}</strong><small>{zh ? "不推断真实身份，仅生成娱乐性视觉效果" : "Entertainment-only; no real identity inference"}</small></div></div>
        <div className="ancestor-style-list">{styles.map(([value, name, description]) => <button key={value} type="button" className={style === value ? "active" : ""} onClick={() => setStyle(value)}><span>{style === value ? <CheckCircle weight="fill" /> : <Sparkle />}</span><div><strong>{zh ? name : value}</strong><small>{zh ? description : value === "dynasty" ? "Cinematic bronze and ceremonial robes" : value === "clan" ? "Ancestral ink and mineral pigments" : "Surreal and meme-ready"}</small></div></button>)}</div>

        <p className="ancestor-safety"><ShieldCheck size={17} />{zh ? "请仅上传你有权使用的图片。结果为虚构娱乐创作，不代表真实血缘、民族或历史身份。" : "Only upload images you may use. Results are fictional and do not represent real ancestry or identity."}</p>
        {error && <p className="form-error"><Warning size={17} />{error}</p>}
        {!authenticated && <div className="tool-auth-notice"><LockKey size={18} /><span>{zh ? "登录后可生成并保存结果" : "Sign in to generate and save"}</span><button onClick={onAuth}>{zh ? "登录" : "Sign in"}</button></div>}
        <button className="ancestor-run" onClick={run} disabled={busy}>{busy ? <><SpinnerGap className="spin" />{zh ? "正在炼制 24 张图，预计 2–8 分钟…" : "Creating 24 frames, about 2–8 minutes…"}</> : <><Play weight="fill" />{zh ? "生成 24 级祖系图" : "Generate 24 stages"}</>}</button>
        <small className="ancestor-quota-note">{zh ? "本次会保存 24 个文件；每位用户最多保存 100 个文件。" : "This saves 24 files; each account can store up to 100 files."}</small>
      </section>

      <section className="ancestor-stage">
        <header><div><p>VISUAL OUTPUT</p><h2>{intensityLabel}</h2></div><span>{frames.length ? `${frames.length} / 24` : "00 / 24"}</span></header>
        <div className={`ancestor-portrait ${!displayImage ? "empty" : ""}`}>
          {displayImage ? <img src={displayImage} alt={intensityLabel} /> : <><ImageSquare size={42} /><strong>{zh ? "等待人物图像" : "Waiting for portrait"}</strong><span>{zh ? "上传后会在这里显示原图预览" : "Your source preview will appear here"}</span></>}
          {displayImage && <div className="ancestor-frame-corners" />}
        </div>
        <div className="ancestor-scale-copy"><span>{zh ? "越来越虚" : "More ethereal"}</span><strong>{intensityLabel}</strong><span>{zh ? "越来越夯" : "More mighty"}</span></div>
        <input className="ancestor-slider" type="range" min="-12" max="12" step="1" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} disabled={!frames.length} />
        <div className="ancestor-ticks">{Array.from({ length: 25 }, (_, index) => <i key={index} className={index === intensity + 12 ? "active" : index === 12 ? "origin" : ""} />)}</div>
        {frames.length ? <div className="ancestor-series">
          <div><header><strong>{zh ? "虚系 12 级" : "Ethereal · 12"}</strong><span>{zh ? "轻、淡、雾化" : "light · pale · spectral"}</span></header><div>{leftFrames.map((item) => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setIntensity(-item.level)}><img src={item.downloadUrl} alt={`虚 ${item.level}`} loading="lazy" /><span>{String(item.level).padStart(2, "0")}</span></button>)}</div></div>
          <div><header><strong>{zh ? "夯系 12 级" : "Mighty · 12"}</strong><span>{zh ? "重、硬、压迫感" : "solid · hard · monumental"}</span></header><div>{rightFrames.map((item) => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setIntensity(item.level)}><img src={item.downloadUrl} alt={`夯 ${item.level}`} loading="lazy" /><span>{String(item.level).padStart(2, "0")}</span></button>)}</div></div>
        </div> : <div className="ancestor-empty-series"><span>{zh ? "生成后，左侧 12 张和右侧 12 张会完整显示在这里。" : "The 12 left and 12 right frames will appear here."}</span></div>}
        {selected && <a className="ancestor-download" href={selected.downloadUrl} download><DownloadSimple size={18} />{zh ? "下载当前图片" : "Download selected image"}</a>}
      </section>
    </div>
  </div>;
}
