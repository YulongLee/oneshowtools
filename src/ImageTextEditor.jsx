import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal, AlignLeft, AlignRight, ArrowLeft, ArrowsClockwise, CheckCircle,
  CloudArrowUp, DownloadSimple, Eye, FileImage, MagicWand, MagnifyingGlassMinus,
  MagnifyingGlassPlus, Plus, SpinnerGap, TextT, Translate, ArrowCounterClockwise, ArrowClockwise, FilePpt, PresentationChart,
} from "@phosphor-icons/react";
import "./image-text-editor.css";

const errors = {
  IMAGE_REQUIRED: "请先上传图片。", IMAGE_TEXT_FILE_UNSUPPORTED: "仅支持 JPG、PNG 和 WebP 图片。",
  IMAGE_TEXT_FILE_TOO_LARGE: "单张图片不能超过 20 MB。", IMAGE_TEXT_RESOLUTION_TOO_LOW: "图片分辨率过低，请上传更清晰的图片。",
  IMAGE_TEXT_OCR_FAILED: "文字识别失败，请换一张更清晰的图片重试。", IMAGE_TEXT_ASSISTANT_UNAVAILABLE: "文案助手暂时不可用，仍可直接编辑文字。",
  IMAGE_TEXT_ASSISTANT_FAILED: "文案处理失败，请稍后重试。", IMAGE_TEXT_ASSET_NOT_FOUND: "这张图片已失效，请重新上传。", IMAGE_TEXT_DETECTION_NOT_FOUND: "这段文字已失效，请重新识别。",
  IMAGE_TEXT_REPLACEMENT_REQUIRED: "请输入修改后的文字。", INSUFFICIENT_CREDITS: "积分不足，请先充值后再应用修改。",
  IMAGE_EDITING_NOT_CONFIGURED: "背景修复模型尚未配置，请联系管理员。", IMAGE_PROVIDER_UNAVAILABLE: "背景修复服务暂时不可用，请稍后重试。",
  PPT_FILE_REQUIRED: "请先上传 PPTX 文件。", PPT_FILE_UNSUPPORTED: "目前仅支持 .pptx 格式。", PPT_FILE_TOO_LARGE: "PPTX 文件不能超过 50 MB。",
  PPT_FILE_INVALID: "这个 PPTX 文件无法解析，请确认文件没有损坏。", PPT_PROJECT_NOT_FOUND: "这个 PPT 项目已失效，请重新上传。", PPT_TEXT_NOT_FOUND: "这段 PPT 文字已失效。",
  PPT_FILE_TOO_COMPLEX: "这份 PPT 内容过多，测试版暂时支持最多 200 页或 5000 个文字框。",
};

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data?.error?.code || "REQUEST_FAILED";
    throw Object.assign(new Error(errors[code] || "操作失败，请稍后重试。"), { code });
  }
  return data;
}
const json = (method, body) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

function UploadCard({ busy, onFiles }) {
  const input = useRef(null);
  const accept = (list) => onFiles(Array.from(list || []).slice(0, 8));
  return <button type="button" className="ite-upload-card" onClick={() => input.current?.click()}
    onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); accept(event.dataTransfer.files); }}>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => accept(event.target.files)} />
    {busy ? <SpinnerGap className="ite-spin" size={28} /> : <CloudArrowUp size={28} weight="duotone" />}
    <strong>{busy ? "正在识别文字…" : "上传图片"}</strong><span>拖拽或点击上传</span><small>JPG · PNG · WEBP · 20 MB</small>
  </button>;
}

function EmptyCanvas({ onUpload }) {
  return <div className="ite-empty-canvas"><span><TextT size={40} weight="duotone" /></span><h2>把图片里的文字重新变得可编辑</h2><p>上传海报、AI 生图或截图，系统会自动识别可修改的文字区域。</p><button onClick={onUpload}><Plus size={17} />选择第一张图片</button><div><i>1</i>上传图片<b /> <i>2</i>点击文字<b /> <i>3</i>修改并下载</div></div>;
}

