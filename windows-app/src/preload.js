'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mianboor', {
  getState: () => ipcRenderer.invoke('get-state'),
  addLinks: (text) => ipcRenderer.invoke('add-links', text),
  addSubscription: (url) => ipcRenderer.invoke('add-subscription', url),
  removeConfig: (id) => ipcRenderer.invoke('remove-config', id),
  selectConfig: (id) => ipcRenderer.invoke('select-config', id),
  connect: () => ipcRenderer.invoke('connect'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  pingAll: () => ipcRenderer.invoke('ping-all'),
  setSysProxy: (v) => ipcRenderer.invoke('set-sysproxy', v),
  onEvent: (cb) => ipcRenderer.on('mianboor:event', (_e, data) => cb(data)),
});
