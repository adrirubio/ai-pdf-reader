import React, { useEffect, useRef, useState } from 'react'; 

const PDFViewer = ({ filePath, onTextSelected }) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState(null);
  const [selectionTooltip, setSelectionTooltip] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0
  });
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const selectedTextRef = useRef('');
  
  // Load PDF document when filePath changes
  useEffect(() => {
    if (!filePath) return;
    
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      setLoadingStatus('Starting PDF load...');
      
      try {
        console.log('Loading PDF from:', filePath);
        
        // Check that PDF.js is loaded
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('PDF.js library not found');
        }
        
        // Read file via preload bridge
        setLoadingStatus('Reading PDF file...');
        console.log('Calling electron.readPdfFile...');
        const base64Data = await window.electron.readPdfFile(filePath);
        
        if (!base64Data) {
          throw new Error('Could not read PDF file');
        }
        
        console.log('PDF data loaded, length:', base64Data.length);
        setLoadingStatus('Processing PDF data...');
        
        // Convert base64 to binary data
        const binaryData = atob(base64Data);
        const len = binaryData.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        
        // Load PDF from binary data
        setLoadingStatus('Loading PDF into viewer...');
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        
        const document = await loadingTask.promise;
        console.log('PDF loaded successfully, pages:', document.numPages);
        
        setPdfDocument(document);
        setTotalPages(document.numPages);
        setCurrentPage(1);
        setLoadingStatus('');
      } catch (error) {
        console.error('Failed to load PDF:', error);
        setError('Failed to load PDF: ' + error.message);
        setLoadingStatus('Error loading PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [filePath]);

  // Render current page when it changes
  useEffect(() => {
    if (!pdfDocument || !containerRef.current) return;

    const renderCurrentPage = async () => {
      setLoading(true);
      setLoadingStatus(`Rendering page ${currentPage}...`);
      try {
        // Clear previous content
        const pageContainer = containerRef.current;
        pageContainer.innerHTML = '';
        
        // Create canvas element
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'canvasWrapper';
        canvasWrapper.style.position = 'relative';
        
        const canvas = document.createElement('canvas');
        canvasWrapper.appendChild(canvas);
        pageContainer.appendChild(canvasWrapper);

        // Get the page
        const page = await pdfDocument.getPage(currentPage);
        
        // Set viewport based on scale
        const viewport = page.getViewport({ scale });
        
        // Prepare canvas
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Add text layer for selection
        const textContent = await page.getTextContent();
        
        // Create text layer div
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.position = 'absolute';
        textLayerDiv.style.top = '0';
        textLayerDiv.style.left = '0';
        textLayerDiv.style.right = '0';
        textLayerDiv.style.bottom = '0';
        textLayerDiv.style.width = viewport.width + 'px';
        textLayerDiv.style.height = viewport.height + 'px';
        canvasWrapper.appendChild(textLayerDiv);
        
        // Use PDF.js text layer builder
        const renderTextLayer = window.pdfjsLib.renderTextLayer({
          textContent: textContent,
          container: textLayerDiv,
          viewport: viewport,
        });
        
        await renderTextLayer.promise;
        
        // Make text layer selectable
        textLayerDiv.style.pointerEvents = 'auto';
        setLoadingStatus('');
      } catch (error) {
        console.error('Error rendering page:', error);
        setError('Error rendering page: ' + error.message);
        setLoadingStatus('Error rendering page');
      } finally {
        setLoading(false);
      }
    };

    renderCurrentPage();
  }, [pdfDocument, currentPage, scale]);

  // IMPROVED: Handle text selection with fixed tooltip position
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        // Store selected text for later use
        selectedTextRef.current = selectedText;
        
        // First hide any existing tooltip
        setSelectionTooltip({ visible: false });
        
        // Brief delay before showing new tooltip
        setTimeout(() => {
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            
            if (rects.length > 0) {
              // Get the first line rectangle (first highlighted line)
              const firstRect = rects[0];
              
              // Position tooltip centered at the middle of the first line
              const x = firstRect.left + (firstRect.width / 2);
              // Position above the text (with extra spacing)
              const y = firstRect.top - 50;
              
              console.log('Setting tooltip at position:', x, y);
              
              // Show tooltip with current selected text
              setSelectionTooltip({
                visible: true,
                text: selectedText,
                x,
                y
              });
            }
          }
        }, 10);
      }
    };

    // On mouse up, check for selection
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        handleSelectionChange();
      }
    };
    
    // Hide tooltip when clicking elsewhere
    const handleDocumentClick = (e) => {
      // Don't hide if clicking on the tooltip itself
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) {
        return;
      }
      
      setTimeout(() => {
        if (!window.getSelection().toString().trim()) {
          setSelectionTooltip(prev => ({ ...prev, visible: false }));
        }
      }, 100);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  // FIX: Improved handleAskAI with multiple approaches
  const handleAskAI = (style) => {
    try {
      console.log('Button clicked:', style);
      
      // Use the stored text to ensure we have it
      const text = selectedTextRef.current || selectionTooltip.text;
      
      if (!text) {
        console.error('No text selected for AI explanation');
        return;
      }
      
      // Hide tooltip first
      setSelectionTooltip({ visible: false });
      
      // Reset selection
      window.getSelection().removeAllRanges();
      
      // Delay to ensure UI updates before callback
      setTimeout(() => {
        // Call the parent callback
        if (onTextSelected && typeof onTextSelected === 'function') {
          console.log('Calling onTextSelected with:', text, style);
          onTextSelected(text, style);
        } else {
          console.error('onTextSelected is not available');
        }
      }, 100);
    } catch (error) {
      console.error('Error in handleAskAI:', error);
    }
  };
  
  // FIX: Improved close button handler
  const handleCloseTooltip = (e) => {
    console.log('Close button clicked');
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setSelectionTooltip({ visible: false });
    
    // Also clear selection
    window.getSelection().removeAllRanges();
  };

  // Navigation controls
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prevScale => prevScale + 0.2);
  };

  const zoomOut = () => {
    if (scale > 0.5) {
      setScale(prevScale => prevScale - 0.2);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* PDF Controls */}
      <div style={{ 
        padding: '10px 15px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
      }}>
        <button 
          onClick={goToPreviousPage} 
          disabled={currentPage <= 1 || loading}
          style={{ 
            padding: '8px 12px',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: currentPage <= 1 ? 0.5 : 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 15px',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '0.9rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          minWidth: '80px',
        }}>
          {currentPage} / {totalPages || '?'}
        </div>
        
        <button 
          onClick={goToNextPage} 
          disabled={currentPage >= totalPages || loading}
          style={{ 
            padding: '8px 12px',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={zoomOut} 
            style={{ 
              padding: '8px 12px',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
          
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.9rem',
            minWidth: '50px',
            textAlign: 'center',
          }}>
            {Math.round(scale * 100)}%
          </div>
          
          <button 
            onClick={zoomIn} 
            style={{ 
              padding: '8px 12px',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Status display */}
      {loadingStatus && (
        <div style={{ 
          padding: '8px 15px',
          backgroundColor: 'rgba(44, 83, 100, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            borderTop: '2px solid rgba(255, 255, 255, 0.8)',
            borderRight: '2px solid transparent',
            animation: 'spin 1s linear infinite',
          }}></div>
          {loadingStatus}
        </div>
      )}
      
      {/* PDF Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        backgroundColor: '#0c1821',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '20px',
        position: 'relative',
      }}>
        {loading && !pdfDocument ? (
          <div style={{ 
            padding: '30px', 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              borderTop: '3px solid white',
              borderRight: '3px solid transparent',
              animation: 'spin 1s linear infinite',
            }}></div>
            <div>{loadingStatus || 'Loading...'}</div>
          </div>
        ) : error ? (
          <div style={{ 
            padding: '30px', 
            backgroundColor: 'rgba(178, 34, 34, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            maxWidth: '500px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '15px',
              color: '#ff6b6b',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 style={{ margin: 0 }}>Error Loading PDF</h3>
            </div>
            <p style={{ margin: '0 0 15px 0' }}>{error}</p>
            <p style={{ margin: 0, opacity: 0.8 }}>Make sure you selected a valid PDF file.</p>
          </div>
        ) : (
          <div 
            ref={containerRef} 
            style={{ 
              backgroundColor: 'white',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          ></div>
        )}
        
        {/* Selection Tooltip - FIXED IMPLEMENTATION */}
        {selectionTooltip.visible && (
          <div 
            ref={tooltipRef}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: selectionTooltip.x,
              top: selectionTooltip.y - 100, // Position well above the text
              width: '240px',
              backgroundColor: 'rgba(42, 49, 65, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 6px 25px rgba(0, 0, 0, 0.3)',
              color: 'white',
              zIndex: 9999,
              transform: 'translateX(-50%)',
              pointerEvents: 'auto', 
            }}
          >
            {/* Tooltip Header with Close Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}>
              <p style={{ 
                margin: 0,
                fontSize: '0.9rem', 
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                Explain this text using:
              </p>
              <button 
                onClick={handleCloseTooltip}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000, // Ensure button is clickable
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Tooltip Buttons */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              justifyContent: 'center',
            }}>
              {/* Simple Button */}
              <button
                onClick={() => handleAskAI('simple')}
                onMouseDown={(e) => e.stopPropagation()} // Prevent event bubbling
                style={{
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 10000, // Ensure button is clickable
                }}
                onMouseEnter={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';}}
                onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';}}
              >
                Simple
              </button>
              
              {/* ELI5 Button */}
              <button
                onClick={() => handleAskAI('eli5')}
                onMouseDown={(e) => e.stopPropagation()} // Prevent event bubbling
                style={{
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 10000, // Ensure button is clickable
                }}
                onMouseEnter={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';}}
                onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';}}
              >
                Like I'm 5
              </button>
              
              {/* Technical Button */}
              <button
                onClick={() => handleAskAI('technical')}
                onMouseDown={(e) => e.stopPropagation()} // Prevent event bubbling
                style={{
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 10000, // Ensure button is clickable
                }}
                onMouseEnter={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';}}
                onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';}}
              >
                Technical
              </button>
              
              {/* Custom Button */}
              <button
                onClick={() => handleAskAI('custom')}
                onMouseDown={(e) => e.stopPropagation()} // Prevent event bubbling
                style={{
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 10000, // Ensure button is clickable
                }}
                onMouseEnter={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';}}
                onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';}}
              >
                Custom...
              </button>
            </div>
            
            {/* Tooltip Arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              marginLeft: '-10px',
              width: '0',
              height: '0',
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid rgba(42, 49, 65, 0.95)'
            }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
