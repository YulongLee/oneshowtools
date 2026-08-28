import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { ensureDevStockPet } from "./devStockPet";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  GearSix,
  MagnifyingGlass,
  Minus,
  Power,
  Play,
  Plus,
  SignOut,
  Sparkle,
  Star,
  Stop,
  TrendUp,
  Trash,
  X,
} from "@phosphor-icons/react";
import "./renderer.css";

ensureDevStockPet();

const rendererMode = new URLSearchParams(window.location.search).get("mode") === "control" ? "control" : "pet";
const initialControlPanel = (() => {
  const value = new URLSearchParams(window.location.search).get("panel");
  return value === "chart" || value === "alerts" || value === "actions" || value === "settings" ? value : "watch";
})();

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
type Watch = { id: string; symbol: string; code?: string; name: string; market?: "A" | "HK" | "US"; isPrimary?: boolean };
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
type HistoryRange = "1d" | "1m" | "3m" | "1y";
type HistoryPoint = { time: string; open: number; close: number; high: number; low: number; volume?: number };
type MotionPreset = "calm" | "float" | "bounce" | "power" | "rocket" | "sway" | "shiver" | "collapse" | "pulse" | "sleep";
type ActionRuleTrigger = "daily_change" | "recent_change" | "price" | "market_state" | "time_range";
type ActionRuleOperator = "gte" | "lte" | "between" | "equals";
type ActionRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: ActionRuleTrigger;
  operator: ActionRuleOperator;
  value: number;
  endValue: number;
  marketState: MarketState;
  startTime: string;
  endTime: string;
  motion: MotionPreset;
};
type ActionPreferences = {
  speed: 0.75 | 1 | 1.25;
  sound: boolean;
  volume: number;
  animations: boolean;
  refreshSeconds: 15 | 20 | 30 | 60;
  opacity: number;
  locked: boolean;
  thresholds: { up: number; strongUp: number; down: number; strongDown: number };
  stateMotions: Record<MarketState, MotionPreset>;
  stockRuleGroups: Record<string, ActionRule[]>;
};
const defaultActions: ActionPreferences = {
  speed: 1,
  sound: false,
  volume: 0.85,
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
  stockRuleGroups: {},
};
const ruleAssetKey = (symbol: string, ruleId: string) => `${symbol.trim().toUpperCase()}::${ruleId}`;
function recentMomentum(items: HistoryPoint[], minutes = 5) {
  const points = items.filter((item) => Number.isFinite(Number(item.close)));
  if (points.length < 2) return null;
  const latest = points.at(-1)!;
  const latestTime = String(latest.time || "");
  const latestMatch = latestTime.match(/(\d{2}):(\d{2})$|^(\d{2})(\d{2})$/);
  const latestMinute = latestMatch
    ? Number(latestMatch[1] || latestMatch[3]) * 60 + Number(latestMatch[2] || latestMatch[4])
    : null;
  let baseline = points[Math.max(0, points.length - (minutes + 1))];
  if (latestMinute !== null) {
    for (let index = points.length - 2; index >= 0; index -= 1) {
      const match = String(points[index].time || "").match(/(\d{2}):(\d{2})$|^(\d{2})(\d{2})$/);
      if (!match) continue;
      const pointMinute = Number(match[1] || match[3]) * 60 + Number(match[2] || match[4]);
      if (latestMinute - pointMinute >= minutes) {
        baseline = points[index];
        break;
      }
    }
  }
  const start = Number(baseline.close), end = Number(latest.close);
  if (!start || !Number.isFinite(start) || !Number.isFinite(end)) return null;
  return ((end - start) / start) * 100;
}

function clientMarketState(quote: Quote | null, message: string, preferences: ActionPreferences): MarketState {
  if (!quote) return message ? "OFFLINE" : "LOADING";
  if (["CLOSED", "OFFLINE", "LOADING", "ALERT", "LIMIT_UP", "LIMIT_DOWN"].includes(String(quote.state)))
    return quote.state as MarketState;
  const threshold = preferences.thresholds;
  // The default pet state is deliberately stable and follows the current
  // trading day's percentage change. Short-term momentum remains available as
  // an explicit per-stock custom rule instead of silently overriding defaults.
  const value = Number(quote.changePercent || 0);
  if (value >= threshold.strongUp) return "STRONG_UP";
  if (value >= threshold.up) return "UP";
  if (value <= threshold.strongDown) return "STRONG_DOWN";
  if (value <= threshold.down) return "DOWN";
  return "FLAT";
}

