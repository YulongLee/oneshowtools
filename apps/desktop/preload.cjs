const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('oneShowDesktop', { platform: process.platform, version: process.versions.electron });
