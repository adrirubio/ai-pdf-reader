import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from '../slices/uiSlice';

export const useUIActions = () => {
  const dispatch = useDispatch();
  const {
    showLanding,
    showAIPanel,
    showStyleChooser,
    showCustomPrompt,
    darkMode,
    menuOpen,
    sidebarWidth,
  } = useSelector((state) => state.ui);

  const navigateToLanding = useCallback(() => {
    dispatch(setShowLanding(true));
    dispatch(setShowAIPanel(false));
  }, [dispatch]);

  const navigateToPdfViewer = useCallback(() => {
    dispatch(setShowLanding(false));
  }, [dispatch]);

  const toggleAIPanel = useCallback(() => {
    dispatch(setShowAIPanel(!showAIPanel));
  }, [dispatch, showAIPanel]);

  const openAIPanel = useCallback(() => {
    dispatch(setShowAIPanel(true));
  }, [dispatch]);

  const closeAIPanel = useCallback(() => {
    dispatch(setShowAIPanel(false));
  }, [dispatch]);

  const toggleStyleChooser = useCallback(() => {
    dispatch(setShowStyleChooser(!showStyleChooser));
  }, [dispatch, showStyleChooser]);

  const showStyleChooserPanel = useCallback((show) => {
    dispatch(setShowStyleChooser(show));
  }, [dispatch]);

  const toggleCustomPromptPanel = useCallback(() => {
    dispatch(setShowCustomPrompt(!showCustomPrompt));
  }, [dispatch, showCustomPrompt]);

  const showCustomPromptPanel = useCallback((show) => {
    dispatch(setShowCustomPrompt(show));
  }, [dispatch]);

  const switchTheme = useCallback(() => {
    dispatch(toggleDarkMode());
  }, [dispatch]);

  const setTheme = useCallback((isDark) => {
    dispatch(setDarkMode(isDark));
  }, [dispatch]);

  const toggleSidebar = useCallback(() => {
    dispatch(toggleMenu());
  }, [dispatch]);

  const showSidebar = useCallback((show) => {
    dispatch(setMenuOpen(show));
  }, [dispatch]);

  const resizeSidebar = useCallback((width) => {
    dispatch(setSidebarWidth(width));
  }, [dispatch]);

  const resetUIState = useCallback(() => {
    dispatch(resetUI());
  }, [dispatch]);

  return {
    // State
    showLanding,
    showAIPanel,
    showStyleChooser,
    showCustomPrompt,
    darkMode,
    menuOpen,
    sidebarWidth,
    
    // Actions
    navigateToLanding,
    navigateToPdfViewer,
    toggleAIPanel,
    openAIPanel,
    closeAIPanel,
    toggleStyleChooser,
    showStyleChooserPanel,
    toggleCustomPromptPanel,
    showCustomPromptPanel,
    switchTheme,
    setTheme,
    toggleSidebar,
    showSidebar,
    resizeSidebar,
    resetUIState,
  };
}; 