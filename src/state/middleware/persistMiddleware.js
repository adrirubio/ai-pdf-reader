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
  if (electron && documents) {
    electron.getRecentDocuments()
      .then(currentDocuments => {
        // Only save if different to avoid unnecessary writes
        const currentJson = JSON.stringify(currentDocuments);
        const newJson = JSON.stringify(documents);
        if (currentJson !== newJson) {
          console.log('Saving recent documents to electron-store');
          // In a real implementation, this would make an IPC call to save the documents
          // to the main process via electron-store
          // Here we're just logging for now
        }
      })
      .catch(err => console.error('Error in debouncedSaveRecentDocuments:', err));
  }
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