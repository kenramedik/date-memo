const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appMenu', {
  state: () => ipcRenderer.invoke('menu:state'),
  run: name => ipcRenderer.invoke('menu:action', name),
  onState: cb => ipcRenderer.on('menu:state', (_e, s) => cb(s)),
});
