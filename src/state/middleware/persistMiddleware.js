/**
 * Redux middleware to automatically persist state changes to electron-store
 * This implements Task 2.3 in the recent-documents-plan.md
 */

// Action types that should trigger saving recent documents
const SAVE_RECENT_DOCUMENTS_ACTIONS = [
  'pdf/loadRecentDocuments',
  'pdf/addOrUpdateRecentDocument',
  'pdf/removeRecentDocument',
  'pdf/clearRecentDocuments',
];

// Action types that should trigger saving document-specific chat sessions
const SAVE_DOCUMENT_CHATS_ACTIONS = [
  'chat/addSession',
  'chat/removeSession',
  'chat/addUserMessage',
  'chat/addAIMessage',
  'chat/clearCurrentChat',
  'chat/renameSession',
];

// Debounce function to avoid excessive saves
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Create debounced save functions
const debouncedSaveRecentDocuments = debounce((electron, documents) => {
  // Recent documents are already saved directly in main.js when added/removed
  // This is kept for consistency but may not be needed
  console.log('Recent documents are persisted directly in main process');
}, 500);

const debouncedSaveDocumentChats = debounce((electron, filePath, sessions) => {
  if (electron && filePath && sessions) {
    console.log(`Saving chat sessions for ${filePath} to electron-store`);
    electron.saveDocumentChats(filePath, sessions)
      .catch(err => console.error('Error in debouncedSaveDocumentChats:', err));
  }
}, 500);

// The middleware function
export const persistMiddleware = store => next => action => {
  // Call next with the action first so the state is updated
  const result = next(action);
  
  // Check if we have access to the electron API
  const electron = window.electron;
  if (!electron) {
    console.warn('persistMiddleware: electron API not available');
    return result;
  }
  
  // After state update, check if we need to persist anything
  const state = store.getState();
  
  // Save recent documents if the action is in our list
  if (SAVE_RECENT_DOCUMENTS_ACTIONS.includes(action.type)) {
    debouncedSaveRecentDocuments(electron, state.pdf.recentDocuments);
  }
  
  // Save document-specific chat sessions if the action is in our list
  // and there's an active document
  if (SAVE_DOCUMENT_CHATS_ACTIONS.includes(action.type) && state.chat.activeDocumentPath) {
    debouncedSaveDocumentChats(electron, state.chat.activeDocumentPath, state.chat.sessions);
  }
  
  return result;
};

export default persistMiddleware;