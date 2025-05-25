const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const aiService = require('./services/aiService.js');

// Create a simple in-memory store initially, will be replaced with persistent store
let store = {
  get: (key, defaultValue) => defaultValue,
  set: () => {},
  delete: () => {},
  clear: () => {},
  has: () => false
};

// --- Simple In-Memory Cache for Explanations ---
const explanationCache = new Map();
const CACHE_MAX_SIZE = 100; // Optional: Limit cache size
const CACHE_EXPIRY_MS = 1000 * 60 * 60; // Optional: Cache entries expire after 1 hour

// Keep a global reference of the window object
let mainWindow;

console.log(">>>> INSPECTING aiService in main.js:", aiService);
if (aiService) {
    console.log(">>>> aiService.explainTextAndStream type:", typeof aiService.explainTextAndStream);
    console.log(">>>> aiService.startChatStream type:", typeof aiService.startChatStream);
} else {
    console.error(">>>> CRITICAL: aiService is undefined in main.js after require!");
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0f2027', // Set background color to avoid white flash
    show: false, // Don't show window until it's ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), 
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local files
    },
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  
  // Open DevTools for debugging
  // // // // // // // // // // // // mainWindow.webContents.openDevTools();
  
  // Show window once ready to avoid blank white screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log("Window is now visible");
  });
}

// Function to initialize electron-store
async function initializeStore() {
  try {
    const Store = require('electron-store');
    store = new Store({
      schema: {
        recentDocuments: {
          type: 'array',
          default: [],
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              name: { type: 'string' },
              lastAccessed: { type: 'string' }
            }
          },
          maxItems: 10
        },
        documentSpecificData: {
          type: 'object',
          default: {},
          additionalProperties: {
            type: 'object',
            properties: {
              chatSessions: {
                type: 'array',
                default: [],
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    messages: { type: 'array' },
                    highlightId: { type: ['string', 'null'] },
                    createdAt: { type: 'string' }
                  }
                }
              },
              highlights: {
                type: 'array',
                default: [],
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    pageNumber: { type: 'number' },
                    text: { type: 'string' },
                    rectsOnPage: { type: 'array' }
                  }
                }
              },
              lastViewedPage: { type: 'number', default: 1 }
            }
          }
        }
      }
    });
    console.log('Electron Store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Electron Store:', error);
  }
}

// Create window when Electron is ready
app.whenReady().then(async () => {
  // Initialize store first
  await initializeStore();
  
  
  // Then create window and setup handlers
  createWindow();
  setupHandlers();
});

