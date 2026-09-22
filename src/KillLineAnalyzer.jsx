import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowsClockwise, ChartScatter, Check, Copy, DownloadSimple, Eye,
  EyeSlash, ImageSquare, Pause, Play, Plus, PresentationChart, Trash, UploadSimple, X,
} from "@phosphor-icons/react";
import "./kill-line-analyzer.css";

const STORAGE_KEY = "ost_kill_line_project_v1";
const WIDTH = 960;
const HEIGHT = 640;
const PLOT = { left: 94, top: 96, right: 42, bottom: 78 };
const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#4f46e5", "#be185d", "#475569"];
const featureNames = ["实时语音识别", "实时 AI 回答", "系统音频/会议软件", "简历个性化", "JD 岗位个性化", "个人知识库/RAG", "截图答题", "编程题/笔试辅助", "桌面端/悬浮辅助", "模拟面试/复盘"];

const uid = () => globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const initials = (name) => String(name || "?").trim().slice(0, 2).toUpperCase();
const demoProducts = [
  ["面试稳", 1.25, 95, "¥29.9", "1天不限量"], ["白瓜面试", 1.38, 80, "¥99", "3天不限次数"],
  ["面试猫", 2.48, 90, "¥119", "2天不限量"], ["即答侠", 27.6, 85, "¥69", "2.5小时"],
  ["AskCc", 29, 95, "¥29", "1小时"], ["面灵AI", 29, 85, "¥29", "1小时"],
  ["面试通", 66.86, 55, "¥78", "约70分钟"], ["面试狗", 67.5, 80, "¥67.5", "60分钟"],
  ["OfferBiye", 72, 50, "¥78", "约65分钟"],
].map(([name, xValue, yValue, price, duration], index) => ({
  id: uid(), name, logo: "", xValue, yValue, price, duration, description: "Demo 产品", note: "示例数据，仅用于功能演示", highlight: index === 0, color: COLORS[index % COLORS.length],
  features: Object.fromEntries(featureNames.map((feature, featureIndex) => {
    const completed = Math.floor(yValue / 10); const remainder = yValue % 10;
    return [feature, featureIndex < completed ? "supported" : featureIndex === completed && remainder >= 5 ? "partial" : "unsupported"];
  })),
}));

const blankProduct = (index = 0) => ({ id: uid(), name: `产品 ${index + 1}`, logo: "", xValue: index + 1, yValue: 60, price: "", duration: "", description: "", note: "", highlight: false, color: COLORS[index % COLORS.length], features: {} });
const dimensions = featureNames.map((name) => ({ id: uid(), name, weight: 10 }));

const templates = {
  blank: { name: "空白模板", title: "产品竞争力分析", subtitle: "数据驱动的二维产品定位", xName: "价格", xUnit: "元", yName: "综合评分", yUnit: "分", products: [blankProduct(0), blankProduct(1)], dimensions: [] },
  interview: { name: "AI 面试助手", title: "2026 AI 面试助手 价格 × 功能 斩杀线", subtitle: "示例数据，仅用于功能演示", xName: "每小时价格", xUnit: "元/h", yName: "功能完整度", yUnit: "分", products: demoProducts, dimensions },
  models: { name: "AI 模型比较", title: "AI 模型 成本 × 能力分析", subtitle: "用真实测评数据替换示例项", xName: "百万 Token 成本", xUnit: "元", yName: "能力评分", yUnit: "分", products: [blankProduct(0), blankProduct(1), blankProduct(2)], dimensions: [] },
  saas: { name: "SaaS 产品比较", title: "SaaS 产品 价格 × 功能分析", subtitle: "评估套餐竞争力与价值区间", xName: "月费", xUnit: "元/月", yName: "功能完整度", yUnit: "分", products: [blankProduct(0), blankProduct(1), blankProduct(2)], dimensions: [] },
  hardware: { name: "手机 / 硬件", title: "硬件 价格 × 配置分析", subtitle: "寻找配置与价格的平衡点", xName: "价格", xUnit: "元", yName: "配置评分", yUnit: "分", products: [blankProduct(0), blankProduct(1), blankProduct(2)], dimensions: [] },
};

