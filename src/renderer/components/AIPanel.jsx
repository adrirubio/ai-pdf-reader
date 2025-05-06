import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

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

  // Effect to handle new text selection
  useEffect(() => {
    if (selectedText && selectedText !== lastSelectedText) {
      setShowCustomPrompt(true);
      setCustomPrompt('');
      addUserMessage(selectedText);
      setLastSelectedText(selectedText);
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

  const addUserMessage = (text) => {
    setSessions(s => {
      const copy = [...s];
      copy[currentIdx].messages.push({
        id: Date.now(), type: 'user', content: text, timestamp: new Date().toISOString()
      });
      return copy;
    });
  };

  const addAIMessage = (text, error = false) => {
    setSessions(s => {
      const copy = [...s];
      copy[currentIdx].messages.push({
        id: Date.now(), type: 'ai', content: text,
        timestamp: new Date().toISOString(), isError: error
      });
      return copy;
    });
  };

  const generateResponse = async (text, style) => {
    setIsTyping(true);
    
    try {
      // For now, just echo the input with some formatting based on style
      // In a real implementation, this would call your AI service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      
      let response = `Custom explanation based on: ${customPrompt}:\n\n${text}`;
      
      addAIMessage(response);
    } catch (error) {
      console.error('Error generating response:', error);
      addAIMessage('Sorry, I encountered an error while analyzing this text. Please try again.', true);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    addUserMessage(inputMessage);
    const message = inputMessage;
    setInputMessage('');
    
    // For this simple echo version, just respond with the user's message
    setIsTyping(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
      addAIMessage(`You said: "${message}"\n\nIn a real implementation, this would be a proper AI response.`);
    } finally {
      setIsTyping(false);
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
    if (!customPrompt.trim()) return;
    
    setShowCustomPrompt(false);
    generateResponse(lastSelectedText, 'custom');
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Modified to allow deleting the last chat
  const handleRemoveSession = (idx = currentIdx) => {
    setSessions(s => {
      // If this is the last chat, create a new empty one instead of preventing deletion
      if (s.length <= 1) {
        const id = uuid();
        return [{ id, title: 'Chat 1', messages: [] }];
      }
      
      // Otherwise, proceed with normal deletion
      const filtered = s.filter((_, i) => i !== idx);
      // renumber the remainder: Chat 1, Chat 2, …
      const renumbered = filtered.map((sess, i) => ({
        ...sess,
        title: `Chat ${i + 1}`
      }));
      // adjust current index to stay in-bounds
      setCurrentIdx(ci => Math.max(0, Math.min(renumbered.length - 1, ci)));
      return renumbered;
    });
  };

  // wrap panel-close so empty sessions get purged
  const handleClose = () => {
    // only auto-remove if there's more than one session
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
            // Try to switch to an empty chat first
            const idx = sessions.findIndex(s => s.messages.length === 0);
            if (idx !== -1) {
              setCurrentIdx(idx);
              setCustomPrompt('');
              setShowCustomPrompt(false);
              setShowStyleChooser(false);
              return;
            }
            // Otherwise, create a new chat
            const id = uuid();
            setSessions(sessions.concat({ id, title: `Chat ${sessions.length+1}`, messages: [] }));
            setCurrentIdx(sessions.length);
            setCustomPrompt('');
            setShowCustomPrompt(false);
            setShowStyleChooser(false);
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
            value={sessions[currentIdx].id}
            onChange={e => {
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
            onClick={() => handleRemoveSession(currentIdx)}
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
          onClick={handleClose}
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
        {sessions[currentIdx].messages.length === 0 && !showCustomPrompt ? (
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
            {sessions[currentIdx].messages.map((message) => (
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
                  {message.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
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
                    <div style={{ 
                      width: '5px', 
                      height: '5px', 
                      backgroundColor: 'currentColor', 
                      borderRadius: '50%',
                      opacity: 0.8,
                      animation: 'pulse 1s infinite',
                    }}></div>
                    <div style={{ 
                      width: '5px', 
                      height: '5px', 
                      backgroundColor: 'currentColor', 
                      borderRadius: '50%',
                      opacity: 0.8,
                      animation: 'pulse 1s infinite 0.2s',
                    }}></div>
                    <div style={{ 
                      width: '5px', 
                      height: '5px', 
                      backgroundColor: 'currentColor', 
                      borderRadius: '50%',
                      opacity: 0.8,
                      animation: 'pulse 1s infinite 0.4s',
                    }}></div>
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
