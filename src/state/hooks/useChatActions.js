import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from '../slices/chatSlice';

export const useChatActions = () => {
  const dispatch = useDispatch();
  const {
    sessions,
    currentSessionIndex,
    isTyping,
    selectedStyle,
    customPrompt,
  } = useSelector((state) => state.chat);

  const currentSession = sessions[currentSessionIndex];

  const createNewChat = useCallback(() => {
    dispatch(addSession());
  }, [dispatch]);

  const switchChat = useCallback((index) => {
    dispatch(setCurrentSession(index));
  }, [dispatch]);

  const deleteChat = useCallback((index) => {
    dispatch(removeSession(index));
  }, [dispatch]);

  const sendUserMessage = useCallback((text) => {
    dispatch(addUserMessage({ text }));
  }, [dispatch]);

  const sendAIMessage = useCallback((text, isError = false) => {
    dispatch(addAIMessage({ text, isError }));
  }, [dispatch]);

  const setTypingStatus = useCallback((status) => {
    dispatch(setIsTyping(status));
  }, [dispatch]);

  const changeSelectedStyle = useCallback((style) => {
    dispatch(setSelectedStyle(style));
  }, [dispatch]);

  const updateCustomPrompt = useCallback((prompt) => {
    dispatch(setCustomPrompt(prompt));
  }, [dispatch]);

  const clearChat = useCallback(() => {
    dispatch(clearCurrentChat());
  }, [dispatch]);

  const renameChat = useCallback((index, title) => {
    dispatch(renameSession({ index, title }));
  }, [dispatch]);

  // Helper function to find an empty chat session
  const findEmptyChat = useCallback(() => {
    const emptyIndex = sessions.findIndex(session => session.messages.length === 0);
    return emptyIndex;
  }, [sessions]);

  // Switch to an empty chat or create a new one if none exists
  const switchToEmptyChat = useCallback(() => {
    const emptyIndex = findEmptyChat();
    if (emptyIndex !== -1) {
      dispatch(setCurrentSession(emptyIndex));
      return true;
    } else {
      dispatch(addSession());
      return true;
    }
  }, [dispatch, findEmptyChat]);

  return {
    // State
    sessions,
    currentSessionIndex,
    currentSession,
    isTyping,
    selectedStyle,
    customPrompt,
    
    // Actions
    createNewChat,
    switchChat,
    deleteChat,
    sendUserMessage,
    sendAIMessage,
    setTypingStatus,
    changeSelectedStyle,
    updateCustomPrompt,
    clearChat,
    renameChat,
    findEmptyChat,
    switchToEmptyChat,
  };
}; 