function setupHandlers() {
  console.log("Setting up IPC handlers...");
  
  // Handle file open dialog
  ipcMain.handle('dialog:openFile', async () => {
    console.log("dialog:openFile was called");
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      
      // Make sure we get a valid result
      if (!result || typeof result !== 'object') {
        console.error('Invalid dialog result');
        return null;
      }
      
      const { canceled, filePaths } = result;
      
      if (!canceled && Array.isArray(filePaths) && filePaths.length > 0) {
        const filePath = filePaths[0];
        
        if (typeof filePath === 'string') {
          console.log("Selected file:", filePath);
          
          // Verify the file exists and is readable before adding to recent documents
          if (fs.existsSync(filePath)) {
            try {
              // Test read access
              fs.accessSync(filePath, fs.constants.R_OK);
              console.log("File exists and is readable:", filePath);
              
              // Add to recent documents
              addRecentDocument(filePath);
              return filePath;
            } catch (accessErr) {
              console.error('File exists but is not readable:', filePath, accessErr);
              return null;
            }
          } else {
            console.error('Selected file does not exist:', filePath);
            return null;
          }
        } else {
          console.error('Invalid file path from dialog:', filePath);
        }
      }
      
      console.log('Dialog was canceled or no file selected');
      return null;
    } catch (error) {
      console.error('Error showing open dialog:', error);
      return null;
    }
  });

  // Handle PDF file reading
  ipcMain.handle('pdf:readFile', async (event, filePath) => {
    console.log("pdf:readFile was called for:", filePath);
    try {
      // Ensure filePath is a string
      if (typeof filePath !== 'string') {
        // Try to extract the path if it's an object with a path property
        if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
          console.log("Converting object to path string:", filePath.path);
          filePath = filePath.path;
        } else if (filePath && typeof filePath === 'object') {
          // Try to stringify the object for logging
          const objStr = JSON.stringify(filePath);
          console.error('Invalid file path object:', objStr);
          throw new Error('Invalid file path: object does not have a path property');
        } else {
          // If we can't extract a valid path, throw an error
          console.error('Invalid file path type:', typeof filePath);
          throw new Error('Invalid file path: must be a string');
        }
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        throw new Error('File does not exist');
      }

      // Read file - using synchronous version for better reliability
      const data = fs.readFileSync(filePath);
      console.log("File read successfully, size:", data.length);
      
      // Return data as base64 string
      return data.toString('base64');
    } catch (error) {
      console.error('Error reading PDF file:', error);
      throw error;
    }
  });

  // --- MODIFIED: ai:explain handler for Streaming ---
  ipcMain.on('ai:explain-request', async (event, { text, style, streamId }) => {
    console.log(`main.js: ai:explain-request received (streamId: ${streamId}) - Style: "${style}"`);
    try {
      // Check if aiService and the function exist before calling
      if (aiService && typeof aiService.explainTextAndStream === 'function') {
        await aiService.explainTextAndStream(text, style, streamId, (chunk) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('ai:explain-chunk', chunk);
          }
        });
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ai:explain-end', streamId);
        }
      } else {
        console.error('main.js: aiService.explainTextAndStream is not available or not a function. aiService:', aiService);
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ai:explain-error', { streamId, message: 'Internal server error: AI explanation service unavailable.' });
        }
      }
    } catch (error) {
      console.error('main.js: Error in ai:explain-request handler:', error); // Log the full error
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('ai:explain-error', { streamId, message: error.message || 'Error processing explanation' });
      }
    }
  });

  // --- MODIFIED: ai:chat handler for Streaming ---
  ipcMain.on('ai:chat-request', async (event, { messages, streamId }) => {
    console.log(`ai:chat-request received (streamId: ${streamId}) - Messages count: ${messages.length}`);
    if (!messages || !Array.isArray(messages)) {
      console.error(`ai:chat-request (streamId: ${streamId}) - Invalid messages argument`);
      if (!event.sender.isDestroyed()) {
        event.sender.send('ai:chat-error', { streamId, message: 'Invalid message format received by server.' });
      }
      return;
    }

    try {
      const streamChunkCallback = (chunk, isLastChunk) => {
        if (event.sender.isDestroyed()) {
            console.warn(`ai:chat-request (streamId: ${streamId}) - Renderer window destroyed, cannot send chat chunk.`);
            return;
        }
        console.log(`ai:chat-request (streamId: ${streamId}) - Sending chat chunk. Last: ${isLastChunk}`);
        // Chat chunks should also include the 'role' for the AI.
        // For simplicity, assuming chunks are just content. The service should return content.
        event.sender.send('ai:chat-chunk', { streamId, content: chunk, role: 'assistant', isLast: isLastChunk });
      };
      
      // aiService.chat will now need to be stream-aware and accept a callback.
      // It will internally call callAiApi which will also be stream-aware for chat.
      // For now, we're defining a new method in aiService or modifying existing chat.
      // Let's assume we'll modify aiService.chat to take the callback.
      await aiService.chatAndStream(messages, streamChunkCallback);
      // The chatAndStream method, like explainTextAndStream, won't return the full message
      // if it's successfully streamed. It handles sending chunks via callback.
      // No explicit 'end' signal here as the last chunk from streamChunkCallback serves that.

    } catch (error) {
      console.error(`Error in ai:chat-request (streamId: ${streamId}):`, error.message);
      if (!event.sender.isDestroyed()) {
        event.sender.send('ai:chat-error', { streamId, message: error.message });
      }
    }
  });

  // Handler for chat stream requests
  ipcMain.on('ai:chat-stream-request', async (event, { messages, streamId }) => {
    console.log(`main.js: ai:chat-stream-request received (streamId: ${streamId})`);
    try {
      // The 3rd argument here (for chat) is the callback function
      await aiService.startChatStream(messages, streamId, (chunk) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ai:chat-chunk', chunk);
        }
      });
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('ai:chat-end', streamId);
      }
    } catch (error) {
      console.error('main.js: Error in ai:chat-stream-request handler calling aiService:', error);
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('ai:chat-error', { streamId, message: error.message || 'Error processing chat response' });
      }
    }
  });

  ipcMain.handle('ai:setPreferences', async (event, preferences) => {
    console.log('IPC main received ai:setPreferences with preferences:', preferences);
    // TODO: Implement logic to handle and store AI preferences.
    // This could involve calling a method in aiService or a new configuration service.
    // This is related to "AI preference settings UI" in Week 3, Task 3 for AIPanel.jsx
    return { status: "Preferences received (placeholder for ai:setPreferences)" };
  });
  
  // Add handlers for recent documents and document-specific data
  ipcMain.handle('recentDocuments:get', async () => {
    return getRecentDocuments();
  });
  
  ipcMain.handle('recentDocuments:add', async (event, filePath) => {
    addRecentDocument(filePath);
    return true;
  });
  
  ipcMain.handle('recentDocuments:remove', async (event, filePath) => {
    removeRecentDocument(filePath);
    return true;
  });
  
  ipcMain.handle('documentChats:get', async (event, filePath) => {
    try {
      console.log("documentChats:get called with:", typeof filePath);
      
      // DEBUG: Log the detailed object structure if it's an object
      if (typeof filePath === 'object') {
        console.log("Object details:", JSON.stringify(filePath, null, 2));
      }
      
      // Handle both string paths and objects with path property
      let pathString;
      
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log(`documentChats:get - Using path property: ${pathString}`);
      } else {
        // Try to convert to string
        try {
          pathString = String(filePath || '');
          console.log(`documentChats:get - Converted to string: ${pathString}`);
        } catch (e) {
          console.error('documentChats:get - Could not convert filePath to string:', e);
          return [];
        }
      }
      
      if (!pathString || pathString.trim() === '') {
        console.error('documentChats:get called with empty path');
        return [];
      }
      
      // Sanitize path for use as object key
      const sanitizedPath = pathString.replace(/[.]/g, '_');
      
      // Get the document-specific data from storage
      console.log(`Getting chats for document: ${sanitizedPath}`);
      const docData = store.get(`documentSpecificData.${sanitizedPath}`, { chatSessions: [] });
      return docData.chatSessions || [];
    } catch (error) {
      console.error('Error in documentChats:get:', error);
      return [];
    }
  });
  
  ipcMain.handle('documentChats:save', async (event, filePath, sessions) => {
    try {
      console.log("documentChats:save called with filepath type:", typeof filePath);
      
      // DEBUG: Log the detailed object structure if it's an object
      if (typeof filePath === 'object') {
        console.log("Object details:", JSON.stringify(filePath, null, 2));
      }
      
      // Handle both string paths and objects with path property  
      let pathString;
      
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log(`documentChats:save - Using path property: ${pathString}`);
      } else {
        // Try to convert to string
        try {
          pathString = String(filePath || '');
          console.log(`documentChats:save - Converted to string: ${pathString}`);
        } catch (e) {
          console.error('documentChats:save - Could not convert filePath to string:', e);
          return false;
        }
      }
      
      if (!pathString || pathString.trim() === '') {
        console.error('documentChats:save called with empty path');
        return false;
      }
      
      if (!sessions || !Array.isArray(sessions)) {
        console.error('documentChats:save called with invalid sessions data:', typeof sessions);
        return false;
      }
      
      // Sanitize path for use as object key
      const sanitizedPath = pathString.replace(/[.]/g, '_');
      
      // Save the chat sessions for this document
      console.log(`Saving ${sessions.length} chat sessions for ${sanitizedPath}`);
      store.set(`documentSpecificData.${sanitizedPath}.chatSessions`, sessions);
      return true;
    } catch (error) {
      console.error('Error in documentChats:save:', error);
      return false;
    }
  });
  
  ipcMain.handle('documentHighlights:get', async (event, filePath) => {
    try {
      console.log("documentHighlights:get called with filepath type:", typeof filePath);
      
      // DEBUG: Log the detailed object structure if it's an object
      if (typeof filePath === 'object') {
        console.log("Object details:", JSON.stringify(filePath, null, 2));
      }

      // Handle both string paths and objects with path property
      let pathString;
      
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log(`documentHighlights:get - Using path property: ${pathString}`);
      } else {
        // Try to convert to string
        try {
          pathString = String(filePath || '');
          console.log(`documentHighlights:get - Converted to string: ${pathString}`);
        } catch (e) {
            console.error('documentHighlights:get - Could not convert filePath to string:', e);
            return [];
        }
      }
      
      if (!pathString || pathString.trim() === '') {
        console.error('documentHighlights:get called with empty path');
        return [];
      }
      
      // Sanitize path for use as object key
      const sanitizedPath = pathString.replace(/[.]/g, '_');
      
      // Get the highlights for this document
      console.log(`Getting highlights for document: ${sanitizedPath}`);
      const docData = store.get(`documentSpecificData.${sanitizedPath}`, { highlights: [] });
      return docData.highlights || [];
    } catch (error) {
      console.error('Error in documentHighlights:get:', error);
      return [];
    }
  });
  
  ipcMain.handle('document:getLastViewedPage', async (event, filePath) => {
    try {
      let pathString;
      
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
      } else {
        pathString = String(filePath || '');
      }
      
      if (!pathString || pathString.trim() === '') {
        return 1;
      }
      
      // Sanitize path for use as object key
      const sanitizedPath = pathString.replace(/[.]/g, '_');
      
      // Get the last viewed page for this document
      const docData = store.get(`documentSpecificData.${sanitizedPath}`, {});
      return docData.lastViewedPage || 1;
    } catch (error) {
      console.error('Error in document:getLastViewedPage:', error);
      return 1;
    }
  });
  
  ipcMain.handle('document:saveLastViewedPage', async (event, filePath, pageNumber) => {
    try {
      let pathString;
      
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
      } else {
        pathString = String(filePath || '');
      }
      
      if (!pathString || pathString.trim() === '') {
        return false;
      }
      
      // Sanitize path for use as object key
      const sanitizedPath = pathString.replace(/[.]/g, '_');
      
      // Save the last viewed page
      store.set(`documentSpecificData.${sanitizedPath}.lastViewedPage`, pageNumber);
      return true;
    } catch (error) {
      console.error('Error in document:saveLastViewedPage:', error);
      return false;
    }
  });
  
  ipcMain.handle('documentHighlights:save', async (event, filePath, highlights) => {
    try {
      console.log("documentHighlights:save called with filepath type:", typeof filePath);
      
      // DEBUG: Log the detailed object structure if it's an object
      if (typeof filePath === 'object') {
        console.log("Object details:", JSON.stringify(filePath, null, 2));
      }

      // Handle both string paths and objects with path property  
      let pathString;
      
      if (typeof filePath === 'string') {
        pathString = filePath;
      } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
        pathString = filePath.path;
        console.log(`documentHighlights:save - Using path property: ${pathString}`);
      } else {
        // Try to convert to string
        try {
          pathString = String(filePath || '');
          console.log(`documentHighlights:save - Converted to string: ${pathString}`);
        } catch (e) {
            console.error('documentHighlights:save - Could not convert filePath to string:', e);
            return false;
        }
      }
      
      if (!pathString || pathString.trim() === '') {
        console.error('documentHighlights:save called with empty path');
        return false;
      }
      
      if (!highlights || !Array.isArray(highlights)) {
        console.error('documentHighlights:save called with invalid highlights data:', typeof highlights);
        return false;
      }
      
      // Sanitize path for use as object key
      const sanitizedPath = pathString.replace(/[.]/g, '_');
      
      // Save the highlights for this document
      console.log(`Saving ${highlights.length} highlights for ${sanitizedPath}`);
      store.set(`documentSpecificData.${sanitizedPath}.highlights`, highlights);
      return true;
    } catch (error) {
      console.error('Error in documentHighlights:save:', error);
      return false;
    }
  });

  console.log("IPC handlers setup complete (ai:explain & ai:chat use streaming).");
}

