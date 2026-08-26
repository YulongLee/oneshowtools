import { app, BrowserWindow, ipcMain, Menu, nativeImage, safeStorage, screen, shell, Tray } from "electron";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { hostname, platform } from "node:os";
import { join } from "node:path";
import { autoUpdater } from "electron-updater";

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
const apiBase = process.env.ONESHOWTOOLS_API_URL || "https://www.gameforcast.top";
const updateFeedUrl = String(process.env.STOCK_PET_UPDATE_URL || "").trim();
const fingerprint = createHash("sha256").update(`${hostname()}:${platform()}:${app.getPath("userData")}`).digest("hex");
const sessionPath = () => join(app.getPath("userData"), "session.bin");
const licenseCachePath = () => join(app.getPath("userData"), "license-cache.bin");
const quoteCachePath = () => join(app.getPath("userData"), "quote-cache.json");
const preferencesPath = () => join(app.getPath("userData"), "action-preferences.json");
const windowStatePath = () => join(app.getPath("userData"), "window-state.json");
const motionPresets = new Set(["calm", "float", "bounce", "power", "rocket", "sway", "shiver", "collapse", "pulse", "sleep"]);
const marketStates = new Set(["LOADING", "OFFLINE", "FLAT", "UP", "STRONG_UP", "LIMIT_UP", "DOWN", "STRONG_DOWN", "LIMIT_DOWN", "ALERT", "CLOSED"]);
const defaultActionPreferences = {
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

function sanitizeActionPreferences(input: any) {
  const speed = [0.75, 1, 1.25].includes(Number(input?.speed)) ? Number(input.speed) : 1;
  const stateMotions = { ...defaultActionPreferences.stateMotions } as Record<string, string>;
  for (const [state, preset] of Object.entries(input?.stateMotions || {})) {
    if (marketStates.has(state) && motionPresets.has(String(preset))) stateMotions[state] = String(preset);
  }
  const candidate = input?.thresholds || {};
  const thresholds = {
    up: Math.max(0.1, Math.min(20, Number(candidate.up) || 1)),
    strongUp: Math.max(0.2, Math.min(30, Number(candidate.strongUp) || 3)),
    down: Math.min(-0.1, Math.max(-20, Number(candidate.down) || -1)),
    strongDown: Math.min(-0.2, Math.max(-30, Number(candidate.strongDown) || -3)),
  };
  if (thresholds.strongUp <= thresholds.up) thresholds.strongUp = Math.min(30, thresholds.up + 1);
  if (thresholds.strongDown >= thresholds.down) thresholds.strongDown = Math.max(-30, thresholds.down - 1);
  return {
    speed,
    sound: Boolean(input?.sound),
    animations: input?.animations !== false,
    refreshSeconds: [15, 20, 30, 60].includes(Number(input?.refreshSeconds)) ? Number(input.refreshSeconds) : 20,
    opacity: Math.max(0.55, Math.min(1, Number(input?.opacity) || 1)),
    locked: Boolean(input?.locked),
    thresholds,
    stateMotions,
  };
}

function readActionPreferences() {
  try {
    if (!existsSync(preferencesPath())) return defaultActionPreferences;
    return sanitizeActionPreferences(JSON.parse(readFileSync(preferencesPath(), "utf8")));
  } catch { return defaultActionPreferences; }
}

function writeActionPreferences(input: any) {
  const value = sanitizeActionPreferences(input);
  const temporary = `${preferencesPath()}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(temporary, preferencesPath());
  return value;
}

function readToken() {
  try {
    if (!existsSync(sessionPath())) return "";
    const stored = readFileSync(sessionPath());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(stored) : stored.toString("utf8");
  } catch { return ""; }
}

function writeToken(token = "") {
  const stored = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(token) : Buffer.from(token, "utf8");
  writeFileSync(sessionPath(), stored, { mode: 0o600 });
}

function readEncryptedJson(pathname: string) {
  try {
    if (!existsSync(pathname)) return null;
    const stored = readFileSync(pathname);
    const value = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(stored) : stored.toString("utf8");
    return JSON.parse(value);
  } catch { return null; }
}

function writeEncryptedJson(pathname: string, value: unknown) {
  const plain = JSON.stringify(value);
  const stored = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(plain) : Buffer.from(plain, "utf8");
  writeFileSync(pathname, stored, { mode: 0o600 });
}

function readQuoteCache() {
  try { return JSON.parse(readFileSync(quoteCachePath(), "utf8")); } catch { return null; }
}

function writeQuoteCache(value: unknown) {
  writeFileSync(quoteCachePath(), JSON.stringify({ payload: value, cachedAt: Date.now() }), { mode: 0o600 });
}

function readWindowState() {
  try {
    const value = JSON.parse(readFileSync(windowStatePath(), "utf8"));
    if ([value.x, value.y, value.width, value.height].every(Number.isFinite))
      return { x: value.x, y: value.y, width: Math.max(280, Math.min(700, value.width)), height: Math.max(340, Math.min(900, value.height)) };
  } catch {}
  return { width: 360, height: 460 };
}

function visibleWindowBounds(bounds: ReturnType<typeof readWindowState>) {
  if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) return bounds;
  const intersectsDisplay = screen.getAllDisplays().some(({ workArea }) =>
    bounds.x! < workArea.x + workArea.width &&
    bounds.x! + bounds.width > workArea.x &&
    bounds.y! < workArea.y + workArea.height &&
    bounds.y! + bounds.height > workArea.y
  );
  if (intersectsDisplay) return bounds;
  const { workArea } = screen.getPrimaryDisplay();
  return {
    width: bounds.width,
    height: bounds.height,
    x: workArea.x + workArea.width - bounds.width - 24,
    y: workArea.y + workArea.height - bounds.height - 24,
  };
}

let windowStateTimer: NodeJS.Timeout | undefined;
function persistWindowState() {
  if (!window || window.isDestroyed()) return;
  clearTimeout(windowStateTimer);
  windowStateTimer = setTimeout(() => {
    if (!window || window.isDestroyed()) return;
    const temporary = `${windowStatePath()}.tmp`;
    writeFileSync(temporary, JSON.stringify(window.getBounds()), { mode: 0o600 });
    renameSync(temporary, windowStatePath());
  }, 250);
}

async function api(pathname: string, options: { method?: string; body?: unknown; authenticated?: boolean } = {}) {
  const token = readToken();
  const response = await fetch(`${apiBase}${pathname}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json", "x-oneshow-client": "desktop",
      "x-stock-pet-device": fingerprint,
      ...(options.authenticated !== false && token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.code || "REQUEST_FAILED"), { code: payload?.error?.code, status: response.status });
  return payload;
}