function actionRuleMatches(rule: ActionRule, quote: Quote | null, state: MarketState, recentChange: number | null, now = new Date()) {
  if (!rule.enabled) return false;
  if (rule.trigger === "market_state") return state === rule.marketState;
  if (rule.trigger === "time_range") {
    const current = now.getHours() * 60 + now.getMinutes();
    const parse = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
    const start = parse(rule.startTime), end = parse(rule.endTime);
    return start <= end ? current >= start && current <= end : current >= start || current <= end;
  }
  const candidate = rule.trigger === "recent_change" ? recentChange : rule.trigger === "price" ? quote?.price : quote?.changePercent;
  if (candidate == null || !Number.isFinite(Number(candidate))) return false;
  const value = Number(candidate), start = Math.min(rule.value, rule.endValue), end = Math.max(rule.value, rule.endValue);
  if (rule.operator === "lte") return value <= rule.value;
  if (rule.operator === "between") return value >= start && value <= end;
  if (rule.operator === "equals") return Math.abs(value - rule.value) < 0.0001;
  return value >= rule.value;
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
const stateNames: Record<MarketState, string> = {
  LOADING: "加载行情", OFFLINE: "网络异常", FLAT: "平稳行情", UP: "普通上涨",
  STRONG_UP: "明显上涨", LIMIT_UP: "涨停", DOWN: "普通下跌",
  STRONG_DOWN: "明显下跌", LIMIT_DOWN: "跌停", ALERT: "异动提醒", CLOSED: "收盘休息",
};
const defaultPetAssets: Record<MarketState, string> = {
  LOADING: "./default-actions/confused.gif",
  OFFLINE: "./default-actions/confused.gif",
  FLAT: "./default-actions/flat.gif",
  UP: "./default-actions/up.gif",
  STRONG_UP: "./default-actions/strong-up.gif",
  LIMIT_UP: "./default-actions/limit-up.gif",
  DOWN: "./default-actions/slight-loss.gif",
  STRONG_DOWN: "./default-actions/down.gif",
  LIMIT_DOWN: "./default-actions/down.gif",
  ALERT: "./default-actions/alert.gif",
  CLOSED: "./default-actions/closed.gif",
};
const errors: Record<string, string> = {
  INVALID_CREDENTIALS: "邮箱或密码不正确",
  EMAIL_UNVERIFIED: "请先完成邮箱验证",
  PRODUCT_NOT_OWNED: "请先在 OneShowTools 网页解锁产品",
  STOCK_PROVIDER_NOT_CONFIGURED: "行情服务尚未配置，请联系平台管理员",
  STOCK_PROVIDER_FAILED: "行情源暂时不可用，稍后将自动重试",
  STOCK_HISTORY_NOT_SUPPORTED: "当前行情源尚未提供历史走势，请联系平台管理员配置历史行情接口",
  INVALID_STOCK_HISTORY_RANGE: "不支持所选的行情周期",
  STOCK_NOT_IN_WATCHLIST: "请先把这只股票加入自选，再查看历史走势",
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
    [panel, setPanel] = useState<"watch" | "chart" | "alerts" | "actions" | "settings">(initialControlPanel);
  const [actions, setActions] = useState<ActionPreferences>(defaultActions);
  const [customRuleAssets, setCustomRuleAssets] = useState<Record<string, string>>({});
  const [customRuleAudioAssets, setCustomRuleAudioAssets] = useState<Record<string, string>>({});
  const [historyRange, setHistoryRange] = useState<HistoryRange>("1m");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [intradayHistory, setIntradayHistory] = useState<HistoryPoint[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
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
  const playedRule = useRef("");
  const playingRuleAudio = useRef<HTMLAudioElement | null>(null);

  const loadWatchlist = useCallback(async () => {
    const payload = await window.stockPet.api(
      "/api/products/stock-pet/watchlist",
    );
    const items: Watch[] = payload.items || [];
    setWatchlist(items);
    setSelected((previous) => {
      const primary = items.findIndex((item) => item.isPrimary);
      return rendererMode === "pet" && primary >= 0 ? primary : Math.min(previous, Math.max(0, items.length - 1));
    });
    return items;
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
    window.stockPet.getCustomRuleAssets().then(setCustomRuleAssets).catch(() => undefined);
    window.stockPet.getCustomRuleAudioAssets().then(setCustomRuleAudioAssets).catch(() => undefined);
  }, []);
  useEffect(() => window.stockPet.onCustomRuleAssetsChanged(setCustomRuleAssets), []);
  useEffect(() => window.stockPet.onCustomRuleAudioAssetsChanged(setCustomRuleAudioAssets), []);
  useEffect(() => window.stockPet.onActionPreferencesChanged((value) => {
    const next = value as ActionPreferences;
    setActions(next);
    if (rendererMode === "pet") {
      window.stockPet.setOpacity(next.opacity);
      window.stockPet.setPositionLocked(next.locked);
    }
  }), []);
  useEffect(() => window.stockPet.onSessionChanged(setSession), []);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => window.stockPet.onQuickAction((action) => {
    if (action === "actions") setPanel("actions");
    else if (action === "chart") setPanel("chart");
    else setPanel("watch");
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

  const currentWatch = watchlist[selected] || watchlist.find((item) => item.isPrimary) || watchlist[0] || null;
  const currentSymbol = currentWatch?.symbol || "";
  useEffect(() => {
    const legacyRules = actions.stockRuleGroups?.__LEGACY__;
    if (!currentSymbol || !legacyRules?.length || actions.stockRuleGroups[currentSymbol]?.length) return;
    const nextGroups = { ...actions.stockRuleGroups, [currentSymbol]: legacyRules };
    delete nextGroups.__LEGACY__;
    window.stockPet.saveActionPreferences({ ...actions, stockRuleGroups: nextGroups })
      .then((saved) => {
        setActions(saved);
        return window.stockPet.getCustomRuleAssets();
      })
      .then(setCustomRuleAssets)
      .catch(() => undefined);
  }, [actions, currentSymbol]);
  useEffect(() => {
    if (!session?.authenticated || !session?.license?.entitled || !currentSymbol || !visible) return;
    let active = true;
    const loadIntraday = () => window.stockPet
      .api(`/api/products/stock-pet/history?symbol=${encodeURIComponent(currentSymbol)}&range=1d`)
      .then((payload) => { if (active) setIntradayHistory(payload.items || []); })
      .catch(() => { if (active) setIntradayHistory([]); });
    loadIntraday();
    const timer = window.setInterval(loadIntraday, marketClosed ? 300000 : 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [session, currentSymbol, visible, marketClosed]);
  useEffect(() => {
    if (rendererMode !== "control" || panel !== "chart" || !currentSymbol) return;
    let active = true;
    setHistoryBusy(true); setHistoryMessage("");
    window.stockPet.api(`/api/products/stock-pet/history?symbol=${encodeURIComponent(currentSymbol)}&range=${historyRange}`)
      .then((payload) => { if (active) setHistory(payload.items || []); })
      .catch((error: any) => { if (active) { setHistory([]); setHistoryMessage(errors[error?.code] || "历史行情暂时不可用"); } })
      .finally(() => { if (active) setHistoryBusy(false); });
    return () => { active = false; };
  }, [panel, currentSymbol, historyRange]);

  const current = quotes.find((quote) => quote.symbol === currentSymbol) || null,
    recentChange = useMemo(() => recentMomentum(intradayHistory, 5), [intradayHistory]),
    state: MarketState = clientMarketState(current, message, actions);
  const stockRules = actions.stockRuleGroups?.[currentSymbol] || [];
  const matchedRule = useMemo(() => stockRules.find((rule) => actionRuleMatches(rule, current, state, recentChange)) || null, [stockRules, current, state, recentChange]);
  const activeRule = matchedRule;
  const activeRuleKey = activeRule ? ruleAssetKey(currentSymbol, activeRule.id) : "";
  const activeRuleAudio = activeRuleKey ? customRuleAudioAssets[activeRuleKey] : "";
  const title = current?.name || currentWatch?.name || "添加第一只自选",
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
  const priceChange = Number(current?.change);
  const changeAmount = current && Number.isFinite(priceChange)
    ? priceChange
    : current?.price != null && Number.isFinite(change) && change > -100
      ? Number(current.price) - (Number(current.price) / (1 + change / 100))
      : null;
  const formattedChangeAmount = changeAmount == null
    ? "--"
    : `${changeAmount >= 0 ? "+" : ""}${changeAmount.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      })}`;
  const quoteUpdatedAt = current?.updatedAt
    ? new Date(current.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "等待首次更新";
  useEffect(() => {
    if (rendererMode !== "pet") return;
    if (!activeRuleKey) {
      playedRule.current = "";
      playingRuleAudio.current?.pause();
      playingRuleAudio.current = null;
      return;
    }
    if (!actions.sound || !activeRuleAudio) {
      playedRule.current = "";
      playingRuleAudio.current?.pause();
      playingRuleAudio.current = null;
      return;
    }
    const playbackKey = `${activeRuleKey}::${activeRuleAudio}`;
    if (playedRule.current === playbackKey) return;
    playedRule.current = playbackKey;
    playingRuleAudio.current?.pause();
    playingRuleAudio.current = null;
    const audio = new Audio(activeRuleAudio);
    audio.volume = actions.volume;
    playingRuleAudio.current = audio;
    audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      if (playingRuleAudio.current === audio) playingRuleAudio.current = null;
    };
  }, [activeRuleKey, activeRuleAudio, actions.sound]);
  useEffect(() => {
    if (playingRuleAudio.current) playingRuleAudio.current.volume = actions.volume;
  }, [actions.volume]);
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
    const items: Watch[] = payload.items || [];
    setWatchlist(items);
    const primary = items.findIndex((item) => item.isPrimary);
    setSelected(primary >= 0 ? primary : 0);
    await loadQuotes(items);
  };
  const updateWatchlist = async (body: { orderedIds?: string[]; primaryId?: string }) => {
    const selectedId = watchlist[selected]?.id;
    const payload = await window.stockPet.api("/api/products/stock-pet/watchlist", { method: "PATCH", body });
    const items: Watch[] = payload.items || [];
    setWatchlist(items);
    const preferredId = body.primaryId || selectedId;
    const preferred = items.findIndex((item) => item.id === preferredId);
    const primary = items.findIndex((item) => item.isPrimary);
    setSelected(preferred >= 0 ? preferred : primary >= 0 ? primary : 0);
    await loadQuotes(items);
  };
  const addAlert = async (event: FormEvent) => {
    event.preventDefault();
    const symbol = currentWatch?.symbol;
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

  const defaultPetAsset = defaultPetAssets[state];
  const activeCustomGif = activeRule ? customRuleAssets[ruleAssetKey(currentSymbol, activeRule.id)] : "";
  const petAsset = activeCustomGif || defaultPetAsset;
  // GIF assets already contain the complete animation. Applying a CSS motion
  // preset on top makes the result shake, jump or drift twice.
  const petMotion = actions.stateMotions[state] || defaultActions.stateMotions[state];

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
        <div className={`pet-drag-region ${actions.animations && !petAsset.toLowerCase().endsWith(".gif") ? `motion-${petMotion}` : "motion-off"}`} style={{ "--motion-speed": actions.speed } as React.CSSProperties}>
          <img key={`${state}:${activeRule?.id || "default"}:${petAsset}`} draggable={false} src={petAsset} alt={`牛来了：${copy[state]}`} />
        </div>
        <button className="pet-quote-chip" title="点击查看行情走势" onClick={() => openManager("chart")}>
          <b>{title}</b>
          <span>{activeRule ? activeRule.name : copy[state]}</span>
          {current ? (
            <strong className={change < 0 ? "negative" : ""}>
              <em>{price}</em>
              <i>今日 {formattedChangeAmount}（{change >= 0 ? "+" : ""}{change.toFixed(2)}%）</i>
            </strong>
          ) : (
            <strong className="quote-loading"><em>--</em><i>行情加载中</i></strong>
          )}
        </button>
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
        <div><small>{copy[state]}</small><h1>{title}</h1><strong className={change < 0 ? "negative" : ""}>{price}{current && `  ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</strong><p className="quote-meta">更新于 {quoteUpdatedAt}</p></div>
        <div className={`summary-action-status ${activeRule ? "configured" : "default"}`}><Sparkle/><span><b>{activeRule ? activeRule.name : "默认按今日涨跌幅"}</b><small>{stockRules.length ? activeRule ? customRuleAssets[activeRuleKey] ? "已按该股票的自定义规则触发" : "自定义规则已触发，使用默认小牛形象" : `今日状态生效；另有 ${stockRules.length} 条自定义规则待匹配` : "按今日涨跌幅自动切换动作，可为每只股票单独配置"}</small></span></div>
      </section>
      <nav className="control-tabs">
        {([['watch', <Star />, '自选行情'], ['chart', <TrendUp />, '行情走势'], ['alerts', <Bell />, '异动提醒'], ['actions', <Sparkle />, '场景动作'], ['settings', <GearSix />, '桌宠设置']] as const).map(([key, icon, label]) => <button key={key} className={panel === key ? "active" : ""} onClick={() => setPanel(key)}>{icon}{label}</button>)}
      </nav>
      <section className="control-content">
        {message && <p className="message">{message}</p>}
        {panel === "watch" && <WatchPanel search={search} setSearch={setSearch} results={results} add={add} watchlist={watchlist} quotes={quotes} selected={selected} setSelected={setSelected} remove={remove} updateWatchlist={updateWatchlist} />}
        {panel === "chart" && <MarketChartPanel quote={current} range={historyRange} setRange={setHistoryRange} items={history} busy={historyBusy} message={historyMessage} />}
        {panel === "alerts" && <AlertPanel alerts={alerts} watchlist={watchlist} selected={selected} alertType={alertType} setAlertType={setAlertType} alertValue={alertValue} setAlertValue={setAlertValue} addAlert={addAlert} removeAlert={removeAlert} updateAlert={updateAlert} />}
        {panel === "actions" && <ActionPanel state={state} activeRule={activeRule} preferences={actions} watchlist={watchlist} currentSymbol={currentSymbol} customRuleAssets={customRuleAssets} setCustomRuleAssets={setCustomRuleAssets} customRuleAudioAssets={customRuleAudioAssets} setCustomRuleAudioAssets={setCustomRuleAudioAssets} onChange={async (next) => { const saved = await window.stockPet.saveActionPreferences(next); setActions(saved); setMessage("动作配置已保存"); }} />}
        {panel === "settings" && <SettingsPanel logout={async () => setSession(await window.stockPet.logout())} preferences={actions} onChange={async (next) => setActions(await window.stockPet.saveActionPreferences(next))} updateStatus={updateStatus} setUpdateStatus={setUpdateStatus} />}
      </section>
      <footer className="control-disclaimer">行情数据仅供信息展示，不构成投资建议或交易依据。</footer>
    </main>
  );
}

function formatChartPrice(value: number) {
  const digits = Math.abs(value) < 1 ? 4 : 2;
  return value.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatChartTime(value: string, compact = false) {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  const dateTime = raw.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})[ T]?(\d{2})?:?(\d{2})?/);
  if (dateTime) {
    const [, year, month, day, hour, minute] = dateTime;
    if (hour && minute) return compact ? `${hour}:${minute}` : `${month}-${day} ${hour}:${minute}`;
    return `${year}-${month}-${day}`;
  }
  const clock = raw.match(/^(\d{2}):?(\d{2})$/);
  return clock ? `${clock[1]}:${clock[2]}` : raw;
}

function formatChartVolume(value?: number) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "--";
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(2)}亿`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(1)}万`;
  return amount.toLocaleString("zh-CN");
}

function MarketChartPanel({ quote, range, setRange, items, busy, message }: {
  quote: Quote | null; range: HistoryRange; setRange: (value: HistoryRange) => void;
  items: HistoryPoint[]; busy: boolean; message: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartItems = items.filter((item) => Number.isFinite(Number(item.close)));
  const prices = chartItems.map((item) => Number(item.close));
  const rawMin = prices.length ? Math.min(...prices) : 0;
  const rawMax = prices.length ? Math.max(...prices) : 0;
  const rawSpread = Math.max(rawMax - rawMin, Math.abs(rawMax || 1) * .002);
  const padding = rawSpread * .12;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const spread = Math.max(max - min, .0001);
  const width = 720, height = 270, left = 66, right = 650, top = 18, bottom = 218;
  const xFor = (index: number) => left + (index / Math.max(chartItems.length - 1, 1)) * (right - left);
  const yFor = (value: number) => bottom - ((value - min) / spread) * (bottom - top);
  const points = chartItems.map((item, index) => `${xFor(index)},${yFor(Number(item.close))}`).join(" ");
  const area = points ? `${left},${bottom} ${points} ${right},${bottom}` : "";
  const latest = chartItems.at(-1);
  const first = chartItems[0];
  const positive = Number(latest?.close || 0) >= Number(first?.close || 0);
  const intervalChange = first?.close ? ((Number(latest?.close || 0) - Number(first.close)) / Number(first.close)) * 100 : 0;
  const yTicks = Array.from({ length: 5 }, (_, index) => max - (spread * index) / 4);
  const xTickIndexes = Array.from(new Set([0, .25, .5, .75, 1].map((ratio) => Math.round((chartItems.length - 1) * ratio))));
  const hovered = hoverIndex === null ? null : chartItems[hoverIndex];
  const hoveredX = hoverIndex === null ? 0 : xFor(hoverIndex);
  const hoveredY = hovered ? yFor(Number(hovered.close)) : 0;
  const tooltipX = Math.min(Math.max(hoveredX + 12, left + 4), right - 142);
  const tooltipY = Math.min(Math.max(hoveredY - 88, top + 4), bottom - 86);
  const latestY = latest ? yFor(Number(latest.close)) : 0;
  const onChartMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.min(1, Math.max(0, (svgX - left) / (right - left)));
    setHoverIndex(Math.round(ratio * Math.max(chartItems.length - 1, 0)));
  };
  return <div className="market-chart-panel">
    <header><div><h2>{quote?.name || quote?.symbol || "行情走势"}</h2><p>{quote?.symbol || "选择自选行情查看走势"}</p></div><div className="range-tabs">{([['1d','日内'],['1m','1月'],['3m','3月'],['1y','1年']] as const).map(([value,label]) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{label}</button>)}</div></header>
    {busy ? <div className="chart-state">正在加载历史行情…</div> : message ? <div className="chart-state error">{message}</div> : chartItems.length < 2 ? <div className="chart-state">该市场暂时没有可展示的历史数据</div> : <>
      <div className={`price-overview ${positive ? "positive" : "negative"}`}>
        <strong>{formatChartPrice(Number(latest?.close || 0))}</strong>
        <b>{intervalChange >= 0 ? "+" : ""}{intervalChange.toFixed(2)}%</b>
        <span>最高 {formatChartPrice(rawMax)}</span><span>最低 {formatChartPrice(rawMin)}</span>
      </div>
      <svg className={`history-chart ${positive ? "positive" : "negative"}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${range} 价格走势`} onMouseMove={onChartMove} onMouseLeave={() => setHoverIndex(null)}>
        <defs><linearGradient id="stockPetChartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopOpacity=".28"/><stop offset="1" stopOpacity=".015"/></linearGradient></defs>
        <line x1={left} y1={top} x2={left} y2={bottom} className="chart-axis-line" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} className="chart-axis-line" />
        {yTicks.map((value) => {
          const y = yFor(value);
          return <g key={value}><line x1={left} y1={y} x2={right} y2={y} className="chart-grid"/><text x={left - 10} y={y + 4} textAnchor="end" className="chart-y-label">{formatChartPrice(value)}</text></g>;
        })}
        {xTickIndexes.map((index) => {
          const x = xFor(index);
          return <g key={index}><line x1={x} y1={top} x2={x} y2={bottom} className="chart-grid vertical"/><text x={x} y={bottom + 24} textAnchor={index === 0 ? "start" : index === chartItems.length - 1 ? "end" : "middle"} className="chart-x-label">{formatChartTime(chartItems[index]?.time || "", range === "1d")}</text></g>;
        })}
        <polygon points={area} className="chart-area"/><polyline points={points} className="chart-line" />
        <line x1={left} y1={latestY} x2={right} y2={latestY} className="chart-latest-guide"/>
        <circle cx={right} cy={latestY} r="3.6" className="chart-latest-dot"/>
        <rect x={right + 5} y={latestY - 11} width="62" height="22" rx="6" className="chart-latest-tag"/>
        <text x={right + 36} y={latestY + 4} textAnchor="middle" className="chart-latest-text">{formatChartPrice(Number(latest?.close || 0))}</text>
        {hovered && <g className="chart-hover">
          <line x1={hoveredX} y1={top} x2={hoveredX} y2={bottom} className="chart-hover-line"/>
          <line x1={left} y1={hoveredY} x2={right} y2={hoveredY} className="chart-hover-line horizontal"/>
          <circle cx={hoveredX} cy={hoveredY} r="5" className="chart-hover-dot"/>
          <rect x={tooltipX} y={tooltipY} width="138" height="78" rx="8" className="chart-tooltip"/>
          <text x={tooltipX + 10} y={tooltipY + 17} className="chart-tooltip-title">{formatChartTime(hovered.time)}</text>
          <text x={tooltipX + 10} y={tooltipY + 35} className="chart-tooltip-label">开 {formatChartPrice(Number(hovered.open))}　高 {formatChartPrice(Number(hovered.high))}</text>
          <text x={tooltipX + 10} y={tooltipY + 52} className="chart-tooltip-label">低 {formatChartPrice(Number(hovered.low))}　收 {formatChartPrice(Number(hovered.close))}</text>
          <text x={tooltipX + 10} y={tooltipY + 69} className="chart-tooltip-label">成交量 {formatChartVolume(hovered.volume)}</text>
        </g>}
        <rect x={left} y={top} width={right - left} height={bottom - top} className="chart-hit-area"/>
      </svg>
    </>}
    <small className="chart-note">价格与成交数据可能存在延迟，仅供信息展示，不构成投资建议。</small>
  </div>;
}

function ActionPanel({ state, activeRule, preferences, watchlist, currentSymbol, customRuleAssets, setCustomRuleAssets, customRuleAudioAssets, setCustomRuleAudioAssets, onChange }: {
  state: MarketState;
  activeRule: ActionRule | null;
  preferences: ActionPreferences;
  watchlist: Watch[];
  currentSymbol: string;
  customRuleAssets: Record<string, string>;
  setCustomRuleAssets: (value: Record<string, string>) => void;
  customRuleAudioAssets: Record<string, string>;
  setCustomRuleAudioAssets: (value: Record<string, string>) => void;
  onChange: (value: ActionPreferences) => void;
}) {
  const [assetMessage, setAssetMessage] = useState("");
  const [editingSymbol, setEditingSymbol] = useState(currentSymbol);
  const [previewingRuleId, setPreviewingRuleId] = useState("");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { if (currentSymbol) setEditingSymbol(currentSymbol); }, [currentSymbol]);
  useEffect(() => () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
  }, []);
  const symbol = editingSymbol || currentSymbol;
  const rules = preferences.stockRuleGroups?.[symbol] || [];
  const stockName = watchlist.find((item) => item.symbol === symbol)?.name || symbol || "未选择股票";
  const assetFor = (rule: ActionRule) => customRuleAssets[ruleAssetKey(symbol, rule.id)];
  const audioFor = (rule: ActionRule) => customRuleAudioAssets[ruleAssetKey(symbol, rule.id)];
  const saveRules = (nextRules: ActionRule[]) => onChange({
    ...preferences,
    stockRuleGroups: { ...preferences.stockRuleGroups, [symbol]: nextRules },
  });
  const chooseRuleGif = async (rule: ActionRule) => {
    try {
      setCustomRuleAssets(await window.stockPet.chooseCustomRuleGif(symbol, rule.id));
      setAssetMessage(`${rule.name}的动图已保存`);
    } catch (error: any) {
      const code = String(error?.message || error || "");
      setAssetMessage(code.includes("GIF_FILE_TOO_LARGE") ? "GIF 不能超过 25MB" : code.includes("INVALID_GIF_FILE") ? "请选择有效的 GIF 动图" : "动图保存失败，请重试");
    }
  };
  const chooseRuleAudio = async (rule: ActionRule) => {
    try {
      setCustomRuleAudioAssets(await window.stockPet.chooseCustomRuleAudio(symbol, rule.id));
      if (!preferences.sound) await onChange({ ...preferences, sound: true });
      setAssetMessage(`${rule.name}的声音已保存，命中规则时会按当前音量播放`);
    } catch (error: any) {
      const code = String(error?.message || error || "");
      setAssetMessage(code.includes("AUDIO_FILE_TOO_LARGE") ? "声音文件不能超过 15MB" : code.includes("INVALID_AUDIO_FILE") ? "请选择 MP3、WAV、M4A、AAC 或 OGG 文件" : "声音保存失败，请重试");
    }
  };
  const previewRuleAudio = (rule: ActionRule) => {
    const source = audioFor(rule);
    if (!source) return;
    if (previewingRuleId === rule.id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
      setPreviewingRuleId("");
      setAssetMessage(`${rule.name}的声音已停止`);
      return;
    }
    previewAudioRef.current?.pause();
    const audio = new Audio(source);
    audio.volume = preferences.volume;
    audio.onended = () => {
      previewAudioRef.current = null;
      setPreviewingRuleId("");
    };
    audio.onerror = () => {
      previewAudioRef.current = null;
      setPreviewingRuleId("");
      setAssetMessage("声音预览失败，请确认文件格式后重新上传");
    };
    previewAudioRef.current = audio;
    setPreviewingRuleId(rule.id);
    audio.play().then(() => setAssetMessage(`正在试听 ${rule.name} 的触发声音`)).catch(() => {
      previewAudioRef.current = null;
      setPreviewingRuleId("");
      setAssetMessage("声音预览失败，请确认文件格式后重新上传");
    });
  };
  const clearRuleAudio = async (rule: ActionRule) => {
    if (previewingRuleId === rule.id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingRuleId("");
    }
    setCustomRuleAudioAssets(await window.stockPet.clearCustomRuleAudio(symbol, rule.id));
    setAssetMessage(`${rule.name}的声音已移除`);
  };
  const updateRule = (id: string, changes: Partial<ActionRule>) => saveRules(rules.map((rule) => rule.id === id ? { ...rule, ...changes } : rule));
  const addRule = () => {
    if (!symbol) return setAssetMessage("请先在自选行情中添加并选择一只股票");
    if (rules.length >= 30) return setAssetMessage("每只股票最多配置 30 个动作");
    saveRules([...rules, {
      id: crypto.randomUUID(), name: `动作 ${rules.length + 1}`, enabled: true,
      trigger: "daily_change", operator: "gte", value: 1, endValue: 3, marketState: "UP",
      startTime: "09:30", endTime: "15:00", motion: "bounce",
    }]);
  };
  const removeRule = async (rule: ActionRule) => {
    if (assetFor(rule)) setCustomRuleAssets(await window.stockPet.clearCustomRuleGif(symbol, rule.id));
    if (audioFor(rule)) setCustomRuleAudioAssets(await window.stockPet.clearCustomRuleAudio(symbol, rule.id));
    saveRules(rules.filter((item) => item.id !== rule.id));
  };
  const moveRule = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rules.length) return;
    const nextRules = [...rules];
    [nextRules[index], nextRules[nextIndex]] = [nextRules[nextIndex], nextRules[index]];
    saveRules(nextRules);
  };
  const clearStockRules = async () => {
    if (!rules.length || !window.confirm(`确定清空 ${stockName} 的全部场景动作吗？`)) return;
    let nextAssets = customRuleAssets;
    for (const rule of rules) {
      if (nextAssets[ruleAssetKey(symbol, rule.id)]) nextAssets = await window.stockPet.clearCustomRuleGif(symbol, rule.id);
    }
    setCustomRuleAssets(nextAssets);
    let nextAudioAssets = customRuleAudioAssets;
    for (const rule of rules) {
      if (nextAudioAssets[ruleAssetKey(symbol, rule.id)]) nextAudioAssets = await window.stockPet.clearCustomRuleAudio(symbol, rule.id);
    }
    setCustomRuleAudioAssets(nextAudioAssets);
    saveRules([]);
    setAssetMessage(`${stockName} 已恢复默认小牛形象`);
  };
  const triggerNames: Record<ActionRuleTrigger, string> = {
    recent_change: "近 5 分钟涨跌幅", daily_change: "当日涨跌幅", price: "当前价格", market_state: "行情状态", time_range: "固定时间段",
  };
  const operatorNames: Record<ActionRuleOperator, string> = { gte: "大于等于", lte: "小于等于", between: "介于", equals: "等于" };
  return (
    <div className="action-panel">
      <div className="action-heading">
        <span><b>股票专属场景动作</b><small>默认动作依据今日涨跌幅；你也可以为每只股票配置短周期、价格、状态或时间规则。</small></span>
        <button className="primary-action" onClick={addRule}><Plus />新增动作</button>
      </div>
      <div className="stock-action-toolbar">
        <label><span>配置股票</span><select value={symbol} onChange={(event) => { setEditingSymbol(event.target.value); setAssetMessage(""); }}>{watchlist.map((item) => <option key={item.id} value={item.symbol}>{item.name} · {item.symbol}</option>)}</select></label>
        <label><span>默认小牛速度</span><select value={preferences.speed} onChange={(event) => onChange({ ...preferences, speed: Number(event.target.value) as ActionPreferences["speed"] })}><option value="0.75">舒缓</option><option value="1">标准</option><option value="1.25">活泼</option></select></label>
        <label className="action-volume"><span>声音音量 <b>{Math.round(preferences.volume * 100)}%</b></span><div><input aria-label="声音音量" type="range" min="0" max="1" step="0.05" value={preferences.volume} onChange={(event) => onChange({ ...preferences, volume: Number(event.target.value), sound: true })}/><button type="button" className={preferences.sound ? "enabled" : ""} onClick={() => onChange({ ...preferences, sound: !preferences.sound })}>{preferences.sound ? "已开启" : "已静音"}</button></div></label>
        <div className={`stock-action-state ${rules.some(assetFor) || rules.some(audioFor) ? "ready" : "default"}`}><Sparkle/><span><b>{rules.some(assetFor) || rules.some(audioFor) ? `${rules.filter(assetFor).length} 个动图 · ${rules.filter(audioFor).length} 个声音` : "使用默认小牛"}</b><small>{stockName} · 共 {rules.length} 条规则</small></span></div>
      </div>
      {rules.length ? <div className="custom-rule-list">{rules.map((rule, index) => <article className={`custom-rule-card ${activeRule?.id === rule.id && symbol === currentSymbol ? "current" : ""}`} key={rule.id}>
        <div className="custom-rule-top">
          <div className="rule-preview">{assetFor(rule) ? <img src={assetFor(rule)} alt=""/> : <img src="./niu-lai-le-mascot.png" alt="默认小牛"/>}</div>
          <label className="rule-name"><small>动作 {index + 1}</small><input value={rule.name} maxLength={24} onChange={(event) => updateRule(rule.id, { name: event.target.value })}/></label>
          {activeRule?.id === rule.id && symbol === currentSymbol && <span className="rule-live">正在执行</span>}
          <label className="rule-switch"><input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })}/><span>{rule.enabled ? "启用" : "停用"}</span></label>
          <span className="rule-order-actions">
            <button title="提高优先级" disabled={index === 0} onClick={() => moveRule(index, -1)}><ArrowUp /></button>
            <button title="降低优先级" disabled={index === rules.length - 1} onClick={() => moveRule(index, 1)}><ArrowDown /></button>
          </span>
          <button className="icon-danger" title="删除动作" onClick={() => removeRule(rule)}><Trash /></button>
        </div>
        <div className="rule-fields">
          <label><span>触发时机</span><select value={rule.trigger} onChange={(event) => updateRule(rule.id, { trigger: event.target.value as ActionRuleTrigger })}>{(Object.keys(triggerNames) as ActionRuleTrigger[]).map((value) => <option value={value} key={value}>{triggerNames[value]}</option>)}</select></label>
          {rule.trigger === "market_state" ? <label><span>行情状态</span><select value={rule.marketState} onChange={(event) => updateRule(rule.id, { marketState: event.target.value as MarketState })}>{(Object.keys(stateNames) as MarketState[]).map((value) => <option value={value} key={value}>{stateNames[value]}</option>)}</select></label>
          : rule.trigger === "time_range" ? <><label><span>开始时间</span><input type="time" value={rule.startTime} onChange={(event) => updateRule(rule.id, { startTime: event.target.value })}/></label><label><span>结束时间</span><input type="time" value={rule.endTime} onChange={(event) => updateRule(rule.id, { endTime: event.target.value })}/></label></>
          : <><label><span>条件</span><select value={rule.operator} onChange={(event) => updateRule(rule.id, { operator: event.target.value as ActionRuleOperator })}>{(Object.keys(operatorNames) as ActionRuleOperator[]).map((value) => <option value={value} key={value}>{operatorNames[value]}</option>)}</select></label><label><span>{rule.trigger === "price" ? "价格" : "数值 (%)"}</span><input type="number" step="0.1" value={rule.value} onChange={(event) => updateRule(rule.id, { value: Number(event.target.value) })}/></label>{rule.operator === "between" && <label><span>至</span><input type="number" step="0.1" value={rule.endValue} onChange={(event) => updateRule(rule.id, { endValue: Number(event.target.value) })}/></label>}</>}
        </div>
        <div className="rule-actions">
          <div className="rule-media-group"><span>动作画面</span><button onClick={() => chooseRuleGif(rule)}>{assetFor(rule) ? "更换 GIF" : "上传 GIF"}</button>{assetFor(rule) && <button className="secondary" onClick={async () => setCustomRuleAssets(await window.stockPet.clearCustomRuleGif(symbol, rule.id))}>移除</button>}</div>
          <div className={`rule-media-group audio-media-group ${audioFor(rule) ? "has-asset" : ""}`}>
            <span>触发声音</span>
            {audioFor(rule) && <em className="media-ready-dot">已上传</em>}
            {audioFor(rule) && <button className={`preview-audio ${previewingRuleId === rule.id ? "playing" : ""}`} onClick={() => previewRuleAudio(rule)}>{previewingRuleId === rule.id ? <Stop /> : <Play />}{previewingRuleId === rule.id ? "停止" : "试听"}</button>}
            <button onClick={() => chooseRuleAudio(rule)}>{audioFor(rule) ? "更换" : "上传声音"}</button>
            {audioFor(rule) && <button className="secondary" onClick={() => clearRuleAudio(rule)}>移除</button>}
          </div>
          <small>{assetFor(rule) ? "GIF 将按原动画直接播放，不叠加内置动作效果；声音会在规则命中时同步触发。" : audioFor(rule) ? "声音已保存在本机；规则命中时会播放声音，并显示默认小牛。" : "尚未上传素材，命中时会使用默认小牛。"}</small>
        </div>
      </article>)}</div> : <button className="empty-rule" onClick={addRule}><Plus/><b>为 {stockName} 添加第一个动作</b><span>上传 GIF，并设置涨跌幅、价格、行情状态或时间条件</span></button>}
      {assetMessage && <p className="asset-message">{assetMessage}</p>}
      <div className="action-safety-notes">
        <span><b>默认稳定</b><small>没有命中自定义规则时，始终按今日涨跌幅切换动作，不受分钟噪声干扰。</small></span>
        <span><b>按顺序匹配</b><small>自定义规则从上到下检查，首个命中的动作立即执行。</small></span>
        <span><b>安全兜底</b><small>未命中或 GIF 缺失时自动显示默认小牛，不影响行情。</small></span>
        <span><b>本机私有</b><small>自定义 GIF 与声音仅保存在当前电脑，不会上传云端。</small></span>
      </div>
      {rules.length > 0 && <button className="clear-stock-actions" onClick={clearStockRules}><Trash/><span><b>清空当前股票动作</b><small>删除 {stockName} 的全部规则、GIF 和声音</small></span></button>}
    </div>
  );
}

function WatchPanel({
  search,
  setSearch,
  results,
  add,
  watchlist,
  quotes,
  selected,
  setSelected,
  remove,
  updateWatchlist,
}: any) {
  const [draggedId, setDraggedId] = useState("");
  const [pendingPrimaryId, setPendingPrimaryId] = useState("");
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
      <div className="watch-toolbar">
        <span>
          <b>我的自选</b>
          <small>点击卡片切换行情，点亮星标设为桌宠主行情</small>
        </span>
        <em>{watchlist.length} / 20</em>
      </div>
      <div className="watchlist" aria-label="我的自选行情">
        {watchlist.map((item: Watch, index: number) => {
          const quote = (quotes as Quote[]).find((entry) => entry.symbol === item.symbol);
          const itemChange = Number(quote?.changePercent || 0);
          const itemPrice = quote?.price == null ? "--" : Number(quote.price).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
          return (
          <article
            key={item.id}
            className={`watch-card ${selected === index ? "active" : ""}`}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => reorder(item.id)}
          >
            <button className="watch-select" type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <span className="watch-name"><b>{item.name}</b><small>{quote?.code || item.code || item.symbol}</small></span>
              <span className={`watch-price ${itemChange < 0 ? "negative" : ""}`}><b>{itemPrice}</b><small>{quote ? `${itemChange >= 0 ? "+" : ""}${itemChange.toFixed(2)}%` : "等待行情"}</small></span>
            </button>
            <div className="watch-actions">
              <button
                type="button"
                className={`watch-primary ${item.isPrimary ? "active" : ""}`}
                aria-label={item.isPrimary ? `${item.name}是桌宠主行情` : `将${item.name}设为桌宠主行情`}
                title={item.isPrimary ? "当前桌宠主行情" : "设为桌宠主行情"}
                disabled={pendingPrimaryId === item.id}
                onClick={async () => {
                  setSelected(index);
                  setPendingPrimaryId(item.id);
                  try { await updateWatchlist({ primaryId: item.id }); }
                  finally { setPendingPrimaryId(""); }
                }}
              >
                <Star weight={item.isPrimary ? "fill" : "regular"} />
              </button>
              <button type="button" className="watch-remove" aria-label={`删除${item.name}`} title="移出自选" onClick={() => remove(item.id)}><X /></button>
            </div>
          </article>
        )})}
        {watchlist.length === 0 && (
          <div className="watch-empty">
            <Star />
            <b>还没有自选行情</b>
            <span>在上方搜索股票名称或代码后添加</span>
          </div>
        )}
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
      <div className="settings-grid">
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
      <label><span>场景与提醒声音</span><input type="checkbox" checked={preferences.sound} onChange={(event) => onChange({ ...preferences, sound: event.target.checked })} /></label>
      <label><span>声音音量 · {Math.round(preferences.volume * 100)}%</span><input aria-label="声音音量" type="range" min="0" max="1" step="0.05" value={preferences.volume} onChange={(event) => onChange({ ...preferences, volume: Number(event.target.value) })} /></label>
      <label><span>透明度</span><input type="range" min="0.55" max="1" step="0.05" value={preferences.opacity} onChange={(event) => {
        const opacity = Number(event.target.value);
        window.stockPet.setOpacity(opacity);
        onChange({ ...preferences, opacity });
      }} /></label>
      <label><span>交易时刷新</span><select value={preferences.refreshSeconds} onChange={(event) => onChange({ ...preferences, refreshSeconds: Number(event.target.value) as ActionPreferences["refreshSeconds"] })}>
        <option value="15">15 秒</option><option value="20">20 秒</option><option value="30">30 秒</option><option value="60">60 秒</option>
      </select></label>
      </div>
      <div className="settings-actions">
      <button onClick={async () => {
        if (updateStatus === "ready") return window.stockPet.installUpdate();
        const result = await window.stockPet.checkUpdates();
        setUpdateStatus(result.status);
      }}>{({ idle: "检查更新", checking: "正在检查…", downloading: "正在下载更新…", current: "已是最新版本", ready: "重启并安装更新", unavailable: "正式版发布后可更新", error: "更新检查失败，点击重试" } as Record<string,string>)[updateStatus] || "检查更新"}</button>
      <button className="logout-action" onClick={logout}>
        <SignOut />
        退出登录
      </button>
      </div>
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
