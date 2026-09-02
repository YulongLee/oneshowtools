import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  safeStorage,
  screen,
  shell,
  Tray,
} from "electron";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { hostname, platform } from "node:os";
import { join } from "node:path";

const apiBase = process.env.ONSHOWTOOLS_API_BASE || "https://oneshowtools.com";
const fingerprint = createHash("sha256")
  .update(`${hostname()}|${platform()}|${app.getPath("userData")}`)
  .digest("hex");
const defaultConfig = {
  monthlySalary: 12000,
  workDays: 21.75,
  startHour: 9,
  endHour: 18,
  lunchMinutes: 60,
  mode: "worktime",
  privacy: false,
  alwaysOnTop: true,
  launchAtLogin: false,
  showMoney: true,
};
let petWindow: BrowserWindow | null = null;
let controlWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const tokenPath = () => join(app.getPath("userData"), "session.bin");
const configPath = () => join(app.getPath("userData"), "salary-config.bin");
const boundsPath = () => join(app.getPath("userData"), "window.json");
function encryptedRead(pathname: string, fallback: any) {
  try {
    if (!existsSync(pathname)) return fallback;
    const data = readFileSync(pathname);
    const text = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(data)
      : data.toString("utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
function encryptedWrite(pathname: string, value: any) {
  const text = JSON.stringify(value);
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(text)
    : Buffer.from(text);
  writeFileSync(pathname, data, { mode: 0o600 });
}
function token() {
  return String(encryptedRead(tokenPath(), "") || "");
}
function saveToken(value = "") {
  encryptedWrite(tokenPath(), value);
}
function readConfig() {
  return { ...defaultConfig, ...encryptedRead(configPath(), {}) };
}
function saveConfig(value: any) {
  const next = {
    ...readConfig(),
    monthlySalary: Math.max(0, Number(value.monthlySalary) || 0),
    workDays: Math.max(1, Math.min(31, Number(value.workDays) || 21.75)),
    startHour: Math.max(0, Math.min(23, Number(value.startHour) || 9)),
    endHour: Math.max(1, Math.min(24, Number(value.endHour) || 18)),
    lunchMinutes: Math.max(0, Math.min(240, Number(value.lunchMinutes) || 0)),
    privacy: Boolean(value.privacy),
    alwaysOnTop: value.alwaysOnTop !== false,
    launchAtLogin: Boolean(value.launchAtLogin),
    showMoney: value.showMoney !== false,
  };
  encryptedWrite(configPath(), next);
  petWindow?.setAlwaysOnTop(next.alwaysOnTop);
  app.setLoginItemSettings({ openAtLogin: next.launchAtLogin });
  petWindow?.webContents.send("fortune:config", next);
  controlWindow?.webContents.send("fortune:config", next);
  return next;
}
async function api(
  pathname: string,
  options: { method?: string; body?: unknown; authenticated?: boolean } = {},
) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      "x-oneshow-client": "desktop",
      "x-fortune-cat-device": fingerprint,
      ...(options.authenticated === false || !token()
        ? {}
        : { authorization: `Bearer ${token()}` }),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(payload?.error?.code || "REQUEST_FAILED"), {
      code: payload?.error?.code,
      status: response.status,
    });
  return payload;
}
function load(target: BrowserWindow, mode: "pet" | "control") {
  if (process.env.VITE_DEV_SERVER_URL)
    target.loadURL(`${process.env.VITE_DEV_SERVER_URL}?mode=${mode}`);
  else
    target.loadFile(join(__dirname, "../dist/index.html"), { query: { mode } });
}
function readBounds() {
  try {
    return JSON.parse(readFileSync(boundsPath(), "utf8"));
  } catch {
    return { width: 300, height: 390 };
  }
}
function createPet() {
  const saved = readBounds();
  petWindow = new BrowserWindow({
    width: 300,
    height: 390,
    ...(Number.isFinite(saved.x) && Number.isFinite(saved.y)
      ? { x: saved.x, y: saved.y }
      : {}),
    minWidth: 250,
    minHeight: 330,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    skipTaskbar: true,
    show: false,
    alwaysOnTop: readConfig().alwaysOnTop,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.on("move", () => {
    if (!petWindow) return;
    const tmp = `${boundsPath()}.tmp`;
    writeFileSync(tmp, JSON.stringify(petWindow.getBounds()));
    renameSync(tmp, boundsPath());
  });
  petWindow.once("ready-to-show", () => petWindow?.showInactive());
  load(petWindow, "pet");
}
function openControl() {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.show();
    controlWindow.focus();
    return;
  }
  controlWindow = new BrowserWindow({
    width: 760,
    height: 720,
    minWidth: 680,
    minHeight: 620,
    title: "招财滚滚 · 设置中心",
    backgroundColor: "#f8f7f3",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  controlWindow.setMenuBarVisibility(false);
  controlWindow.once("ready-to-show", () => controlWindow?.show());
  controlWindow.on("closed", () => {
    controlWindow = null;
  });
  load(controlWindow, "control");
}

app.whenReady().then(() => {
  createPet();
  tray = new Tray(
    nativeImage
      .createFromPath(join(__dirname, "../dist/zhaocai-gungun-desktop.png"))
      .resize({ width: 20, height: 20 }),
  );
  tray.setToolTip("招财滚滚");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "显示 / 隐藏滚滚",
        click: () =>
          petWindow?.isVisible() ? petWindow.hide() : petWindow?.showInactive(),
      },
      { label: "工资与工作时间设置", click: openControl },
      { type: "separator" },
      { label: "退出招财滚滚", click: () => app.quit() },
    ]),
  );
});
app.on("window-all-closed", () => {});
ipcMain.handle("fortune:session", async () => {
  if (!token()) return { authenticated: false };
  try {
    return {
      authenticated: true,
      account: await api("/api/auth/session"),
      license: await api("/api/products/fortune-cat/license"),
    };
  } catch {
    return { authenticated: false };
  }
});
ipcMain.handle("fortune:login", async (_event, value) => {
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: value,
      authenticated: false,
    });
    saveToken(result.accessToken);
    await api("/api/products/fortune-cat/devices", {
      method: "POST",
      body: {
        fingerprint,
        name: hostname(),
        platform: platform(),
        appVersion: app.getVersion(),
        installationId: randomUUID(),
      },
    });
    const session = {
      authenticated: true,
      account: await api("/api/auth/session"),
      license: await api("/api/products/fortune-cat/license"),
    };
    petWindow?.webContents.send("fortune:session", session);
    return { ok: true, session };
  } catch (error: any) {
    saveToken();
    return {
      ok: false,
      error: { code: String(error?.code || "REQUEST_FAILED") },
    };
  }
});
ipcMain.handle("fortune:logout", () => {
  saveToken();
  const value = { authenticated: false };
  petWindow?.webContents.send("fortune:session", value);
  return value;
});
ipcMain.handle("fortune:get-config", () => readConfig());
ipcMain.handle("fortune:save-config", (_event, value) => saveConfig(value));
ipcMain.handle("fortune:open-control", openControl);
ipcMain.handle("fortune:set-always-on-top", (_event, value) =>
  saveConfig({ ...readConfig(), alwaysOnTop: value }),
);
ipcMain.handle("fortune:set-launch-at-login", (_event, value) =>
  saveConfig({ ...readConfig(), launchAtLogin: value }),
);
ipcMain.handle("fortune:hide", () => petWindow?.hide());
ipcMain.handle("fortune:quit", () => app.quit());