// Helper functions for recent documents
function addRecentDocument(filePath) {
  if (!filePath) return;
  
  try {
    console.log("addRecentDocument called with:", typeof filePath, filePath);
    
    // DEBUG: Log the detailed object structure if it's an object
    if (typeof filePath === 'object') {
      console.log("Object details:", JSON.stringify(filePath, null, 2));
    }
    
    // Ensure filePath is a string
    let filePathString;
    if (typeof filePath === 'string') {
      filePathString = filePath;
    } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
      console.log("Converting object to path string in addRecentDocument:", filePath.path);
      filePathString = filePath.path;
    } else {
      console.error('Invalid filePath type in addRecentDocument:', typeof filePath);
      // Try to convert to string as a last resort
      try {
        filePathString = String(filePath);
        console.log("Converted filePath to string:", filePathString);
      } catch (e) {
        console.error("Failed to convert filePath to string:", e);
        return;
      }
    }
    
    // Validate that filePath is non-empty string
    if (!filePathString || filePathString.trim() === '') {
      console.error('Empty filePath in addRecentDocument');
      return;
    }
    
    // Replace original reference with the string version
    filePath = filePathString;
    
    // Get the file name from the path
    const name = path.basename(filePath);
    
    // Create the document info - always store both separately
    const docInfo = {
      path: filePath,   // Store the full path for file operations
      name,             // Name is for display and as a backup for path
      lastAccessed: new Date().toISOString()
    };
    
    // Log the document info that will be stored
    console.log("Adding document info to recent documents:", {
      path: docInfo.path,
      name: docInfo.name,
      lastAccessed: docInfo.lastAccessed
    });
    
    // Get current list of recent documents
    let recentDocs = store.get('recentDocuments', []);
    
    // Ensure recentDocs is an array
    if (!Array.isArray(recentDocs)) {
      console.warn('recentDocuments was not an array, resetting to empty array');
      recentDocs = [];
    }
    
    // Check if this document is already in the list
    const existingIndex = recentDocs.findIndex(doc => 
      doc && typeof doc === 'object' && doc.path === filePath
    );
    
    if (existingIndex >= 0) {
      // Remove the existing entry
      recentDocs.splice(existingIndex, 1);
    }
    
    // Add the document to the beginning of the list
    recentDocs.unshift(docInfo);
    
    // Ensure the list doesn't exceed 10 items
    if (recentDocs.length > 10) {
      recentDocs = recentDocs.slice(0, 10);
    }
    
    // Save the updated list
    store.set('recentDocuments', recentDocs);
    console.log(`Added/updated ${name} in recent documents list. Total: ${recentDocs.length}`);
  } catch (error) {
    console.error('Error in addRecentDocument:', error);
  }
}

