const noOp = () => () => undefined;

export function ensureDevStockPet() {
  if (!(import.meta as any).env?.DEV || window.stockPet) return;

  let actions: any = {
    speed: 1,
    sound: true,
    opacity: 1,
    locked: false,
    refreshSeconds: 60,
    thresholds: { up: 1, strongUp: 3, down: -1, strongDown: -3 },
    stateMotions: {
      LOADING: "breathe", OFFLINE: "breathe", FLAT: "breathe", UP: "bounce",
      STRONG_UP: "rush", LIMIT_UP: "rush", DOWN: "droop", STRONG_DOWN: "shake",
      LIMIT_DOWN: "shake", CLOSED: "sleep",
    },
    stockRuleGroups: { "513500.SS": [
      { id: "rule-fast-rise", name: "5 分钟快速上涨", enabled: true, trigger: "recent_change", operator: "gte", value: 0.5, endValue: 1, marketState: "UP", startTime: "09:30", endTime: "15:00", motion: "rush" },
      { id: "rule-close", name: "收盘休息", enabled: true, trigger: "market_state", operator: "equals", value: 0, endValue: 0, marketState: "CLOSED", startTime: "15:00", endTime: "09:30", motion: "sleep" },
    ] },
  };
  const watch = [{ id: "demo-watch", symbol: "513500.SS", code: "513500", name: "标普500ETF博时", market: "A" }];
  const quote = { symbol: "513500.SS", code: "513500", name: "标普500ETF博时", market: "A", price: 2.708, changePercent: 0.48, state: "OPEN" };
  const history = Array.from({ length: 18 }, (_, index) => ({ time: Date.now() - (17 - index) * 60_000, price: 2.68 + index * 0.0018 }));

  window.stockPet = {
    identity: async () => ({}),
    session: async () => ({ authenticated: true, license: { entitled: true }, user: { name: "本地预览" } }),
    login: async () => ({ authenticated: true, license: { entitled: true } }),
    logout: async () => ({ authenticated: false }),
    api: async (path: string) => {
      if (path.includes("/watchlist")) return { items: watch };
      if (path.includes("/quotes")) return { quotes: [quote] };
      if (path.includes("/history")) return { items: history };
      if (path.includes("/alerts")) return { items: [] };
      return { items: [] };
    },
    openLogin: async () => undefined,
    openControl: async () => undefined,
    setAlwaysOnTop: async () => undefined,
    setLaunchAtLogin: async () => undefined,
    setWindowSize: async () => undefined,
    setOpacity: async () => undefined,
    setPositionLocked: async () => undefined,
    getSystemSettings: async () => ({ alwaysOnTop: true, launchAtLogin: false }),
    getActionPreferences: async () => actions,
    saveActionPreferences: async (value) => (actions = value),
    getCustomStateAssets: async () => ({}),
    chooseCustomGif: async () => ({}),
    clearCustomGif: async () => ({}),
    getCustomRuleAssets: async () => ({}),
    chooseCustomRuleGif: async () => ({}),
    clearCustomRuleGif: async () => ({}),
    onCustomAssetsChanged: noOp,
    onCustomRuleAssetsChanged: noOp,
    showContextMenu: async () => undefined,
    onQuickAction: noOp,
    onSessionChanged: noOp,
    checkUpdates: async () => ({ status: "idle" }),
    installUpdate: async () => undefined,
    onUpdateStatus: noOp,
    hide: async () => undefined,
    quit: async () => undefined,
  };
}
