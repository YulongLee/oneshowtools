import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal, AlignLeft, AlignRight, ArrowLeft, ArrowsClockwise, CheckCircle,
  CloudArrowUp, DownloadSimple, Eye, FileImage, MagicWand, MagnifyingGlass, MagnifyingGlassMinus,
  MagnifyingGlassPlus, Plus, SpinnerGap, TextT, Translate, ArrowCounterClockwise, ArrowClockwise, FilePpt, PresentationChart,
} from "@phosphor-icons/react";
import "./image-text-editor.css";

const errors = {
  IMAGE_REQUIRED: "请先上传图片或 PDF。", IMAGE_TEXT_FILE_UNSUPPORTED: "仅支持 JPG、PNG、WebP 图片和 PDF。",
  IMAGE_TEXT_FILE_TOO_LARGE: "单张图片不能超过 20 MB。", IMAGE_TEXT_RESOLUTION_TOO_LOW: "图片分辨率过低，请上传更清晰的图片。",
  IMAGE_TEXT_OCR_FAILED: "文字识别失败，请换一张更清晰的图片重试。", IMAGE_TEXT_ASSISTANT_UNAVAILABLE: "文案助手暂时不可用，仍可直接编辑文字。",
  IMAGE_TEXT_ASSISTANT_FAILED: "文案处理失败，请稍后重试。", IMAGE_TEXT_ASSET_NOT_FOUND: "这张图片已失效，请重新上传。", IMAGE_TEXT_DETECTION_NOT_FOUND: "这段文字已失效，请重新识别。",
  IMAGE_TEXT_REPLACEMENT_REQUIRED: "请输入修改后的文字。", INSUFFICIENT_CREDITS: "积分不足，请先充值后再应用修改。",
  IMAGE_TEXT_BATCH_LIMIT: "一次最多统一处理 20 处文字，请分批生成。",
  IMAGE_TEXT_QUALITY_REJECTED: "生成文字与草稿未能核对一致，可能是漏改、错字或识别不清。本次积分已退回，草稿保留。请检查选中文字框及内容后重试。",
  IMAGE_TEXT_LAYOUT_CHANGED: "生成图片的版式发生变化，本次未交付结果，积分已退回。请重试。",
  IMAGE_PROVIDER_CONTENT_REJECTED: "模型服务未通过本次内容审核，无法继续生成；本次积分已退回，草稿保留。如有疑问请联系客服核查。",
  IMAGE_EDITING_NOT_CONFIGURED: "图片编辑模型尚未配置，请联系管理员。", IMAGE_PROVIDER_UNAVAILABLE: "图片编辑服务暂时不可用，请稍后重试。",
  IMAGE_PROVIDER_RATE_LIMITED: "当前使用人数较多，请稍后再试；失败任务不会重复扣积分。", IMAGE_PROVIDER_TIMEOUT: "模型处理超时，本次积分已退回，请稍后重试。",
  IMAGE_PROVIDER_AUTH_FAILED: "图片编辑服务配置异常，请联系客服处理，本次积分已退回。",
  PPT_FILE_REQUIRED: "请先上传 PPTX 文件。", PPT_FILE_UNSUPPORTED: "目前仅支持 .pptx 格式。", PPT_FILE_TOO_LARGE: "PPTX 文件不能超过 50 MB。",
  PPT_FILE_INVALID: "这个 PPTX 文件无法解析，请确认文件没有损坏。", PPT_PROJECT_NOT_FOUND: "这个 PPT 项目已失效，请重新上传。", PPT_TEXT_NOT_FOUND: "这段 PPT 文字已失效。",
  PPT_FILE_TOO_COMPLEX: "这份 PPT 内容过多，测试版暂时支持最多 200 页或 5000 个文字框。",
  PPT_NO_CHANGES: "请至少修改一处文字后再导出。", PPT_EXPORT_VALIDATION_FAILED: "导出文件校验未通过，本次积分已退回，原文件和文字草稿均已保留。",
  VISUAL_PROJECT_NOT_RECONSTRUCTED: "请先逐页完成 AI 结构重建，再导出可编辑文件。",
  PDF_PAGE_LIMIT: "测试版单个 PDF 最多导入 12 页，请拆分后重试。", PDF_INVALID_OR_ENCRYPTED: "PDF 无法读取或已加密，请更换文件。",
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
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(event) => accept(event.target.files)} />
    {busy ? <SpinnerGap className="ite-spin" size={28} /> : <CloudArrowUp size={28} weight="duotone" />}
    <strong>{busy ? "正在分析视觉结构…" : "上传图片 / PDF"}</strong><span>拖拽或点击上传</span><small>图片 20 MB · PDF 最多 12 页</small>
  </button>;
}