function getRecentDocuments() {
  return store.get('recentDocuments', []);
}

function removeRecentDocument(filePath) {
  if (!filePath) return false;
  
  try {
    // Ensure filePath is a string
    let filePathString;
    if (typeof filePath === 'string') {
      filePathString = filePath;
    } else if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
      console.log("Converting object to path string in removeRecentDocument:", filePath.path);
      filePathString = filePath.path;
    } else {
      console.error('Invalid filePath type in removeRecentDocument:', typeof filePath);
      // Try to convert to string as a last resort
      try {
        filePathString = String(filePath);
        console.log("Converted filePath to string:", filePathString);
      } catch (e) {
        console.error("Failed to convert filePath to string:", e);
        return false;
      }
    }
    
    // Validate that filePath is non-empty string
    if (!filePathString || filePathString.trim() === '') {
      console.error('Empty filePath in removeRecentDocument');
      return false;
    }
    
    // Get current list of recent documents
    let recentDocs = store.get('recentDocuments', []);
    
    // Ensure recentDocs is an array
    if (!Array.isArray(recentDocs)) {
      console.warn('recentDocuments was not an array, nothing to remove');
      return false;
    }
    
    // Filter out the document with the matching path
    const updatedDocs = recentDocs.filter(doc => 
      !(doc && typeof doc === 'object' && doc.path === filePathString)
    );
    
    // If the length hasn't changed, we didn't find the document
    if (updatedDocs.length === recentDocs.length) {
      console.log(`Document with path ${filePathString} not found in recent documents`);
      return false;
    }
    
    // Save the updated list
    store.set('recentDocuments', updatedDocs);
    console.log(`Removed document with path ${filePathString} from recent documents list. Remaining: ${updatedDocs.length}`);
    
    // Also remove any document-specific data
    removeDocumentData(filePathString);
    
    return true;
  } catch (error) {
    console.error('Error in removeRecentDocument:', error);
    return false;
  }
}

