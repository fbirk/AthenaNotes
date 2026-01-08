import { contextBridge, ipcRenderer } from "electron";
const safeInvoke = (channel, payload) => ipcRenderer.invoke(channel, payload);
contextBridge.exposeInMainWorld("knowledgeBase", {
  invoke: safeInvoke,
  on(channel, listener) {
    const subscription = (_event, ...args) => listener(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});
