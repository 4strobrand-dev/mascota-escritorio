const { contextBridge, ipcRenderer } = require('electron');

const EVENTS = ['pet:edge', 'pet:landed', 'pet:chat', 'pet:walk', 'pet:gravity', 'pet:floating',
  'pet:scale', 'pet:cursor', 'pet:do', 'pet:music', 'pet:pause'];

contextBridge.exposeInMainWorld('astro', {
  move: dx => ipcRenderer.send('pet:move', dx),
  lift: px => ipcRenderer.send('pet:lift', px),
  setIgnore: v => ipcRenderer.send('pet:ignore', v),
  dragStart: () => ipcRenderer.send('pet:drag-start'),
  dragMove: () => {},
  dragEnd: () => ipcRenderer.send('pet:drag-end'),
  resize: d => ipcRenderer.send('pet:resize', d),
  click: () => ipcRenderer.send('pet:click'),
  menu: () => ipcRenderer.send('pet:menu'),
  on: (ch, cb) => {
    if (EVENTS.includes(ch)) ipcRenderer.on(ch, (_e, ...a) => cb(...a));
  }
});
