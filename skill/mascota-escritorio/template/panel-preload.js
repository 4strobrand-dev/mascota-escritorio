const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('panel', {
  tab: name => ipcRenderer.send('panel:tab', name),
  music: action => ipcRenderer.send('panel:music', action),
  openSpotify: () => ipcRenderer.send('panel:open-spotify'),
  reload: () => ipcRenderer.send('panel:reload'),
  hide: () => ipcRenderer.send('panel:hide'),
  onMusic: cb => ipcRenderer.on('panel:music-state', (_e, s) => cb(s)),
  onTab: cb => ipcRenderer.on('panel:tab-state', (_e, t) => cb(t))
});
