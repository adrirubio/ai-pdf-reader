import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setOpenaiApiKey } from '../../state/slices/userSlice';

const ApiKeyConfig = () => {
  const dispatch = useDispatch();
  const apiKey = useSelector(state => state.user.preferences.openaiApiKey);
  const [showModal, setShowModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSaveApiKey = async () => {
    try {
      // Save to Redux store
      dispatch(setOpenaiApiKey(tempApiKey));
      
      // Send to main process to update AI service
      if (window.electron && window.electron.setApiKey) {
        await window.electron.setApiKey(tempApiKey);
      }
      
      setShowModal(false);
      setTempApiKey('');
      setShowKey(false);
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setTempApiKey('');
    setShowKey(false);
  };

  const handleOpenModal = () => {
    setTempApiKey(apiKey);
    setShowModal(true);
  };

  const hasApiKey = apiKey && apiKey.length > 0;

  return (
    <>
      <button
        onClick={handleOpenModal}
        style={{
          background: hasApiKey ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: hasApiKey ? '#22c55e' : '#ef4444',
          border: `1px solid ${hasApiKey ? '#22c55e' : '#ef4444'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.85rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hasApiKey ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = hasApiKey ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <circle cx="12" cy="16" r="1"></circle>
          <path d="m7 11 0-5a5 5 0 0 1 10 0l0 5"></path>
        </svg>
        {hasApiKey ? 'Change API Key' : 'Set API Key'}
      </button>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          paddingTop: '120px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{
              color: 'white',
              marginTop: 0,
              marginBottom: '16px',
              fontSize: '1.2rem',
              fontWeight: '600',
            }}>
              {hasApiKey ? 'Update OpenAI API Key' : 'Configure OpenAI API Key'}
            </h3>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              marginBottom: '20px',
              lineHeight: '1.5',
            }}>
              Enter your OpenAI API key to enable AI features. You can get one from{' '}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'none' }}
              >
                platform.openai.com
              </a>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    paddingRight: '45px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(96, 165, 250, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showKey ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancel}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                style={{
                  background: tempApiKey.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  cursor: tempApiKey.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (tempApiKey.trim()) {
                    e.currentTarget.style.background = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tempApiKey.trim()) {
                    e.currentTarget.style.background = '#3b82f6';
                  }
                }}
              >
                Save API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApiKeyConfig;