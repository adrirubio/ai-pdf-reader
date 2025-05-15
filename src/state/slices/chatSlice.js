import { createSlice } from '@reduxjs/toolkit';

// Helper function to generate a simple UUID for chat sessions
const generateId = () => Math.random().toString(36).substr(2, 9);

const initialState = {
  sessions: [
    { id: generateId(), title: 'Chat 1', messages: [] }
  ],
  currentSessionIndex: 0,
  isTyping: false,
  selectedStyle: 'simple',
  customPrompt: '',
  sessionCount: 1,
  activeDocumentPath: null, // Track the current active document
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addSession: (state) => {
      const newSessionCount = state.sessionCount + 1;
      const newSession = {
        id: generateId(),
        title: `Chat ${newSessionCount}`,
        messages: [],
        highlightId: null, // Add highlightId for cross-reference
        createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
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
    // New actions for document-specific chats
    setActiveDocument: (state, action) => {
      const { filePath, initialSessions } = action.payload;
      state.activeDocumentPath = filePath;
      
      // If sessions are provided, use them; otherwise, initialize with one empty chat
      if (initialSessions && initialSessions.length > 0) {
        state.sessions = initialSessions;
        // Update sessionCount based on the highest chat number
        state.sessionCount = Math.max(
          ...initialSessions.map(session => {
            const match = session.title.match(/Chat (\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          }), 
          0
        );
      } else {
        // Initialize with one empty chat
        state.sessions = [{ 
          id: generateId(), 
          title: 'Chat 1', 
          messages: [],
          highlightId: null,
          createdAt: new Date().toISOString(),
        }];
        state.sessionCount = 1;
      }
      
      state.currentSessionIndex = 0;
    },
    clearActiveDocument: (state) => {
      state.activeDocumentPath = null;
      state.sessions = initialState.sessions;
      state.currentSessionIndex = 0;
      state.sessionCount = 1;
    },
    setHighlightForCurrentSession: (state, action) => {
      state.sessions[state.currentSessionIndex].highlightId = action.payload;
    },
  },
});

export const {
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
  setActiveDocument,
  clearActiveDocument,
  setHighlightForCurrentSession,
} = chatSlice.actions;

export default chatSlice.reducer; 