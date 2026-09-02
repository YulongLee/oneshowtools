import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarCheck, CheckCircle, Clock, Coins, Desktop, DownloadSimple,
  Laptop, LockKey, ShieldCheck, Sparkle, Wallet, X,
} from "@phosphor-icons/react";
import "./fortune-cat.css";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.code || "REQUEST_FAILED"), { code: payload?.error?.code, status: response.status });
  return payload;
}

const errors = {
  INSUFFICIENT_CREDITS: "积分不足，请先充值后再兑换。",
  DOWNLOAD_NOT_CONFIGURED: "测试安装包正在准备中，权益会永久保留。",
  DOWNLOAD_PLATFORM_INVALID: "请选择正确的电脑系统。",
  PRODUCT_NOT_OWNED: "请先使用积分解锁招财滚滚。",
  DEVICE_LIMIT_REACHED: "已达到 3 台设备上限，请先移除旧设备。",
};

function currentProgress(monthlySalary, workDays, startHour, endHour) {
  const now = new Date();
  const start = new Date(now); start.setHours(startHour, 0, 0, 0);
  const end = new Date(now); end.setHours(endHour, 0, 0, 0);
  const totalMs = Math.max(1, end - start);
  const elapsedMs = Math.max(0, Math.min(totalMs, now - start));
  const daily = monthlySalary / Math.max(1, workDays);
  return { today: daily * (elapsedMs / totalMs), daily, percent: elapsedMs / totalMs, perSecond: daily / (totalMs / 1000) };
}

