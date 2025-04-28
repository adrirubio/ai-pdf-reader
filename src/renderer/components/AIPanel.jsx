import React, { useState, useEffect, useRef } from 'react';

const AIPanel = ({ selectedText, selectedStyle, customPrompt, setCustomPrompt, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const customPromptRef = useRef(null);

  // Initialize chat with selected text and chosen style
  useEffect(() => {
    if (selectedText && messages.length === 0) {
      if (selectedStyle === 'custom') {
        setShowCustomPrompt(true);
      } else {
        addUserMessage(selectedText);
        generateResponse(selectedText, selectedStyle);
      }
    }
  }, [selectedText, selectedStyle]);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus on input when chat is ready
  useEffect(() => {
    if (showCustomPrompt && customPromptRef.current) {
      customPromptRef.current.focus();
    } else if (inputRef.current && messages.length > 0 && !isTyping) {
      inputRef.current.focus();
    }
  }, [messages, isTyping, showCustomPrompt]);

  const addUserMessage = (text) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        content: text,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const addAIMessage = (text, error = false) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'ai',
        content: text,
        timestamp: new Date().toISOString(),
        isError: error
      }
    ]);
  };

  const generateResponse = async (text, style) => {
    setIsTyping(true);
    
    try {
      // For now, just echo the input with some formatting based on style
      // In a real implementation, this would call your AI service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      
      let response;
      switch (style) {
        case 'simple':
          response = `Here's a simple explanation of what you highlighted:\n\n${text}\n\nIs there anything specific you'd like me to elaborate on?`;
          break;
        case 'eli5':
          response = `Explaining like you're 5 years old:\n\n${text}\n\nDoes that make sense?`;
          break;
        case 'technical':
          response = `Technical explanation:\n\n${text}\n\nAny particular aspect you want me to dive deeper into?`;
          break;
        case 'custom':
          response = `Custom explanation based on: "${customPrompt}":\n\n${text}\n\nIs this what you were looking for?`;
          break;
        default:
          response = `About this text:\n\n${text}\n\nAny questions?`;
      }
      
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
      handleSendMessage();
    }
  };

  const handleSubmitCustomPrompt = () => {
    if (!customPrompt.trim()) return;
    
    setShowCustomPrompt(false);
    addUserMessage(`${selectedText}\n\n(Custom: ${customPrompt})`);
    generateResponse(selectedText, 'custom');
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(15, 32, 39, 0.95)',
      backdropFilter: 'blur(10px)',
    }}>
      {/* Header */}
      <div style={{ 
        padding: '15px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(44, 83, 100, 0.4)',
      }}>
        <h3 style={{ 
          margin: 0,
          fontWeight: '600',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          AI Chat Assistant
        </h3>
        
        <button
          onClick={onClose}
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
      
      {/* Custom Prompt Input (shown only when style is custom) */}
      {showCustomPrompt && (
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
            placeholder="E.g., Explain using a cooking analogy..."
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
          <button
            onClick={handleSubmitCustomPrompt}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(44, 83, 100, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(44, 83, 100, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(44, 83, 100, 0.8)';
            }}
          >
            Submit
          </button>
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
          gap: '15px',
        }}
      >
        {messages.length === 0 && !showCustomPrompt ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.5)',
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
              <p>Highlight text in the document to start a conversation</p>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <div style={{
                  background: message.type === 'user' 
                    ? 'rgba(44, 83, 100, 0.7)' 
                    : message.isError 
                      ? 'rgba(178, 34, 34, 0.3)'
                      : 'rgba(255, 255, 255, 0.1)',
                  padding: '12px 16px',
                  borderRadius: message.type === 'user' 
                    ? '18px 18px 4px 18px' 
                    : '18px 18px 18px 4px',
                  color: 'white',
                  boxShadow: '0 1px 5px rgba(0, 0, 0, 0.1)',
                  border: message.isError 
                    ? '1px solid rgba(255, 100, 100, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  whiteSpace: 'pre-line',
                }}>
                  {message.content}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '4px',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {message.type === 'ai' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  )}
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 4px',
                display: 'flex',
                gap: '4px',
                animation: 'fadeIn 0.3s ease-out',
                marginTop: '8px',
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: 'white', 
                  borderRadius: '50%',
                  opacity: 0.7,
                  animation: 'pulse 1s infinite',
                }}></div>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: 'white', 
                  borderRadius: '50%',
                  opacity: 0.7,
                  animation: 'pulse 1s infinite 0.2s',
                }}></div>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: 'white', 
                  borderRadius: '50%',
                  opacity: 0.7,
                  animation: 'pulse 1s infinite 0.4s',
                }}></div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Input area */}
      <div style={{ 
        padding: '15px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(15, 32, 39, 0.8)',
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '10px 15px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
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
              fontSize: '0.95rem',
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
                : 'rgba(44, 83, 100, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
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
                e.currentTarget.style.background = 'rgba(44, 83, 100, 1)';
              }
            }}
            onMouseLeave={(e) => {
              if (inputMessage.trim() && !isTyping && !showCustomPrompt) {
                e.currentTarget.style.background = 'rgba(44, 83, 100, 0.8)';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;
