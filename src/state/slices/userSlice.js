import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  preferences: {
    defaultExplanationStyle: 'simple', // simple, detailed, technical
    defaultScale: 1.5, // Default zoom level
    fontSizePDF: 'medium', // small, medium, large
    aiResponseStyle: 'conversational', // conversational, concise, academic
  },
  settings: {
    autoOpenAIPanel: true, // Automatically open AI panel when text is selected
    smoothScrolling: true,
    confirmBeforeClosing: true,
  },
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setDefaultExplanationStyle: (state, action) => {
      state.preferences.defaultExplanationStyle = action.payload;
    },
    setDefaultScale: (state, action) => {
      state.preferences.defaultScale = action.payload;
    },
    setFontSizePDF: (state, action) => {
      state.preferences.fontSizePDF = action.payload;
    },
    setAIResponseStyle: (state, action) => {
      state.preferences.aiResponseStyle = action.payload;
    },
    setAutoOpenAIPanel: (state, action) => {
      state.settings.autoOpenAIPanel = action.payload;
    },
    setSmoothScrolling: (state, action) => {
      state.settings.smoothScrolling = action.payload;
    },
    setConfirmBeforeClosing: (state, action) => {
      state.settings.confirmBeforeClosing = action.payload;
    },
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    updateSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    resetUserPreferences: (state) => {
      state.preferences = initialState.preferences;
    },
    resetUserSettings: (state) => {
      state.settings = initialState.settings;
    },
    resetUserState: (state) => {
      return initialState;
    },
  },
});

export const {
  setDefaultExplanationStyle,
  setDefaultScale,
  setFontSizePDF,
  setAIResponseStyle,
  setAutoOpenAIPanel,
  setSmoothScrolling,
  setConfirmBeforeClosing,
  updatePreferences,
  updateSettings,
  resetUserPreferences,
  resetUserSettings,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer; 