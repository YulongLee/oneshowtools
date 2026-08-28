import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("stockPet", {
  identity: () => ipcRenderer.invoke("pet:identity"),
  session: () => ipcRenderer.invoke("pet:session"),
  login: (credentials: { email: string; password: string }) => ipcRenderer.invoke("pet:login", credentials),
  logout: () => ipcRenderer.invoke("pet:logout"),
  api: (path: string, options?: { method?: string; body?: unknown }) => ipcRenderer.invoke("pet:api", path, options),
  openLogin: () => ipcRenderer.invoke("pet:open-login"),
  openControl: (panel?: string) => ipcRenderer.invoke("pet:open-control", panel),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke("pet:set-always-on-top", enabled),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke("pet:set-launch-at-login", enabled),
  setWindowSize: (size: "small"|"medium"|"large") => ipcRenderer.invoke("pet:set-window-size", size),
  setOpacity: (value: number) => ipcRenderer.invoke("pet:set-opacity", value),
  setPositionLocked: (value: boolean) => ipcRenderer.invoke("pet:set-position-locked", value),
  getSystemSettings: () => ipcRenderer.invoke("pet:get-system-settings"),
  getActionPreferences: () => ipcRenderer.invoke("pet:get-action-preferences"),
  saveActionPreferences: (value: unknown) => ipcRenderer.invoke("pet:save-action-preferences", value),
  getCustomStateAssets: () => ipcRenderer.invoke("pet:get-custom-state-assets"),
  chooseCustomGif: (state: string) => ipcRenderer.invoke("pet:choose-custom-gif", state),
  clearCustomGif: (state: string) => ipcRenderer.invoke("pet:clear-custom-gif", state),
  getCustomRuleAssets: () => ipcRenderer.invoke("pet:get-custom-rule-assets"),
  chooseCustomRuleGif: (symbol: string, ruleId: string) => ipcRenderer.invoke("pet:choose-custom-rule-gif", symbol, ruleId),
  clearCustomRuleGif: (symbol: string, ruleId: string) => ipcRenderer.invoke("pet:clear-custom-rule-gif", symbol, ruleId),
  getCustomRuleAudioAssets: () => ipcRenderer.invoke("pet:get-custom-rule-audio-assets"),
  chooseCustomRuleAudio: (symbol: string, ruleId: string) => ipcRenderer.invoke("pet:choose-custom-rule-audio", symbol, ruleId),
  clearCustomRuleAudio: (symbol: string, ruleId: string) => ipcRenderer.invoke("pet:clear-custom-rule-audio", symbol, ruleId),
  onCustomAssetsChanged: (handler: (assets: Record<string, string>) => void) => {
    const listener = (_event: unknown, assets: Record<string, string>) => handler(assets);
    ipcRenderer.on("pet:custom-assets-changed", listener);
    return () => ipcRenderer.removeListener("pet:custom-assets-changed", listener);
  },
  onCustomRuleAssetsChanged: (handler: (assets: Record<string, string>) => void) => {
    const listener = (_event: unknown, assets: Record<string, string>) => handler(assets);
    ipcRenderer.on("pet:custom-rule-assets-changed", listener);
    return () => ipcRenderer.removeListener("pet:custom-rule-assets-changed", listener);
  },
  onCustomRuleAudioAssetsChanged: (handler: (assets: Record<string, string>) => void) => {
    const listener = (_event: unknown, assets: Record<string, string>) => handler(assets);
    ipcRenderer.on("pet:custom-rule-audio-assets-changed", listener);
    return () => ipcRenderer.removeListener("pet:custom-rule-audio-assets-changed", listener);
  },
  onActionPreferencesChanged: (handler: (preferences: unknown) => void) => {
    const listener = (_event: unknown, preferences: unknown) => handler(preferences);
    ipcRenderer.on("pet:action-preferences-changed", listener);
    return () => ipcRenderer.removeListener("pet:action-preferences-changed", listener);
  },
  showContextMenu: () => ipcRenderer.invoke("pet:show-context-menu"),
  onQuickAction: (handler: (action: string) => void) => {
    const listener = (_event: unknown, action: string) => handler(action);
    ipcRenderer.on("pet:quick-action", listener);
    return () => ipcRenderer.removeListener("pet:quick-action", listener);
  },
  onSessionChanged: (handler: (session: unknown) => void) => {
    const listener = (_event: unknown, session: unknown) => handler(session);
    ipcRenderer.on("pet:session-changed", listener);
    return () => ipcRenderer.removeListener("pet:session-changed", listener);
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
