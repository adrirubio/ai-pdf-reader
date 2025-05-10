const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const aiService = require('./services/aiService.js');

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

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();
  
  // Set up IPC handlers after window creation
  setupHandlers();
});

function setupHandlers() {
  console.log("Setting up IPC handlers...");
  
  // Handle file open dialog
  ipcMain.handle('dialog:openFile', async () => {
    console.log("dialog:openFile was called");
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (!canceled) {
      console.log("Selected file:", filePaths[0]);
      return filePaths[0];
    }
    return null;
  });

  // Handle PDF file reading
  ipcMain.handle('pdf:readFile', async (event, filePath) => {
    console.log("pdf:readFile was called for:", filePath);
    try {
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
  
  console.log("IPC handlers setup complete (ai:explain & ai:chat use streaming).");
}

// Standard Electron event handlers
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
