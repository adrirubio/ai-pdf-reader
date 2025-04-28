const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readPdfFile: (filePath) => ipcRenderer.invoke('pdf:readFile', filePath),
  aiExplain: (text, style) => ipcRenderer.invoke('ai:explain', text, style)
});

// For debugging
console.log('Preload script loaded successfully');