function getDocumentChats(filePath) {
  if (!filePath) return [];
  // Sanitize path for use as object key (same as in IPC handlers)
  const sanitizedPath = filePath.replace(/[.]/g, '_');
  const docData = store.get(`documentSpecificData.${sanitizedPath}`, { chatSessions: [] });
  return docData.chatSessions || [];
}

function saveDocumentChats(filePath, sessions) {
  if (!filePath) return false;
  // Sanitize path for use as object key (same as in IPC handlers)
  const sanitizedPath = filePath.replace(/[.]/g, '_');
  store.set(`documentSpecificData.${sanitizedPath}.chatSessions`, sessions);
  return true;
}

function removeDocumentData(filePath) {
  if (!filePath) return false;
  
  // Sanitize path for use as object key (same as in IPC handlers)
  const sanitizedPath = filePath.replace(/[.]/g, '_');
  
  // Get current document-specific data
  const docData = store.get('documentSpecificData', {});
  
  // Delete this document's data
  if (docData[sanitizedPath]) {
    delete docData[sanitizedPath];
    store.set('documentSpecificData', docData);
    console.log(`Removed data for ${filePath}`);
    return true;
  }
  return false;
}

// Save state before app close
app.on('before-quit', () => {
  console.log('Application is about to quit, saving state...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Send an event to the renderer to trigger final state saving
    mainWindow.webContents.send('app:before-quit');
  }
});

// Standard Electron event handlers
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
