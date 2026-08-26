import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Bell, CheckCircle, Desktop, DownloadSimple, Gauge, Laptop,
  LockKey, Monitor, ShieldCheck, Sparkle, TrendUp, X,
} from "@phosphor-icons/react";
import "./stock-pet.css";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.code || "REQUEST_FAILED"), { code: payload?.error?.code, status: response.status });
  return payload;
}

const errorCopy = {
  INSUFFICIENT_CREDITS: "积分不足，请先充值后再解锁。",
  DOWNLOAD_NOT_CONFIGURED: "安装包正在准备中，完成签名与安全检测后即可下载。",
  OSS_RELEASE_DOWNLOAD_FAILED: "安装包下载服务暂时不可用，请稍后重试。",
  DOWNLOAD_PLATFORM_INVALID: "请选择正确的电脑系统后再下载。",
  PRODUCT_NOT_OWNED: "请先使用积分解锁牛来了。",
  DEVICE_LIMIT_REACHED: "已达到 3 台设备上限，请先移除旧设备。",
};

export function StockPetProduct({ authenticated, account, onBack, onAuth, onCompleted }) {
  const [product, setProduct] = useState(null);
  const [license, setLicense] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("features");

  const load = async () => {
    const info = await request("/api/products/stock-pet");
    setProduct(info);
    if (authenticated) setLicense(await request("/api/products/stock-pet/license"));
  };
  useEffect(() => { load().catch(() => setNotice("产品信息加载失败，请稍后重试。")); }, [authenticated]);
  const balance = Number(account?.credits?.balance || 0);
  const owned = Boolean(license?.entitled);
  const canAfford = balance >= Number(product?.priceCredits || 1000);
  const downloadReady = useMemo(() => product?.downloads?.windows || product?.downloads?.macos, [product]);

  const unlock = async () => {
    if (!authenticated) return onAuth();
    setBusy(true); setNotice("");
    try {
      const next = await request("/api/products/stock-pet/unlock", { method: "POST" });
      setLicense(next); setNotice(next.alreadyOwned ? "你已经拥有牛来了，可在下方管理设备。" : "解锁成功，牛来了已加入你的账户。 ");
      await onCompleted?.();
    } catch (error) { setNotice(errorCopy[error.code] || "解锁失败，请稍后重试。"); }
    finally { setBusy(false); }
  };

  const download = async (platform) => {
    if (!owned) return unlock();
    setBusy(true); setNotice("");
    try {
      const result = await request(`/api/products/stock-pet/download?platform=${platform}`);
      location.assign(result.url);
    } catch (error) { setNotice(errorCopy[error.code] || "下载暂不可用，请稍后重试。"); }
    finally { setBusy(false); }
  };

  return <div className="stock-pet-page">
    <button className="stock-pet-back" onClick={onBack}><ArrowLeft size={17} />返回工具市场</button>
    <header className="stock-pet-titlebar">
      <img src="/stock-pet/niu-lai-le-mascot.png" alt="牛来了桌面宠物" />
      <div><span className="stock-pet-kicker">ONESHOWTOOLS DESKTOP APP</span><h1>牛来了桌面宠物</h1><p>行情一动，牛牛先知道。让一只可爱的小牛陪你看自选。</p>
        <div className="stock-pet-tags"><span>Windows</span><span>macOS</span><span>A 股</span><span>港股</span><span>美股</span><span>实时提醒</span><span>桌面置顶</span></div>
      </div>
      <div className="stock-pet-rating"><ShieldCheck size={20} weight="fill" /><strong>商业预览</strong><small>发布前安全核验中</small></div>
    </header>

    <div className="stock-pet-commerce-grid">
      <main>
        <section className="stock-pet-hero">
          <div className="stock-pet-hero-copy"><small>陪伴式行情工具</small><h2>让一只小牛<br /><em>陪你看行情</em></h2>
            <ul><li><TrendUp />自选涨跌及时反馈</li><li><Sparkle />十一种市场状态动作</li><li><Bell />价格与涨跌幅提醒</li><li><Monitor />透明置顶、不挡操作</li></ul>
            <div className="stock-pet-os"><span><Desktop />Windows</span><span><Laptop />macOS</span></div>
          </div>
          <div className="stock-pet-scene">
            <div className="quote-bubble"><strong>贵州茅台 <i>+2.31%</i></strong><span>今天又是红彤彤的一天</span></div>
            <img src="/stock-pet/niu-lai-le-mascot.png" alt="牛来了开心状态" />
            <div className="quote-panel"><b>我的自选</b><p>贵州茅台 <i>+2.31%</i></p><p>宁德时代 <i>+1.12%</i></p><p>中国平安 <i className="down">-0.73%</i></p></div>
          </div>
        </section>

        <nav className="stock-pet-tabs">
          {[['features','功能介绍'],['tutorial','使用教程'],['updates','更新日志'],['devices','设备管理']].map(([key, label]) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}</button>)}
        </nav>
        {tab === "features" && <section className="stock-pet-feature-grid">
          {[[TrendUp,'实时行情反馈','15 秒起刷新自选行情，不提供交易建议。'],[Sparkle,'十一种状态动作','加载、离线、平盘、上涨、强涨、涨停、下跌、强跌、跌停、提醒与收盘。'],[Gauge,'自定义动作与阈值','每种行情状态可独立选择动作、速度与强弱阈值。'],[Monitor,'透明置顶','自由拖动、缩放、隐藏，并记住桌面位置。'],[ShieldCheck,'服务端安全','行情密钥只保存在服务端，客户端不接触供应商凭证。'],[Bell,'异动提醒','达到价格或涨跌幅阈值后提醒，支持启停、修改与冷却。']].map(([Icon, title, text]) => <article key={title}><Icon size={27} weight="duotone" /><div><h3>{title}</h3><p>{text}</p></div></article>)}
        </section>}
        {tab === "tutorial" && <section className="stock-pet-panel"><h3>三步开始使用</h3><ol><li>使用 OneShowTools 账号解锁产品。</li><li>下载并安装对应系统客户端，登录同一 OneShowTools 账号完成设备授权。</li><li>添加最多 10 只 A 股、港股或美股自选，设置提醒阈值与小牛动作。</li></ol><p>当前行情由 {product?.marketProvider?.name || "平台行情服务"} 提供，仅用于信息展示，不构成投资建议。</p></section>}
        {tab === "updates" && <section className="stock-pet-panel"><h3>{product?.version || "0.1.1"}</h3><p>桌面宠物、账户权益、设备授权、A股/港股/美股行情和安全下载均已接入。当前版本修复了安装包内本地资源无法加载的问题。</p></section>}
        {tab === "devices" && <section className="stock-pet-panel"><h3>授权设备 {license?.devices?.length || 0} / {product?.deviceLimit || 3}</h3>{!owned ? <p>解锁产品后，可在这里查看和移除授权设备。</p> : license.devices.length ? license.devices.map((device) => <div className="stock-device" key={device.id}><Laptop /><span><b>{device.name}</b><small>{device.platform} · {device.appVersion || "未知版本"}</small></span><button aria-label="移除设备" onClick={async () => { await request(`/api/products/stock-pet/devices/${device.id}`, { method: "DELETE" }); await load(); }}><X /></button></div>) : <p>尚未绑定设备。安装桌面端并登录后会自动显示。</p>}</section>}
      </main>

      <aside className="stock-pet-buy-card"><span>下载解锁</span><strong>{product?.priceCredits?.toLocaleString() || "1,000"}<small> 积分</small></strong><p>一次付费，永久使用</p>
        {owned ? <><div className="owned"><CheckCircle weight="fill" />已永久解锁</div><button onClick={() => download('windows')} disabled={busy || !product?.downloads?.windows}><DownloadSimple />下载 Windows</button><button className="secondary" onClick={() => download('macos')} disabled={busy || !product?.downloads?.macos}><DownloadSimple />下载 macOS</button></> : <button onClick={unlock} disabled={busy || (authenticated && !canAfford)}><LockKey />{busy ? "处理中…" : authenticated && !canAfford ? "积分不足" : "立即解锁"}</button>}
        <small>{downloadReady ? "兑换后可在授权设备永久使用" : "安装包签名与安全检测中，解锁权益将永久保留"}</small>
        {notice && <div className="stock-pet-notice">{notice}</div>}
        <hr /><h3>你将获得</h3><ul><li><CheckCircle />终身产品权益</li><li><CheckCircle />最多 3 台设备</li><li><CheckCircle />后续版本免费更新</li><li><CheckCircle />账户统一管理</li></ul>
      </aside>
    </div>
  </div>;
}
