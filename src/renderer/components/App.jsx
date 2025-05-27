import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveDocument, clearActiveDocument } from '../../state/slices/chatSlice';
import { addOrUpdateRecentDocument } from '../../state/slices/pdfSlice';
import { setOpenaiApiKey } from '../../state/slices/userSlice';
import LandingPage from './LandingPage';
import PDFViewer from './PDFViewer';
import AIPanel from './AIPanel';
import ApiKeyConfig from './ApiKeyConfig';

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
  const [userClosedPanel, setUserClosedPanel] = useState(false);
  const aiPanelRef = useRef(null);
  const pdfViewerRef = useRef(null);
  const dispatch = useDispatch();
  
  // Get Redux sessions to check if AI panel should be shown
  const reduxSessions = useSelector(state => state.chat.sessions);
  
  // Get stored API key from Redux
  const storedApiKey = useSelector(state => state.user.preferences.openaiApiKey);
  
  // Load API key from persistent storage on startup
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        if (window.electron && window.electron.getApiKey) {
          const persistedApiKey = await window.electron.getApiKey();
          if (persistedApiKey && persistedApiKey !== storedApiKey) {
            // Update Redux store with the persisted API key
            dispatch(setOpenaiApiKey(persistedApiKey));
            console.log('Loaded API key from persistent storage');
          }
        }
      } catch (error) {
        console.error('Error loading API key from persistent storage:', error);
      }
    };
    
    loadApiKey();
  }, []); // Only run once on component mount
  
  // Send stored API key to main process when it changes (but not on initial load)
  useEffect(() => {
    const updateApiKey = async () => {
      if (storedApiKey && window.electron && window.electron.setApiKey) {
        try {
          await window.electron.setApiKey(storedApiKey);
          console.log('Updated AI service with API key change');
        } catch (error) {
          console.error('Error updating API key:', error);
        }
      }
    };
    
    // Skip the initial empty value
    if (storedApiKey) {
      updateApiKey();
    }
  }, [storedApiKey]); // Run when storedApiKey changes
  
  // Auto-show AI panel when Redux sessions have content (for recent documents)
  useEffect(() => {
    if (reduxSessions && reduxSessions.length > 0 && !showLanding && !userClosedPanel) {
      // Check if any session has messages
      const hasMessages = reduxSessions.some(session => 
        session.messages && session.messages.length > 0
      );
      if (hasMessages && !showAIPanel) {
        setShowAIPanel(true);
      }
    }
  }, [reduxSessions, showLanding, showAIPanel, userClosedPanel]);
  
  // Handle app:before-quit event
  useEffect(() => {
    if (window.electronEvents && window.electronEvents.onBeforeQuit) {
      const removeListener = window.electronEvents.onBeforeQuit(() => {
        console.log('App is about to quit, saving state...');
        // Save the current document's chat sessions
        if (pdfPath && aiPanelRef.current) {
          try {
            // getSessions already returns a clean copy
            const sessions = aiPanelRef.current.getSessions();
            if (sessions && sessions.length > 0) {
              window.electron.saveDocumentChats(pdfPath, sessions)
                .catch(err => console.error('Error saving chat sessions before quit:', err));
            }
          } catch (error) {
            console.error('Error preparing chat sessions for save before quit:', error);
          }
        }
        
        // Save highlights for the current document
        if (pdfPath && pdfViewerRef.current) {
          // This is handled automatically by the PDFViewer component
          console.log('Highlights will be saved by PDFViewer component');
        }
      });
      
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, [pdfPath]);

  const handleNewChat = () => {
    setShowAIPanel(true);
    setUserClosedPanel(false); // Reset the close flag when opening new chat
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

  const handleOpenPDF = async (providedPath) => {
    try {
      console.log('handleOpenPDF called with:', typeof providedPath);
      
      // Handle React events that might be passed to this function
      if (providedPath && typeof providedPath === 'object' && 'preventDefault' in providedPath) {
        console.log('React event object detected, ignoring it');
        providedPath = null; // Ignore the event object and use file dialog instead
      }
      
      // Try to log the object for debugging (only if it's not a React event)
      if (providedPath && typeof providedPath === 'object' && !('preventDefault' in providedPath)) {
        try {
          console.log('ProvidedPath object details:', JSON.stringify(providedPath, null, 2));
        } catch (e) {
          console.error('Could not stringify providedPath:', e);
        }
      }
      
      let filePath = providedPath;
      
      // If no path was provided or it's an invalid type (not a string), open the file dialog
      if (!filePath || typeof filePath !== 'string') {
        // Special case for recent document objects
        if (filePath && typeof filePath === 'object' && filePath.path && typeof filePath.path === 'string') {
          console.log('Using path from recent document object:', filePath.path);
          filePath = filePath.path;
        } else if (filePath && typeof filePath === 'object' && filePath.name && typeof filePath.name === 'string') {
          console.log('Using name from recent document object:', filePath.name);
          filePath = filePath.name;
        } else {
          console.log('No valid path provided, opening file dialog');
          filePath = await window.electron.openFile();
          console.log('File dialog returned:', filePath);
        }
      }
      
      // Early exit if no filePath was selected
      if (!filePath) {
        console.log('No file selected.');
        return;
      }
      
      // Ensure we have a string path
      let filePathString = typeof filePath === 'string' ? filePath : '';
      
      if (!filePathString) {
        console.error('Invalid path, cannot open PDF');
        return;
      }
      
      // To diagnose issues with bad paths, try to check if this is a valid path
      console.log('Path being used:', filePathString);
      
      console.log('Setting pdfPath state to string:', filePathString);
      setPdfPath(filePathString);
      setShowLanding(false);
      
      console.log('Opening PDF:', filePathString);
        
      // Add or update this document in the recent documents list
      // Handle both Windows and Unix-style paths
      let fileName = 'Unnamed Document';
      try {
        if (filePathString.includes('/')) {
          fileName = filePathString.split('/').pop();
        } else if (filePathString.includes('\\')) {
          fileName = filePathString.split('\\').pop();
        } else {
          fileName = filePathString;
        }
      } catch (error) {
        console.error('Error extracting filename:', error);
      }
        
      // Create a simple object with only primitive properties
      const documentInfo = {
        path: filePathString,
        name: fileName,
        lastAccessed: new Date().toISOString()
      };
      
      // Update Redux store
      console.log('Dispatching addOrUpdateRecentDocument:', documentInfo);
      dispatch(addOrUpdateRecentDocument(documentInfo));
      
      // Save to persistent storage - always use the string path we've already extracted
      console.log('Saving to recent documents:', filePathString);
      
      try {
        await window.electron.addRecentDocument(filePathString);
      } catch (err) {
        console.error('Error saving recent document:', err);
      }
      
      // Load document-specific chats
      try {
        console.log('Loading document chats with path:', filePathString);
        const documentChats = await window.electron.getDocumentChats(filePathString);
        
        // Clean any potentially non-serializable data before dispatching
        let cleanSessions = [];
        if (Array.isArray(documentChats) && documentChats.length > 0) {
          cleanSessions = documentChats;
          console.log(`Loaded ${cleanSessions.length} chat sessions for document`);
        }
        
        console.log('Dispatching setActiveDocument with path:', filePathString);
        
        dispatch(setActiveDocument({
          filePath: filePathString,
          initialSessions: cleanSessions.length > 0 ? cleanSessions : undefined
        }));
      } catch (error) {
        console.error('Error loading document chats:', error);
        // Initialize with empty sessions if there was an error
        dispatch(setActiveDocument({ filePath: filePathString }));
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
    // Save chats for the current document before navigating away
    if (pdfPath) {
      const currentSessions = aiPanelRef.current?.getSessions();
      if (currentSessions) {
        // The getSessions method now returns a clean copy without circular references
        window.electron.saveDocumentChats(pdfPath, currentSessions)
          .catch(err => console.error('Error saving document chats:', err));
      }
    }
    
    // Clear active document in Redux
    dispatch(clearActiveDocument());
    
    // Reset component state
    setPdfPath(null);
    setSelectedText('');
    setSelectedLocation(null);
    setShowAIPanel(false);
    setShowLanding(true);
    setFullPdfText('');
    setUserClosedPanel(false); // Reset the user closed panel flag
  };

  const handleCloseAIPanel = () => {
    setShowAIPanel(false);
    setUserClosedPanel(true); // Track that user manually closed the panel
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
              {pdfPath && typeof pdfPath === 'string' ? 
                (pdfPath.includes('/') ? pdfPath.split('/').pop() : 
                 pdfPath.includes('\\') ? pdfPath.split('\\').pop() : 
                 pdfPath) : 
                'No file selected'}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginLeft: 'auto',
              gap: '12px'
            }}>
              <ApiKeyConfig />
              
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
          }}>
            {/* Main PDF Viewer - width adjusts based on panel state */}
            <div style={{ 
              flex: 1, 
              overflow: 'hidden',
              transition: 'margin-right 0.3s ease',
              marginRight: showAIPanel ? '600px' : '0',
            }}>
              <PDFViewer 
                ref={pdfViewerRef}
                filePath={typeof pdfPath === 'string' ? pdfPath : (pdfPath && typeof pdfPath === 'object' && pdfPath.path) ? pdfPath.path : String(pdfPath || '')} 
                onTextSelected={handleTextSelected}
                onFullTextExtracted={setFullPdfText}
                setCustomPrompt={setCustomPrompt}
                onClose={handleCloseAIPanel}
                newChatCount={newChatCount}
                fullPdfText={fullPdfText}
                onGoToHighlight={handleGoToHighlight}
              />
            </div>
            
            {/* AI Panel slides in from the right */}
            <div style={{
              position: 'fixed',
              top: '65px', // Account for header height
              right: 0,
              bottom: 0,
              width: '600px',
              transform: showAIPanel ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease-in-out',
              background: 'linear-gradient(180deg, rgba(15, 32, 39, 0.98) 0%, rgba(32, 58, 67, 0.98) 100%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.2)',
              overflow: 'auto',
              zIndex: 100,
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