const newProject = (key = "interview") => {
  const source = templates[key] || templates.interview;
  return {
    version: 1, template: key, title: source.title, subtitle: source.subtitle,
    axes: { xName: source.xName, xUnit: source.xUnit, yName: source.yName, yUnit: source.yUnit, xDirection: "lower", yDirection: "higher", xScale: "log" },
    products: structuredClone(source.products), dimensions: structuredClone(source.dimensions), scoring: { supported: 1, partial: .5, unsupported: 0, unknown: 0 },
    line: { mode: "curve", base: 60, range: 40, scale: 30, slope: .45, intercept: 56, formula: "60 + 40 * (1 - exp(-x / 30))", points: [{ x: 1, y: 60 }, { x: 10, y: 70 }, { x: 30, y: 80 }, { x: 70, y: 95 }] },
    regions: { visible: true, passName: "高性价比区", balanceName: "均衡区", killedName: "被斩杀区" },
    presentation: { interval: 800, speed: 1, order: "data", killAnimation: true }, export: { width: 1920, height: 1080 },
  };
};

function safeProject(value) {
  try {
    if (!value || !Array.isArray(value.products) || !value.axes || !value.line) return null;
    const project = { ...newProject("blank"), ...value };
    project.products = value.products.slice(0, 50).map((product, index) => ({ ...blankProduct(index), ...product, id: String(product.id || uid()), xValue: Number(product.xValue) || 0, yValue: Number(product.yValue) || 0 }));
    project.dimensions = Array.isArray(value.dimensions) ? value.dimensions.slice(0, 30) : [];
    return project;
  } catch { return null; }
}

function lineValue(project, x) {
  const line = project.line;
  if (line.mode === "linear") return line.intercept + line.slope * x;
  if (line.mode === "manual") {
    const points = [...line.points].sort((a, b) => a.x - b.x);
    if (!points.length) return 0;
    if (x <= points[0].x) return points[0].y;
    if (x >= points.at(-1).x) return points.at(-1).y;
    const right = points.findIndex((point) => point.x >= x);
    const a = points[right - 1]; const b = points[right]; const ratio = (x - a.x) / Math.max(.0001, b.x - a.x);
    return a.y + (b.y - a.y) * ratio;
  }
  if (line.mode === "formula") {
    const expression = String(line.formula || "").replaceAll("exp", "Math.exp").replaceAll("sqrt", "Math.sqrt").replaceAll("log", "Math.log");
    if (!/^[0-9xX+\-*/().,\sMathsqrt explog]+$/.test(expression)) return NaN;
    try { return Number(Function("x", `"use strict"; return (${expression.replaceAll("X", "x")});`)(x)); } catch { return NaN; }
  }
  return line.base + line.range * (1 - Math.exp(-x / Math.max(.01, line.scale)));
}

function scoreProduct(product, project) {
  if (!project.dimensions.length) return Number(product.yValue) || 0;
  const total = project.dimensions.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) || 1;
  return project.dimensions.reduce((sum, item) => sum + (Number(item.weight) || 0) * (project.scoring[product.features?.[item.name] || "unknown"] ?? 0), 0) / total * 100;
}

function smoothPath(points) {
  if (points.length < 2) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]; const mid = (previous[0] + point[0]) / 2;
    return `${path} C ${mid} ${previous[1]}, ${mid} ${point[1]}, ${point[0]} ${point[1]}`;
  }, `M ${points[0][0]} ${points[0][1]}`);
}

function axisDomain(values, log = false) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return [log ? .1 : 0, 100];
  let min = Math.min(...valid); let max = Math.max(...valid);
  if (min === max) { min -= Math.abs(min || 1) * .2; max += Math.abs(max || 1) * .2; }
  if (log) return [Math.max(.01, min / 1.35), max * 1.35];
  const pad = (max - min) * .14; return [Math.min(0, min - pad), max + pad];
}

function zoomDomain(domain, zoom, log = false) {
  if (zoom <= 1) return domain;
  if (log) {
    const low = Math.log(domain[0]); const high = Math.log(domain[1]); const center = (low + high) / 2; const half = (high - low) / (2 * zoom);
    return [Math.exp(center - half), Math.exp(center + half)];
  }
  const center = (domain[0] + domain[1]) / 2; const half = (domain[1] - domain[0]) / (2 * zoom);
  return [center - half, center + half];
}

