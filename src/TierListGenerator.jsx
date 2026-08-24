import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowsClockwise, CheckCircle, CloudArrowUp, DownloadSimple, DotsThree,
  Export, Plus, Shuffle, Sparkle, SpinnerGap, Warning, X,
} from "@phosphor-icons/react";
import "./tier-list-generator.css";

const defaultTiers = [
  { id: "hang", name: "夯", color: "#ef4444", emoji: "👑", itemIds: [] },
  { id: "top", name: "顶级", color: "#f97316", emoji: "💎", itemIds: [] },
  { id: "elite", name: "人上人", color: "#eab308", emoji: "😎", itemIds: [] },
  { id: "npc", name: "NPC", color: "#22c55e", emoji: "🎮", itemIds: [] },
  { id: "pull", name: "拉完了", color: "#4f6de8", emoji: "💀", itemIds: [] },
];

const templateOptions = [
  { id: "paper", name: "纸感手账", colors: ["#f8f7f3", "#ef4444"] },
  { id: "aurora", name: "清透蓝紫", colors: ["#eef4ff", "#6557ff"] },
  { id: "candy", name: "甜酷粉彩", colors: ["#fff4f8", "#f04b91"] },
  { id: "dark", name: "暗夜榜单", colors: ["#141421", "#a78bfa"] },
];

const request = async (path, options = {}) => {
  const response = await fetch(path, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.code || "TIER_LIST_EXPORT_FAILED"), { code: payload?.error?.code || "TIER_LIST_EXPORT_FAILED" });
  return payload;
};

const shuffle = (values) => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
};

