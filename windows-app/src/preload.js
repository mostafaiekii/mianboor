'use strict';
/**
 * پل امن بین رندرر و پروسهٔ اصلی — contextIsolation روشن است.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mb', {
  getState: () => ipcRenderer.invoke('get-state'),
  connect: () => ipcRenderer.invoke('connect'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  selectConfig: (id) => ipcRenderer.invoke('select-config', id),
  removeConfig: (id) => ipcRenderer.invoke('remove-config', id),
  addLinks: (text) => ipcRenderer.invoke('add-links', text),
  addSubscription: (url) => ipcRenderer.invoke('add-subscription', url),
  pingBatch: (items) => ipcRenderer.invoke('ping-batch', items),
  setSetting: (k, v) => ipcRenderer.invoke('set-setting', k, v),
  getUsage: () => ipcRenderer.invoke('get-usage'),
  emergencyRescue: () => ipcRenderer.invoke('emergency:rescue'),
  emergencyPing: (link) => ipcRenderer.invoke('emergency:ping', link),
  emergencyConnect: (link) => ipcRenderer.invoke('emergency:connect', link),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  win: (action) => ipcRenderer.invoke('win', action),
  devShot: (name) => ipcRenderer.invoke('dev:shot', name).catch(() => ({ ok: false })),
  devQuit: () => ipcRenderer.invoke('dev:quit').catch(() => ({ ok: false })),
  onEvent: (cb) => {
    ipcRenderer.on('mianboor:event', (_e, evt) => cb(evt));
  },
});
