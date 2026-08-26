import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("stockPet", {
  identity: () => ipcRenderer.invoke("pet:identity"),
  session: () => ipcRenderer.invoke("pet:session"),
  login: (credentials: { email: string; password: string }) => ipcRenderer.invoke("pet:login", credentials),
  logout: () => ipcRenderer.invoke("pet:logout"),
  api: (path: string, options?: { method?: string; body?: unknown }) => ipcRenderer.invoke("pet:api", path, options),
  openLogin: () => ipcRenderer.invoke("pet:open-login"),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke("pet:set-always-on-top", enabled),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke("pet:set-launch-at-login", enabled),
  setWindowSize: (size: "small"|"medium"|"large") => ipcRenderer.invoke("pet:set-window-size", size),
  setOpacity: (value: number) => ipcRenderer.invoke("pet:set-opacity", value),
  setPositionLocked: (value: boolean) => ipcRenderer.invoke("pet:set-position-locked", value),
  getSystemSettings: () => ipcRenderer.invoke("pet:get-system-settings"),
  getActionPreferences: () => ipcRenderer.invoke("pet:get-action-preferences"),
  saveActionPreferences: (value: unknown) => ipcRenderer.invoke("pet:save-action-preferences", value),
  showContextMenu: () => ipcRenderer.invoke("pet:show-context-menu"),
  onQuickAction: (handler: (action: string) => void) => {
    const listener = (_event: unknown, action: string) => handler(action);
    ipcRenderer.on("pet:quick-action", listener);
    return () => ipcRenderer.removeListener("pet:quick-action", listener);
  },
  checkUpdates: () => ipcRenderer.invoke("pet:check-updates"),
  installUpdate: () => ipcRenderer.invoke("pet:install-update"),
  onUpdateStatus: (handler: (status: string) => void) => {
    const listener = (_event: unknown, status: string) => handler(status);
    ipcRenderer.on("pet:update-status", listener);
    return () => ipcRenderer.removeListener("pet:update-status", listener);
  },
  hide: () => ipcRenderer.invoke("pet:hide"),
  quit: () => ipcRenderer.invoke("pet:quit"),
});
