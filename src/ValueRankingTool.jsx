import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CheckCircle, DownloadSimple, Eye, EyeSlash, Pause, Play,
  Plus, PresentationChart, Sparkle, Trash, Trophy, UploadSimple, X,
} from "@phosphor-icons/react";
import html2canvas from "html2canvas";
import "./value-ranking-tool.css";

const STORAGE_KEY = "ost_value_ranking_project_v1";
const COLORS = ["#635bff", "#1976f3", "#00a389", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9", "#16a34a"];
const uid = () => globalThis.crypto?.randomUUID?.() || `value-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const makeProduct = (index = 0) => ({ id: uid(), name: `产品 ${index + 1}`, totalPrice: "", hours: "", logo: "", color: COLORS[index % COLORS.length], visible: true, note: "" });
const initialProject = () => ({
  title: "同类产品每小时价格排行榜",
  subtitle: "用统一口径比较真实使用成本",
  currency: "¥",
  scope: "全部产品",
  products: [makeProduct(0), makeProduct(1), makeProduct(2)],
  topN: 10,
  showSavings: true,
  presentationSpeed: 700,
});

function safeProject(value) {
  if (!value || !Array.isArray(value.products)) return null;
  return {
    ...initialProject(),
    ...value,
    products: value.products.slice(0, 100).map((product, index) => ({ ...makeProduct(index), ...product, id: String(product.id || uid()) })),
  };
}

const hourlyPrice = (product) => {
  const total = Number(product.totalPrice);
  const hours = Number(product.hours);
  return total >= 0 && hours > 0 ? total / hours : null;
};

const formatMoney = (value) => Number(value).toLocaleString("zh-CN", { minimumFractionDigits: value < 10 ? 2 : 1, maximumFractionDigits: value < 10 ? 2 : 1 });

export function ValueRankingTool({ onBack }) {
  const [project, setProject] = useState(() => {
    try { return safeProject(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")) || initialProject(); } catch { return initialProject(); }
  });
  const [selectedId, setSelectedId] = useState(project.products[0]?.id || "");
  const [bulkText, setBulkText] = useState("");
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(99);
  const captureRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* uploaded logos can exceed storage */ } }, [project]);
  useEffect(() => {
    document.body.classList.toggle("value-ranking-presenting", recording);
    return () => document.body.classList.remove("value-ranking-presenting");
  }, [recording]);

  const ranked = useMemo(() => project.products
    .filter((product) => product.visible !== false && hourlyPrice(product) !== null)
    .map((product) => ({ ...product, hourly: hourlyPrice(product) }))
    .sort((a, b) => a.hourly - b.hourly)
    .map((product, index) => ({ ...product, rank: index + 1 })), [project.products]);
  const shown = project.topN === 0 ? ranked : ranked.slice(0, project.topN);
  const average = ranked.length ? ranked.reduce((sum, product) => sum + product.hourly, 0) / ranked.length : 0;
  const maximum = Math.max(1, ...shown.map((product) => product.hourly));
  const readyCount = ranked.length;

  useEffect(() => {
    if (!recording || !playing || revealed >= shown.length) { if (revealed >= shown.length) setPlaying(false); return undefined; }
    const timer = setTimeout(() => setRevealed((value) => value + 1), project.presentationSpeed);
    return () => clearTimeout(timer);
  }, [recording, playing, revealed, shown.length, project.presentationSpeed]);

  const updateProduct = (id, patch) => setProject((current) => ({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...patch } : product) }));
  const addProduct = () => setProject((current) => ({ ...current, products: [...current.products, makeProduct(current.products.length)].slice(0, 100) }));
  const removeProduct = (id) => setProject((current) => ({ ...current, products: current.products.filter((product) => product.id !== id) }));
  const uploadLogo = (id, file) => {
    if (!file || !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader(); reader.onload = () => updateProduct(id, { logo: String(reader.result) }); reader.readAsDataURL(file);
  };
  const importBulk = () => {
    const rows = bulkText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 100).map((line, index) => {
      const [name = "", totalPrice = "", hours = "", note = ""] = line.split(/[，,\t]/).map((item) => item.trim());
      return { ...makeProduct(index), name: name || `产品 ${index + 1}`, totalPrice, hours, note };
    });
    if (!rows.length) return;
    setProject((current) => ({ ...current, products: rows })); setSelectedId(rows[0].id); setBulkText("");
  };
  const downloadPng = async () => {
    if (!captureRef.current) return;
    const canvas = await html2canvas(captureRef.current, { scale: 2, backgroundColor: "#f6f8fc", useCORS: true });
    const link = document.createElement("a"); link.download = `${project.title || "性价比排名"}.png`; link.href = canvas.toDataURL("image/png"); link.click();
  };
  const startPresentation = () => { setRecording(true); setRevealed(0); setPlaying(true); };
  const resetProject = () => { const next = initialProject(); setProject(next); setSelectedId(next.products[0].id); };

  return <main className={`value-ranking-page ${recording ? "is-presenting" : ""}`}>
    {!recording && <>
      <button className="value-back" onClick={onBack}><ArrowLeft size={17} />返回工具市场</button>
      <header className="value-hero">
        <span className="value-hero-icon"><img src="/tool-icons-v2/value-ranking-tool.svg" alt="" /></span>
        <div><small>PRICE PER HOUR · VALUE RANKING</small><h1>性价比排名工具</h1><p>统一换算每小时价格，让几十个同类产品的真实成本一眼可见。</p></div>
        <em><Sparkle size={14} weight="fill" />已上线</em>
      </header>
    </>}

    <section className="value-workspace">
      {!recording && <aside className="value-config">
        <section className="value-panel value-settings">
          <div className="value-panel-title"><div><small>01</small><h2>榜单设置</h2></div><button onClick={resetProject}>清空重置</button></div>
          <label>榜单标题<input value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /></label>
          <label>副标题<input value={project.subtitle} onChange={(event) => setProject({ ...project, subtitle: event.target.value })} /></label>
          <div className="value-two"><label>货币符号<input value={project.currency} maxLength="4" onChange={(event) => setProject({ ...project, currency: event.target.value })} /></label><label>展示范围<select value={project.topN} onChange={(event) => setProject({ ...project, topN: Number(event.target.value) })}><option value="5">TOP 5</option><option value="10">TOP 10</option><option value="20">TOP 20</option><option value="0">全部</option></select></label></div>
        </section>

        <section className="value-panel">
          <div className="value-panel-title"><div><small>02</small><h2>产品数据</h2></div><span>{project.products.length}/100</span></div>
          <div className="value-product-list">{project.products.map((product) => {
            const calculated = hourlyPrice(product); const active = selectedId === product.id; const visible = product.visible !== false;
            return <article key={product.id} className={`${active ? "active" : ""} ${visible ? "" : "hidden"}`} onClick={() => setSelectedId(product.id)}>
              <i style={{ background: product.color }}>{product.logo ? <img src={product.logo} alt="" /> : String(product.name || "?").slice(0, 1)}</i>
              <div><strong>{product.name}</strong><small>{calculated === null ? "等待填写价格与小时数" : `${project.currency}${formatMoney(calculated)} / 小时`}</small></div>
              <button aria-label={visible ? "隐藏" : "显示"} onClick={(event) => { event.stopPropagation(); updateProduct(product.id, { visible: !visible }); }}>{visible ? <Eye size={16} weight="fill" /> : <EyeSlash size={16} />}</button>
              <button aria-label="删除" onClick={(event) => { event.stopPropagation(); removeProduct(product.id); }}><Trash size={15} /></button>
            </article>;
          })}</div>
          <button className="value-add" disabled={project.products.length >= 100} onClick={addProduct}><Plus size={16} />新增产品</button>
          {project.products.filter((product) => product.id === selectedId).map((product) => <div className="value-editor" key={product.id}>
            <h3>编辑产品</h3>
            <label>产品名称<input value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} /></label>
            <div className="value-two"><label>总价<input type="number" min="0" placeholder="例如 399" value={product.totalPrice} onChange={(event) => updateProduct(product.id, { totalPrice: event.target.value })} /></label><label>可使用小时数<input type="number" min="0.01" step="0.5" placeholder="例如 20" value={product.hours} onChange={(event) => updateProduct(product.id, { hours: event.target.value })} /></label></div>
            <div className="value-hourly-preview"><span>自动换算</span><strong>{hourlyPrice(product) === null ? "—" : `${project.currency}${formatMoney(hourlyPrice(product))}`}</strong><small>/ 小时</small></div>
            <label>备注（可选）<input value={product.note} placeholder="套餐、版本或服务说明" onChange={(event) => updateProduct(product.id, { note: event.target.value })} /></label>
            <label className="value-logo"><UploadSimple size={16} />上传 Logo<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadLogo(product.id, event.target.files?.[0])} /></label>
          </div>)}
        </section>

        <section className="value-panel value-bulk">
          <div className="value-panel-title"><div><small>03</small><h2>批量导入</h2></div></div>
          <p>每行一个产品：名称, 总价, 小时数, 备注</p>
          <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={'产品 A, 399, 20, 专业版\n产品 B, 699, 50, 年度套餐'} />
          <button onClick={importBulk}>替换并导入数据</button>
        </section>
      </aside>}

      <section className="value-result-column">
        {!recording && <div className="value-toolbar"><div><span><CheckCircle size={17} weight="fill" />{readyCount} 个有效产品</span><span>最低价优先</span></div><div><button onClick={startPresentation} disabled={!shown.length}><PresentationChart size={17} />录制演示</button><button className="primary" onClick={downloadPng} disabled={!shown.length}><DownloadSimple size={17} />下载榜单</button></div></div>}
        {recording && <div className="value-presentation-tools"><button onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={18} /> : <Play size={18} />}{playing ? "暂停" : "继续"}</button><button onClick={() => { setRevealed(0); setPlaying(true); }}><PresentationChart size={18} />重新播放</button><button onClick={() => { setRecording(false); setRevealed(99); setPlaying(false); }}><X size={18} />退出</button></div>}
        <div ref={captureRef} className="value-ranking-canvas">
          <header><div><small>ONESHOWTOOLS · VALUE RANKING</small><h2>{project.title}</h2><p>{project.subtitle}</p></div><div className="value-formula"><span>统一计算公式</span><strong>总价 ÷ 可使用小时数</strong><small>价格越低 · 排名越高</small></div></header>
          {shown.length ? <>
            <div className="value-summary">
              <article className="winner"><Trophy size={22} weight="fill" /><span>性价比冠军</span><strong>{shown[0].name}</strong><em>{project.currency}{formatMoney(shown[0].hourly)} / 小时</em></article>
              <article><span>参与排名</span><strong>{ranked.length}</strong><em>个有效产品</em></article>
              <article><span>平均小时价</span><strong>{project.currency}{formatMoney(average)}</strong><em>同口径平均值</em></article>
            </div>
            <div className="value-ranking-list">{shown.slice(0, revealed).map((product, index) => {
              const savePercent = average > 0 ? Math.max(0, (average - product.hourly) / average * 100) : 0;
              const width = Math.max(10, product.hourly / maximum * 100);
              return <article key={product.id} className={`${index < 3 ? `top top-${index + 1}` : ""}`} style={{ "--delay": `${index * 45}ms` }}>
                <b className="rank">{index + 1}</b>
                <i style={{ background: product.color }}>{product.logo ? <img src={product.logo} alt="" /> : String(product.name || "?").slice(0, 1)}</i>
                <div className="value-row-main"><div><strong>{product.name}</strong><small>{product.note || `${project.currency}${product.totalPrice} ÷ ${product.hours} 小时`}</small></div><span className="value-bar-track"><span style={{ width: `${width}%`, background: product.color }} /></span></div>
                {project.showSavings && <span className={`saving ${savePercent > 0 ? "positive" : ""}`}>{savePercent > 0 ? `低于均价 ${savePercent.toFixed(0)}%` : "高于均价"}</span>}
                <strong className="hourly"><small>{project.currency}</small>{formatMoney(product.hourly)}<em>/小时</em></strong>
              </article>;
            })}</div>
            {revealed < shown.length && <div className="value-reveal-placeholder"><span>{shown.length - revealed}</span> 个排名即将揭晓</div>}
          </> : <div className="value-empty"><span>01</span><h3>填写价格与小时数，榜单会自动生成</h3><p>至少完成一个产品的数据；支持最多 100 个同类产品。</p></div>}
          <footer><span>数据由用户提供 · 每小时价格自动计算</span><strong>OneShowTools</strong></footer>
        </div>
      </section>
    </section>
  </main>;
}
