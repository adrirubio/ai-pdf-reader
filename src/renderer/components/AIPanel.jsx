import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// Small UUID helper
const uuid = () => Math.random().toString(36).substr(2, 9);

const AIPanel = forwardRef(({
  selectedText,
  selectedStyle,
  customPrompt,
  setCustomPrompt,
  onClose,
  newChatCount
}, ref) => {
  // multiple chat sessions
  const [sessions, setSessions] = useState([
    { id: uuid(), title: 'Chat 1', messages: [] }
  ]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showStyleChooser, setShowStyleChooser] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const customPromptRef = useRef(null);
  const [lastSelectedText, setLastSelectedText] = useState('');

  // Ref to keep track of the current streaming AI message ID and its stream ID (for EXPLAIN)
  const currentStreamingMessageRef = useRef({ messageId: null, streamId: null });

  // Ref to track the active stream ID for CHAT
  const activeChatStreamIdRef = useRef(null);

  // --- Callbacks for EXPLAIN stream ---
  const handleExplainChunk = useCallback((chunk) => {
    const { streamId: chunkStreamId, type, content, isLastChunk } = chunk;
    const activeMessageId = currentStreamingMessageRef.current.messageId;
    const activeStreamId = currentStreamingMessageRef.current.streamId;
    if (chunkStreamId !== activeStreamId || !activeMessageId) return;
    setSessions(prevSessions => {
      const sessionIndexToUpdate = currentIdx;
      const newSessions = [...prevSessions];
      const currentSession = newSessions[sessionIndexToUpdate];
      if (!currentSession) return prevSessions;
      const msgIndex = currentSession.messages.findIndex(m => m.id === activeMessageId && m.type === 'ai');
      if (msgIndex === -1) return prevSessions;
      const existingMessage = currentSession.messages[msgIndex];
      let updatedMessage = { ...existingMessage };
      if (type === 'error') {
        updatedMessage.content = `Error: ${content}`;
        updatedMessage.isError = true;
        setIsTyping(false);
        currentStreamingMessageRef.current = { messageId: null, streamId: null };
      } else if (type === 'status') {
        updatedMessage.content = content;
      } else if (type === 'content') {
        const newContent = (existingMessage.content === "⏳ Receiving explanation...")
          ? content
          : (existingMessage.content || '') + content;
        updatedMessage.content = newContent;
        updatedMessage.isError = false;
      }
      currentSession.messages[msgIndex] = updatedMessage;
      return newSessions;
    });
  }, [currentIdx]);

  const handleExplainEnd = useCallback((endedStreamId) => {
    if (endedStreamId === currentStreamingMessageRef.current.streamId) {
      setIsTyping(false);
      currentStreamingMessageRef.current = { messageId: null, streamId: null };
    }
  }, []);

  const handleExplainError = useCallback((errorInfo) => {
    if (errorInfo.streamId === currentStreamingMessageRef.current.streamId) {
      const activeMessageId = currentStreamingMessageRef.current.messageId;
      setSessions(prevSessions => {
        const sessionIndexToUpdate = currentIdx;
        const newSessions = [...prevSessions];
        const currentSession = newSessions[sessionIndexToUpdate];
        if (!currentSession || !activeMessageId) return prevSessions;
        const msgIndex = currentSession.messages.findIndex(m => m.id === activeMessageId && m.type === 'ai');
        if (msgIndex !== -1) {
          currentSession.messages[msgIndex] = { 
            ...currentSession.messages[msgIndex], 
            content: `Error: ${errorInfo.message || 'Unknown error during explanation.'}`, 
            isError: true 
          };
        } else {
          currentSession.messages.push({ 
            id: uuid(), type: 'ai', 
            content: `Error: ${errorInfo.message || 'Unknown error during explanation.'}`, 
            timestamp: new Date().toISOString(), isError: true 
          });
        }
        return newSessions;
      });
      setIsTyping(false);
      currentStreamingMessageRef.current = { messageId: null, streamId: null };
    }
  }, [currentIdx]);

  // --- Callbacks for CHAT stream (NEW IMPLEMENTATION) ---
  const handleChatChunk = useCallback((chunk) => {
    const { streamId: chunkStreamId, type, content, isLastChunk } = chunk;
    const activeMessageId = activeChatStreamIdRef.current?.messageId; // Using a new structure for chat stream ref
    const activeStreamId = activeChatStreamIdRef.current?.streamId;

    // console.log(`AIPanel ChatChunk: Received chunk for stream ${chunkStreamId}, active stream is ${activeStreamId}, active message is ${activeMessageId}`);
    // console.log('Chat Chunk content:', chunk);

    if (chunkStreamId !== activeStreamId || !activeMessageId) {
      // console.log('AIPanel ChatChunk: Mismatched stream or no active message. Ignoring.');
      return;
    }

    setSessions(prevSessions => {
      const sessionIndexToUpdate = currentIdx;
      const newSessions = [...prevSessions];
      const currentSession = newSessions[sessionIndexToUpdate];

      if (!currentSession) return prevSessions;

      const msgIndex = currentSession.messages.findIndex(m => m.id === activeMessageId && m.type === 'ai');
      if (msgIndex === -1) {
        // console.warn('AIPanel ChatChunk: AI placeholder message not found for ID:', activeMessageId);
        return prevSessions; 
      }

      const existingMessage = currentSession.messages[msgIndex];
      let updatedMessage = { ...existingMessage };

      if (type === 'error') {
        updatedMessage.content = `Chat Error: ${content}`;
        updatedMessage.isError = true;
        setIsTyping(false);
        activeChatStreamIdRef.current = null; // Clear chat stream ref
      } else if (type === 'status') {
        updatedMessage.content = content; // e.g., "AI is thinking..."
      } else if (type === 'content') {
        const newContent = (existingMessage.content === "⏳ AI is thinking...") // Placeholder for chat
          ? content
          : (existingMessage.content || '') + content;
        updatedMessage.content = newContent;
        updatedMessage.isError = false;
      }
      
      currentSession.messages[msgIndex] = updatedMessage;
      return newSessions;
    });
  }, [currentIdx]);

  const handleChatEnd = useCallback((endedStreamId) => {
    // console.log(`AIPanel ChatEnd: Stream ${endedStreamId} ended. Active stream: ${activeChatStreamIdRef.current?.streamId}`);
    if (endedStreamId === activeChatStreamIdRef.current?.streamId) {
      setIsTyping(false);
      activeChatStreamIdRef.current = null; // Clear chat stream ref
    }
  }, [/* No direct state dependencies other than currentIdx handled by closure */]);

  const handleChatError = useCallback((errorInfo) => {
    // console.error('AIPanel ChatError:', errorInfo);
    if (errorInfo.streamId === activeChatStreamIdRef.current?.streamId) {
      const activeMessageId = activeChatStreamIdRef.current?.messageId;
      
      setSessions(prevSessions => {
        const sessionIndexToUpdate = currentIdx;
        const newSessions = [...prevSessions];
        const currentSession = newSessions[sessionIndexToUpdate];

        if (!currentSession || !activeMessageId) return prevSessions;

        const msgIndex = currentSession.messages.findIndex(m => m.id === activeMessageId && m.type === 'ai');
        if (msgIndex !== -1) {
          currentSession.messages[msgIndex] = { 
            ...currentSession.messages[msgIndex], 
            content: `Chat Error: ${errorInfo.message || 'Unknown error during chat.'}`, 
            isError: true 
          };
        } else {
          currentSession.messages.push({ 
            id: uuid(), type: 'ai', 
            content: `Chat Error: ${errorInfo.message || 'Unknown error during chat.'}`, 
            timestamp: new Date().toISOString(), isError: true 
          });
        }
        return newSessions;
      });

      setIsTyping(false);
      activeChatStreamIdRef.current = null; // Clear chat stream ref
    }
  }, [currentIdx]);

  // Effect to handle new text selection
  useEffect(() => {
    if (selectedText && selectedText !== lastSelectedText) {
      setShowCustomPrompt(true);
      setCustomPrompt('');
      addUserMessageToSession(selectedText);
      setLastSelectedText(selectedText);
      // Cancel any ongoing explanation stream if user selects new text
      if (currentStreamingMessageRef.current.streamId) {
        console.log(`AIPanel: New text selected, cleaning up old stream: ${currentStreamingMessageRef.current.streamId}`);
        // We don't have a direct "cancel" to send to main, but we can stop listening.
        // Actual cancellation would require more IPC.
        currentStreamingMessageRef.current = { messageId: null, streamId: null }; 
      }
    }
  }, [selectedText]);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [sessions]);

  // Focus on input when chat is ready
  useEffect(() => {
    if (showCustomPrompt && customPromptRef.current) {
      customPromptRef.current.focus();
    } else if (inputRef.current && sessions[currentIdx].messages.length > 0 && !isTyping) {
      inputRef.current.focus();
    }
  }, [sessions, isTyping, showCustomPrompt]);

  // whenever parent does "newChatCount++", create a new session
  useEffect(() => {
    if (newChatCount < 1) return;
    setSessions(prev => {
      const id = uuid();
      const next  = [...prev, { id, title: `Chat ${prev.length+1}`, messages: [] }];
      setCurrentIdx(next.length - 1);
      return next;
    });
    setCustomPrompt('');
    setShowCustomPrompt(false);
    setShowStyleChooser(false);
    setLastSelectedText('');
  }, [newChatCount, setCustomPrompt]);

  // --- useEffect for setting up IPC Listeners (UPDATED) ---
  useEffect(() => {
    // console.log('AIPanel: Setting up IPC listeners.');

    const unsubExplainChunk = window.electron.onExplainChunk(handleExplainChunk);
    const unsubExplainEnd = window.electron.onExplainEnd(handleExplainEnd);
    const unsubExplainError = window.electron.onExplainError(handleExplainError);

    // Add CHAT listeners
    const unsubChatChunk = window.electron.onChatChunk(handleChatChunk);
    const unsubChatEnd = window.electron.onChatEnd(handleChatEnd);
    const unsubChatError = window.electron.onChatError(handleChatError);

    return () => {
      // console.log('AIPanel: Cleaning up IPC listeners.');
      if (unsubExplainChunk) unsubExplainChunk();
      if (unsubExplainEnd) unsubExplainEnd();
      if (unsubExplainError) unsubExplainError();

      if (unsubChatChunk) unsubChatChunk();
      if (unsubChatEnd) unsubChatEnd();
      if (unsubChatError) unsubChatError();
    };
  }, [handleExplainChunk, handleExplainEnd, handleExplainError, handleChatChunk, handleChatEnd, handleChatError]);

  const addUserMessageToSession = (text, sessionIndex = currentIdx) => {
    const newMessageId = uuid();
    setSessions(s => {
      const copy = [...s];
      if (!copy[sessionIndex]) {
        copy[sessionIndex] = { id: uuid(), title: `Chat ${sessionIndex + 1}`, messages: [] };
      }
      copy[sessionIndex].messages.push({
        id: newMessageId, type: 'user', content: text, timestamp: new Date().toISOString()
      });
      return copy;
    });
    return newMessageId;
  };

  const addAIMessageToSession = (text, error = false, sessionIndex = currentIdx, messageIdToUse = null) => {
    const newMessageId = messageIdToUse || uuid();
    setSessions(s => {
      const copy = [...s];
      if (!copy[sessionIndex]) {
        copy[sessionIndex] = { id: uuid(), title: `Chat ${sessionIndex + 1}`, messages: [] };
      }
      // If it's an update to an existing streaming message, find and update
      const existingMsg = messageIdToUse ? copy[sessionIndex].messages.find(m => m.id === messageIdToUse) : null;
      if (existingMsg) {
        existingMsg.content = text; // Replace content (or append if streaming logic is here)
        existingMsg.isError = error;
      } else {
        copy[sessionIndex].messages.push({
          id: newMessageId, type: 'ai', content: text,
          timestamp: new Date().toISOString(), isError: error
        });
      }
      return copy;
    });
    return newMessageId;
  };

  const generateInitialExplanation = async (textForExplanation, explanationStylePrompt) => {
    if (!textForExplanation || !explanationStylePrompt) {
      console.warn("Text for explanation or style prompt is missing.");
      addAIMessageToSession("Could not generate explanation: missing text or instructions.", true);
      return;
    }
    
    const currentSessionMessages = sessions[currentIdx]?.messages || [];
    if (currentSessionMessages.length === 0 || currentSessionMessages[currentSessionMessages.length -1]?.content !== textForExplanation) {
        addUserMessageToSession(`Explaining: "${textForExplanation.substring(0,100)}..."`);
    }

    const placeholderMessageId = uuid();
    console.log(`AIPanel generateInitialExplanation: placeholderMessageId generated for AI msg: "${placeholderMessageId}"`);
    addAIMessageToSession("⏳ Receiving explanation...", false, currentIdx, placeholderMessageId); 

    const currentStreamId = uuid(); 
    
    // Directly assign values
    currentStreamingMessageRef.current.messageId = placeholderMessageId;
    currentStreamingMessageRef.current.streamId = currentStreamId;
    
    console.log(`AIPanel generateInitialExplanation: currentStreamingMessageRef SET TO:`, JSON.stringify(currentStreamingMessageRef.current));

    setIsTyping(true);
    setShowCustomPrompt(false);

    console.log(`AIPanel: Calling window.electron.aiExplain with streamId: ${currentStreamId}, text: "${textForExplanation.substring(0,50)}...", style: "${explanationStylePrompt}"`);
    window.electron.aiExplain(textForExplanation, explanationStylePrompt, currentStreamId);

    // The response and any errors will come via the 'onExplainChunk' and 'onExplainError' listeners.
    // setIsTyping(false) will be handled by the last chunk or error handler.
  };

  // MODIFIED handleSendMessage to use streaming
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessageContent = inputMessage;
    addUserMessageToSession(userMessageContent); // Adds user message to current session
    setInputMessage('');
    
    setIsTyping(true);

    // Abort any ongoing explanation stream if user sends a chat message
    if (currentStreamingMessageRef.current.streamId) {
        // console.log("AIPanel: User sending chat, aborting active explanation stream:", currentStreamingMessageRef.current.streamId);
        currentStreamingMessageRef.current = { messageId: null, streamId: null }; 
    }
    // Abort any previous chat stream
    if (activeChatStreamIdRef.current?.streamId) {
        // console.log("AIPanel: User sending new chat, aborting previous chat stream:", activeChatStreamIdRef.current.streamId);
        activeChatStreamIdRef.current = null;
    }

    const newChatStreamId = uuid();
    const placeholderAiMessageId = uuid(); // This ID will be for the placeholder in the UI

    // Store both the placeholder's UI ID and the stream's ID for the backend
    activeChatStreamIdRef.current = { messageId: placeholderAiMessageId, streamId: newChatStreamId };

    // Add AI placeholder message
    addAIMessageToSession("⏳ AI is thinking...", false, currentIdx, placeholderAiMessageId);

    try {
      const messagesForBackend = sessions[currentIdx].messages
        .filter(msg => msg.id !== placeholderAiMessageId) // Don't send the new placeholder itself
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // console.log('AIPanel: Calling window.electron.aiChatStream with streamId:', newChatStreamId, 'messagesForBackend:', JSON.stringify(messagesForBackend, null, 2));
      window.electron.aiChatStream(messagesForBackend, newChatStreamId);
      // Response will come via onChatChunk, onChatEnd, onChatError
      // setIsTyping(false) will be handled by onChatEnd or onChatError

    } catch (error) {
      console.error('AIPanel: Exception calling aiChatStream setup:', error);
      // Update the placeholder to show an error
      setSessions(prevSessions => {
        const sessionIndexToUpdate = currentIdx;
        const newSessions = [...prevSessions];
        const currentSession = newSessions[sessionIndexToUpdate];
        if (!currentSession) return prevSessions;
        const msgIndex = currentSession.messages.findIndex(m => m.id === placeholderAiMessageId && m.type === 'ai');
        if (msgIndex !== -1) {
          currentSession.messages[msgIndex] = {
            ...currentSession.messages[msgIndex],
            content: 'Sorry, I encountered an error starting the chat. Please try again.',
            isError: true,
          };
        }
        return newSessions;
      });
      setIsTyping(false);
      activeChatStreamIdRef.current = null; // Clear ref on error
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showCustomPrompt) {
        handleSubmitCustomPrompt();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleSubmitCustomPrompt = () => {
    if (!customPrompt.trim() || !lastSelectedText) return;
    generateInitialExplanation(lastSelectedText, customPrompt);
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Modified to allow deleting the last chat
  const handleRemoveSession = (idx = currentIdx) => {
    setSessions(s => {
      if (s.length <= 1) {
        const id = uuid();
        setCurrentIdx(0);
        return [{ id, title: 'Chat 1', messages: [] }];
      }
      
      const filtered = s.filter((_, i) => i !== idx);
      const renumbered = filtered.map((sess, i) => ({
        ...sess,
        title: `Chat ${i + 1}`
      }));
      setCurrentIdx(ci => {
          const newIndex = Math.min(Math.max(0, ci === idx ? idx -1 : ci), renumbered.length - 1);
          return newIndex < 0 ? 0 : newIndex;
      });
      return renumbered;
    });
  };

  // wrap panel-close so empty sessions get purged
  const handleClose = () => {
    if (sessions.length > 1 && sessions[currentIdx]?.messages.length === 0) {
      handleRemoveSession(currentIdx);
    }
    onClose();
  };

  // Expose switchToEmptyChat to parent via ref
  useImperativeHandle(ref, () => ({
    switchToEmptyChat: () => {
      const idx = sessions.findIndex(s => s.messages.length === 0);
      if (idx !== -1) {
        setCurrentIdx(idx);
        setShowStyleChooser(false);
        setShowCustomPrompt(false);
        return true;
      }
      return false;
    }
  }));

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(15, 32, 39, 0.95)',
      backdropFilter: 'blur(10px)',
    }}>
      {/* Header: chat selector + new chat */}
      <div style={{ 
        padding: '15px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(44, 83, 100, 0.4)',
      }}>
        <div style={{ display:'flex', gap: '8px', alignItems:'center' }}>
          {/* New Chat */}
          <button onClick={() => {
            if (currentStreamingMessageRef.current.streamId) { currentStreamingMessageRef.current = { messageId: null, streamId: null }; } // Clear stream on new chat
            const idx = sessions.findIndex(s => s.messages.length === 0);
            if (idx !== -1) {
              setCurrentIdx(idx);
              setCustomPrompt('');
              setShowCustomPrompt(false);
              return;
            }
            const id = uuid();
            setSessions(sessions.concat({ id, title: `Chat ${sessions.length+1}`, messages: [] }));
            setCurrentIdx(sessions.length);
            setCustomPrompt('');
            setShowCustomPrompt(false);
          }} style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>

          {/* Chat dropdown (now uses rgba(44,83,100,0.4) background) */}
          <select
            className="chat-select"
            value={sessions[currentIdx]?.id || ''}
            onChange={e => {
              if (currentStreamingMessageRef.current.streamId) { currentStreamingMessageRef.current = { messageId: null, streamId: null }; }
              const idx = sessions.findIndex(s => s.id === e.target.value);
              if (idx >= 0) setCurrentIdx(idx);
            }}
            style={{
              marginRight: '2px',   // tighten up gap
              backgroundColor: 'rgba(44, 83, 100, 0.4)',  // ← updated to match header
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.9rem',
              appearance: 'none',
            }}
          >
            {sessions.map((s,i) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {/* Remove current chat */}
          <button
            onClick={() => { if (currentStreamingMessageRef.current.streamId && sessions[currentIdx]?.id === sessions.find((s,i)=>i === currentIdx)?.id ) { currentStreamingMessageRef.current = { messageId: null, streamId: null }; } handleRemoveSession(currentIdx);}}
            title="Remove Chat"
            style={{
              marginLeft: '2px',     // tuck it in a bit
              background: 'transparent',
              border: 'none',
              color: 'white',  // Always enabled now
              cursor: 'pointer',  // Always enabled now
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ display: 'block' }}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
        
        <h3 style={{
          margin: 0,
          fontWeight: '600',
          fontSize: '1.1rem',
          color: 'white',
        }}>
          AI Chat Assistant
        </h3>
        
        <button
          onClick={()=>{ if (currentStreamingMessageRef.current.streamId) { currentStreamingMessageRef.current = { messageId: null, streamId: null }; } handleClose();}}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      {/* Custom Prompt Input (shown only when text is selected and prompt hasn't been submitted yet) */}
      {showCustomPrompt && selectedText && !isTyping && (
        <div style={{
          padding: '15px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(44, 83, 100, 0.2)',
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>How would you like me to explain this text?</p>
          <textarea
            ref={customPromptRef}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your instructions here..."
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              resize: 'vertical',
              minHeight: '80px',
              fontSize: '0.9rem',
              marginBottom: '10px',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              onClick={handleSubmitCustomPrompt}
              disabled={!customPrompt.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: customPrompt.trim() ? 'rgba(44, 83, 100, 0.8)' : 'rgba(44, 83, 100, 0.3)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: customPrompt.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.9rem',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (customPrompt.trim()) {
                  e.currentTarget.style.backgroundColor = 'rgba(44, 83, 100, 1)';
                }
              }}
              onMouseLeave={(e) => {
                if (customPrompt.trim()) {
                  e.currentTarget.style.backgroundColor = 'rgba(44, 83, 100, 0.8)';
                }
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
      
      {/* Chat messages */}
      <div 
        ref={chatContainerRef}
        style={{ 
          flex: 1,
          padding: '15px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {sessions[currentIdx]?.messages.length === 0 && !showCustomPrompt ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            padding: '0 20px',
          }}>
            {isTyping ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  borderTop: '3px solid white',
                  borderRight: '3px solid transparent',
                  animation: 'spin 1s linear infinite',
                }}></div>
                <p>Analyzing text...</p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <p>Highlight any part of the document or ask a question to start the conversation</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {sessions[currentIdx]?.messages.map((message) => (
              <div 
                key={message.id}
                style={{
                  width: '100%',
                }}
              >
                {/* Sender label */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '4px',
                  paddingLeft: '2px',
                }}>
                  <div style={{
                    color: message.type === 'user' ? '#4f8cb5' : '#c3e9ff',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    {message.type === 'ai' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )}
                    {message.type === 'ai' ? 'AI Assistant' : 'You'}
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginLeft: '8px',
                  }}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                
                {/* Message content */}
                <div style={{
                  background: message.type === 'user' 
                    ? 'rgba(44, 83, 100, 0.4)' 
                    : message.isError 
                      ? 'rgba(178, 34, 34, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                  padding: '14px 16px',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  {message.content}{message.type === 'ai' && isTyping && currentStreamingMessageRef.current.messageId === message.id ? '...' : ''}
                </div>
              </div>
            ))}
            
            {isTyping && !sessions[currentIdx]?.messages.find(m => m.id === currentStreamingMessageRef.current.messageId && m.type ==='ai') && (
              <div style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 16px',
                borderRadius: '6px',
                animation: 'fadeIn 0.3s ease-out',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}>
                <div style={{ 
                  color: '#c3e9ff',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ marginRight: '8px' }}>AI is typing</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: '5px', height: '5px', backgroundColor: 'currentColor', borderRadius: '50%', opacity: 0.8, animation: `pulse 1s infinite ${i * 0.2}s`}}></div>)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Input area */}
      <div style={{ 
        padding: '10px 15px 15px',
        background: 'rgba(15, 32, 39, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          padding: '12px 14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'white',
              resize: 'none',
              outline: 'none',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              minHeight: '24px',
              maxHeight: '100px',
              fontFamily: 'inherit',
            }}
            rows={1}
            disabled={isTyping || showCustomPrompt}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping || showCustomPrompt}
            style={{
              background: !inputMessage.trim() || isTyping || showCustomPrompt
                ? 'rgba(44, 83, 100, 0.3)' 
                : 'linear-gradient(135deg, #2c5364, #203a43)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !inputMessage.trim() || isTyping || showCustomPrompt
                ? 'not-allowed' 
                : 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (inputMessage.trim() && !isTyping && !showCustomPrompt) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3a7a9e, #2c5364)';
              }
            }}
            onMouseLeave={(e) => {
              if (inputMessage.trim() && !isTyping && !showCustomPrompt) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2c5364, #203a43)';
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default AIPanel;