export function TierListGenerator({ tool, locale, authenticated, onBack, onAuth, onCompleted }) {
  const zh = locale !== "en";
  const [title, setTitle] = useState(zh ? "夯拉排行榜" : "My tier list");
  const [tiers, setTiers] = useState(defaultTiers);
  const [assets, setAssets] = useState([]);
  const [layout, setLayout] = useState("portrait");
  const [template, setTemplate] = useState("paper");
  const [activeStep, setActiveStep] = useState("sort");
  const [dragId, setDragId] = useState("");
  const [dragOver, setDragOver] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const urlsRef = useRef(new Set());
  const dragIdRef = useRef("");

  useEffect(() => () => { for (const url of urlsRef.current) URL.revokeObjectURL(url); }, []);
  useEffect(() => {
    const clearReleasedDrag = () => {
      dragIdRef.current = "";
      setDragId("");
      setDragOver("");
    };
    window.addEventListener("mouseup", clearReleasedDrag);
    return () => window.removeEventListener("mouseup", clearReleasedDrag);
  }, []);

  const assignedIds = useMemo(() => new Set(tiers.flatMap((tier) => tier.itemIds)), [tiers]);
  const unassigned = useMemo(() => assets.filter((asset) => !assignedIds.has(asset.id)), [assets, assignedIds]);
  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const addFiles = (fileList) => {
    const accepted = [...(fileList || [])].filter((file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024);
    if (!accepted.length) return setError(zh ? "请选择不超过 10MB 的 JPG、PNG 或 WebP 图片。" : "Choose JPG, PNG, or WebP images under 10MB.");
    if (assets.length + accepted.length > 50) return setError(zh ? "一次最多上传 50 张图片。" : "You can upload up to 50 images.");
    setAssets((current) => [...current, ...accepted.map((file) => {
      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);
      return { id: crypto.randomUUID(), file, url, name: file.name };
    })]);
    setError("");
  };

  const removeAsset = (id) => {
    const found = assetMap.get(id);
    if (found?.url) { URL.revokeObjectURL(found.url); urlsRef.current.delete(found.url); }
    setAssets((current) => current.filter((asset) => asset.id !== id));
    setTiers((current) => current.map((tier) => ({ ...tier, itemIds: tier.itemIds.filter((itemId) => itemId !== id) })));
  };

  const moveToTier = (itemId, tierId, beforeId = "") => {
    setTiers((current) => current.map((tier) => {
      const without = tier.itemIds.filter((id) => id !== itemId);
      if (tier.id !== tierId) return { ...tier, itemIds: without };
      const position = beforeId ? without.indexOf(beforeId) : -1;
      if (position < 0) without.push(itemId); else without.splice(position, 0, itemId);
      return { ...tier, itemIds: without };
    }));
  };

  const moveToTray = (itemId) => {
    setTiers((current) => current.map((tier) => ({ ...tier, itemIds: tier.itemIds.filter((id) => id !== itemId) })));
  };

  const dropOnTier = (event, tierId, beforeId = "") => {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.dataTransfer.getData("text/plain") || dragId;
    if (itemId) moveToTier(itemId, tierId, beforeId);
    setDragId("");
    setDragOver("");
  };

  const dropOnTray = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.dataTransfer.getData("text/plain") || dragId;
    if (itemId) moveToTray(itemId);
    setDragId("");
    setDragOver("");
  };

  const finishDrag = () => {
    dragIdRef.current = "";
    setDragId("");
    setDragOver("");
  };

  const beginDrag = (itemId) => {
    dragIdRef.current = itemId;
    setDragId(itemId);
  };

  const pointerDropOnTier = (event, tierId, beforeId = "") => {
    const itemId = dragIdRef.current;
    if (!itemId) return;
    event.stopPropagation();
    moveToTier(itemId, tierId, beforeId);
    finishDrag();
  };

  const pointerDropOnTray = (event) => {
    const itemId = dragIdRef.current;
    if (!itemId) return;
    event.stopPropagation();
    moveToTray(itemId);
    finishDrag();
  };

  const updateTier = (id, patch) => setTiers((current) => current.map((tier) => tier.id === id ? { ...tier, ...patch } : tier));
  const removeTier = (id) => tiers.length > 2 && setTiers((current) => current.filter((tier) => tier.id !== id));
  const addTier = () => {
    if (tiers.length >= 10) return;
    const index = tiers.length + 1;
    setTiers((current) => [...current, { id: crypto.randomUUID(), name: `等级 ${index}`, color: "#8b5cf6", emoji: "⭐", itemIds: [] }]);
  };

  const distribute = (random = false) => {
    const ids = random ? shuffle(assets.map((asset) => asset.id)) : assets.map((asset) => asset.id);
    const perTier = Math.max(1, Math.ceil(ids.length / tiers.length));
    setTiers((current) => current.map((tier, index) => ({ ...tier, itemIds: ids.slice(index * perTier, (index + 1) * perTier) })));
  };

  const assignments = () => tiers.flatMap((tier) => tier.itemIds.map((itemId, order) => ({
    tierId: tier.id,
    order,
    fileIndex: assets.findIndex((asset) => asset.id === itemId),
  }))).filter((item) => item.fileIndex >= 0);

  const exportImage = async (allowEmpty = false) => {
    if (!authenticated) return onAuth?.();
    if (!allowEmpty && !assets.length) return setError(zh ? "请先上传至少一张图片。" : "Upload at least one image first.");
    setBusy(true); setError("");
    try {
      const form = new FormData();
      assets.forEach((asset) => form.append("files", asset.file));
      form.append("title", title);
      form.append("layout", layout);
      form.append("template", template);
      form.append("tiers", JSON.stringify(tiers.map(({ id, name, color }) => ({ id, name, color }))));
      form.append("assignments", JSON.stringify(assignments()));
      const response = await request(`/api/tool-actions/${tool.slug}`, { method: "POST", body: form });
      setResult(response.file);
      onCompleted?.(response.task);
    } catch (caught) {
      const messages = {
        INSUFFICIENT_CREDITS: zh ? "积分不足，请先充值或选择免费工具。" : "Not enough credits.",
        FILE_QUOTA_EXCEEDED: zh ? "文件空间已满，请先到文件中心清理文件。" : "File storage is full.",
        TIER_LIST_TOO_MANY_IMAGES: zh ? "图片数量超过 50 张。" : "More than 50 images were uploaded.",
        TIER_LIST_IMAGE_INVALID: zh ? "图片格式或大小不符合要求。" : "An image type or size is invalid.",
      };
      setError(messages[caught.code] || (zh ? `导出失败（${caught.code}），请稍后重试。` : `Export failed (${caught.code}).`));
    } finally { setBusy(false); }
  };

  const shareResult = async () => {
    if (!result?.downloadUrl) return setError(zh ? "请先导出排行榜图片。" : "Export the tier list first.");
    try {
      const response = await fetch(result.downloadUrl, { credentials: "include" });
      const blob = await response.blob();
      const file = new File([blob], result.name || "tier-list.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title, files: [file] });
      else {
        await navigator.clipboard.writeText(location.origin + result.downloadUrl);
        setError(zh ? "下载链接已复制。" : "Download link copied.");
      }
    } catch { setError(zh ? "分享未完成，你也可以直接下载图片。" : "Sharing was not completed. You can download the image instead."); }
  };

  const previewRatio = layout === "portrait" ? "9 / 16" : layout === "landscape" ? "16 / 9" : "1 / 1";

  return <main className="tier-tool-page">
    <button type="button" className="tier-back" onClick={onBack}><ArrowLeft size={17} />{zh ? "返回工具市场" : "Back to marketplace"}</button>
    <header className="tier-hero">
        <span className="tier-app-icon">
          <img src="/tool-icons-v2/optimized/hang-la-tier-list-generator.png" alt="" />
        </span>
      <div><h1>{zh ? "夯拉排行榜生成器" : "Hang-La Tier List Maker"} <span>🔥</span></h1><p>{zh ? "从夯到拉，锐评你心中的万物排行榜。自定义等级、拖拽排序，一键导出分享长图。" : "Build a playful tier list with custom ranks, drag-and-drop ordering, and share-ready exports."}</p><div className="tier-tags"><span>娱乐创作</span><span>排行榜</span><span>社交媒体</span><span>免费工具</span></div></div>
    </header>
    <ol className="tier-steps">
      <li className={activeStep === "setup" ? "active" : ""}><button type="button" onClick={() => setActiveStep("setup")}><b>1</b>设置等级</button></li>
      <li className={activeStep === "sort" ? "active" : ""}><button type="button" onClick={() => setActiveStep("sort")}><b>2</b>全屏排序</button></li>
      <li className={activeStep === "preview" ? "active" : ""}><button type="button" onClick={() => setActiveStep("preview")}><b>3</b>样式与预览</button></li>
    </ol>

    <div className={`tier-workspace step-${activeStep}`}>
      {activeStep === "setup" && <section className="tier-panel tier-settings">
        <div className="tier-section-head"><h2>排行榜主题</h2><small>{title.length}/30</small></div>
        <input value={title} maxLength={30} onChange={(event) => setTitle(event.target.value)} placeholder="例如：奶茶品牌大比拼" />
        <div className="tier-section-head"><h2>自定义等级</h2><button type="button" onClick={() => setTiers(defaultTiers)}>恢复默认</button></div>
        <div className="tier-editor-list">{tiers.map((tier) => <div className="tier-editor-row" key={tier.id} style={{ "--tier-color": tier.color }}>
          <span>{tier.emoji}</span><input value={tier.name} maxLength={16} onChange={(event) => updateTier(tier.id, { name: event.target.value })} /><input aria-label="等级颜色" type="color" value={tier.color} onChange={(event) => updateTier(tier.id, { color: event.target.value })} /><button type="button" aria-label="删除等级" disabled={tiers.length <= 2} onClick={() => removeTier(tier.id)}><X size={15} /></button>
        </div>)}</div>
        <button type="button" className="tier-add-level" onClick={addTier} disabled={tiers.length >= 10}><Plus size={16} />添加等级（最多 10 级）</button>
        <div className="tier-step-footer"><span>等级和标题随时可以回来修改</span><button type="button" className="tier-next-button" onClick={() => setActiveStep("sort")}>进入全屏排序 <ArrowLeft size={16} /></button></div>
      </section>}

      {activeStep === "sort" && <section className="tier-panel tier-ranking tier-ranking-full">
        <div className="tier-ranking-toolbar"><div><h2>{title || "夯拉排行榜"}</h2><p>拖动图片完成你的夯拉排名</p></div><div className="tier-toolbar-actions"><button type="button" onClick={() => distribute(false)}><Sparkle size={16} />自动排序</button><button type="button" onClick={() => distribute(true)}><Shuffle size={16} />随机排序</button><button type="button" className="primary" onClick={() => setActiveStep("preview")}>查看预览</button></div></div>
        <div className="tier-ranking-list">{tiers.map((tier) => <div className={`tier-rank-row ${dragOver === tier.id ? "is-drag-over" : ""}`} key={tier.id} style={{ "--tier-color": tier.color }} onMouseEnter={() => dragIdRef.current && setDragOver(tier.id)} onMouseLeave={() => dragIdRef.current && setDragOver("")} onMouseUp={(event) => pointerDropOnTier(event, tier.id)} onDragEnter={() => setDragOver(tier.id)} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(""); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => dropOnTier(event, tier.id)}>
          <strong>{tier.name}</strong><div>{tier.itemIds.map((id) => { const asset = assetMap.get(id); return asset ? <TierAsset asset={asset} key={id} tiers={tiers} onDrag={beginDrag} onDragEnd={finishDrag} onMove={moveToTier} onPointerDrop={(event) => pointerDropOnTier(event, tier.id, id)} onDrop={(event) => dropOnTier(event, tier.id, id)} isDragging={dragId === id} /> : null; })}</div>
        </div>)}</div>
        <div className={`tier-material-tray ${dragOver === "tray" ? "is-drag-over" : ""}`} onMouseEnter={() => dragIdRef.current && setDragOver("tray")} onMouseLeave={() => dragIdRef.current && setDragOver("")} onMouseUp={pointerDropOnTray} onDragEnter={() => dragId && setDragOver("tray")} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(""); }} onDragOver={(event) => { if (dragId) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={dropOnTray}>
          <button type="button" className="tier-upload-button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); addFiles(event.dataTransfer.files); }}><CloudArrowUp size={18} />上传图片</button>
          {!!unassigned.length && <div className="tier-tray-grid">{unassigned.map((asset) => <TierAsset asset={asset} key={asset.id} tiers={tiers} onDrag={beginDrag} onDragEnd={finishDrag} onMove={moveToTier} onRemove={removeAsset} isDragging={dragId === asset.id} />)}</div>}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
      </section>}

      {activeStep === "preview" && <section className="tier-panel tier-preview-panel">
        <div className="tier-section-head"><h2>预览效果</h2></div>
        <div className="tier-layout-tabs"><button className={layout === "portrait" ? "active" : ""} onClick={() => setLayout("portrait")}>竖版 (9:16)</button><button className={layout === "landscape" ? "active" : ""} onClick={() => setLayout("landscape")}>横版 (16:9)</button><button className={layout === "square" ? "active" : ""} onClick={() => setLayout("square")}>方版 (1:1)</button></div>
        <div className={`tier-live-preview theme-${template}`} style={{ aspectRatio: previewRatio }}><header><h3>{title || "夯拉排行榜"}</h3><p>从夯到拉，主观锐评，仅供娱乐</p></header>{tiers.map((tier) => <div className="tier-preview-row" key={tier.id} style={{ "--tier-color": tier.color }}><strong>{tier.name}</strong><span>{tier.itemIds.map((id) => assetMap.get(id)).filter(Boolean).map((asset) => <img key={asset.id} src={asset.url} alt="" />)}</span></div>)}<footer>你怎么排？评论区见！</footer></div>
        <div className="tier-section-head tier-template-head"><h2>样式模板</h2></div>
        <div className="tier-template-list">{templateOptions.map((option) => <button type="button" key={option.id} className={template === option.id ? "active" : ""} onClick={() => setTemplate(option.id)} style={{ background: `linear-gradient(135deg, ${option.colors[0]}, ${option.colors[1]})` }}><span>{option.name}</span>{template === option.id && <CheckCircle weight="fill" size={16} />}</button>)}</div>
        {error && <p className={`tier-error ${error.includes("复制") ? "success" : ""}`}><Warning size={16} />{error}</p>}
        {result && <a className="tier-result" href={result.downloadUrl} download><CheckCircle weight="fill" size={18} />排行榜已生成，点击下载 {result.name}</a>}
        <div className="tier-export-actions"><button type="button" className="primary" disabled={busy} onClick={() => exportImage(false)}>{busy ? <SpinnerGap className="spin" size={18} /> : <Export size={18} />}导出长图</button><button type="button" onClick={() => exportImage(true)}><DownloadSimple size={18} />下载模板</button><button type="button" onClick={shareResult}><ArrowsClockwise size={18} />分享</button></div>
      </section>}
    </div>
  </main>;
}

function TierAsset({ asset, tiers, onDrag, onDragEnd, onMove, onDrop, onPointerDrop, onRemove, isDragging }) {
  return <div className={`tier-asset ${isDragging ? "is-dragging" : ""}`} draggable onMouseDown={(event) => { if (event.button === 0) onDrag(asset.id); }} onMouseUp={onPointerDrop} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", asset.id); onDrag(asset.id); }} onDragEnd={onDragEnd} onDragOver={(event) => { if (onDrop) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; } }} onDrop={onDrop}>
    <img src={asset.url} alt={asset.name} draggable="false" /><select aria-label="移动到等级" defaultValue="" onMouseDown={(event) => event.stopPropagation()} onChange={(event) => { if (event.target.value) onMove(asset.id, event.target.value); event.target.value = ""; }}><option value="">移动到…</option>{tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}</select><DotsThree size={16} />{onRemove && <button type="button" className="tier-asset-remove" aria-label={`删除 ${asset.name}`} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRemove(asset.id); }}><X size={12} /></button>}
  </div>;
}
