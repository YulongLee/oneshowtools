import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("fortuneCat", {
  session: () => ipcRenderer.invoke("fortune:session"),
  login: (value: unknown) => ipcRenderer.invoke("fortune:login", value),
  logout: () => ipcRenderer.invoke("fortune:logout"),
  getConfig: () => ipcRenderer.invoke("fortune:get-config"),
  saveConfig: (value: unknown) => ipcRenderer.invoke("fortune:save-config", value),
  openControl: () => ipcRenderer.invoke("fortune:open-control"),
  hide: () => ipcRenderer.invoke("fortune:hide"),
  quit: () => ipcRenderer.invoke("fortune:quit"),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke("fortune:set-always-on-top", value),
  setLaunchAtLogin: (value: boolean) => ipcRenderer.invoke("fortune:set-launch-at-login", value),
  onConfig: (handler: (value: unknown) => void) => { const listener = (_: unknown, value: unknown) => handler(value); ipcRenderer.on("fortune:config", listener); return () => ipcRenderer.removeListener("fortune:config", listener); },
  onSession: (handler: (value: unknown) => void) => { const listener = (_: unknown, value: unknown) => handler(value); ipcRenderer.on("fortune:session", listener); return () => ipcRenderer.removeListener("fortune:session", listener); },
});
