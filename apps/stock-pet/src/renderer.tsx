import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  GearSix,
  MagnifyingGlass,
  Minus,
  Power,
  SignOut,
  Sparkle,
  Star,
  TrendUp,
  X,
} from "@phosphor-icons/react";
import "./renderer.css";

const rendererMode = new URLSearchParams(window.location.search).get("mode") === "control" ? "control" : "pet";

type MarketState =
  | "LOADING"
  | "OFFLINE"
  | "FLAT"
  | "UP"
  | "STRONG_UP"
  | "LIMIT_UP"
  | "DOWN"
  | "STRONG_DOWN"
  | "LIMIT_DOWN"
  | "ALERT"
  | "CLOSED";
type Watch = { id: string; symbol: string; name: string; isPrimary?: boolean };
type Quote = {
  symbol: string;
  code?: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  updatedAt?: string | number;
  trend?: number[];
  state?: MarketState;
  market?: "A" | "HK" | "US";
  currency?: "CNY" | "HKD" | "USD";
  sourceLabel?: string;
};
type Alert = {
  id: string;
  symbol: string;
  type: "price_above" | "price_below" | "change_above" | "change_below";
  targetValue: number;
  cooldownMinutes: number;
  enabled: boolean;
  lastTriggeredAt?: number | null;
};
type MotionPreset = "calm" | "float" | "bounce" | "power" | "rocket" | "sway" | "shiver" | "collapse" | "pulse" | "sleep";
type ActionPreferences = {
  speed: 0.75 | 1 | 1.25;
  sound: boolean;
  animations: boolean;
  refreshSeconds: 15 | 20 | 30 | 60;
  opacity: number;
  locked: boolean;
  thresholds: { up: number; strongUp: number; down: number; strongDown: number };
  stateMotions: Record<MarketState, MotionPreset>;
};
const defaultActions: ActionPreferences = {
  speed: 1,
  sound: false,
  animations: true,
  refreshSeconds: 20,
  opacity: 1,
  locked: false,
  thresholds: { up: 1, strongUp: 3, down: -1, strongDown: -3 },
  stateMotions: {
    LOADING: "calm", OFFLINE: "shiver", FLAT: "float", UP: "bounce",
    STRONG_UP: "power", LIMIT_UP: "rocket", DOWN: "sway",
    STRONG_DOWN: "shiver", LIMIT_DOWN: "collapse", ALERT: "pulse", CLOSED: "sleep",
  },
};
const motionNames: Record<MotionPreset, string> = {
  calm: "轻轻呼吸", float: "悠闲漂浮", bounce: "开心弹跳", power: "蓄力冲刺",
  rocket: "冲上云霄", sway: "左右观察", shiver: "紧张发抖", collapse: "趴下休息",
  pulse: "异动提醒", sleep: "收盘睡觉",
};
function clientMarketState(quote: Quote | null, message: string, preferences: ActionPreferences): MarketState {
  if (!quote) return message ? "OFFLINE" : "LOADING";
  if (["CLOSED", "OFFLINE", "LOADING", "ALERT", "LIMIT_UP", "LIMIT_DOWN"].includes(String(quote.state)))
    return quote.state as MarketState;
  const value = Number(quote.changePercent || 0), threshold = preferences.thresholds;
  if (value >= threshold.strongUp) return "STRONG_UP";
  if (value >= threshold.up) return "UP";
  if (value <= threshold.strongDown) return "STRONG_DOWN";
  if (value <= threshold.down) return "DOWN";
  return "FLAT";
}
const copy: Record<MarketState, string> = {
  LOADING: "正在看盘…",
  OFFLINE: "网络走丢了",
  FLAT: "稳稳观察中",
  UP: "有点开心",
  STRONG_UP: "牛气冲天！",
  LIMIT_UP: "涨停啦！",
  DOWN: "先趴一会",
  STRONG_DOWN: "今天有点冷",
  LIMIT_DOWN: "抱紧自己",
  ALERT: "有异动！",
  CLOSED: "收盘休息",
};
const errors: Record<string, string> = {
  INVALID_CREDENTIALS: "邮箱或密码不正确",
  EMAIL_UNVERIFIED: "请先完成邮箱验证",
  PRODUCT_NOT_OWNED: "请先在 OneShowTools 网页解锁产品",
  STOCK_PROVIDER_NOT_CONFIGURED: "行情服务尚未配置，请联系平台管理员",
  STOCK_PROVIDER_FAILED: "行情源暂时不可用，稍后将自动重试",
  WATCHLIST_LIMIT_REACHED: "最多添加 10 只自选",
  INVALID_STOCK_ALERT: "提醒条件不正确",
  REQUEST_FAILED: "暂时无法连接服务",
};

function playAlertTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    oscillator.onended = () => context.close();
  } catch {}
}

function App() {
  const [session, setSession] = useState<any>(null),
    [watchlist, setWatchlist] = useState<Watch[]>([]),
    [quotes, setQuotes] = useState<Quote[]>([]),
    [alerts, setAlerts] = useState<Alert[]>([]);
  const [selected, setSelected] = useState(0),
    [expanded, setExpanded] = useState(false),
    [panel, setPanel] = useState<"watch" | "alerts" | "actions" | "settings">("watch");
  const [actions, setActions] = useState<ActionPreferences>(defaultActions);
  const [visible, setVisible] = useState(!document.hidden);
  const [updateStatus, setUpdateStatus] = useState("idle");
  const [search, setSearch] = useState(""),
    [results, setResults] = useState<any[]>([]),
    [message, setMessage] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const [alertType, setAlertType] = useState<Alert["type"]>("change_above"),
    [alertValue, setAlertValue] = useState("3");
  const triggered = useRef(new Map<string, number>());

  const loadWatchlist = useCallback(async () => {
    const payload = await window.stockPet.api(
      "/api/products/stock-pet/watchlist",
    );
    setWatchlist(payload.items || []);
    return payload.items || [];
  }, []);
  const loadAlerts = useCallback(async () => {
    const payload = await window.stockPet.api("/api/products/stock-pet/alerts");
    setAlerts(payload.items || []);
  }, []);
  const loadQuotes = useCallback(
    async (items = watchlist) => {
      if (!items.length) {
        setQuotes([]);
        return;
      }
      try {
        const payload = await window.stockPet.api(
          `/api/products/stock-pet/quotes?symbols=${encodeURIComponent(items.map((item: Watch) => item.symbol).join(","))}`,
        );
        setQuotes(payload.quotes || []);
        setMessage(payload.stale ? `行情服务暂不可用，显示 ${new Date(payload.cachedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 的缓存` : "");
      } catch (error: any) {
        setMessage(errors[error?.code] || errors.REQUEST_FAILED);
      }
    },
    [watchlist],
  );

  useEffect(() => {
    window.stockPet
      .session()
      .then(setSession)
      .catch(() => setSession({ authenticated: false }));
    window.stockPet.getActionPreferences().then((value) => {
      setActions(value);
      window.stockPet.setOpacity(value.opacity);
      window.stockPet.setPositionLocked(value.locked);
    }).catch(() => undefined);
  }, []);
  useEffect(() => window.stockPet.onSessionChanged(setSession), []);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => window.stockPet.onQuickAction((action) => {
    if (action === "actions") setPanel("actions");
    else setPanel("watch");
    setExpanded(true);
  }), []);
  useEffect(() => window.stockPet.onUpdateStatus(setUpdateStatus), []);
  useEffect(() => {
    if (session?.authenticated && session?.license?.entitled)
      Promise.all([loadWatchlist().then(loadQuotes), loadAlerts()]).catch(
        (error) => setMessage(errors[error?.code] || errors.REQUEST_FAILED),
      );
  }, [session, loadWatchlist, loadQuotes, loadAlerts]);
  const marketClosed =
    quotes.length > 0 && quotes.every((quote) => quote.state === "CLOSED");
  useEffect(() => {
    if (!session?.authenticated || !session?.license?.entitled || !visible) return;
    const timer = window.setInterval(
      () => loadQuotes(),
      marketClosed ? 300000 : actions.refreshSeconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [session, loadQuotes, marketClosed, visible, actions.refreshSeconds]);
  useEffect(() => {
    if (!search.trim() || !session?.authenticated) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(
      () =>
        window.stockPet
          .api(
            `/api/products/stock-pet/stocks/search?q=${encodeURIComponent(search)}`,
          )
          .then((payload) => setResults(payload.items || []))
          .catch(() => setResults([])),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search, session]);
  useEffect(() => {
    const now = Date.now();
    alerts.forEach((alert) => {
      if (!alert.enabled) return;
      const quote = quotes.find((item) => item.symbol === alert.symbol);
      if (!quote) return;
      const value = alert.type.startsWith("price_")
        ? Number(quote.price)
        : Number(quote.changePercent);
      const hit = alert.type.endsWith("above")
        ? value >= alert.targetValue
        : value <= alert.targetValue;
      const last =
        triggered.current.get(alert.id) || Number(alert.lastTriggeredAt || 0);
      if (hit && now - last >= alert.cooldownMinutes * 60000) {
        triggered.current.set(alert.id, now);
        if (actions.sound) playAlertTone();
        new Notification("牛来了提醒", {
          body: `${quote.name || alert.symbol} 已达到 ${alert.targetValue}${alert.type.startsWith("change_") ? "%" : ""}`,
        });
        window.stockPet
          .api(`/api/products/stock-pet/alerts/${alert.id}/trigger`, {
            method: "POST",
          })
          .then((result) =>
            setAlerts((items) =>
              items.map((item) =>
                item.id === alert.id
                  ? { ...item, lastTriggeredAt: result.lastTriggeredAt }
                  : item,
              ),
            ),
          )
          .catch(() => undefined);
      }
    });
  }, [quotes, alerts, actions.sound]);

  const current = quotes[selected] || null,
    state: MarketState = clientMarketState(current, message, actions);
  const title = current?.name || watchlist[selected]?.name || "添加第一只自选",
    change = Number(current?.changePercent || 0);
  const price = useMemo(
    () =>
      current?.price == null
        ? "--"
        : Number(current.price).toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
          }),
    [current],
  );
  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      setSession(await window.stockPet.login({ email, password }));
    } catch (error: any) {
      setMessage(errors[error?.code] || "登录失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };
  const add = async (item: any) => {
    try {
      const payload = await window.stockPet.api(
        "/api/products/stock-pet/watchlist",
        { method: "POST", body: { symbol: item.symbol, code: item.code, name: item.name, market: item.market || "A" } },
      );
      setWatchlist(payload.items);
      setSearch("");
      setResults([]);
      await loadQuotes(payload.items);
    } catch (error: any) {
      setMessage(errors[error?.code] || "添加失败");
    }
  };
  const remove = async (id: string) => {
    const payload = await window.stockPet.api(
      `/api/products/stock-pet/watchlist/${id}`,
      { method: "DELETE" },
    );
    setWatchlist(payload.items);
    setQuotes((items) => items.filter((_, index) => index !== selected));
    setSelected(0);
  };
  const updateWatchlist = async (body: { orderedIds?: string[]; primaryId?: string }) => {
    const payload = await window.stockPet.api("/api/products/stock-pet/watchlist", { method: "PATCH", body });
    setWatchlist(payload.items || []);
    setSelected(0);
    await loadQuotes(payload.items || []);
  };
  const addAlert = async (event: FormEvent) => {
    event.preventDefault();
    const symbol = watchlist[selected]?.symbol;
    if (!symbol) return setMessage("请先选择一只自选");
    try {
      const payload = await window.stockPet.api(
        "/api/products/stock-pet/alerts",
        {
          method: "POST",
          body: {
            symbol,
            type: alertType,
            targetValue: Number(alertValue),
            cooldownMinutes: 30,
          },
        },
      );
      setAlerts(payload.items || []);
      setMessage("提醒已保存");
    } catch (error: any) {
      setMessage(errors[error?.code] || "提醒保存失败");
    }
  };
  const removeAlert = async (id: string) => {
    const payload = await window.stockPet.api(
      `/api/products/stock-pet/alerts/${id}`,
      { method: "DELETE" },
    );
    setAlerts(payload.items || []);
  };
  const updateAlert = async (id: string, body: Partial<Alert>) => {
    const payload = await window.stockPet.api(
      `/api/products/stock-pet/alerts/${id}`,
      { method: "PATCH", body },
    );
    setAlerts(payload.items || []);
  };

  const petAsset = ["UP", "STRONG_UP", "LIMIT_UP"].includes(state)
    ? "./niu-lai-le-up.png"
    : ["DOWN", "STRONG_DOWN", "LIMIT_DOWN", "OFFLINE"].includes(state)
      ? "./niu-lai-le-down.png"
      : state === "CLOSED" ? "./niu-lai-le-sleep.png" : "./niu-lai-le-mascot.png";

  if (rendererMode === "pet") {
    const openManager = (target = "watch") => window.stockPet.openControl(target);
    if (session === null) return <main className="pet-only loading"><div className="pet-drag-region"><img draggable={false} src="./niu-lai-le-mascot.png" alt="正在唤醒小牛" /></div></main>;
    if (!session.authenticated || !session.license?.entitled) return (
      <main className="pet-only locked-pet" onContextMenu={(event) => { event.preventDefault(); window.stockPet.showContextMenu(); }}>
        <div className="pet-drag-region"><img draggable={false} src="./niu-lai-le-sleep.png" alt="牛来了" /></div>
        <button className="pet-status-chip" onClick={() => openManager("account")}>{session.authenticated ? "待解锁" : "登录后唤醒"}</button>
      </main>
    );
    return (
      <main className={`pet-only ${state.toLowerCase()}`} onContextMenu={(event) => { event.preventDefault(); window.stockPet.showContextMenu(); }}>
        <div className={`pet-drag-region ${actions.animations ? `motion-${actions.stateMotions[state] || defaultActions.stateMotions[state]}` : "motion-off"}`} style={{ "--motion-speed": actions.speed } as React.CSSProperties}>
          <img draggable={false} src={petAsset} alt={`牛来了：${copy[state]}`} />
        </div>
        <button className={`pet-quote-chip ${expanded ? "open" : ""}`} onClick={() => setExpanded((value) => !value)}>
          <span>{copy[state]}</span><b>{title}</b>{current && <strong className={change < 0 ? "negative" : ""}>{price} · {change >= 0 ? "+" : ""}{change.toFixed(2)}%</strong>}
        </button>
        {expanded && <button className="pet-manage-button" onClick={() => openManager("watch")}><GearSix /> 管理</button>}
      </main>
    );
  }

  if (session === null) return <main className="control-app control-loading"><img src="./niu-lai-le-mascot.png" alt="牛来了" /><b>正在连接 OneShowTools…</b></main>;
  if (!session.authenticated) return (
    <main className="control-app control-auth"><section><img src="./niu-lai-le-mascot.png" alt="牛来了" /><form onSubmit={login}><small>ONSHOWTOOLS DESKTOP</small><h1>登录牛来了</h1><p>登录后同步产品权益、自选和提醒。</p><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="邮箱" required /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" required /><button disabled={busy}>{busy ? "登录中…" : "登录"}</button>{message && <em>{message}</em>}</form></section>
    </main>
  );
  if (!session.license?.entitled) return (
    <main className="control-app control-auth"><section><img src="./niu-lai-le-sleep.png" alt="牛来了" /><div className="control-locked"><h1>尚未解锁牛来了</h1><p>前往 OneShowTools 使用 1,000 积分永久解锁。</p><button onClick={() => window.stockPet.openLogin()}>前往产品页</button><button className="secondary" onClick={async () => setSession(await window.stockPet.logout())}>退出账号</button></div></section></main>
  );
  return (
    <main className="control-app">
      <header className="control-header"><div><img src="./niu-lai-le-mascot.png" alt="" /><span><b>牛来了</b><small>行情桌宠管理中心</small></span></div><button onClick={() => window.close()}><X /></button></header>
      <section className="control-summary">
        <div><small>{copy[state]}</small><h1>{title}</h1><strong className={change < 0 ? "negative" : ""}>{price}{current && `  ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</strong></div>
        {current?.trend && current.trend.length > 1 && <QuoteSparkline values={current.trend} negative={change < 0} />}
      </section>
      <nav className="control-tabs">
        {([['watch', <TrendUp />, '自选行情'], ['alerts', <Bell />, '异动提醒'], ['actions', <Sparkle />, '动作配置'], ['settings', <GearSix />, '桌宠设置']] as const).map(([key, icon, label]) => <button key={key} className={panel === key ? "active" : ""} onClick={() => setPanel(key)}>{icon}{label}</button>)}
      </nav>
      <section className="control-content">
        {message && <p className="message">{message}</p>}
        {panel === "watch" && <WatchPanel search={search} setSearch={setSearch} results={results} add={add} watchlist={watchlist} selected={selected} setSelected={setSelected} remove={remove} updateWatchlist={updateWatchlist} />}
        {panel === "alerts" && <AlertPanel alerts={alerts} watchlist={watchlist} selected={selected} alertType={alertType} setAlertType={setAlertType} alertValue={alertValue} setAlertValue={setAlertValue} addAlert={addAlert} removeAlert={removeAlert} updateAlert={updateAlert} />}
        {panel === "actions" && <ActionPanel state={state} preferences={actions} onChange={async (next) => { const saved = await window.stockPet.saveActionPreferences(next); setActions(saved); setMessage("动作偏好已保存"); }} />}
        {panel === "settings" && <SettingsPanel logout={async () => setSession(await window.stockPet.logout())} preferences={actions} onChange={async (next) => setActions(await window.stockPet.saveActionPreferences(next))} updateStatus={updateStatus} setUpdateStatus={setUpdateStatus} />}
      </section>
      <footer className="control-disclaimer">行情数据仅供信息展示，不构成投资建议或交易依据。</footer>
    </main>
  );
}

function QuoteSparkline({ values, negative }: { values: number[]; negative: boolean }) {
  const safe = values.map(Number).filter(Number.isFinite).slice(-30);
  if (safe.length < 2) return null;
  const min = Math.min(...safe), max = Math.max(...safe), range = Math.max(max - min, 0.0001);
  const points = safe.map((value, index) => `${(index / (safe.length - 1)) * 100},${28 - ((value - min) / range) * 24}`).join(" ");
  return <svg className={`quote-sparkline ${negative ? "negative" : ""}`} viewBox="0 0 100 32" preserveAspectRatio="none" aria-label="分时趋势"><polyline points={points} /></svg>;
}

function ActionPanel({ state, preferences, onChange }: {
  state: MarketState;
  preferences: ActionPreferences;
  onChange: (value: ActionPreferences) => void;
}) {
  const updateMotion = (value: MotionPreset) => onChange({
    ...preferences,
    stateMotions: { ...preferences.stateMotions, [state]: value },
  });
  return (
    <div className="action-panel">
      <div className="action-heading">
        <span><b>{copy[state]}</b><small>当前行情状态</small></span>
        <select value={preferences.stateMotions[state]} onChange={(event) => updateMotion(event.target.value as MotionPreset)}>
          {(Object.keys(motionNames) as MotionPreset[]).map((preset) => <option key={preset} value={preset}>{motionNames[preset]}</option>)}
        </select>
      </div>
      <label>
        <span>动作速度</span>
        <select value={preferences.speed} onChange={(event) => onChange({ ...preferences, speed: Number(event.target.value) as ActionPreferences["speed"] })}>
          <option value="0.75">舒缓</option><option value="1">标准</option><option value="1.25">活泼</option>
        </select>
      </label>
      <p>每一种涨跌状态都能单独选择动作，切换行情时会自动播放。</p>
      <div className="threshold-grid">
        {([
          ["up", "普通上涨"], ["strongUp", "明显上涨"],
          ["down", "普通下跌"], ["strongDown", "明显下跌"],
        ] as const).map(([key, label]) => (
          <label key={key}><span>{label}</span><input type="number" step="0.1" value={preferences.thresholds[key]}
            onChange={(event) => onChange({ ...preferences, thresholds: { ...preferences.thresholds, [key]: Number(event.target.value) } })} /></label>
        ))}
      </div>
    </div>
  );
}

function WatchPanel({
  search,
  setSearch,
  results,
  add,
  watchlist,
  selected,
  setSelected,
  remove,
  updateWatchlist,
}: any) {
  const [draggedId, setDraggedId] = useState("");
  const reorder = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const items = [...watchlist];
    const sourceIndex = items.findIndex((item: Watch) => item.id === draggedId);
    const targetIndex = items.findIndex((item: Watch) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, moved);
    setDraggedId("");
    updateWatchlist({ orderedIds: items.map((item: Watch) => item.id) });
  };
  return (
    <>
      <div className="search">
        <MagnifyingGlass />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="代码或名称"
        />
      </div>
      {results.length > 0 && (
        <div className="results">
          {results.map((item: any) => (
            <button key={item.symbol} onClick={() => add(item)}>
              <span>{item.name}</span>
              <small>{item.code}</small>
            </button>
          ))}
        </div>
      )}
      <div className="watchlist">
        {watchlist.map((item: Watch, index: number) => (
          <button
            key={item.id}
            className={selected === index ? "active" : ""}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => reorder(item.id)}
            onClick={() => setSelected(index)}
          >
            <Star
              weight={item.isPrimary ? "fill" : "regular"}
              className={item.isPrimary ? "primary-star" : ""}
              onClick={(event) => {
                event.stopPropagation();
                updateWatchlist({ primaryId: item.id });
              }}
            />
            <span>{item.name}</span>
            <X
              onClick={(event) => {
                event.stopPropagation();
                remove(item.id);
              }}
            />
          </button>
        ))}
      </div>
    </>
  );
}
function AlertPanel({
  alerts,
  watchlist,
  selected,
  alertType,
  setAlertType,
  alertValue,
  setAlertValue,
  addAlert,
  removeAlert,
  updateAlert,
}: any) {
  return (
    <div className="alert-panel">
      <form onSubmit={addAlert}>
        <select
          value={alertType}
          onChange={(event) => setAlertType(event.target.value)}
        >
          <option value="change_above">涨幅达到</option>
          <option value="change_below">跌幅达到</option>
          <option value="price_above">价格高于</option>
          <option value="price_below">价格低于</option>
        </select>
        <input
          type="number"
          step="0.01"
          value={alertValue}
          onChange={(event) => setAlertValue(event.target.value)}
          required
        />
        <button>添加提醒</button>
      </form>
      {alerts.length ? (
        <div className="alert-list">
          {alerts.map((item: Alert) => (
            <div key={item.id} className={item.enabled ? "" : "disabled"}>
              <input
                type="checkbox"
                checked={item.enabled}
                aria-label={item.enabled ? "停用提醒" : "启用提醒"}
                onChange={(event) => updateAlert(item.id, { enabled: event.target.checked })}
              />
              <span>
                {watchlist.find((watch: Watch) => watch.symbol === item.symbol)
                  ?.name || item.symbol}
                <small>
                  {item.type.startsWith("change_") ? "涨跌幅" : "价格"}{" "}
                  {item.type.endsWith("above") ? "≥" : "≤"}{" "}
                  <input
                    className="alert-value"
                    type="number"
                    step="0.01"
                    defaultValue={item.targetValue}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value !== item.targetValue)
                        updateAlert(item.id, { targetValue: value });
                    }}
                  />
                  {item.type.startsWith("change_") ? "%" : ""}
                </small>
              </span>
              <button
                onClick={() => removeAlert(item.id)}
                aria-label="删除提醒"
              >
                <X />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <Bell size={22} />
          <b>{watchlist[selected] ? "还没有提醒" : "请先添加自选"}</b>
          <p>设置价格或涨跌幅阈值，30 分钟内同类提醒不重复。</p>
        </div>
      )}
    </div>
  );
}
function SettingsPanel({ logout, preferences, onChange, updateStatus, setUpdateStatus }: {
  logout: () => void;
  preferences: ActionPreferences;
  onChange: (value: ActionPreferences) => void;
  updateStatus: string;
  setUpdateStatus: (value: string) => void;
}) {
  const [system, setSystem] = useState({ alwaysOnTop: true, launchAtLogin: false });
  useEffect(() => { window.stockPet.getSystemSettings().then(setSystem).catch(() => undefined); }, []);
  return (
    <div className="settings-panel">
      <label>
        <span>始终置顶</span>
        <input
          type="checkbox"
          checked={system.alwaysOnTop}
          onChange={(event) => {
            const enabled = event.target.checked;
            setSystem((value) => ({ ...value, alwaysOnTop: enabled }));
            window.stockPet.setAlwaysOnTop(enabled);
          }}
        />
      </label>
      <label>
        <span>开机启动</span>
        <input
          type="checkbox"
          checked={system.launchAtLogin}
          onChange={(event) => {
            const enabled = event.target.checked;
            setSystem((value) => ({ ...value, launchAtLogin: enabled }));
            window.stockPet.setLaunchAtLogin(enabled);
          }}
        />
      </label>
      <label>
        <span>窗口大小</span>
        <select
          defaultValue="medium"
          onChange={(event) =>
            window.stockPet.setWindowSize(
              event.target.value as "small" | "medium" | "large",
            )
          }
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </label>
      <label><span>锁定位置</span><input type="checkbox" checked={preferences.locked} onChange={(event) => {
        window.stockPet.setPositionLocked(event.target.checked);
        onChange({ ...preferences, locked: event.target.checked });
      }} /></label>
      <label><span>桌宠动画</span><input type="checkbox" checked={preferences.animations} onChange={(event) => onChange({ ...preferences, animations: event.target.checked })} /></label>
      <label><span>提醒声音</span><input type="checkbox" checked={preferences.sound} onChange={(event) => onChange({ ...preferences, sound: event.target.checked })} /></label>
      <label><span>透明度</span><input type="range" min="0.55" max="1" step="0.05" value={preferences.opacity} onChange={(event) => {
        const opacity = Number(event.target.value);
        window.stockPet.setOpacity(opacity);
        onChange({ ...preferences, opacity });
      }} /></label>
      <label><span>交易时刷新</span><select value={preferences.refreshSeconds} onChange={(event) => onChange({ ...preferences, refreshSeconds: Number(event.target.value) as ActionPreferences["refreshSeconds"] })}>
        <option value="15">15 秒</option><option value="20">20 秒</option><option value="30">30 秒</option><option value="60">60 秒</option>
      </select></label>
      <button onClick={async () => {
        if (updateStatus === "ready") return window.stockPet.installUpdate();
        const result = await window.stockPet.checkUpdates();
        setUpdateStatus(result.status);
      }}>{({ idle: "检查更新", checking: "正在检查…", downloading: "正在下载更新…", current: "已是最新版本", ready: "重启并安装更新", unavailable: "正式版发布后可更新", error: "更新检查失败，点击重试" } as Record<string,string>)[updateStatus] || "检查更新"}</button>
      <button onClick={logout}>
        <SignOut />
        退出登录
      </button>
      <small>行情仅供信息展示，不构成投资建议。</small>
    </div>
  );
}
function WindowHeader() {
  return (
    <header>
      <span>牛来了</span>
      <button onClick={() => window.stockPet.hide()} aria-label="隐藏">
        <Minus />
      </button>
      <button onClick={() => window.stockPet.quit()} aria-label="退出">
        <Power />
      </button>
    </header>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
