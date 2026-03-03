const { contextBridge, ipcRenderer } = require('electron');

// Webサイト側から window.electronAPI.resizeWindow() で呼び出せるようにする
contextBridge.exposeInMainWorld('electronAPI', {
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height)
});