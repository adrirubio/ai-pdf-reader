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
        messages: []
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
        state.sessions = [{ id: generateId(), title: 'Chat 1', messages: [] }];
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