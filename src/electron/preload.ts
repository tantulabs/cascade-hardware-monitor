import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSnapshot: () => ipcRenderer.invoke('get-snapshot'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (updates: Record<string, unknown>) => ipcRenderer.invoke('update-config', updates),
  getAlerts: () => ipcRenderer.invoke('get-alerts'),
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  onAlert: (callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on('alert', callback);
    return () => ipcRenderer.removeListener('alert', callback);
  }
});
