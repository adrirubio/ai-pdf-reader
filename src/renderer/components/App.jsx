import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import PDFViewer from './PDFViewer';
import AIPanel from './AIPanel';

const App = () => {
  const [pdfPath, setPdfPath] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('simple');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [newChatCount, setNewChatCount] = useState(0);
  const [fullPdfText, setFullPdfText] = useState('');
  const aiPanelRef = useRef(null);
  const pdfViewerRef = useRef(null);

  const handleNewChat = () => {
    setShowAIPanel(true);
    setSelectedText('');
    setSelectedStyle('simple');
    setSelectedLocation(null);
    setCustomPrompt('');
    if (aiPanelRef.current && aiPanelRef.current.switchToEmptyChat) {
      const switched = aiPanelRef.current.switchToEmptyChat();
      if (switched) return;
    }
    setNewChatCount(c => c + 1);
  };

  const handleOpenPDF = async () => {
    try {
      const filePath = await window.electron.openFile();
      if (filePath) {
        setPdfPath(filePath);
        setShowLanding(false);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
    }
  };

  const handleTextSelected = (text, style = 'default', locationData) => {
    setSelectedText(text);
    setSelectedStyle(style);
    setSelectedLocation(locationData);
    
    // Always open panel for any style, including default
    setShowAIPanel(true);
  };

  const handleBackToLanding = () => {
    setPdfPath(null);
    setSelectedText('');
    setSelectedLocation(null);
    setShowAIPanel(false);
    setShowLanding(true);
    setFullPdfText('');
  };

  const handleCloseAIPanel = () => {
    setShowAIPanel(false);
  };

  const handleGoToHighlight = (locationToScrollTo) => {
    const targetLocation = locationToScrollTo !== undefined ? locationToScrollTo : selectedLocation;

    if (pdfViewerRef.current && targetLocation) {
      if (typeof pdfViewerRef.current.scrollToHighlight === 'function') {
        pdfViewerRef.current.scrollToHighlight(targetLocation);
      } else {
        console.warn('PDFViewer ref does not have scrollToHighlight method');
      }
    } else {
      if (!targetLocation) {
        console.log('handleGoToHighlight: No highlight selected yet.');
      } else {
        console.warn('handleGoToHighlight called without targetLocation or PDFViewer ref');
      }
    }
  };

  const handleRemoveHighlightById = (highlightId) => {
    if (pdfViewerRef.current && typeof pdfViewerRef.current.removeHighlight === 'function') {
      pdfViewerRef.current.removeHighlight(highlightId);
    } else {
      console.warn('PDFViewer ref does not have removeHighlight method or ref is not set');
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#0f2027',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {showLanding ? (
        <LandingPage onOpenPDF={handleOpenPDF} />
      ) : (
        <>
          <header style={{ 
            padding: '15px',
            background: 'linear-gradient(90deg, #0f2027, #203a43, #2c5364)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            zIndex: 10,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          }}>
            <button 
              onClick={handleBackToLanding}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 15px',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to Home
            </button>
            
            <div style={{ 
              margin: '0 15px', 
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              {pdfPath ? pdfPath.split('/').pop() : 'No file selected'}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginLeft: 'auto',
              gap: '8px'
            }}>
              <span style={{
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '0.01em',
                userSelect: 'none'
              }}>
                Open new chat
              </span>
              <button
                onClick={handleNewChat}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </button>
            </div>
          </header>
          
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden',
            background: '#1a2a36',
            position: 'relative',
          }}>
            {/* Main PDF Viewer takes full width when AI panel is hidden */}
            <div style={{ 
              flex: 1, 
              overflow: 'hidden',
              transition: 'width 0.3s ease',
            }}>
              <PDFViewer 
                ref={pdfViewerRef}
                filePath={pdfPath} 
                onTextSelected={handleTextSelected}
                onFullTextExtracted={setFullPdfText}
                pdfContentStyle={{
                  marginLeft: showAIPanel ? '-600px' : '0',
                  transition: 'margin-left 0.3s ease',
                }}
                setCustomPrompt={setCustomPrompt}
                onClose={handleCloseAIPanel}
                newChatCount={newChatCount}
                fullPdfText={fullPdfText}
                onGoToHighlight={handleGoToHighlight}
              />
            </div>
            
            {/* AI Panel slides in from the right when text is selected */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '600px', // Increased from 500px to 600px for a wider panel
              transform: showAIPanel ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease-in-out',
              zIndex: 100,
              boxShadow: '-2px 0 20px rgba(0, 0, 0, 0.25)',
              overflow: 'auto'
            }}>
              <AIPanel 
                ref={aiPanelRef}
                selectedText={selectedText}
                selectedStyle={selectedStyle}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
                onClose={handleCloseAIPanel}
                newChatCount={newChatCount}
                fullPdfText={fullPdfText}
                onGoToHighlight={handleGoToHighlight}
                selectedLocation={selectedLocation}
                onRemoveHighlight={handleRemoveHighlightById}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;