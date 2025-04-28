const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

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

  // Handle AI API requests
  ipcMain.handle('ai:explain', async (event, text, style) => {
    console.log("ai:explain was called with style:", style);
    try {
      // Simple mock response
      const response = `Here's a simple explanation of the text you selected: 
      
This appears to discuss ${text.length > 100 ? text.substring(0, 100) + '...' : text}. 

The key points are:
- This text discusses important concepts
- It contains valuable information
- Understanding it requires careful reading

Would you like me to explain any specific part in more detail?`;
      
      return { explanation: response };
    } catch (error) {
      console.error('Error in AI explain:', error);
      return { error: error.message };
    }
  });
  
  console.log("IPC handlers setup complete");
}

// Standard Electron event handlers
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