function EmptyCanvas({ onUpload }) {
  return <div className="ite-empty-canvas"><span><TextT size={40} weight="duotone" /></span><h2>把图片重建成可编辑设计稿</h2><p>上传图片、海报、截图或 PDF，AI 识别文字与版式并重建为独立图层。</p><button onClick={onUpload}><Plus size={17} />创建视觉工程</button><div><i>1</i>导入文件<b /> <i>2</i>AI 分层重建<b /> <i>3</i>编辑并导出</div></div>;
}

function PptTextEditor({ tool, authenticated, onAuth, onCompleted }) {
  const [project, setProject] = useState(null);
  const [slideNumber, setSlideNumber] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [saveStatus, setSaveStatus] = useState("idle");
  const input = useRef(null);
  const slide = project?.slides?.find((item) => item.number === slideNumber) || project?.slides?.[0] || null;
  const selected = slide?.items?.find((item) => item.id === selectedId) || slide?.items?.[0] || null;
  const allItems = project?.slides?.flatMap((item) => item.items) || [];
  const changedItems = allItems.filter((item) => item.currentText !== item.originalText);
  const filteredSlides = project?.slides?.filter((item) => !query.trim() || item.items.some((text) => `${text.originalText} ${text.currentText}`.toLowerCase().includes(query.trim().toLowerCase()))) || [];

  useEffect(() => { if (slide && !selectedId) setSelectedId(slide.items?.[0]?.id || ""); }, [slide, selectedId]);
  useEffect(() => {
    if (!task?.id || ["completed", "failed", "cancelled"].includes(task.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/api/tasks/${task.id}`); setTask(data.task);
        if (data.task.status === "completed") {
          const fresh = await api(`/api/image-text/ppt/projects/${project.id}`); setProject(fresh.project); setDirtyIds(new Set()); setSaveStatus("exported"); onCompleted?.();
        } else if (data.task.status === "failed") setError(errors[data.task.errorCode] || "PPT 导出失败，积分已自动退回，原文件和草稿不会受影响。");
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
      setProject(data.project); setSlideNumber(1); setSelectedId(""); setTask(null); setDirtyIds(new Set()); setSaveStatus("idle"); setQuery("");
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  function updateLocal(text) {
    if (!selected) return;
    setProject((current) => ({ ...current, slides: current.slides.map((currentSlide) => currentSlide.number !== slide.number ? currentSlide : ({ ...currentSlide, items: currentSlide.items.map((item) => item.id === selected.id ? { ...item, currentText: text } : item) })) }));
    setDirtyIds((items) => new Set(items).add(selected.id)); setSaveStatus("dirty"); setError("");
  }

  async function saveItem(item = selected) {
    if (!item || !dirtyIds.has(item.id)) return;
    if (!String(item.currentText || "").trim()) return setError("PPT 文字不能为空，请输入内容后再继续。");
    setSaveStatus("saving");
    try {
      const data = await api(`/api/image-text/ppt/texts/${item.id}`, json("PATCH", { text: item.currentText }));
      setProject((current) => ({ ...current, slides: current.slides.map((currentSlide) => ({ ...currentSlide, items: currentSlide.items.map((entry) => entry.id === data.item.id && entry.currentText === item.currentText ? data.item : entry) })) }));
      setDirtyIds((items) => { const next = new Set(items); next.delete(item.id); return next; }); setSaveStatus("saved");
    } catch (cause) { setSaveStatus("error"); setError(cause.message); }
  }

  async function saveItems(items) {
    for (let index = 0; index < items.length; index += 8) {
      await Promise.all(items.slice(index, index + 8).map((item) => api(`/api/image-text/ppt/texts/${item.id}`, json("PATCH", { text: item.currentText }))));
    }
  }

  async function exportPpt() {
    if (!project) return;
    setBusy(true); setError("");
    try {
      if (!changedItems.length) throw Object.assign(new Error(errors.PPT_NO_CHANGES), { code: "PPT_NO_CHANGES" });
      await saveItems(allItems.filter((item) => dirtyIds.has(item.id)));
      setDirtyIds(new Set()); setSaveStatus("saved");
      const data = await api("/api/image-text/ppt/export", json("POST", { projectId: project.id })); setTask(data.task);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  const processing = ["queued", "running"].includes(task?.status);
  const progress = Number(task?.output?.progress || (task?.status === "running" ? 20 : 0));
  return <section className="ite-workbench ite-ppt-workbench">
    <aside className="ite-assets ite-ppt-assets">
      <button className="ite-upload-card ite-ppt-upload" onClick={() => input.current?.click()}><input ref={input} hidden type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => upload(event.target.files?.[0])} />{busy && !task ? <SpinnerGap className="ite-spin" size={28} /> : <FilePpt size={30} weight="duotone" />}<strong>{busy && !task ? "正在解析演示文稿…" : "上传 PPTX"}</strong><span>保留原文件版式与素材</span><small>PPTX · 最大 50 MB</small></button>
      {project && <label className="ite-ppt-search"><MagnifyingGlass size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索整份 PPT 文字" /></label>}
      <div className="ite-ppt-slides">{filteredSlides.map((item) => { const changed = item.items.filter((text) => text.currentText !== text.originalText).length; return <button key={item.number} className={slide?.number === item.number ? "active" : ""} onClick={() => { setSlideNumber(item.number); setSelectedId(""); }}><span>{item.number}</span><div>{item.items.slice(0, 3).map((text) => <i key={text.id}>{text.currentText}</i>)}</div><small className={changed ? "changed" : ""}>{changed ? `已修改 ${changed} 处` : `${item.items.length} 段文字`}</small></button>; })}{project && !filteredSlides.length && <p className="ite-ppt-no-results">没有找到包含该文字的页面</p>}</div>
    </aside>
    <section className="ite-canvas-panel ite-ppt-canvas-panel">
      {!project ? <div className="ite-empty-canvas"><span><PresentationChart size={42} weight="duotone" /></span><h2>批量修改整份 PPT 的文字</h2><p>上传 PPTX，按页面查找和修改文字。导出时保留图片、背景、母版、动画与文本格式。</p><button onClick={() => authenticated ? input.current?.click() : onAuth?.()}><Plus size={17} />选择 PPTX 文件</button><div><i>1</i>上传 PPT<b /><i>2</i>批量修改<b /><i>3</i>校验并导出</div></div> : <><header className="ite-ppt-canvas-title"><div><small>SLIDE {slide?.number} / {project.slideCount}</small><strong>{project.name}</strong></div><span>{changedItems.length ? `共修改 ${changedItems.length} 处` : "尚未修改"}</span></header><div className="ite-ppt-stage">{slide?.items?.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} style={{ left: `${item.bbox.x * 100}%`, top: `${item.bbox.y * 100}%`, width: `${Math.min(item.bbox.width, 1 - item.bbox.x) * 100}%`, height: `${Math.min(item.bbox.height, 1 - item.bbox.y) * 100}%`, color: item.style.color, fontWeight: item.style.bold ? 700 : 500, fontSize: `${Math.max(9, Math.min(24, item.style.fontSize * .32))}px` }}>{item.currentText}</button>)}</div><p className="ite-ppt-note">工作区展示可编辑文字层；最终文件直接修改原 PPTX 文字对象，不会重绘页面。</p></>}
      {processing && <div className="ite-progress"><span><SpinnerGap className="ite-spin" /></span><div><strong>正在生成新版 PPT</strong><p>正在写回文字并重新打包演示文稿。</p><i><b style={{ width: `${Math.max(6, progress)}%` }} /></i></div><em>{progress}%</em></div>}
    </section>
    <aside className="ite-editor ite-ppt-editor"><header><div><small>PRESENTATION TEXT</small><h2>PPT 文字编辑</h2></div>{project && <em>{changedItems.length} 处修改</em>}</header>
      {!selected ? <div className="ite-no-selection"><FilePpt size={30} /><strong>{project ? "当前页没有可编辑文字" : "等待上传 PPTX"}</strong><p>{project ? "请选择左侧其他页面继续检查。" : "上传后会自动列出每页中的文字对象。"}</p></div> : <><div className={`ite-ppt-save-status ${saveStatus}`}><CheckCircle weight="fill" />{saveStatus === "saving" ? "正在保存草稿" : saveStatus === "dirty" ? "这处修改尚未保存" : saveStatus === "exported" ? "新版 PPT 已通过校验" : "修改会自动保存"}</div><label><span>原文字</span><div className="ite-original-text">{selected.originalText}</div></label><label><span>修改为</span><textarea value={selected.currentText} maxLength={2000} onChange={(event) => updateLocal(event.target.value)} onBlur={() => saveItem(selected)} /><small>{selected.currentText.length}/2000</small></label><div className="ite-ppt-edit-actions"><button disabled={selected.currentText === selected.originalText} onClick={() => updateLocal(selected.originalText)}>恢复原文字</button></div><div className="ite-ppt-meta"><span>第 {slide.number} 页</span><span>文本框 {selected.shapeIndex + 1}</span><span>保留原格式</span></div><section className="ite-options"><h3>商业级导出保护</h3><label><CheckCircle weight="fill" /><span><strong>只写入实际修改</strong><small>没有修改的文字对象完全不触碰</small></span></label><label><CheckCircle weight="fill" /><span><strong>保留多段文字格式</strong><small>尽量沿用原有字体、颜色和强调样式</small></span></label><label><CheckCircle weight="fill" /><span><strong>导出后自动校验</strong><small>文字不一致则不交付并自动退款</small></span></label></section></>}
      {error && <p className="ite-error">{error}</p>}
      <footer><button className="secondary" disabled={!project || !changedItems.length || processing || busy} onClick={exportPpt}>{busy || processing ? <SpinnerGap className="ite-spin" /> : <MagicWand />}校验并导出 {changedItems.length || 0} 处 · {tool.creditCost} 积分</button><a className={!project?.downloadUrl ? "disabled" : ""} href={project?.downloadUrl || "#"} download><DownloadSimple />{saveStatus === "exported" ? "下载新版 PPTX" : "下载上次导出"}</a></footer>
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
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [inlineEditingId, setInlineEditingId] = useState("");
  const [draftStatus, setDraftStatus] = useState("idle");
  const [changedIds, setChangedIds] = useState(() => new Set());
  const [showResult, setShowResult] = useState(false);
  const [resultNonce, setResultNonce] = useState(0);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportFormat, setExportFormat] = useState("pptx");
  const [exportFile, setExportFile] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const fileInput = useRef(null);
  const inlineEditor = useRef(null);
  const stageRef = useRef(null);
  const resultPreviewRef = useRef(null);
  const asset = project?.assets?.find((item) => item.id === assetId) || project?.assets?.[0] || null;
  const selected = asset?.detections?.find((item) => item.id === selectedId) || null;
  const changedDetections = asset?.detections?.filter((item) => changedIds.has(item.id)) || [];
  const workingUrl = asset?.backgroundUrl || asset?.originalUrl || "";
  const displayedUrl = compare ? asset?.originalUrl : showResult && asset?.currentFileId ? asset.imageUrl : workingUrl;
  const imageUrl = asset ? `${displayedUrl}${displayedUrl.includes("?") ? "&" : "?"}v=${asset.backgroundFileId || asset.currentFileId || asset.originalFileId}-${resultNonce}` : "";
  const progressText = { preparing: "准备处理", "repairing-background": "正在修复原文字背景", "rendering-text": "正在精确写入新文字", "checking-text": "正在逐处检查生成文字", rendering: "保存生成结果", completed: "处理完成" };
  const resultNeedsReview = task?.status === "completed" && task?.output?.textVerified === false;

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
    document.title = "字迹 · AI 视觉结构重建 | OneShowTools";
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (!showResult || !asset?.currentFileId) return;
    const timer = setTimeout(() => resultPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 160);
    return () => clearTimeout(timer);
  }, [showResult, asset?.currentFileId]);
  useEffect(() => {
    if (!task?.id || ["completed", "failed", "cancelled"].includes(task.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/api/tasks/${task.id}`); setTask(data.task);
        if (data.task.status === "completed") {
          const fresh = await api(`/api/image-text/projects/${project.id}`);
          setProject(fresh.project); setShowResult(true); setCompare(false); setInlineEditingId(""); setChangedIds(new Set()); setResultNonce(Date.now()); onCompleted?.();
        } else if (data.task.status === "failed") {
          setError(errors[data.task.errorCode] || "图片生成或检查失败，积分已自动退回，文字草稿仍保留，可稍后重试。");
          const failedId = data.task.output?.failedDetectionIds?.[0];
          if (failedId) { setSelectedId(failedId); setCompare(false); }
        }
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
      setProject(next); setAssetId(next.assets.at(-1)?.id || ""); setSelectedId(""); setInlineEditingId(""); setDraftStatus("idle"); setChangedIds(new Set()); setShowResult(false); setZoom(1);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  function updateLocal(patch, remember = true) {
    if (!selected) return;
    if (remember) { setHistory((items) => [...items.slice(-29), { assetId: asset.id, detectionId: selected.id, value: selected }]); setFuture([]); }
    setDraftStatus("dirty");
    setChangedIds((items) => new Set(items).add(selected.id));
    setShowResult(false);
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
      const data = await api(`/api/image-text/texts/${item.id}`, json("PATCH", { text: item.currentText, style: item.style, bbox: item.bbox, rotation: item.rotation }));
      setProject((current) => ({ ...current, assets: current.assets.map((currentAsset) => ({ ...currentAsset, detections: currentAsset.detections.map((detection) => detection.id === data.detection.id && detection.currentText === item.currentText ? data.detection : detection) })) }));
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
    setShowResult(false);
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
      setChangedIds(new Set()); setShowResult(false);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function apply() {
    const edits = !asset?.backgroundFileId ? (asset?.detections || []) : (changedDetections.length ? changedDetections : (selected ? [selected] : []));
    if (!edits.length) return; setBusy(true); setError("");
    try {
      await Promise.all(edits.map((item) => api(`/api/image-text/texts/${item.id}`, json("PATCH", { text: item.currentText, style: item.style, bbox: item.bbox, rotation: item.rotation }))));
      setDraftStatus("saved");
      setShowResult(false);
      if (asset.backgroundFileId) {
        const fresh = await api(`/api/image-text/projects/${project.id}`);
        setProject(fresh.project); setChangedIds(new Set()); setBusy(false); return;
      }
      const data = await api("/api/image-text/apply", json("POST", { assetId: asset.id, detectionIds: edits.map((item) => item.id), applyAllPending: true }));
      setTask(data.task);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function exportProject() {
    if (!project) return;
    setExportBusy(true); setError("");
    try {
      const data = await api("/api/image-text/export", json("POST", { projectId: project.id, format: exportFormat }));
      setExportFile(data.file);
    } catch (cause) { setError(cause.message); }
    finally { setExportBusy(false); }
  }

  const progress = Number(task?.output?.progress || (task?.status === "running" ? 20 : 0));
  const processing = ["queued", "running"].includes(task?.status);
  const displayScale = useMemo(() => {
    if (!asset || !stageSize.width || !stageSize.height) return zoom;
    const fit = Math.min(1, Math.max(.08, (stageSize.width - 30) / asset.width), Math.max(.08, (stageSize.height - 30) / asset.height));
    return fit * zoom;
  }, [asset, stageSize, zoom]);

  return <main className="ite-page">
    <input ref={fileInput} hidden multiple type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => upload(Array.from(event.target.files || []))} />
    <button className="ite-back" onClick={onBack}><ArrowLeft size={16} />返回工具市场</button>
    <header className="ite-hero ite-hero-premium"><img className="ite-product-icon" src="/image-text-editor/image-text-editor-icon-v2.webp" alt="字迹 AI 视觉重建图标" /><div className="ite-hero-copy"><small>ONSHOWTOOLS · VISUAL RECONSTRUCTION</small><h1>字迹 · AI 视觉结构重建</h1><p>把图片、海报、截图和 PDF 重建成可编辑图层，并导出可编辑 PPTX、SVG 或高清图片。</p><div className="ite-hero-pills"><span><CheckCircle weight="fill" />OCR 与版面分析</span><span><CheckCircle weight="fill" />文字图层独立编辑</span><span><CheckCircle weight="fill" />多格式可编辑导出</span></div></div><em>测试中</em><aside className="ite-hero-proof"><small>AI LAYERED DESIGN</small><strong>从一张平面图<br />恢复可编辑结构</strong><div><span><b>12 页</b>PDF 导入</span><span><b>PPTX / SVG</b>可编辑</span><span><b>30 积分</b>AI 重建</span></div></aside></header>
    <nav className="ite-mode-tabs"><button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>图片 / PDF 转可编辑设计</button><button className={mode === "ppt" ? "active" : ""} onClick={() => setMode("ppt")}>已有 PPTX 改字 <i>保留原文件</i></button></nav>
    {mode === "image" ? <><section className="ite-workbench">
      <aside className="ite-assets"><UploadCard busy={busy && !task} onFiles={upload} />
        <div className="ite-asset-list">{project?.assets?.map((item, index) => <button key={item.id} className={(asset?.id === item.id ? "active " : "") + item.status} onClick={() => { setAssetId(item.id); setSelectedId(""); setInlineEditingId(""); setDraftStatus("idle"); setShowResult(false); setZoom(1); }}><span>{String(index + 1).padStart(2, "0")}</span><img src={`/api/files/${item.originalFileId}/thumbnail`} alt={item.name} /><small>{item.detections.length} 处文字</small></button>)}</div>
        {project && <button className="ite-add-image" onClick={() => fileInput.current?.click()}><Plus size={16} />添加图片</button>}
      </aside>
      <section className="ite-canvas-panel">
        <div className="ite-toolbar"><button onClick={() => setZoom(Math.max(.5, zoom - .1))}><MagnifyingGlassMinus /></button><button onClick={() => setZoom(Math.min(1.8, zoom + .1))}><MagnifyingGlassPlus /></button><strong>{Math.round(zoom * 100)}%</strong><button className="wide" onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}><Eye />按住对比</button>{asset?.currentFileId && <button className={`wide ${showResult ? "active" : ""}`} onClick={() => setShowResult((value) => !value)}><CheckCircle />{showResult ? "继续编辑" : "查看结果"}</button>}</div>
        {!asset ? <EmptyCanvas onUpload={() => authenticated ? fileInput.current?.click() : onAuth?.()} /> : <div className="ite-stage" ref={stageRef}><div className={`ite-image-wrap ${asset.backgroundFileId ? "layered" : "detected"}`} style={{ width: `${asset.width * displayScale}px`, height: `${asset.height * displayScale}px` }}><img key={imageUrl} src={imageUrl} alt={asset.name} />{!compare && !showResult && asset.detections.map((item) => {
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
              {(asset.backgroundFileId || item.currentText !== item.originalText) && <span>{item.currentText}</span>}
            </button>;
        })}</div></div>}
        <footer><button disabled={!history.length} onClick={() => restore(history.at(-1), setFuture, setHistory)}><ArrowCounterClockwise />撤销</button><button disabled={!future.length} onClick={() => restore(future.at(-1), setHistory, setFuture)}><ArrowClockwise />重做</button><button disabled={!asset} onClick={() => setSelectedId(asset?.detections?.[0]?.id || "")}><ArrowsClockwise />重新选择文字</button></footer>
        {processing && <div className="ite-progress"><span><SpinnerGap className="ite-spin" /></span><div><strong>{progressText[task.output?.phase] || "正在处理图片"}</strong><p>后台处理中，你可以留在当前页面等待。</p><i><b style={{ width: `${Math.max(6, progress)}%` }} /></i></div><em>{progress}%</em></div>}
      </section>
      <aside className="ite-editor"><header><div><small>LAYER EDITOR</small><h2>图层与导出</h2></div><button disabled={!asset || busy || processing} onClick={redetect}>{busy ? <SpinnerGap className="ite-spin" /> : <ArrowsClockwise />}重新识别</button></header>
        {!selected ? <div className="ite-no-selection"><TextT size={28} /><strong>{asset?.detections?.length === 0 ? "没有识别到文字" : "请选择一段文字"}</strong><p>{asset?.detections?.length === 0 ? "可以换一张更清晰、文字对比度更高的图片。" : "点击画布中的虚线框，即可原位输入修改。"}</p></div> : <>
          <div className={`ite-direct-edit-status ${draftStatus}`}><span><TextT weight="bold" />画布内直接编辑{changedDetections.length > 0 && <em>{changedDetections.length} 处待处理</em>}</span><small>{draftStatus === "saving" ? "正在自动保存文字草稿…" : draftStatus === "saved" ? "草稿已保存，可继续修改其他文字后统一处理" : draftStatus === "dirty" ? "点击其他区域保存这一处，再继续修改其他文字" : draftStatus === "error" ? "草稿未保存，请检查内容后重试" : "可连续修改多处，最后一次生成最终图片"}</small></div>
          <label><span>识别到的文字</span><div className="ite-original-text">{selected.originalText}</div></label>
          <label><span>修改为</span><textarea value={selected.currentText} maxLength={100} onChange={(event) => updateLocal({ currentText: event.target.value })} onBlur={() => saveDraft(selected)} /><small>{selected.currentText.length}/100</small></label>
          <div className="ite-ai-actions"><button onClick={() => rewrite("polish")} disabled={busy}><MagicWand />AI 优化文案</button><button onClick={() => rewrite("translate")} disabled={busy}><Translate />中英互译</button></div>
          <section className="ite-style"><h3>图层样式与位置 <small>可精确调整</small></h3>
            <label><span>字号</span><div className="ite-stepper"><button onClick={() => updateLocal({ style: { fontSize: Math.max(8, Number(selected.style?.fontSize || 16) - 2) } })}>−</button><input value={Math.round(selected.style?.fontSize || 16)} readOnly /><button onClick={() => updateLocal({ style: { fontSize: Math.min(300, Number(selected.style?.fontSize || 16) + 2) } })}>＋</button></div></label>
            <label><span>颜色</span><div className="ite-color"><input type="color" value={selected.style?.color || "#17264d"} onChange={(event) => updateLocal({ style: { color: event.target.value } })} /><input value={selected.style?.color || "#17264d"} readOnly /></div></label>
            <div className="ite-layer-position">{[["X", "x"], ["Y", "y"], ["宽", "width"], ["高", "height"]].map(([label, key]) => <label key={key}><span>{label}</span><input type="number" value={Math.round(selected.bbox[key])} onChange={(event) => updateLocal({ bbox: { ...selected.bbox, [key]: Number(event.target.value) } })} onBlur={() => saveDraft(selected)} /></label>)}</div>
            <div className="ite-format"><button className={selected.style?.bold ? "active" : ""} onClick={() => updateLocal({ style: { bold: !selected.style?.bold } })}>B</button><button className={selected.style?.align === "left" ? "active" : ""} onClick={() => updateLocal({ style: { align: "left" } })}><AlignLeft /></button><button className={selected.style?.align === "center" ? "active" : ""} onClick={() => updateLocal({ style: { align: "center" } })}><AlignCenterHorizontal /></button><button className={selected.style?.align === "right" ? "active" : ""} onClick={() => updateLocal({ style: { align: "right" } })}><AlignRight /></button></div>
          </section>
          <section className="ite-options"><h3>{asset.backgroundFileId ? "可编辑工程已建立" : "下一步：AI 分层重建"}</h3><p>{asset.backgroundFileId ? "当前画布由无文字背景和独立文字图层组成，修改位置与样式后可再次导出。" : "当前只是识别预览。点击下方按钮后，AI 会修复文字背后的背景，并把全部文字重建为独立图层。"}</p></section>
        </>}
        {error && <p className="ite-error">{error}</p>}
        <footer><button className="secondary" disabled={!asset?.detections?.length || processing || busy} onClick={apply}>{busy ? <SpinnerGap className="ite-spin" /> : <MagicWand />}{asset?.backgroundFileId ? `保存 ${Math.max(1, changedDetections.length)} 个图层` : `AI 重建 ${asset?.detections?.length || 0} 个图层 · ${tool.creditCost} 积分`}</button><button disabled={!asset?.backgroundFileId || processing} onClick={() => setShowResult(false)}><Eye />画布实时预览</button></footer>
      </aside>
    </section>
    {project && <section className="ite-export-panel"><div><small>EDITABLE EXPORT</small><h2>导出可编辑工程</h2><p>PNG 为最终成品；SVG 保留可编辑文字；PPTX 中每段文字都是可直接修改的文本框。</p></div><div className="ite-export-formats">{[["pptx", "可编辑 PPTX"], ["svg", "分层 SVG"], ["png", "高清 PNG"]].map(([value, label]) => <button key={value} className={exportFormat === value ? "active" : ""} onClick={() => { setExportFormat(value); setExportFile(null); }}>{label}</button>)}</div>{exportFile ? <a href={exportFile.downloadUrl} download><DownloadSimple />下载 {exportFile.name}</a> : <button className="ite-export-action" disabled={exportBusy || project.assets.some((item) => !item.backgroundFileId)} onClick={exportProject}>{exportBusy ? <SpinnerGap className="ite-spin" /> : <DownloadSimple />}{project.assets.some((item) => !item.backgroundFileId) ? "请先完成每页重建" : "生成导出文件"}</button>}</section>}
    {showResult && asset?.currentFileId && <section className="ite-result-preview" ref={resultPreviewRef}>
      <header><div><small>GENERATED RESULT</small><h2>生成结果预览</h2><p>本次已统一处理 <strong>{Number(task?.output?.editCount || changedDetections.length || 1)}</strong> 处文字。{resultNeedsReview ? "模型已生成可用预览，但自动文字核对未完全一致，请人工确认后再下载。" : "自动核对已通过，请先对比确认，满意后再下载。"}</p></div><span className={resultNeedsReview ? "needs-review" : "verified"}><CheckCircle weight="fill" />{resultNeedsReview ? "请人工确认" : "文字核对通过"}</span></header>
      <div className="ite-result-compare">
        <figure><figcaption><span>原始图片</span><small>修改前</small></figcaption><div><img src={`${asset.originalUrl}${asset.originalUrl.includes("?") ? "&" : "?"}v=${asset.originalFileId}`} alt={`${asset.name}原始图片`} /></div></figure>
        <figure className="result"><figcaption><span>生成后</span><small>已合并全部修改</small></figcaption><div><img src={`${asset.imageUrl}${asset.imageUrl.includes("?") ? "&" : "?"}v=${asset.currentFileId}-${resultNonce}`} alt={`${asset.name}生成结果`} /></div></figure>
      </div>
      {resultNeedsReview && <p className="ite-result-warning">个别文字可能存在漏字、错字或字形偏差。你可以继续修改并重新生成；确认画面无误后，也可以直接下载当前结果。</p>}
      <footer><button onClick={() => { const failedId = task?.output?.failedDetectionIds?.[0]; if (failedId) setSelectedId(failedId); setShowResult(false); stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><ArrowLeft />继续修改</button><a href={task?.output?.downloadUrl || asset.imageUrl} download><DownloadSimple />确认满意，下载图片</a></footer>
    </section>}</> : <PptTextEditor tool={tool} authenticated={authenticated} onAuth={onAuth} onCompleted={onCompleted} />}
    <p className="ite-tip"><FileImage size={16} />测试版优先重建文字与背景；普通图片、形状和复杂艺术字的进一步分层会持续增强。</p>
  </main>;
}
