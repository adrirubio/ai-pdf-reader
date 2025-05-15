import { configureStore } from '@reduxjs/toolkit';
import pdfReducer from './slices/pdfSlice';
import chatReducer from './slices/chatSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';

// Middleware for handling persistence
const persistenceMiddleware = store => next => action => {
  // Process the action normally first
  const result = next(action);
  
  // After action is processed, check if we need to persist data
  const state = store.getState();
  
  // Get the electron APIs from window
  const electron = window.electron;
  if (!electron || !electron.storage) {
    console.warn('Electron storage API not available');
    return result;
  }
  
  // Handle actions for PDF slice that require persistence
  if (action.type === 'pdf/addOrUpdateRecentDocument') {
    // Recent documents are already updated in the state
    // Just need to make sure they're consistent with storage
    electron.storage.getRecentDocuments()
      .then(recentDocs => {
        if (JSON.stringify(recentDocs) !== JSON.stringify(state.pdf.recentDocuments)) {
          // If different, sync from redux to storage (should be rare)
          // This ensures consistency if there were other changes outside Redux
          const docsToStore = state.pdf.recentDocuments;
          console.log('Syncing recent documents to storage:', docsToStore.length);
        }
      })
      .catch(err => console.error('Error syncing recent documents:', err));
  }
  
  // Handle actions for chat slice that modify chat sessions
  if (
    state.chat.activeDocumentPath && 
    (
      action.type === 'chat/addSession' ||
      action.type === 'chat/removeSession' ||
      action.type === 'chat/addUserMessage' ||
      action.type === 'chat/addAIMessage' ||
      action.type === 'chat/clearCurrentChat' ||
      action.type === 'chat/renameSession' ||
      action.type === 'chat/setHighlightForCurrentSession'
    )
  ) {
    // Save chat sessions for active document
    const { activeDocumentPath, sessions } = state.chat;
    console.log(`Saving ${sessions.length} chat sessions for: ${activeDocumentPath}`);
    
    electron.storage.saveDocumentChats(activeDocumentPath, sessions)
      .catch(err => console.error('Error saving chat sessions:', err));
  }
  
  return result;
};

export const store = configureStore({
  reducer: {
    pdf: pdfReducer,
    chat: chatReducer,
    ui: uiReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types as they might contain non-serializable data
        ignoredActions: ['pdf/setPdfDocument'],
        // Ignore these paths in the state
        ignoredPaths: ['pdf.pdfDocument'],
      },
    }).concat(persistenceMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Load initial data from persistent storage when the app starts
const initializeFromStorage = async () => {
  try {
    const electron = window.electron;
    if (!electron || !electron.storage) {
      console.warn('Electron storage API not available for initialization');
      return;
    }
    
    // Load recent documents
    const recentDocs = await electron.storage.getRecentDocuments();
    if (recentDocs && recentDocs.length > 0) {
      store.dispatch({ type: 'pdf/loadRecentDocuments', payload: recentDocs });
      console.log(`Loaded ${recentDocs.length} recent documents from storage`);
    }
  } catch (error) {
    console.error('Error initializing data from storage:', error);
  }
};

// Initialize data from storage when this module is loaded
// This will run when the app starts
setTimeout(initializeFromStorage, 500); // Small delay to ensure electron API is available

export default store; 