function createWindow() {
  const initialBounds = visibleWindowBounds(readWindowState());
  window = new BrowserWindow({
    ...initialBounds, minWidth: 280, minHeight: 340, transparent: true, frame: false,
    alwaysOnTop: true, resizable: true, skipTaskbar: false, show: false,
    webPreferences: { preload: join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.on("move", persistWindowState);
  window.on("resize", persistWindowState);
  const reveal = () => {
    if (!window || window.isDestroyed()) return;
    window.show();
    window.focus();
  };
  window.once("ready-to-show", reveal);
  window.webContents.once("did-finish-load", reveal);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(apiBase)) shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.VITE_DEV_SERVER_URL) window.loadURL(process.env.VITE_DEV_SERVER_URL);
  else window.loadFile(join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  tray = new Tray(nativeImage.createFromPath(join(__dirname, "../dist/niu-lai-le-mascot.png")).resize({ width: 18, height: 18 }));
  tray.setToolTip("牛来了");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "显示 / 隐藏", click: () => window?.isVisible() ? window.hide() : window?.show() },
    { label: "保持置顶", type: "checkbox", checked: true, click: (item) => window?.setAlwaysOnTop(item.checked) },
    { type: "separator" }, { label: "退出", click: () => app.quit() },
  ]));
  if (app.isPackaged && updateFeedUrl) {
    autoUpdater.setFeedURL({ provider: "generic", url: updateFeedUrl });
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdates().catch(() => undefined);
  }
});

for (const [eventName, status] of [
  ["checking-for-update", "checking"], ["update-available", "downloading"],
  ["update-not-available", "current"], ["update-downloaded", "ready"], ["error", "error"],
] as const) autoUpdater.on(eventName, () => window?.webContents.send("pet:update-status", status));