function PptTextEditor({ tool, authenticated, onAuth, onCompleted }) {
  const [project, setProject] = useState(null);
  const [slideNumber, setSlideNumber] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const input = useRef(null);
  const slide = project?.slides?.find((item) => item.number === slideNumber) || project?.slides?.[0] || null;
  const selected = slide?.items?.find((item) => item.id === selectedId) || slide?.items?.[0] || null;

  useEffect(() => { if (slide && !selectedId) setSelectedId(slide.items?.[0]?.id || ""); }, [slide, selectedId]);
  useEffect(() => {
    if (!task?.id || ["completed", "failed", "cancelled"].includes(task.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/api/tasks/${task.id}`); setTask(data.task);
        if (data.task.status === "completed") {
          const fresh = await api(`/api/image-text/ppt/projects/${project.id}`); setProject(fresh.project); onCompleted?.();
        } else if (data.task.status === "failed") setError("PPT 导出失败，积分已自动退回，请稍后重试。");
      } catch (cause) { setError(cause.message); }
    }, 1000);
    return () => clearInterval(timer);
  }, [task?.id, task?.status, project?.id, onCompleted]);

  async function upload(file) {
    if (!file) return;
    if (!authenticated) return onAuth?.();
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const data = await api("/api/image-text/ppt/projects", { method: "POST", body: form });
      setProject(data.project); setSlideNumber(1); setSelectedId(""); setTask(null);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  function updateLocal(text) {
    if (!selected) return;
    setProject((current) => ({ ...current, slides: current.slides.map((currentSlide) => currentSlide.number !== slide.number ? currentSlide : ({ ...currentSlide, items: currentSlide.items.map((item) => item.id === selected.id ? { ...item, currentText: text } : item) })) }));
  }

  async function exportPpt() {
    if (!project) return;
    setBusy(true); setError("");
    try {
      for (const item of project.slides.flatMap((currentSlide) => currentSlide.items)) await api(`/api/image-text/ppt/texts/${item.id}`, json("PATCH", { text: item.currentText }));
      const data = await api("/api/image-text/ppt/export", json("POST", { projectId: project.id })); setTask(data.task);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  const processing = ["queued", "running"].includes(task?.status);
  const progress = Number(task?.output?.progress || (task?.status === "running" ? 20 : 0));
  return <section className="ite-workbench ite-ppt-workbench">
    <aside className="ite-assets ite-ppt-assets">
      <button className="ite-upload-card ite-ppt-upload" onClick={() => input.current?.click()}><input ref={input} hidden type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => upload(event.target.files?.[0])} />{busy && !task ? <SpinnerGap className="ite-spin" size={28} /> : <FilePpt size={30} weight="duotone" />}<strong>{busy && !task ? "正在解析演示文稿…" : "上传 PPTX"}</strong><span>保留原文件版式与素材</span><small>PPTX · 最大 50 MB</small></button>
      <div className="ite-ppt-slides">{project?.slides?.map((item) => <button key={item.number} className={slide?.number === item.number ? "active" : ""} onClick={() => { setSlideNumber(item.number); setSelectedId(""); }}><span>{item.number}</span><div>{item.items.slice(0, 3).map((text) => <i key={text.id}>{text.currentText}</i>)}</div><small>{item.items.length} 段文字</small></button>)}</div>
    </aside>
    <section className="ite-canvas-panel ite-ppt-canvas-panel">
      {!project ? <div className="ite-empty-canvas"><span><PresentationChart size={42} weight="duotone" /></span><h2>让整份 PPT 的文字都能快速修改</h2><p>上传 PPTX 后，系统会按页提取文字层。你可以逐段修改，再导出保持原版式的新文件。</p><button onClick={() => authenticated ? input.current?.click() : onAuth?.()}><Plus size={17} />选择 PPTX 文件</button><div><i>1</i>上传 PPT<b /><i>2</i>选择文字<b /><i>3</i>导出新版</div></div> : <><header className="ite-ppt-canvas-title"><div><small>SLIDE {slide?.number} / {project.slideCount}</small><strong>{project.name}</strong></div><span>文字层预览</span></header><div className="ite-ppt-stage">{slide?.items?.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} style={{ left: `${item.bbox.x * 100}%`, top: `${item.bbox.y * 100}%`, width: `${Math.min(item.bbox.width, 1 - item.bbox.x) * 100}%`, height: `${Math.min(item.bbox.height, 1 - item.bbox.y) * 100}%`, color: item.style.color, fontWeight: item.style.bold ? 700 : 500, fontSize: `${Math.max(9, Math.min(24, item.style.fontSize * .32))}px` }}>{item.currentText}</button>)}</div><p className="ite-ppt-note">测试版预览聚焦文字层；导出时会保留原 PPT 中的图片、背景、动画和其他对象。</p></>}
      {processing && <div className="ite-progress"><span><SpinnerGap className="ite-spin" /></span><div><strong>正在生成新版 PPT</strong><p>正在写回文字并重新打包演示文稿。</p><i><b style={{ width: `${Math.max(6, progress)}%` }} /></i></div><em>{progress}%</em></div>}
    </section>
    <aside className="ite-editor ite-ppt-editor"><header><div><small>PRESENTATION TEXT</small><h2>PPT 文字编辑</h2></div>{project && <em>{project.slideCount} 页</em>}</header>
      {!selected ? <div className="ite-no-selection"><FilePpt size={30} /><strong>{project ? "当前页没有可编辑文字" : "等待上传 PPTX"}</strong><p>{project ? "请选择左侧其他页面继续检查。" : "上传后会自动列出每页中的文字对象。"}</p></div> : <><label><span>原文字</span><div className="ite-original-text">{selected.originalText}</div></label><label><span>修改为</span><textarea value={selected.currentText} maxLength={2000} onChange={(event) => updateLocal(event.target.value)} /><small>{selected.currentText.length}/2000</small></label><div className="ite-ppt-meta"><span>第 {slide.number} 页</span><span>文本框 {selected.shapeIndex + 1}</span><span>保留原格式</span></div><section className="ite-options"><h3>导出说明</h3><label><CheckCircle weight="fill" /><span><strong>只替换文字内容</strong><small>图片、背景、母版与页面尺寸保持不变</small></span></label><label><CheckCircle weight="fill" /><span><strong>生成独立副本</strong><small>不会覆盖你上传的原始文件</small></span></label></section></>}
      {error && <p className="ite-error">{error}</p>}
      <footer><button className="secondary" disabled={!project || processing || busy} onClick={exportPpt}>{busy || processing ? <SpinnerGap className="ite-spin" /> : <MagicWand />}导出新版 · {tool.creditCost} 积分</button><a className={!project?.downloadUrl ? "disabled" : ""} href={project?.downloadUrl || "#"} download><DownloadSimple />下载 PPTX</a></footer>
    </aside>
  </section>;
}

export function ImageTextEditor({ tool, authenticated, onBack, onAuth, onCompleted }) {
  const [mode, setMode] = useState("image");
  const [project, setProject] = useState(null);
  const [assetId, setAssetId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(false);
  const [useAiRepair, setUseAiRepair] = useState(true);
  const [preserveStyle, setPreserveStyle] = useState(true);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [inlineEditingId, setInlineEditingId] = useState("");
  const [draftStatus, setDraftStatus] = useState("idle");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const fileInput = useRef(null);
  const inlineEditor = useRef(null);
  const stageRef = useRef(null);
  const asset = project?.assets?.find((item) => item.id === assetId) || project?.assets?.[0] || null;
  const selected = asset?.detections?.find((item) => item.id === selectedId) || null;
  const imageUrl = asset ? (compare ? asset.originalUrl : asset.imageUrl) : "";
  const progressText = { preparing: "准备处理", erasing: "擦除原文字", repairing: "智能修复背景", rendering: "渲染新文字", completed: "处理完成" };

  useEffect(() => {
    if (!inlineEditingId || !inlineEditor.current) return;
    inlineEditor.current.focus();
    inlineEditor.current.setSelectionRange(inlineEditor.current.value.length, inlineEditor.current.value.length);
  }, [inlineEditingId]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;
    const update = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(stage); update();
    return () => observer.disconnect();
  }, [asset?.id]);
  useEffect(() => {
    const previous = document.title;
    document.title = "字迹 · AI 图片文字编辑 | OneShowTools";
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (!task?.id || ["completed", "failed", "cancelled"].includes(task.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/api/tasks/${task.id}`); setTask(data.task);
        if (data.task.status === "completed") {
          const fresh = await api(`/api/image-text/projects/${project.id}`); setProject(fresh.project); onCompleted?.();
        } else if (data.task.status === "failed") setError("图片处理失败，积分已自动退回，请稍后重试。");
      } catch (cause) { setError(cause.message); }
    }, 1100);
    return () => clearInterval(timer);
  }, [task?.id, task?.status, project?.id, onCompleted]);

  async function upload(files) {
    if (!files.length) return;
    if (!authenticated) return onAuth?.();
    setBusy(true); setError("");
    try {
      let next = project;
      for (const file of files) {
        const form = new FormData(); form.append("file", file); if (next?.id) form.append("projectId", next.id);
        const data = await api("/api/image-text/assets", { method: "POST", body: form }); next = data.project;
      }
      setProject(next); setAssetId(next.assets.at(-1)?.id || ""); setSelectedId(""); setInlineEditingId(""); setDraftStatus("idle"); setZoom(1);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  function updateLocal(patch, remember = true) {
    if (!selected) return;
    if (remember) { setHistory((items) => [...items.slice(-29), { assetId: asset.id, detectionId: selected.id, value: selected }]); setFuture([]); }
    setDraftStatus("dirty");
    setProject((current) => ({ ...current, assets: current.assets.map((item) => item.id !== asset.id ? item : ({ ...item, detections: item.detections.map((detection) => detection.id === selected.id ? { ...detection, ...patch, style: { ...detection.style, ...(patch.style || {}) } } : detection) })) }));
  }

  async function saveDraft(item = selected) {
    if (!item || draftStatus !== "dirty") return;
    if (!String(item.currentText || "").trim()) {
      setDraftStatus("error");
      setError("修改文字不能为空，请输入内容后再点击其他区域。");
      return;
    }
    setDraftStatus("saving");
    try {
      const data = await api(`/api/image-text/texts/${item.id}`, json("PATCH", { text: item.currentText, style: item.style }));
      setProject((current) => ({ ...current, assets: current.assets.map((currentAsset) => ({ ...currentAsset, detections: currentAsset.detections.map((detection) => detection.id === data.detection.id ? data.detection : detection) })) }));
      setDraftStatus("saved");
      setError("");
    } catch (cause) {
      setDraftStatus("error");
      setError(`文字草稿保存失败：${cause.message}`);
    }
  }

  function beginInlineEdit(item) {
    if (inlineEditingId !== item.id) {
      setHistory((items) => [...items.slice(-29), { assetId: asset.id, detectionId: item.id, value: item }]);
      setFuture([]);
    }
    setSelectedId(item.id);
    setInlineEditingId(item.id);
  }

  function restore(entry, targetSetter, sourceSetter) {
    if (!entry) return;
    const current = project.assets.find((item) => item.id === entry.assetId)?.detections.find((item) => item.id === entry.detectionId);
    if (current) targetSetter((items) => [...items, { assetId: entry.assetId, detectionId: entry.detectionId, value: current }]);
    setAssetId(entry.assetId); setSelectedId(entry.detectionId);
    setProject((state) => ({ ...state, assets: state.assets.map((item) => item.id !== entry.assetId ? item : ({ ...item, detections: item.detections.map((detection) => detection.id === entry.detectionId ? entry.value : detection) })) }));
    sourceSetter((items) => items.slice(0, -1));
  }

  async function rewrite(mode) {
    if (!selected) return; setBusy(true); setError("");
    try { const data = await api("/api/image-text/rewrite", json("POST", { mode, text: selected.currentText })); updateLocal({ currentText: data.text }); }
    catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function redetect() {
    if (!asset) return;
    setBusy(true); setError("");
    try {
      const data = await api(`/api/image-text/assets/${asset.id}/detect`, { method: "POST" });
      setProject((current) => ({ ...current, assets: current.assets.map((item) => item.id === data.asset.id ? data.asset : item) }));
      setSelectedId(""); setInlineEditingId(""); setDraftStatus("idle"); setHistory([]); setFuture([]);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function apply() {
    if (!selected) return; setBusy(true); setError("");
    try {
      await api(`/api/image-text/texts/${selected.id}`, json("PATCH", { text: selected.currentText, style: selected.style }));
      setDraftStatus("saved");
      const data = await api("/api/image-text/apply", json("POST", { assetId: asset.id, detectionId: selected.id, useAiRepair, preserveStyle }));
      setTask(data.task);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  const progress = Number(task?.output?.progress || (task?.status === "running" ? 20 : 0));
  const processing = ["queued", "running"].includes(task?.status);
  const displayScale = useMemo(() => {
    if (!asset || !stageSize.width || !stageSize.height) return zoom;
    const fit = Math.min(1, Math.max(.08, (stageSize.width - 30) / asset.width), Math.max(.08, (stageSize.height - 30) / asset.height));
    return fit * zoom;
  }, [asset, stageSize, zoom]);

  return <main className="ite-page">
    <input ref={fileInput} hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(Array.from(event.target.files || []))} />
    <button className="ite-back" onClick={onBack}><ArrowLeft size={16} />返回工具市场</button>
    <header className="ite-hero ite-hero-premium"><img className="ite-product-icon" src="/image-text-editor/image-text-editor-icon-v2.webp" alt="字迹 AI 图片文字编辑图标" /><div className="ite-hero-copy"><small>ONSHOWTOOLS · VISUAL TEXT STUDIO</small><h1>字迹 · AI 图片文字编辑</h1><p>不用重做整张图，也不用寻找源文件。识别、改写、修复与导出，在一个工作台完成。</p><div className="ite-hero-pills"><span><CheckCircle weight="fill" />图片文字智能识别</span><span><CheckCircle weight="fill" />PPTX 文字层编辑</span><span><CheckCircle weight="fill" />原文件安全保留</span></div></div><em>测试中</em><aside className="ite-hero-proof"><small>AI VISUAL EDITING</small><strong>让每一处文字<br />都能重新编辑</strong><div><span><b>20 MB</b>图片上传</span><span><b>50 MB</b>PPTX 上传</span><span><b>30 积分</b>每次导出</span></div></aside></header>
    <nav className="ite-mode-tabs"><button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>图片改字</button><button className={mode === "ppt" ? "active" : ""} onClick={() => setMode("ppt")}>PPT 改字 <i>NEW</i></button></nav>
    {mode === "image" ? <section className="ite-workbench">
      <aside className="ite-assets"><UploadCard busy={busy && !task} onFiles={upload} />
        <div className="ite-asset-list">{project?.assets?.map((item, index) => <button key={item.id} className={(asset?.id === item.id ? "active " : "") + item.status} onClick={() => { setAssetId(item.id); setSelectedId(""); setInlineEditingId(""); setDraftStatus("idle"); setZoom(1); }}><span>{String(index + 1).padStart(2, "0")}</span><img src={`/api/files/${item.originalFileId}/thumbnail`} alt={item.name} /><small>{item.detections.length} 处文字</small></button>)}</div>
        {project && <button className="ite-add-image" onClick={() => fileInput.current?.click()}><Plus size={16} />添加图片</button>}
      </aside>
      <section className="ite-canvas-panel">
        <div className="ite-toolbar"><button onClick={() => setZoom(Math.max(.5, zoom - .1))}><MagnifyingGlassMinus /></button><button onClick={() => setZoom(Math.min(1.8, zoom + .1))}><MagnifyingGlassPlus /></button><strong>{Math.round(zoom * 100)}%</strong><button className="wide" onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}><Eye />按住对比</button></div>
        {!asset ? <EmptyCanvas onUpload={() => authenticated ? fileInput.current?.click() : onAuth?.()} /> : <div className="ite-stage" ref={stageRef}><div className="ite-image-wrap" style={{ width: `${asset.width * displayScale}px`, height: `${asset.height * displayScale}px` }}><img src={imageUrl} alt={asset.name} />{!compare && asset.detections.map((item) => {
          const isSelected = selected?.id === item.id;
          const textStyle = {
            left: `${item.bbox.x * displayScale}px`, top: `${item.bbox.y * displayScale}px`, width: `${item.bbox.width * displayScale}px`, height: `${item.bbox.height * displayScale}px`,
            color: item.style?.color || "#17264d", fontSize: `${Math.max(8, Number(item.style?.fontSize || 16) * displayScale)}px`,
            fontFamily: item.style?.fontFamily === "serif" ? '"Songti SC","STSong",serif' : 'Inter,"PingFang SC","Microsoft YaHei",sans-serif',
            fontWeight: item.style?.bold ? 800 : 500, textAlign: item.style?.align || "center", transform: `rotate(${Number(item.rotation || 0)}deg)`,
          };
          return isSelected ? <textarea ref={inlineEditor} key={item.id} data-testid="inline-image-text-editor" aria-label={`直接修改图片文字：${item.originalText}`}
            className={`ite-inline-text ${inlineEditingId === item.id ? "editing" : ""}`} value={item.currentText} maxLength={100} spellCheck="false"
            onFocus={() => beginInlineEdit(item)} onChange={(event) => updateLocal({ currentText: event.target.value }, false)}
            onBlur={() => saveDraft(item)}
            onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); apply(); } if (event.key === "Escape") event.currentTarget.blur(); }} style={textStyle} />
            : <button key={item.id} aria-label={`选择图片文字：${item.originalText}`} className="ite-text-box" onClick={() => beginInlineEdit(item)} style={textStyle}>
              {item.currentText !== item.originalText && <span>{item.currentText}</span>}
            </button>;
        })}<div className="ite-direct-edit-hint"><TextT weight="bold" />点击文字框，直接在图片上输入</div></div></div>}
        <footer><button disabled={!history.length} onClick={() => restore(history.at(-1), setFuture, setHistory)}><ArrowCounterClockwise />撤销</button><button disabled={!future.length} onClick={() => restore(future.at(-1), setHistory, setFuture)}><ArrowClockwise />重做</button><button disabled={!asset} onClick={() => setSelectedId(asset?.detections?.[0]?.id || "")}><ArrowsClockwise />重新选择文字</button></footer>
        {processing && <div className="ite-progress"><span><SpinnerGap className="ite-spin" /></span><div><strong>{progressText[task.output?.phase] || "正在处理图片"}</strong><p>后台处理中，你可以留在当前页面等待。</p><i><b style={{ width: `${Math.max(6, progress)}%` }} /></i></div><em>{progress}%</em></div>}
      </section>
      <aside className="ite-editor"><header><div><small>TEXT EDITOR</small><h2>文字编辑</h2></div><button disabled={!asset || busy || processing} onClick={redetect}>{busy ? <SpinnerGap className="ite-spin" /> : <ArrowsClockwise />}重新识别</button></header>
        {!selected ? <div className="ite-no-selection"><TextT size={28} /><strong>{asset?.detections?.length === 0 ? "没有识别到文字" : "请选择一段文字"}</strong><p>{asset?.detections?.length === 0 ? "可以换一张更清晰、文字对比度更高的图片。" : "点击画布中的虚线框，即可原位输入修改。"}</p></div> : <>
          <div className={`ite-direct-edit-status ${draftStatus}`}><span><TextT weight="bold" />画布内直接编辑</span><small>{draftStatus === "saving" ? "正在自动保存文字草稿…" : draftStatus === "saved" ? "文字草稿已保存；应用到图片后生成最终结果" : draftStatus === "dirty" ? "点击其他区域即可自动保存文字草稿" : draftStatus === "error" ? "草稿未保存，请检查内容后重试" : "输入后点击其他区域自动保存，⌘/Ctrl + Enter 直接应用"}</small></div>
          <label><span>识别到的文字</span><div className="ite-original-text">{selected.originalText}</div></label>
          <label><span>修改为</span><textarea value={selected.currentText} maxLength={100} onChange={(event) => updateLocal({ currentText: event.target.value })} onBlur={() => saveDraft(selected)} /><small>{selected.currentText.length}/100</small></label>
          <div className="ite-ai-actions"><button onClick={() => rewrite("polish")} disabled={busy}><MagicWand />AI 优化文案</button><button onClick={() => rewrite("translate")} disabled={busy}><Translate />中英互译</button></div>
          <section className="ite-style"><h3>样式设置 <small>自动匹配原样式</small></h3><label><span>字体</span><select value={selected.style.fontFamily || "auto"} onChange={(event) => updateLocal({ style: { fontFamily: event.target.value } })}><option value="auto">自动匹配</option><option value="sans">现代黑体</option><option value="serif">优雅宋体</option></select></label>
            <label><span>字号</span><div className="ite-stepper"><button onClick={() => updateLocal({ style: { fontSize: Math.max(8, selected.style.fontSize - 2) } })}>−</button><input type="number" value={selected.style.fontSize} onChange={(event) => updateLocal({ style: { fontSize: Number(event.target.value) } })} /><button onClick={() => updateLocal({ style: { fontSize: selected.style.fontSize + 2 } })}>＋</button></div></label>
            <label><span>颜色</span><div className="ite-color"><input type="color" value={selected.style.color || "#17264d"} onChange={(event) => updateLocal({ style: { color: event.target.value } })} /><input value={selected.style.color || "#17264d"} onChange={(event) => updateLocal({ style: { color: event.target.value } })} /></div></label>
            <div className="ite-format"><button className={selected.style.bold ? "active" : ""} onClick={() => updateLocal({ style: { bold: !selected.style.bold } })}>B</button><button className={selected.style.align === "left" ? "active" : ""} onClick={() => updateLocal({ style: { align: "left" } })}><AlignLeft /></button><button className={selected.style.align === "center" ? "active" : ""} onClick={() => updateLocal({ style: { align: "center" } })}><AlignCenterHorizontal /></button><button className={selected.style.align === "right" ? "active" : ""} onClick={() => updateLocal({ style: { align: "right" } })}><AlignRight /></button></div>
          </section>
          <section className="ite-options"><h3>生成设置</h3><label><input type="checkbox" checked={useAiRepair} onChange={(event) => setUseAiRepair(event.target.checked)} /><span><strong>智能修复原背景</strong><small>测试版将优先调用图片编辑模型</small></span></label><label><input type="checkbox" checked={preserveStyle} onChange={(event) => setPreserveStyle(event.target.checked)} /><span><strong>保持原文字风格</strong><small>保留字号、颜色、粗细与对齐</small></span></label></section>
        </>}
        {error && <p className="ite-error">{error}</p>}
        <footer><button className="secondary" disabled={!selected || processing} onClick={apply}>{busy ? <SpinnerGap className="ite-spin" /> : <MagicWand />}应用到图片 · {tool.creditCost} 积分</button><a className={!asset ? "disabled" : ""} href={asset?.imageUrl || "#"} download><DownloadSimple />下载图片</a></footer>
      </aside>
    </section> : <PptTextEditor tool={tool} authenticated={authenticated} onAuth={onAuth} onCompleted={onCompleted} />}
    <p className="ite-tip"><FileImage size={16} />小提示：文字背景越简洁、清晰，修复效果越自然；复杂艺术字可手动微调字号和颜色。</p>
  </main>;
}