export function KillLineAnalyzer({ onBack }) {
  const [project, setProject] = useState(() => safeProject(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")) || newProject());
  const [selectedId, setSelectedId] = useState(project.products[0]?.id || "");
  const [tab, setTab] = useState("products");
  const [presentation, setPresentation] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState(99);
  const [focusId, setFocusId] = useState("");
  const [dragPoint, setDragPoint] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* oversized uploaded logos remain usable in this session */ } }, [project]);
  useEffect(() => {
    document.body.classList.toggle("kill-line-presenting", presentation);
    return () => document.body.classList.remove("kill-line-presenting");
  }, [presentation]);
  const update = (path, value) => setProject((current) => {
    const next = structuredClone(current); let target = next;
    path.slice(0, -1).forEach((key) => { target = target[key]; }); target[path.at(-1)] = value; return next;
  });
  const scoredProducts = useMemo(() => project.products.map((product) => ({ ...product, yValue: scoreProduct(product, project) })), [project]);
  const logAllowed = scoredProducts.every((product) => product.xValue > 0);
  const useLog = project.axes.xScale === "log" && logAllowed;
  const xDomain = zoomDomain(axisDomain(scoredProducts.map((product) => product.xValue), useLog), zoom, useLog);
  const thresholdValues = Array.from({ length: 81 }, (_, index) => {
    const ratio = index / 80;
    const x = useLog ? Math.exp(Math.log(xDomain[0]) + ratio * (Math.log(xDomain[1]) - Math.log(xDomain[0]))) : xDomain[0] + ratio * (xDomain[1] - xDomain[0]);
    return lineValue(project, x);
  }).filter(Number.isFinite);
  const yDomain = zoomDomain(axisDomain([...scoredProducts.map((product) => product.yValue), ...thresholdValues]), zoom);
  const plotWidth = WIDTH - PLOT.left - PLOT.right; const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const sx = (x) => PLOT.left + (useLog ? (Math.log(Math.max(xDomain[0], x)) - Math.log(xDomain[0])) / (Math.log(xDomain[1]) - Math.log(xDomain[0])) : (x - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotWidth;
  const sy = (y) => PLOT.top + (1 - (y - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight;
  const fromPoint = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect(); const px = (clientX - rect.left) / rect.width * WIDTH; const py = (clientY - rect.top) / rect.height * HEIGHT;
    const xRatio = clamp((px - PLOT.left) / plotWidth, 0, 1); const yRatio = clamp((py - PLOT.top) / plotHeight, 0, 1);
    return { x: Number((useLog ? Math.exp(Math.log(xDomain[0]) + xRatio * (Math.log(xDomain[1]) - Math.log(xDomain[0]))) : xDomain[0] + xRatio * (xDomain[1] - xDomain[0])).toFixed(2)), y: Number((yDomain[1] - yRatio * (yDomain[1] - yDomain[0])).toFixed(2)) };
  };
  const curvePoints = Array.from({ length: 90 }, (_, index) => { const ratio = index / 89; const x = useLog ? Math.exp(Math.log(xDomain[0]) + ratio * (Math.log(xDomain[1]) - Math.log(xDomain[0]))) : xDomain[0] + ratio * (xDomain[1] - xDomain[0]); return [sx(x), sy(lineValue(project, x))]; }).filter((point) => Number.isFinite(point[1]));
  const curvePath = project.line.mode === "manual" ? smoothPath([...project.line.points].sort((a, b) => a.x - b.x).map((point) => [sx(point.x), sy(point.y)])) : smoothPath(curvePoints);
  const statusProducts = scoredProducts.map((product) => ({ ...product, pass: project.axes.yDirection === "higher" ? product.yValue >= lineValue(project, product.xValue) : product.yValue <= lineValue(project, product.xValue) }));
  const orderedProducts = useMemo(() => {
    const items = [...statusProducts];
    if (project.presentation.order === "reverse") return items.reverse();
    if (project.presentation.order === "x-asc") return items.sort((a, b) => a.xValue - b.xValue);
    if (project.presentation.order === "x-desc") return items.sort((a, b) => b.xValue - a.xValue);
    return items;
  }, [statusProducts, project.presentation.order]);
  const desirable = statusProducts.map((product) => {
    const xScore = project.axes.xDirection === "lower" ? 1 - (product.xValue - xDomain[0]) / (xDomain[1] - xDomain[0]) : (product.xValue - xDomain[0]) / (xDomain[1] - xDomain[0]);
    const yScore = project.axes.yDirection === "higher" ? (product.yValue - yDomain[0]) / (yDomain[1] - yDomain[0]) : 1 - (product.yValue - yDomain[0]) / (yDomain[1] - yDomain[0]);
    return { id: product.id, score: xScore + yScore };
  });
  const topId = desirable.sort((a, b) => b.score - a.score)[0]?.id;
  const visibleCount = stage < 4 ? 0 : Math.min(statusProducts.length, stage - 3);
  const showLine = stage >= 4 + statusProducts.length;
  const showRegions = stage >= 5 + statusProducts.length;

  useEffect(() => {
    if (!playing) return undefined;
    const finalStage = 6 + scoredProducts.length;
    if (stage >= finalStage) { setPlaying(false); return undefined; }
    const timer = setTimeout(() => setStage((value) => value + 1), Math.max(120, project.presentation.interval / project.presentation.speed));
    return () => clearTimeout(timer);
  }, [playing, stage, scoredProducts.length, project.presentation]);

  const loadTemplate = (key) => { const next = newProject(key); setProject(next); setSelectedId(next.products[0]?.id || ""); };
  const changeProduct = (id, patch) => setProject((current) => ({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...patch } : product) }));
  const addProduct = () => setProject((current) => ({ ...current, products: [...current.products, blankProduct(current.products.length)] }));
  const duplicate = (product) => setProject((current) => ({ ...current, products: [...current.products, { ...structuredClone(product), id: uid(), name: `${product.name} 副本`, highlight: false }] }));
  const remove = (id) => setProject((current) => ({ ...current, products: current.products.filter((product) => product.id !== id) }));
  const reorderProducts = (sourceId, targetId) => setProject((current) => {
    if (!sourceId || sourceId === targetId) return current;
    const products = [...current.products]; const sourceIndex = products.findIndex((product) => product.id === sourceId); const targetIndex = products.findIndex((product) => product.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return current;
    const [moved] = products.splice(sourceIndex, 1); products.splice(targetIndex, 0, moved);
    return { ...current, products };
  });
  const uploadLogo = (product, file) => { if (!file || !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 2 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => changeProduct(product.id, { logo: String(reader.result) }); reader.readAsDataURL(file); };

  const serializeSvg = () => {
    const clone = svgRef.current.cloneNode(true); clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.setAttribute("width", String(project.export.width)); clone.setAttribute("height", String(project.export.height)); return new XMLSerializer().serializeToString(clone);
  };
  const downloadSvg = () => { const blob = new Blob([serializeSvg()], { type: "image/svg+xml;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${project.title || "kill-line"}.svg`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); };
  const downloadPng = () => { const svg = new Blob([serializeSvg()], { type: "image/svg+xml;charset=utf-8" }); const url = URL.createObjectURL(svg); const image = new Image(); image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = project.export.width; canvas.height = project.export.height; canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); canvas.toBlob((blob) => { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${project.title || "kill-line"}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }, "image/png"); }; image.src = url; };

  const startPresentation = () => { setPresentation(true); setStage(0); setPlaying(true); };
  const chartPointer = (event) => {
    if (project.line.mode !== "manual" || presentation) return;
    const point = fromPoint(event.clientX, event.clientY);
    if (dragPoint >= 0) update(["line", "points"], project.line.points.map((item, index) => index === dragPoint ? point : item));
  };

  return <main className={`kill-line-page ${presentation ? "is-presenting" : ""}`}>
    {!presentation && <><button className="kill-back" onClick={onBack}><ArrowLeft size={17} />返回工具市场</button><header className="kill-hero"><span><ChartScatter size={34} weight="duotone" /></span><div><small>PRODUCT KILL LINE · ADMIN BETA</small><h1>斩杀线 · 二维产品竞争力分析器</h1><p>用两个关键维度看清产品位置，建立规则，画出真正有解释力的竞争力边界。</p></div><em>管理员测试</em></header></>}
    <section className="kill-workspace">
      {!presentation && <aside className="kill-config">
        <nav>{[["products", "产品"], ["axis", "坐标"], ["line", "斩杀线"], ["score", "评分"], ["export", "导出"]].map(([key, name]) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{name}</button>)}</nav>
        {tab === "products" && <div className="kill-pane"><label>分析模板<select value={project.template} onChange={(event) => loadTemplate(event.target.value)}>{Object.entries(templates).map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}</select></label>{project.template === "interview" && <p className="kill-demo-note">示例数据，仅用于功能演示。Logo 均为文字占位，不代表真实品牌标识。</p>}<div className="kill-product-list">{project.products.map((product) => <article draggable className={selectedId === product.id ? "active" : ""} key={product.id} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/product-id", product.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); reorderProducts(event.dataTransfer.getData("text/product-id"), product.id); }} onClick={() => setSelectedId(product.id)}><i style={{ background: product.color }}>{product.logo ? <img src={product.logo} alt="" /> : initials(product.name)}</i><div><strong>{product.name}</strong><small>{project.axes.xName} {product.xValue} · {project.axes.yName} {scoreProduct(product, project).toFixed(1)}</small></div><button title="复制" onClick={(event) => { event.stopPropagation(); duplicate(product); }}><Copy size={14} /></button><button title="删除" onClick={(event) => { event.stopPropagation(); remove(product.id); }}><Trash size={14} /></button></article>)}</div><p className="kill-help">可拖动产品卡片调整演示出现顺序。</p><button className="kill-add" onClick={addProduct}><Plus size={15} />新增产品</button>{project.products.filter((item) => item.id === selectedId).map((product) => <div className="kill-product-form" key={product.id}><h3>编辑产品</h3><label>产品名称<input value={product.name} onChange={(event) => changeProduct(product.id, { name: event.target.value })} /></label><div className="kill-two"><label>X 值<input type="number" value={product.xValue} onChange={(event) => changeProduct(product.id, { xValue: Number(event.target.value) })} /></label><label>Y 值<input type="number" disabled={project.dimensions.length > 0} value={scoreProduct(product, project).toFixed(1)} onChange={(event) => changeProduct(product.id, { yValue: Number(event.target.value) })} /></label></div><div className="kill-two"><label>价格<input value={product.price} onChange={(event) => changeProduct(product.id, { price: event.target.value })} /></label><label>套餐<input value={product.duration} onChange={(event) => changeProduct(product.id, { duration: event.target.value })} /></label></div><label>备注<textarea value={product.note} onChange={(event) => changeProduct(product.id, { note: event.target.value })} /></label><label className="kill-logo"><UploadSimple size={16} />上传 Logo<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadLogo(product, event.target.files?.[0])} /></label></div>)}</div>}
        {tab === "axis" && <div className="kill-pane"><label>图表标题<input value={project.title} onChange={(event) => update(["title"], event.target.value)} /></label><label>副标题<input value={project.subtitle} onChange={(event) => update(["subtitle"], event.target.value)} /></label><div className="kill-two"><label>X 轴名称<input value={project.axes.xName} onChange={(event) => update(["axes", "xName"], event.target.value)} /></label><label>X 轴单位<input value={project.axes.xUnit} onChange={(event) => update(["axes", "xUnit"], event.target.value)} /></label></div><div className="kill-two"><label>Y 轴名称<input value={project.axes.yName} onChange={(event) => update(["axes", "yName"], event.target.value)} /></label><label>Y 轴单位<input value={project.axes.yUnit} onChange={(event) => update(["axes", "yUnit"], event.target.value)} /></label></div><label>X 轴方向<select value={project.axes.xDirection} onChange={(event) => update(["axes", "xDirection"], event.target.value)}><option value="lower">越小越好</option><option value="higher">越大越好</option></select></label><label>Y 轴方向<select value={project.axes.yDirection} onChange={(event) => update(["axes", "yDirection"], event.target.value)}><option value="higher">越大越好</option><option value="lower">越小越好</option></select></label><label>X 轴尺度<select value={useLog ? "log" : "linear"} onChange={(event) => update(["axes", "xScale"], event.target.value)}><option value="linear">Linear 线性</option><option value="log" disabled={!logAllowed}>Log 对数（推荐）</option></select></label>{!logAllowed && <p className="kill-warning">数据含 0 或负数，对数坐标已自动禁用。</p>}</div>}
        {tab === "line" && <div className="kill-pane"><label>斩杀线模式<select value={project.line.mode} onChange={(event) => update(["line", "mode"], event.target.value)}><option value="manual">手动画线</option><option value="linear">线性斩杀线</option><option value="curve">曲线斩杀线</option><option value="formula">自定义公式</option></select></label>{project.line.mode === "curve" && <><label>最低功能要求 base<input type="range" min="0" max="100" value={project.line.base} onChange={(event) => update(["line", "base"], Number(event.target.value))} /><b>{project.line.base}</b></label><label>增长幅度 range<input type="range" min="0" max="100" value={project.line.range} onChange={(event) => update(["line", "range"], Number(event.target.value))} /><b>{project.line.range}</b></label><label>增长速度 scale<input type="range" min="1" max="100" value={project.line.scale} onChange={(event) => update(["line", "scale"], Number(event.target.value))} /><b>{project.line.scale}</b></label></>}{project.line.mode === "linear" && <div className="kill-two"><label>截距<input type="number" value={project.line.intercept} onChange={(event) => update(["line", "intercept"], Number(event.target.value))} /></label><label>斜率<input type="number" step=".05" value={project.line.slope} onChange={(event) => update(["line", "slope"], Number(event.target.value))} /></label></div>}{project.line.mode === "formula" && <label>Y =<input value={project.line.formula} onChange={(event) => update(["line", "formula"], event.target.value)} /><small>支持 x、+ - * /、exp、sqrt、log</small></label>}{project.line.mode === "manual" && <><p className="kill-help">点击图表添加控制点；拖动红色控制点调整曲线；双击控制点可删除。</p><button className="kill-add" onClick={() => update(["line", "points"], newProject().line.points)}>恢复默认控制点</button></>}<label className="kill-switch"><input type="checkbox" checked={project.regions.visible} onChange={(event) => update(["regions", "visible"], event.target.checked)} />显示区域</label><label>推荐区域名称<input value={project.regions.passName} onChange={(event) => update(["regions", "passName"], event.target.value)} /></label><label>均衡区域名称<input value={project.regions.balanceName} onChange={(event) => update(["regions", "balanceName"], event.target.value)} /></label><label>淘汰区域名称<input value={project.regions.killedName} onChange={(event) => update(["regions", "killedName"], event.target.value)} /></label></div>}
        {tab === "score" && <div className="kill-pane"><p className="kill-help">启用功能维度后，Y 值将由加权分自动计算。</p><div className="kill-scoring-rules">{[["supported", "支持"], ["partial", "部分支持"], ["unsupported", "不支持"], ["unknown", "未确认"]].map(([key, name]) => <label key={key}>{name}<input type="number" min="0" max="100" step="5" value={Math.round(project.scoring[key] * 100)} onChange={(event) => update(["scoring", key], clamp(Number(event.target.value) / 100, 0, 1))} /><small>% 权重得分</small></label>)}</div>{project.dimensions.map((dimension, index) => <div className="kill-dimension" key={dimension.id}><input value={dimension.name} onChange={(event) => update(["dimensions", index, "name"], event.target.value)} /><input type="number" value={dimension.weight} onChange={(event) => update(["dimensions", index, "weight"], Number(event.target.value))} /><button onClick={() => update(["dimensions"], project.dimensions.filter((_, itemIndex) => itemIndex !== index))}><X size={13} /></button></div>)}<button className="kill-add" onClick={() => update(["dimensions"], [...project.dimensions, { id: uid(), name: `评分项 ${project.dimensions.length + 1}`, weight: 10 }])}><Plus size={15} />新增评分维度</button>{project.dimensions.length > 0 && project.products.filter((item) => item.id === selectedId).map((product) => <div className="kill-feature-grid" key={product.id}><h3>{product.name} · 功能评分</h3>{project.dimensions.map((dimension) => <label key={dimension.id}><span>{dimension.name}</span><select value={product.features?.[dimension.name] || "unknown"} onChange={(event) => changeProduct(product.id, { features: { ...product.features, [dimension.name]: event.target.value } })}><option value="supported">支持</option><option value="partial">部分支持</option><option value="unsupported">不支持</option><option value="unknown">未确认</option></select></label>)}</div>)}</div>}
        {tab === "export" && <div className="kill-pane"><label>导出尺寸<select value={`${project.export.width}x${project.export.height}`} onChange={(event) => { const [width, height] = event.target.value.split("x").map(Number); update(["export"], { width, height }); }}><option value="1920x1080">1920 × 1080 横版</option><option value="1080x1920">1080 × 1920 竖版</option><option value="2048x2048">2048 × 2048 方版</option></select></label><button className="kill-primary" onClick={downloadPng}><DownloadSimple size={16} />导出高清 PNG</button><button className="kill-secondary" onClick={downloadSvg}><ImageSquare size={16} />导出可编辑 SVG</button><hr /><label>产品出现顺序<select value={project.presentation.order} onChange={(event) => update(["presentation", "order"], event.target.value)}><option value="data">列表顺序</option><option value="reverse">列表倒序</option><option value="x-asc">X 值从小到大</option><option value="x-desc">X 值从大到小</option></select></label><label>产品出现间隔<input type="number" min="120" step="100" value={project.presentation.interval} onChange={(event) => update(["presentation", "interval"], Number(event.target.value))} /></label><label>动画速度<select value={project.presentation.speed} onChange={(event) => update(["presentation", "speed"], Number(event.target.value))}><option value=".75">0.75×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label className="kill-switch"><input type="checkbox" checked={project.presentation.killAnimation} onChange={(event) => update(["presentation", "killAnimation"], event.target.checked)} />斩杀动画</label></div>}
      </aside>}
      <section className="kill-stage"><header className="kill-stage-tools"><div>{!presentation && <><button onClick={startPresentation}><PresentationChart size={16} />演示模式</button><select value={focusId} onChange={(event) => setFocusId(event.target.value)}><option value="">全部产品</option>{project.products.map((product) => <option key={product.id} value={product.id}>聚焦：{product.name}</option>)}</select><span className="kill-zoom"><button aria-label="缩小图表" onClick={() => setZoom((value) => Math.max(1, value - .25))}>−</button><b>{zoom.toFixed(2)}×</b><button aria-label="放大图表" onClick={() => setZoom((value) => Math.min(3, value + .25))}>＋</button></span></>}</div>{presentation && <div className="kill-presentation-tools"><button onClick={() => setPlaying((value) => !value)}>{playing ? <Pause /> : <Play />}{playing ? "暂停" : "继续"}</button><button onClick={() => { setStage(0); setPlaying(true); }}><ArrowsClockwise />重新播放</button><button onClick={() => { setPresentation(false); setStage(99); setPlaying(false); }}><X />退出演示</button></div>}</header>
        <div className="kill-chart-shell">
          <svg ref={svgRef} className="kill-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={project.title} onClick={(event) => { if (project.line.mode === "manual" && !event.target.closest?.(".kill-point, .kill-control")) update(["line", "points"], [...project.line.points, fromPoint(event.clientX, event.clientY)]); }} onPointerMove={chartPointer} onPointerUp={() => setDragPoint(-1)} onPointerLeave={() => setDragPoint(-1)}>
            <rect width={WIDTH} height={HEIGHT} fill="#ffffff" rx="18" />
            {stage >= 1 && <><text x={WIDTH / 2} y="39" textAnchor="middle" className="kill-svg-title">{project.title}</text><text x={WIDTH / 2} y="65" textAnchor="middle" className="kill-svg-subtitle">{project.subtitle}</text></>}
            {project.regions.visible && showRegions && curvePoints.length > 1 && <><path d={`${curvePath} L ${curvePoints.at(-1)[0]} ${PLOT.top} L ${curvePoints[0][0]} ${PLOT.top} Z`} fill="#eaf8f0" opacity=".86" /><path d={`${curvePath} L ${curvePoints.at(-1)[0]} ${PLOT.top + plotHeight} L ${curvePoints[0][0]} ${PLOT.top + plotHeight} Z`} fill="#fff1f1" opacity=".72" /><text x={PLOT.left + 18} y={PLOT.top + 28} className="kill-region-label pass">{project.regions.passName}</text><text x={PLOT.left + plotWidth - 18} y={PLOT.top + plotHeight - 16} textAnchor="end" className="kill-region-label killed">{project.regions.killedName}</text></>}
            {stage >= 2 && Array.from({ length: 6 }, (_, index) => { const ratio = index / 5; const x = PLOT.left + ratio * plotWidth; return <g key={`x-${index}`}><line x1={x} y1={PLOT.top} x2={x} y2={PLOT.top + plotHeight} className="kill-grid-line" /><text x={x} y={PLOT.top + plotHeight + 25} textAnchor="middle" className="kill-axis-tick">{(useLog ? Math.exp(Math.log(xDomain[0]) + ratio * (Math.log(xDomain[1]) - Math.log(xDomain[0]))) : xDomain[0] + ratio * (xDomain[1] - xDomain[0])).toFixed(1)}</text></g>; })}
            {stage >= 3 && Array.from({ length: 6 }, (_, index) => { const ratio = index / 5; const y = PLOT.top + (1 - ratio) * plotHeight; return <g key={`y-${index}`}><line x1={PLOT.left} y1={y} x2={PLOT.left + plotWidth} y2={y} className="kill-grid-line" /><text x={PLOT.left - 14} y={y + 4} textAnchor="end" className="kill-axis-tick">{(yDomain[0] + ratio * (yDomain[1] - yDomain[0])).toFixed(0)}</text></g>; })}
            {stage >= 2 && <><line x1={PLOT.left} y1={PLOT.top + plotHeight} x2={PLOT.left + plotWidth} y2={PLOT.top + plotHeight} className="kill-axis" /><text x={PLOT.left + plotWidth / 2} y={HEIGHT - 21} textAnchor="middle" className="kill-axis-name">{project.axes.xName}（{project.axes.xUnit}） · {useLog ? "Log" : "Linear"}</text></>}
            {stage >= 3 && <><line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.top + plotHeight} className="kill-axis" /><text transform={`translate(27 ${PLOT.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" className="kill-axis-name">{project.axes.yName}（{project.axes.yUnit}）</text></>}
            {showLine && curvePath && <path d={curvePath} fill="none" className="kill-line" pathLength="1" />}
            {project.line.mode === "manual" && !presentation && project.line.points.map((point, index) => <g className="kill-control" key={`${point.x}-${point.y}-${index}`} onPointerDown={(event) => { event.stopPropagation(); setDragPoint(index); event.currentTarget.setPointerCapture?.(event.pointerId); }} onDoubleClick={() => update(["line", "points"], project.line.points.filter((_, itemIndex) => itemIndex !== index))}><circle cx={sx(point.x)} cy={sy(point.y)} r="8" className="kill-control-point" /><text x={sx(point.x)} y={sy(point.y) - 13} textAnchor="middle" className="kill-control-label">{point.x}, {point.y}</text></g>)}
            {orderedProducts.slice(0, stage >= 99 ? orderedProducts.length : visibleCount).map((product) => { const dimmed = focusId && focusId !== product.id; const killed = showRegions && !product.pass && project.presentation.killAnimation; const radius = focusId === product.id ? 28 : 23; return <g key={product.id} className={`kill-point ${selectedId === product.id ? "selected" : ""} ${dimmed ? "dimmed" : ""} ${killed ? "is-killed" : ""}`} transform={`translate(${sx(product.xValue)} ${sy(product.yValue)})`} onClick={(event) => { event.stopPropagation(); setSelectedId(product.id); setTab("products"); }}><title>{`${product.name}\n${project.axes.xName}: ${product.xValue} ${project.axes.xUnit}\n${project.axes.yName}: ${product.yValue.toFixed(1)} ${project.axes.yUnit}\n${product.price} ${product.duration}\n${product.note}`}</title><circle r={radius + 5} fill="#fff" stroke={product.highlight || product.id === topId ? "#10b981" : "#cbd5e1"} strokeWidth={product.highlight || product.id === topId ? 4 : 2} />{product.logo ? <image href={product.logo} x={-radius} y={-radius} width={radius * 2} height={radius * 2} preserveAspectRatio="xMidYMid meet" /> : <><circle r={radius} fill={product.color} /><text textAnchor="middle" y="5" className="kill-initials">{initials(product.name)}</text></>}<text y={radius + 24} textAnchor="middle" className="kill-product-name">{product.name}</text><text y={radius + 40} textAnchor="middle" className="kill-product-value">{product.xValue} · {product.yValue.toFixed(0)}</text>{product.id === topId && <g transform={`translate(${radius - 4} ${-radius - 4})`}><circle r="12" fill="#10b981" /><text textAnchor="middle" y="4" className="kill-top-check">★</text></g>}{killed && <text y={-radius - 12} textAnchor="middle" className="kill-killed-text">被斩杀</text>}</g>; })}
            <g transform={`translate(${PLOT.left} ${HEIGHT - 7})`}><text className="kill-watermark">OneShowTools · Product Kill Line Analyzer</text></g>
          </svg>
        </div>
        {!presentation && <div className="kill-status-row">{statusProducts.map((product) => <button key={product.id} className={product.pass ? "pass" : "killed"} onClick={() => setFocusId(focusId === product.id ? "" : product.id)}><span>{product.id === topId ? "TOP VALUE" : product.pass ? "PASS" : "KILLED"}</span><strong>{product.name}</strong><small>{product.xValue} / {product.yValue.toFixed(0)}</small></button>)}</div>}
      </section>
    </section>
  </main>;
}
