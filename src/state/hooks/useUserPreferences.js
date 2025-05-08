import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from '../slices/userSlice';

export const useUserPreferences = () => {
  const dispatch = useDispatch();
  const { preferences, settings } = useSelector((state) => state.user);

  // Preferences actions
  const changeExplanationStyle = useCallback((style) => {
    dispatch(setDefaultExplanationStyle(style));
  }, [dispatch]);

  const changeDefaultScale = useCallback((scale) => {
    dispatch(setDefaultScale(scale));
  }, [dispatch]);

  const changeFontSize = useCallback((size) => {
    dispatch(setFontSizePDF(size));
  }, [dispatch]);

  const changeAIResponseStyle = useCallback((style) => {
    dispatch(setAIResponseStyle(style));
  }, [dispatch]);

  const updateAllPreferences = useCallback((newPreferences) => {
    dispatch(updatePreferences(newPreferences));
  }, [dispatch]);

  const resetPreferences = useCallback(() => {
    dispatch(resetUserPreferences());
  }, [dispatch]);

  // Settings actions
  const toggleAutoOpenAIPanel = useCallback(() => {
    dispatch(setAutoOpenAIPanel(!settings.autoOpenAIPanel));
  }, [dispatch, settings.autoOpenAIPanel]);

  const setAutoOpen = useCallback((autoOpen) => {
    dispatch(setAutoOpenAIPanel(autoOpen));
  }, [dispatch]);

  const toggleSmoothScrolling = useCallback(() => {
    dispatch(setSmoothScrolling(!settings.smoothScrolling));
  }, [dispatch, settings.smoothScrolling]);

  const setSmoothScroll = useCallback((smoothScroll) => {
    dispatch(setSmoothScrolling(smoothScroll));
  }, [dispatch]);

  const toggleConfirmBeforeClosing = useCallback(() => {
    dispatch(setConfirmBeforeClosing(!settings.confirmBeforeClosing));
  }, [dispatch, settings.confirmBeforeClosing]);

  const setConfirmClose = useCallback((confirmClose) => {
    dispatch(setConfirmBeforeClosing(confirmClose));
  }, [dispatch]);

  const updateAllSettings = useCallback((newSettings) => {
    dispatch(updateSettings(newSettings));
  }, [dispatch]);

  const resetSettings = useCallback(() => {
    dispatch(resetUserSettings());
  }, [dispatch]);

  // Reset all user state
  const resetAll = useCallback(() => {
    dispatch(resetUserState());
  }, [dispatch]);

  return {
    // State
    preferences,
    settings,
    
    // Preference actions
    changeExplanationStyle,
    changeDefaultScale,
    changeFontSize,
    changeAIResponseStyle,
    updateAllPreferences,
    resetPreferences,
    
    // Settings actions
    toggleAutoOpenAIPanel,
    setAutoOpen,
    toggleSmoothScrolling,
    setSmoothScroll,
    toggleConfirmBeforeClosing,
    setConfirmClose,
    updateAllSettings,
    resetSettings,
    
    // Combined actions
    resetAll,
  };
}; 