export function FortuneCatProduct({ authenticated, account, onBack, onAuth, onCompleted }) {
  const [product, setProduct] = useState(null);
  const [license, setLicense] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("preview");
  const [salary, setSalary] = useState(12000);
  const [workDays, setWorkDays] = useState(21.75);
  const [tick, setTick] = useState(Date.now());

  const load = async () => {
    const info = await request("/api/products/fortune-cat");
    setProduct(info);
    if (authenticated) setLicense(await request("/api/products/fortune-cat/license"));
  };
  useEffect(() => { load().catch(() => setNotice("产品信息加载失败，请稍后重试。")); }, [authenticated]);
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const earnings = useMemo(() => currentProgress(Number(salary) || 0, Number(workDays) || 21.75, 9, 18), [salary, workDays, tick]);
  const balance = Number(account?.credits?.balance || 0);
  const owned = Boolean(license?.entitled);
  const canAfford = balance >= Number(product?.priceCredits || 1000);

  const unlock = async () => {
    if (!authenticated) return onAuth();
    setBusy(true); setNotice("");
    try {
      const next = await request("/api/products/fortune-cat/unlock", { method: "POST" });
      setLicense(next);
      setNotice(next.alreadyOwned ? "你已经拥有招财滚滚。" : "兑换成功，招财滚滚已加入你的账户。");
      await onCompleted?.();
    } catch (error) { setNotice(errors[error.code] || "兑换失败，请稍后重试。"); }
    finally { setBusy(false); }
  };

  const download = async (platform) => {
    if (!owned) return unlock();
    setBusy(true); setNotice("");
    try {
      const result = await request(`/api/products/fortune-cat/download?platform=${platform}`);
      location.assign(result.url);
    } catch (error) { setNotice(errors[error.code] || "下载暂不可用，请稍后重试。"); }
    finally { setBusy(false); }
  };

  return <div className="fortune-cat-page">
    <button className="fortune-cat-back" onClick={onBack}><ArrowLeft size={17} />返回工具市场</button>
    <header className="fortune-cat-heading">
      <div className="fortune-cat-brand"><img src="/fortune-cat/zhaocai-gungun-v1.webp" alt="招财滚滚招财猫" /><span><small>ONESHOWTOOLS DESKTOP COMPANION</small><h1>招财滚滚</h1><p>看得见的每一秒，都在为你积累今天的收获。</p></span></div>
      <div className="fortune-cat-test"><i />管理员测试版 <b>{product?.version || "0.1.2-test"}</b></div>
    </header>

    <div className="fortune-cat-layout">
      <main>
        <section className="fortune-cat-hero">
          <div className="fortune-cat-copy"><span className="fortune-cat-eyebrow"><Sparkle weight="fill" />实时收入桌宠</span><h2>让工作的每一秒<br /><em>都有正反馈</em></h2><p>输入工资和工作时间，滚滚会常驻桌面，实时计算今天、本月与当前这一秒赚到的钱。</p><div className="fortune-cat-highlights"><span><ShieldCheck />工资仅保存在本机</span><span><Clock />按工作时间实时累计</span><span><CalendarCheck />支持工作日与休息日</span></div></div>
          <div className="fortune-cat-stage">
            <div className="fortune-cat-earnings"><small>今日已赚</small><strong>¥ {earnings.today.toFixed(2)}</strong><span>每秒 +¥ {earnings.perSecond.toFixed(4)}</span><div><i style={{ width: `${earnings.percent * 100}%` }} /></div><em>今日进度 {Math.round(earnings.percent * 100)}%</em></div>
            <img src="/fortune-cat/zhaocai-gungun-v1.webp" alt="招财滚滚" />
            <div className="fortune-cat-bubble">今天也在稳稳进账！</div>
          </div>
        </section>

        <nav className="fortune-cat-tabs">{[["preview","实时体验"],["features","功能说明"],["privacy","隐私设计"],["devices","设备管理"]].map(([key,label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>
        {tab === "preview" && <section className="fortune-cat-preview-panel"><header><div><small>网页预演</small><h3>先看看滚滚怎么算</h3></div><span>正式客户端设置保存在本机</span></header><div className="fortune-cat-form"><label>税后月薪（元）<input type="number" min="0" max="10000000" value={salary} onChange={(event) => setSalary(event.target.value)} /></label><label>每月工作日<input type="number" min="1" max="31" step="0.25" value={workDays} onChange={(event) => setWorkDays(event.target.value)} /></label></div><div className="fortune-cat-metrics"><article><Wallet /><span><small>今日预计</small><strong>¥ {earnings.daily.toFixed(2)}</strong></span></article><article><Coins /><span><small>当前已赚</small><strong>¥ {earnings.today.toFixed(2)}</strong></span></article><article><Clock /><span><small>每小时</small><strong>¥ {(earnings.perSecond * 3600).toFixed(2)}</strong></span></article></div></section>}
        {tab === "features" && <section className="fortune-cat-feature-grid">{[[Clock,"实时增长","每秒更新今日已赚金额与工作进度。"],[CalendarCheck,"工作日历","自定义上下班、午休、工作日与法定假期。"],[Sparkle,"状态陪伴","开工、午休、加班、下班触发不同动作。"],[Desktop,"透明悬浮","置顶显示、自由拖动、缩放与一键隐藏。"],[Wallet,"多种口径","支持税前、税后、工作时间与自然时间口径。"],[ShieldCheck,"隐私优先","工资与排班默认仅存本机，不上传服务器。"]].map(([Icon,title,text]) => <article key={title}><Icon size={25} weight="duotone" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>}
        {tab === "privacy" && <section className="fortune-cat-info-panel"><ShieldCheck size={30} weight="duotone" /><div><h3>工资数据默认不离开你的电脑</h3><p>平台只同步产品权益和授权设备，不上传工资、排班和实时收入。未来如增加多设备同步，会单独征得用户同意。</p></div></section>}
        {tab === "devices" && <section className="fortune-cat-info-panel device"><Laptop size={28} /><div><h3>授权设备 {license?.devices?.length || 0} / {product?.deviceLimit || 3}</h3>{!owned ? <p>兑换产品后可管理授权设备。</p> : license.devices?.length ? license.devices.map((device) => <div className="fortune-device" key={device.id}><span><b>{device.name}</b><small>{device.platform} · {device.appVersion || "测试版"}</small></span><button aria-label="移除设备" onClick={async () => { await request(`/api/products/fortune-cat/devices/${device.id}`, { method: "DELETE" }); await load(); }}><X /></button></div>) : <p>尚未绑定设备，安装并登录客户端后会自动显示。</p>}</div></section>}
      </main>

      <aside className="fortune-cat-buy"><span className="fortune-cat-buy-label">测试资格兑换</span><strong>{product?.priceCredits?.toLocaleString() || "1,000"}<small> 积分</small></strong><p>一次兑换，永久使用</p>{owned ? <><div className="fortune-owned"><CheckCircle weight="fill" />已永久解锁</div><button onClick={() => download("windows")} disabled={busy || !product?.downloads?.windows}><DownloadSimple />下载 Windows 测试版</button><button className="secondary" onClick={() => download("macos")} disabled={busy || !product?.downloads?.macos}><DownloadSimple />下载 macOS 测试版</button></> : <button onClick={unlock} disabled={busy || (authenticated && !canAfford)}><LockKey />{busy ? "处理中…" : authenticated && !canAfford ? "积分不足" : "1000 积分立即兑换"}</button>}<small>当前仅管理员测试；正式上线前不会向普通用户展示。</small>{notice && <div className="fortune-cat-notice">{notice}</div>}<hr /><h3>测试版包含</h3><ul><li><CheckCircle />实时收入桌面悬浮</li><li><CheckCircle />工资与排班本地保存</li><li><CheckCircle />Windows 与 macOS</li><li><CheckCircle />最多 3 台设备</li></ul></aside>
    </div>
  </div>;
}