ipcMain.handle("pet:identity", () => ({ fingerprint, name: hostname(), platform: platform(), appVersion: app.getVersion(), installationId: randomUUID() }));
ipcMain.handle("pet:open-login", () => shell.openExternal(`${apiBase}/?desktopProduct=stock-pet`));
ipcMain.handle("pet:session", async () => {
  if (!readToken()) return { authenticated: false };
  try {
    const result = { authenticated: true, account: await api("/api/auth/session"), license: await api("/api/products/stock-pet/license") };
    writeEncryptedJson(licenseCachePath(), { ...result, cachedAt: Date.now() });
    return result;
  } catch {
    const cached = readEncryptedJson(licenseCachePath());
    if (cached?.license?.entitled && Date.now() - Number(cached.cachedAt || 0) <= 72 * 60 * 60 * 1000)
      return { authenticated: true, account: cached.account, license: cached.license, graceMode: true };
    return { authenticated: false };
  }
});
ipcMain.handle("pet:login", async (_event, credentials) => {
  const result = await api("/api/auth/login", { method: "POST", body: credentials, authenticated: false });
  writeToken(result.accessToken);
  await api("/api/products/stock-pet/devices", { method: "POST", body: { fingerprint, name: hostname(), platform: platform(), appVersion: app.getVersion() } });
  const session = { authenticated: true, account: await api("/api/auth/session"), license: await api("/api/products/stock-pet/license") };
  writeEncryptedJson(licenseCachePath(), { ...session, cachedAt: Date.now() });
  return session;
});
ipcMain.handle("pet:logout", () => { writeToken(""); writeEncryptedJson(licenseCachePath(), {}); return { authenticated: false }; });
ipcMain.handle("pet:api", (_event, pathname: string, options = {}) => {
  if (!pathname.startsWith("/api/products/stock-pet/")) throw new Error("INVALID_API_PATH");
  if (pathname.startsWith("/api/products/stock-pet/quotes"))
    return api(pathname, options).then((payload) => { writeQuoteCache(payload); return payload; }).catch((error) => {
      const cached = readQuoteCache();
      if (cached?.payload && Date.now() - Number(cached.cachedAt || 0) <= 24 * 60 * 60 * 1000)
        return { ...cached.payload, stale: true, cachedAt: cached.cachedAt };
      throw error;
    });
  return api(pathname, options);
});
ipcMain.handle("pet:set-always-on-top", (_event, enabled: boolean) => window?.setAlwaysOnTop(Boolean(enabled)));
ipcMain.handle("pet:set-launch-at-login", (_event, enabled: boolean) => app.setLoginItemSettings({ openAtLogin: Boolean(enabled) }));
ipcMain.handle("pet:set-window-size", (_event, size: "small"|"medium"|"large") => {
  const sizes = { small: [300, 390], medium: [360, 460], large: [430, 560] } as const;
  const [width, height] = sizes[size] || sizes.medium;
  window?.setSize(width, height, true);
});
ipcMain.handle("pet:set-opacity", (_event, value: number) => window?.setOpacity(Math.max(.55, Math.min(1, Number(value) || 1))));
ipcMain.handle("pet:set-position-locked", (_event, value: boolean) => window?.setMovable(!Boolean(value)));
ipcMain.handle("pet:get-system-settings", () => ({
  alwaysOnTop: Boolean(window?.isAlwaysOnTop()),
  launchAtLogin: app.getLoginItemSettings().openAtLogin,
}));
ipcMain.handle("pet:get-action-preferences", () => readActionPreferences());
ipcMain.handle("pet:save-action-preferences", (_event, value) => writeActionPreferences(value));
ipcMain.handle("pet:show-context-menu", () => {
  const preferences = readActionPreferences();
  const menu = Menu.buildFromTemplate([
    { label: "查看行情", click: () => window?.webContents.send("pet:quick-action", "watch") },
    { label: "添加自选", click: () => window?.webContents.send("pet:quick-action", "search") },
    { label: "动作设置", click: () => window?.webContents.send("pet:quick-action", "actions") },
    { type: "separator" },
    { label: "小号", type: "radio", click: () => window?.setSize(300, 390, true) },
    { label: "中号", type: "radio", checked: true, click: () => window?.setSize(360, 460, true) },
    { label: "大号", type: "radio", click: () => window?.setSize(430, 560, true) },
    { label: "锁定位置", type: "checkbox", checked: preferences.locked, click: (item) => {
      window?.setMovable(!item.checked);
      writeActionPreferences({ ...preferences, locked: item.checked });
    } },
    { label: "始终置顶", type: "checkbox", checked: window?.isAlwaysOnTop(), click: (item) => window?.setAlwaysOnTop(item.checked) },
    { label: "开机启动", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin, click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
    { type: "separator" },
    { label: "隐藏牛牛", click: () => window?.hide() },
    { label: "退出", click: () => app.quit() },
  ]);
  menu.popup({ window: window || undefined });
});
ipcMain.handle("pet:check-updates", async () => {
  if (!app.isPackaged || !updateFeedUrl) return { status: "unavailable" };
  await autoUpdater.checkForUpdates();
  return { status: "checking" };
});
ipcMain.handle("pet:install-update", () => autoUpdater.quitAndInstall(false, true));
ipcMain.handle("pet:hide", () => window?.hide());
ipcMain.handle("pet:quit", () => app.quit());
app.on("window-all-closed", () => {});
