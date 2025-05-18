import { createSlice } from '@reduxjs/toolkit';

// Helper function to generate a simple UUID for chat sessions
const generateId = () => Math.random().toString(36).substr(2, 9);

const initialState = {
  sessions: [
    { id: generateId(), title: 'Chat 1', messages: [], highlightId: null, createdAt: new Date().toISOString() }
  ],
  currentSessionIndex: 0,
  isTyping: false,
  selectedStyle: 'simple',
  customPrompt: '',
  sessionCount: 1,
  activeDocumentPath: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveDocument: (state, action) => {
      try {
        const { filePath, initialSessions } = action.payload || {};
        // Ensure filePath is a string
        state.activeDocumentPath = typeof filePath === 'string' ? filePath : String(filePath || '');
        
        // Clear existing sessions and populate with document-specific sessions
        if (initialSessions && Array.isArray(initialSessions)) {
          // Create clean copies of each session to avoid circular references
          const cleanSessions = initialSessions.map(session => ({
            id: session.id || generateId(),
            title: session.title || 'Untitled Chat',
            highlightId: session.highlightId || null,
            createdAt: session.createdAt || new Date().toISOString(),
            messages: Array.isArray(session.messages) ? session.messages.map(msg => ({
              id: msg.id || Date.now(),
              type: msg.type || 'user',
              content: msg.content || '',
              timestamp: msg.timestamp || new Date().toISOString(),
              isError: !!msg.isError
            })) : []
          }));
          state.sessions = cleanSessions;
        } else {
          // If no sessions provided, create a default empty one
          state.sessions = [{ 
            id: generateId(), 
            title: 'Chat 1', 
            messages: [], 
            highlightId: null, 
            createdAt: new Date().toISOString() 
          }];
        }
        state.currentSessionIndex = 0;
      } catch (error) {
        console.error('Error in setActiveDocument reducer:', error);
        // Fallback to a safe state
        state.activeDocumentPath = '';
        state.sessions = [{ 
          id: generateId(), 
          title: 'Chat 1', 
          messages: [], 
          highlightId: null, 
          createdAt: new Date().toISOString() 
        }];
        state.currentSessionIndex = 0;
      }
    },
    
    clearActiveDocument: (state) => {
      try {
        state.activeDocumentPath = null;
        state.sessions = [{ 
          id: generateId(), 
          title: 'Chat 1', 
          messages: [], 
          highlightId: null, 
          createdAt: new Date().toISOString() 
        }];
        state.currentSessionIndex = 0;
        state.sessionCount = 1;
      } catch (error) {
        console.error('Error in clearActiveDocument reducer:', error);
        // Ensure we reset to a known good state
        state.activeDocumentPath = null;
        state.sessions = [{ 
          id: generateId(), 
          title: 'Chat 1', 
          messages: [], 
          highlightId: null, 
          createdAt: new Date().toISOString() 
        }];
        state.currentSessionIndex = 0;
        state.sessionCount = 1;
      }
    },
    addSession: (state, action) => {
      const newSessionCount = state.sessionCount + 1;
      const payload = action.payload || {};
      const newSession = {
        id: generateId(),
        title: payload.title || `Chat ${newSessionCount}`,
        messages: payload.messages || [],
        highlightId: payload.highlightId || null,
        createdAt: new Date().toISOString()
      };
      state.sessions.push(newSession);
      state.currentSessionIndex = state.sessions.length - 1;
      state.sessionCount = newSessionCount;
    },
    setCurrentSession: (state, action) => {
      state.currentSessionIndex = action.payload;
    },
    removeSession: (state, action) => {
      // If there's only one session, just clear its messages
      if (state.sessions.length <= 1) {
        state.sessions = [{ 
          id: generateId(), 
          title: 'Chat 1', 
          messages: [], 
          highlightId: null, 
          createdAt: new Date().toISOString() 
        }];
        state.currentSessionIndex = 0;
        return;
      }
      
      const indexToRemove = action.payload !== undefined 
        ? action.payload 
        : state.currentSessionIndex;
      
      state.sessions = state.sessions.filter((_, index) => index !== indexToRemove);
      
      // Update titles for remaining sessions
      state.sessions = state.sessions.map((session, index) => ({
        ...session,
        title: `Chat ${index + 1}`
      }));
      
      // Adjust current index if needed
      if (state.currentSessionIndex >= state.sessions.length) {
        state.currentSessionIndex = state.sessions.length - 1;
      }
    },
    addUserMessage: (state, action) => {
      const { text } = action.payload;
      state.sessions[state.currentSessionIndex].messages.push({
        id: Date.now(),
        type: 'user',
        content: text,
        timestamp: new Date().toISOString()
      });
    },
    addAIMessage: (state, action) => {
      const { text, isError = false } = action.payload;
      state.sessions[state.currentSessionIndex].messages.push({
        id: Date.now(),
        type: 'ai',
        content: text,
        timestamp: new Date().toISOString(),
        isError
      });
    },
    setIsTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    setSelectedStyle: (state, action) => {
      state.selectedStyle = action.payload;
    },
    setCustomPrompt: (state, action) => {
      state.customPrompt = action.payload;
    },
    clearCurrentChat: (state) => {
      state.sessions[state.currentSessionIndex].messages = [];
    },
    renameSession: (state, action) => {
      const { index, title } = action.payload;
      state.sessions[index].title = title;
    },
  },
});

export const {
  setActiveDocument,
  clearActiveDocument,
  addSession,
  setCurrentSession,
  removeSession,
  addUserMessage,
  addAIMessage,
  setIsTyping,
  setSelectedStyle,
  setCustomPrompt,
  clearCurrentChat,
  renameSession,
} = chatSlice.actions;

export default chatSlice.reducer; 