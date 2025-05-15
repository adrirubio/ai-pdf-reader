const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readPdfFile: (filePath) => ipcRenderer.invoke('pdf:readFile', filePath),
  aiExplain: (text, style, streamId) => {
    console.log(`Preload: aiExplain called. streamId: ${streamId}, style: ${style}, text: ${String(text).substring(0,30)}...`);
    ipcRenderer.send('ai:explain-request', { text, style, streamId });
  },
  onExplainChunk: (callback) => {
    const listener = (_event, chunk) => callback(chunk);
    ipcRenderer.on('ai:explain-chunk', listener);
    return () => ipcRenderer.removeListener('ai:explain-chunk', listener);
  },
  onExplainEnd: (callback) => {
    const listener = (_event, streamId) => callback(streamId);
    ipcRenderer.on('ai:explain-end', listener);
    return () => ipcRenderer.removeListener('ai:explain-end', listener);
  },
  onExplainError: (callback) => {
    const listener = (_event, errorInfo) => callback(errorInfo);
    ipcRenderer.on('ai:explain-error', listener);
    return () => ipcRenderer.removeListener('ai:explain-error', listener);
  },
  removeAllExplainListeners: (streamId) => {
    // ipcRenderer.removeAllListeners('ai:explain-chunk'); // Too broad, need more specific removal if possible
    // For now, the renderer will have to manage its own listener states based on streamId or use a wrapper.
    // A more robust way is for the renderer to manage its own event emitter that wraps these.
    // Let's keep it simple for now: the renderer needs to be careful with listener cleanup.
    // A simple approach is to have the renderer remove its own specific callback.
    // This preload part just exposes the general .on capability.
  },
  aiChat: (messages, streamId) => {
    console.log(`Preload: aiChat called. streamId: ${streamId}, messages count: ${messages.length}`);
    ipcRenderer.send('ai:chat-request', { messages, streamId });
  },
  onChatChunk: (callback) => {
    const listener = (_event, chunk) => callback(chunk);
    ipcRenderer.on('ai:chat-chunk', listener);
    return () => ipcRenderer.removeListener('ai:chat-chunk', listener);
  },
  onChatEnd: (callback) => {
    const listener = (_event, streamId) => callback(streamId);
    ipcRenderer.on('ai:chat-end', listener);
    return () => ipcRenderer.removeListener('ai:chat-end', listener);
  },
  onChatError: (callback) => {
    const listener = (_event, errorInfo) => callback(errorInfo);
    ipcRenderer.on('ai:chat-error', listener);
    return () => ipcRenderer.removeListener('ai:chat-error', listener);
  },
  aiSetPreferences: (preferences) => ipcRenderer.invoke('ai:setPreferences', preferences),
  removeAllListenersForStream: (channelBasename) => {
    console.warn(`Preload: removeAllListenersForStream for ${channelBasename} called (conceptual).`);
  },
  // New methods for chat streaming
  aiChatStream: (messages, streamId) => {
    console.log(`Preload: aiChatStream called. streamId: ${streamId}, messages count: ${messages?.length}`);
    ipcRenderer.send('ai:chat-stream-request', { messages, streamId });
  },
  
  // New methods for persistent storage
  storage: {
    // Get recent documents from persistent storage
    getRecentDocuments: () => {
      console.log('Preload: getRecentDocuments called');
      return ipcRenderer.invoke('storage:getRecentDocuments');
    },
    
    // Get document data (chat sessions and highlights) for a specific file
    getDocumentData: (filePath) => {
      console.log(`Preload: getDocumentData called for: ${filePath}`);
      return ipcRenderer.invoke('storage:getDocumentData', filePath);
    },
    
    // Save chat sessions for a document
    saveDocumentChats: (filePath, chatSessions) => {
      console.log(`Preload: saveDocumentChats called for: ${filePath}`);
      return ipcRenderer.invoke('storage:saveDocumentChats', { filePath, chatSessions });
    },
    
    // Save highlights for a document
    saveDocumentHighlights: (filePath, highlights) => {
      console.log(`Preload: saveDocumentHighlights called for: ${filePath}`);
      return ipcRenderer.invoke('storage:saveDocumentHighlights', { filePath, highlights });
    },
    
    // Remove document data from persistent storage
    removeDocumentData: (filePath) => {
      console.log(`Preload: removeDocumentData called for: ${filePath}`);
      return ipcRenderer.invoke('storage:removeDocumentData', filePath);
    }
  }
});

// For debugging
console.log('Preload script loaded (streaming for aiExplain & aiChat).');
