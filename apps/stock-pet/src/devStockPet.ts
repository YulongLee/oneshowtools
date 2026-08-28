const noOp = () => () => undefined;

export function ensureDevStockPet() {
  if (!(import.meta as any).env?.DEV || window.stockPet) return;

  let actions: any = {
    speed: 1,
    sound: true,
    volume: 0.85,
    animations: true,
    opacity: 1,
    locked: false,
    refreshSeconds: 60,
    thresholds: { up: 1, strongUp: 3, down: -1, strongDown: -3 },
    stateMotions: {
      LOADING: "calm", OFFLINE: "shiver", FLAT: "float", UP: "bounce",
      STRONG_UP: "power", LIMIT_UP: "rocket", DOWN: "sway", STRONG_DOWN: "shiver",
      LIMIT_DOWN: "collapse", ALERT: "pulse", CLOSED: "sleep",
    },
    stockRuleGroups: {},
  };
  const watch = [{ id: "demo-watch", symbol: "513500.SS", code: "513500", name: "标普500ETF博时", market: "A" }];
  const quote = { symbol: "513500.SS", code: "513500", name: "标普500ETF博时", market: "A", price: 2.708, changePercent: 0.48, state: "OPEN", sourceLabel: "腾讯财经", updatedAt: Date.now() };
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
    getCustomRuleAudioAssets: async () => ({}),
    chooseCustomRuleAudio: async () => ({}),
    clearCustomRuleAudio: async () => ({}),
    onCustomAssetsChanged: noOp,
    onCustomRuleAssetsChanged: noOp,
    onCustomRuleAudioAssetsChanged: noOp,
    onActionPreferencesChanged: noOp,
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
