import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showLanding: true,
  showAIPanel: false,
  showStyleChooser: false, 
  showCustomPrompt: false,
  darkMode: true, // Default to dark mode based on current app styling
  menuOpen: false,
  sidebarWidth: 600, // Current width of the AI panel in pixels
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setShowLanding: (state, action) => {
      state.showLanding = action.payload;
    },
    setShowAIPanel: (state, action) => {
      state.showAIPanel = action.payload;
    },
    setShowStyleChooser: (state, action) => {
      state.showStyleChooser = action.payload;
    },
    setShowCustomPrompt: (state, action) => {
      state.showCustomPrompt = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
    },
    toggleMenu: (state) => {
      state.menuOpen = !state.menuOpen;
    },
    setMenuOpen: (state, action) => {
      state.menuOpen = action.payload;
    },
    setSidebarWidth: (state, action) => {
      state.sidebarWidth = action.payload;
    },
    resetUI: (state) => {
      return initialState;
    },
  },
});

export const {
  setShowLanding,
  setShowAIPanel,
  setShowStyleChooser,
  setShowCustomPrompt,
  toggleDarkMode,
  setDarkMode,
  toggleMenu,
  setMenuOpen,
  setSidebarWidth,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer; 