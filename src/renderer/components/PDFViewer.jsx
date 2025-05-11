import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const PDFViewer = forwardRef(({ filePath, onTextSelected, pdfContentStyle = {}, onFullTextExtracted }, ref) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [persistentHighlights, setPersistentHighlights] = useState([]);
  const [pageRenderKey, setPageRenderKey] = useState(0);
  const [error, setError] = useState(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [selectionTooltip, setSelectionTooltip] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0
  });
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const selectedTextRef = useRef('');

  // Load highlights from session storage on component mount
  useEffect(() => {
    try {
      const storedHighlights = sessionStorage.getItem('pdfPersistentHighlights');
      if (storedHighlights) {
        setPersistentHighlights(JSON.parse(storedHighlights));
      }
    } catch (e) {
      console.error("Failed to load highlights from session storage", e);
    }
  }, []);

  // Save highlights to session storage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem('pdfPersistentHighlights', JSON.stringify(persistentHighlights));
    } catch (e) {
      console.error("Failed to save highlights to session storage", e);
    }
  }, [persistentHighlights]);

  // Load PDF document when filePath changes
  useEffect(() => {
    if (!filePath) return;
    
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      setLoadingStatus('Starting PDF load...');
      setPersistentHighlights([]); // Clear highlights for new PDF
      if (onFullTextExtracted) { // Clear any previous full text
        onFullTextExtracted('');
      }
      
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

        // Extract full text
        if (onFullTextExtracted) {
          setLoadingStatus('Extracting text...');
          let fullText = '';
          for (let i = 1; i <= document.numPages; i++) {
            const page = await document.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n'; // Add double newline between pages
            setLoadingStatus(`Extracted text from page ${i}/${document.numPages}`);
          }
          onFullTextExtracted(fullText.trim());
          console.log('Full text extracted.');
          setLoadingStatus('');
        }

      } catch (error) {
        console.error('Failed to load PDF:', error);
        setError('Failed to load PDF: ' + error.message);
        setLoadingStatus('Error loading PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [filePath, onFullTextExtracted]);

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
        setPageRenderKey(prevKey => prevKey + 1);
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

  // Effect to render persistent highlights
  useEffect(() => {
    if (!pdfDocument || !containerRef.current || !containerRef.current.querySelector('.canvasWrapper')) {
      return;
    }

    const canvasWrapper = containerRef.current.querySelector('.canvasWrapper');
    if (!canvasWrapper) return;

    // Remove old highlight divs for the current page to prevent duplicates
    const oldHighlightElements = canvasWrapper.querySelectorAll('.persistent-highlight');
    oldHighlightElements.forEach(el => el.remove());

    const highlightsForCurrentPage = persistentHighlights.filter(
      h => h.pageNumber === currentPage
    );

    highlightsForCurrentPage.forEach(highlight => {
      highlight.rectsOnPage.forEach(rect => {
        const highlightDiv = document.createElement('div');
        highlightDiv.className = 'persistent-highlight';
        if (highlight.id === activeHighlightId) {
          highlightDiv.classList.add('active-scrolled-highlight');
        }
        highlightDiv.style.position = 'absolute';
        highlightDiv.style.top = `${rect.top * scale}px`;
        highlightDiv.style.left = `${rect.left * scale}px`;
        highlightDiv.style.width = `${rect.width * scale}px`;
        highlightDiv.style.height = `${rect.height * scale}px`;
        highlightDiv.style.backgroundColor = 'rgba(135, 206, 235, 0.25)'; // Sky blueish from highlight-fixes.css
        highlightDiv.style.mixBlendMode = 'multiply'; // From highlight-fixes.css
        highlightDiv.style.pointerEvents = 'none';
        highlightDiv.style.borderRadius = '0.25em'; // From highlight-fixes.css
        highlightDiv.style.zIndex = '0'; // Above canvas, potentially under text layer's transparent text
        highlightDiv.setAttribute('data-highlight-id', highlight.id); 
        canvasWrapper.appendChild(highlightDiv);
      });
    });
  }, [persistentHighlights, currentPage, scale, pdfDocument, pageRenderKey, activeHighlightId]);

  // IMPROVED: Handle text selection with fixed tooltip position
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      // Get raw text, then normalize whitespace
      const rawSelectedText = selection.toString();
      // Replace multiple whitespace characters (spaces, tabs, newlines) with a single space
      const selectedText = rawSelectedText.replace(/\s+/g, ' ').trim();
      
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
              const y = firstRect.top - 56;
              
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
      if (!selectedText) return;

      // Only show the AI bubble for selections inside the PDF text layer
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        // if it's a text node, go up to its parent
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        // if this selection isn't within .textLayer, bail out
        if (!node.closest('.textLayer')) {
          return;  // let normal browser underline apply elsewhere
        }
      }

      handleSelectionChange();
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
      
      const selection = window.getSelection();
      const text = (selectedTextRef.current || selectionTooltip.text || "").trim();
      
      if (!text || !selection.rangeCount) {
        console.error('No text selected or no range for AI explanation/highlighting');
        return;
      }
      
      const range = selection.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());
      const canvasWrapper = containerRef.current.querySelector('.canvasWrapper');

      if (canvasWrapper && clientRects.length > 0) {
        const canvasWrapperRect = canvasWrapper.getBoundingClientRect();
        const rectsOnPage = clientRects.map(rect => ({
          top: (rect.top - canvasWrapperRect.top) / scale,
          left: (rect.left - canvasWrapperRect.left) / scale,
          width: rect.width / scale,
          height: rect.height / scale,
        }));
        const newHighlight = {
          id: Date.now(),
          pageNumber: currentPage,
          text: text, // Store the actual text for potential future use
          rectsOnPage: rectsOnPage,
        };
        setPersistentHighlights(prevHighlights => [...prevHighlights, newHighlight]);
        // Pass the newHighlight's id and first rect for scrolling
        const locationForCallback = { 
          id: newHighlight.id, 
          pageNumber: currentPage, 
          rect: rectsOnPage.length > 0 ? rectsOnPage[0] : null 
        };
        // console.log('New highlight created, locationForCallback:', locationForCallback); // For debugging

        // Hide tooltip first
        setSelectionTooltip({ visible: false });
        
        // Reset selection
        window.getSelection().removeAllRanges();
        
        // Delay to ensure UI updates before callback
        setTimeout(() => {
          // Call the parent callback
          if (onTextSelected && typeof onTextSelected === 'function') {
            console.log('Calling onTextSelected with:', text, style, 'on page', currentPage, 'location:', locationForCallback);
            onTextSelected(text, style, locationForCallback); // Pass comprehensive location data
          } else {
            console.error('onTextSelected is not available');
          }
        }, 100);
      } else { // Added else to handle case where canvasWrapper or clientRects are missing
        console.error('Could not create highlight: canvasWrapper or clientRects missing.');
        // Hide tooltip first
        setSelectionTooltip({ visible: false });
        // Reset selection
        window.getSelection().removeAllRanges();
      }
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

  // Expose scrollToHighlight method via ref
  useImperativeHandle(ref, () => ({
    scrollToHighlight: (locationData) => {
      if (locationData && typeof locationData.pageNumber !== 'undefined' && locationData.id) {
        const pageNum = parseInt(locationData.pageNumber, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          
          const performScrollAndHighlight = () => {
            const targetHighlightElement = document.querySelector(`.persistent-highlight[data-highlight-id="${locationData.id}"]`);
            if (targetHighlightElement) {
              targetHighlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setActiveHighlightId(locationData.id); // Set active ID for styling

              // Remove the active class after a delay
              setTimeout(() => {
                setActiveHighlightId(null);
              }, 2000); // Highlight for 2 seconds
            } else {
              console.warn('scrollToHighlight: Target highlight element not found on page', pageNum, 'for id', locationData.id);
            }
          };

          if (currentPage !== pageNum) {
            setCurrentPage(pageNum);
            // Need to wait for page to render, using setTimeout as a temporary measure
            // A more robust solution might involve a callback or effect after page render
            setTimeout(performScrollAndHighlight, 500); // Adjust delay as needed
          } else {
            // Already on the correct page, scroll immediately
            performScrollAndHighlight();
          }
        } else {
          console.warn('Invalid page number for scrollToHighlight:', locationData.pageNumber, 'Total pages:', totalPages);
        }
      } else {
        console.warn('scrollToHighlight called without valid pageNumber or id in locationData', locationData);
      }
    },
    removeHighlight: (highlightIdToRemove) => {
      setPersistentHighlights(currentHighlights => 
        currentHighlights.filter(h => h.id !== highlightIdToRemove)
      );
    }
  }));

  // Effect to clear active highlight when component unmounts or relevant dependencies change
  useEffect(() => {
    return () => {
      setActiveHighlightId(null);
    };
  }, []); // Clear on unmount

  // Re-apply active class if activeHighlightId is set and page changes (or scale changes)
  // This ensures the class is present if the highlight re-renders
  useEffect(() => {
    if (activeHighlightId && containerRef.current) {
      const canvasWrapper = containerRef.current.querySelector('.canvasWrapper');
      if (canvasWrapper) {
        // Remove from any old ones first (though should be handled by highlight removal)
        const oldActive = canvasWrapper.querySelectorAll('.active-scrolled-highlight');
        oldActive.forEach(el => el.classList.remove('active-scrolled-highlight'));
        
        const targetHighlightElement = canvasWrapper.querySelector(`.persistent-highlight[data-highlight-id="${activeHighlightId}"]`);
        if (targetHighlightElement) {
          targetHighlightElement.classList.add('active-scrolled-highlight');
        }
      }
    }
  }, [activeHighlightId, currentPage, scale, pageRenderKey]); // Dependencies that cause re-render of highlights

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
        ...pdfContentStyle,
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
        
        {/* Selection Tooltip - NEW CIRCULAR DESIGN */}
        {selectionTooltip.visible && (
          <div 
            ref={tooltipRef}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: selectionTooltip.x,
              top: selectionTooltip.y,
              width: '44px',
              height: '44px',
              backgroundColor: 'rgba(42, 49, 65, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              padding: '0',
              boxShadow: '0 6px 25px rgba(0, 0, 0, 0.3)',
              color: 'white',
              zIndex: 9999,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto', 
            }}
          >
            <button
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleAskAI('default');
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PDFViewer;