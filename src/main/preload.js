const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  openFile: async () => {
    try {
      const result = await ipcRenderer.invoke('dialog:openFile');
      // Ensure we return a string or null
      return typeof result === 'string' ? result : null;
    } catch (error) {
      console.error('Error in openFile:', error);
      return null;
    }
  },
  readPdfFile: (filePath) => {
    try {
      // Ensure filePath is a string or an object with a path property
      if (typeof filePath !== 'string') {
        if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
          console.log('Preload: Using path property from object:', filePath.path);
          filePath = filePath.path;
        } else {
          console.error('Preload: Invalid filePath format:', typeof filePath, JSON.stringify(filePath));
          filePath = String(filePath);
        }
      }
      return ipcRenderer.invoke('pdf:readFile', filePath);
    } catch (error) {
      console.error('Error in readPdfFile:', error);
      return Promise.reject(error);
    }
  },
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
  
  // Add methods for recent documents
  getRecentDocuments: () => {
    try {
      return ipcRenderer.invoke('recentDocuments:get');
    } catch (error) {
      console.error('Error in getRecentDocuments:', error);
      return Promise.resolve([]);
    }
  },
  addRecentDocument: (filePath) => {
    try {
      // Ensure we're sending a string path
      if (typeof filePath !== 'string') {
        if (filePath && typeof filePath === 'object' && filePath.path) {
          filePath = filePath.path;
        } else {
          filePath = String(filePath);
        }
      }
      return ipcRenderer.invoke('recentDocuments:add', filePath);
    } catch (error) {
      console.error('Error in addRecentDocument:', error);
      return Promise.resolve(false);
    }
  },
  
  // Methods for document-specific data
  getDocumentChats: (filePath) => {
    try {
      console.log('preload.js getDocumentChats called with:', typeof filePath);
      
      // Convert to string properly
      let pathString;
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log('Using path property in getDocumentChats:', pathString);
      } else if (filePath && typeof filePath === 'object') {
        try {
          console.log('Converting object to JSON for logging:', JSON.stringify(filePath));
          pathString = String(filePath);
        } catch (e) {
          console.error('Failed to stringify object:', e);
          pathString = String(filePath || '');
        }
      } else {
        pathString = String(filePath || '');
      }
      
      return ipcRenderer.invoke('documentChats:get', pathString);
    } catch (error) {
      console.error('Error in getDocumentChats:', error);
      return Promise.resolve([]);
    }
  },
  saveDocumentChats: (filePath, sessions) => {
    try {
      console.log('preload.js saveDocumentChats called with:', typeof filePath);
      
      // Convert to string properly
      let pathString;
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log('Using path property in saveDocumentChats:', pathString);
      } else if (filePath && typeof filePath === 'object') {
        try {
          console.log('Converting object to JSON for logging:', JSON.stringify(filePath));
          pathString = String(filePath);
        } catch (e) {
          console.error('Failed to stringify object:', e);
          pathString = String(filePath || '');
        }
      } else {
        pathString = String(filePath || '');
      }
      
      // Sanitize sessions data for IPC
      const cleanSessions = JSON.parse(JSON.stringify(sessions));
      return ipcRenderer.invoke('documentChats:save', pathString, cleanSessions);
    } catch (error) {
      console.error('Error in saveDocumentChats:', error);
      return Promise.resolve(false);
    }
  },
  getDocumentHighlights: (filePath) => {
    try {
      console.log('preload.js getDocumentHighlights called with:', typeof filePath);
      
      // Convert to string properly
      let pathString;
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log('Using path property in getDocumentHighlights:', pathString);
      } else if (filePath && typeof filePath === 'object') {
        try {
          console.log('Converting object to JSON for logging:', JSON.stringify(filePath));
          pathString = String(filePath);
        } catch (e) {
          console.error('Failed to stringify object:', e);
          pathString = String(filePath || '');
        }
      } else {
        pathString = String(filePath || '');
      }
      
      return ipcRenderer.invoke('documentHighlights:get', pathString);
    } catch (error) {
      console.error('Error in getDocumentHighlights:', error);
      return Promise.resolve([]);
    }
  },
  saveDocumentHighlights: (filePath, highlights) => {
    try {
      console.log('preload.js saveDocumentHighlights called with:', typeof filePath);
      
      // Convert to string properly
      let pathString;
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log('Using path property in saveDocumentHighlights:', pathString);
      } else if (filePath && typeof filePath === 'object') {
        try {
          console.log('Converting object to JSON for logging:', JSON.stringify(filePath));
          pathString = String(filePath);
        } catch (e) {
          console.error('Failed to stringify object:', e);
          pathString = String(filePath || '');
        }
      } else {
        pathString = String(filePath || '');
      }
      
      // Sanitize highlights data for IPC
      const cleanHighlights = JSON.parse(JSON.stringify(highlights));
      return ipcRenderer.invoke('documentHighlights:save', pathString, cleanHighlights);
    } catch (error) {
      console.error('Error in saveDocumentHighlights:', error);
      return Promise.resolve(false);
    }
  }
});

// Register for app:before-quit event
contextBridge.exposeInMainWorld('electronEvents', {
  onBeforeQuit: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:before-quit', listener);
    return () => ipcRenderer.removeListener('app:before-quit', listener);
  }
});

// For debugging
console.log('Preload script loaded (streaming for aiExplain & aiChat, recent documents support).');
