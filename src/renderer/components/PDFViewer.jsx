import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const PDFViewer = forwardRef(({ filePath, onTextSelected, pdfContentStyle = {}, onFullTextExtracted }, ref) => {
  // Input validation - ensure filePath is a string
  const validFilePath = filePath && typeof filePath === 'string' ? filePath : '';
  if (!validFilePath && filePath) {
    console.error('PDFViewer received invalid filePath type:', typeof filePath);
  }
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [initialPageLoaded, setInitialPageLoaded] = useState(false);
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
  const [pageInputValue, setPageInputValue] = useState('');
  const [pageInputError, setPageInputError] = useState('');
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const selectedTextRef = useRef('');
  const pdfContentRef = useRef(null);
  
  // Refs for keyboard navigation to access current values
  const pdfDocumentRef = useRef(null);
  const currentPageRef = useRef(1);
  const totalPagesRef = useRef(0);

  // Load highlights from persistent storage when filePath changes
  useEffect(() => {
    // Use validFilePath from component props validation
    if (!validFilePath) {
      console.log('No valid filePath for loading highlights');
      return;
    }
    
    const filePathString = validFilePath;
    
    const loadHighlights = async () => {
      try {
        // Use the electron API to get document highlights with the string path
        const storedHighlights = await window.electron.getDocumentHighlights(filePathString);
        if (storedHighlights && Array.isArray(storedHighlights) && storedHighlights.length > 0) {
          console.log(`Loaded ${storedHighlights.length} highlights for ${filePath}`);
          
          // Create clean, simple highlight objects
          const cleanHighlights = storedHighlights.map(highlight => ({
            id: String(highlight.id), // Ensure ID is a string
            pageNumber: typeof highlight.pageNumber === 'number' ? highlight.pageNumber : Number(highlight.pageNumber),
            text: typeof highlight.text === 'string' ? highlight.text : String(highlight.text),
            rectsOnPage: Array.isArray(highlight.rectsOnPage) ? highlight.rectsOnPage.map(rect => ({
              top: typeof rect.top === 'number' ? rect.top : Number(rect.top),
              left: typeof rect.left === 'number' ? rect.left : Number(rect.left),
              width: typeof rect.width === 'number' ? rect.width : Number(rect.width),
              height: typeof rect.height === 'number' ? rect.height : Number(rect.height)
            })) : []
          }));
          
          setPersistentHighlights(cleanHighlights);
        } else {
          console.log(`No stored highlights found for ${filePath}`);
          setPersistentHighlights([]);
        }
      } catch (e) {
        console.error("Failed to load highlights from persistent storage", e);
        setPersistentHighlights([]);
      }
    };
    
    loadHighlights();
  }, [validFilePath]);

  // Save highlights to persistent storage whenever they change
  useEffect(() => {
    // Use validFilePath from component props validation
    if (!validFilePath || persistentHighlights.length === 0) {
      return;
    }
    
    const filePathString = validFilePath;
    
    const saveHighlights = async () => {
      try {
        // Create a clean copy of highlights to avoid serialization issues
        const cleanHighlights = persistentHighlights.map(highlight => ({
          id: String(highlight.id), // Ensure ID is a string
          pageNumber: highlight.pageNumber,
          text: highlight.text,
          rectsOnPage: highlight.rectsOnPage.map(rect => ({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }))
        }));
        
        // Use the electron API to save document highlights with the string path
        await window.electron.saveDocumentHighlights(filePathString, cleanHighlights);
        console.log(`Saved ${cleanHighlights.length} highlights for ${filePathString}`);
      } catch (e) {
        console.error("Failed to save highlights to persistent storage", e);
      }
    };
    
    // Debounce save to avoid excessive writes
    const timeoutId = setTimeout(saveHighlights, 500);
    return () => clearTimeout(timeoutId);
  }, [persistentHighlights, validFilePath]);

  // Load PDF document when filePath changes
  useEffect(() => {
    // Force complete state reset - using functional updates to ensure immediate state changes
    setInitialPageLoaded(false);
    setPdfDocument(null);
    setCurrentPage(1);
    setTotalPages(0);
    setScale(1.5);
    setLoading(false);
    setError(null);
    setLoadingStatus('');
    setPageRenderKey(prev => prev + 1);
    setPersistentHighlights([]);
    setActiveHighlightId(null);
    setSelectionTooltip({ visible: false, text: '', x: 0, y: 0 });
    setPageInputValue('');
    setPageInputError('');
    
    // Reset refs as well
    pdfDocumentRef.current = null;
    currentPageRef.current = 1;
    totalPagesRef.current = 0;
    
    // Use validFilePath from component props validation
    if (!validFilePath) {
      console.log('No valid filePath for loading PDF document');
      setLoading(false); // Ensure loading is false if no file
      return;
    }
    
    // Use the validated path string
    const filePathString = validFilePath;
    
    // Log for debugging
    console.log('Loading PDF document with path:', filePathString);
    
    const loadPdf = async () => {
      setLoading(true);
      setLoadingStatus('Starting PDF load...');
      if (onFullTextExtracted) { // Clear any previous full text
        onFullTextExtracted('');
      }
      
      try {
        console.log('Loading PDF from:', filePathString);
        
        // Check that PDF.js is loaded
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('PDF.js library not found');
        }
        
        // Read file via preload bridge
        setLoadingStatus('Reading PDF file...');
        
        // Make sure filePathString is really a string at this point
        if (typeof filePathString !== 'string') {
          if (filePathString && typeof filePathString === 'object' && filePathString.path) {
            console.log('Using path property from object in PDFViewer loadPdf:', filePathString.path);
            filePathString = filePathString.path;
          } else {
            console.warn('Converting non-string filePathString to string in PDFViewer loadPdf:', typeof filePathString);
            filePathString = String(filePathString || '');
          }
        }
        
        console.log('Calling electron.readPdfFile with clean string path:', filePathString);
        const base64Data = await window.electron.readPdfFile(filePathString);
        
        if (!base64Data) {
          throw new Error('Could not read PDF file');
        }
        
        if (typeof base64Data !== 'string') {
          throw new Error(`Invalid data format: ${typeof base64Data}`);
        }
        
        console.log('PDF data loaded, length:', base64Data.length);
        setLoadingStatus('Processing PDF data...');
        
        try {
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
          
          // Update refs for keyboard navigation
          pdfDocumentRef.current = document;
          totalPagesRef.current = document.numPages;
          
          // Load last viewed page if not already loaded
          if (!initialPageLoaded && validFilePath) {
            try {
              const lastPage = await window.electron.getLastViewedPage(validFilePath);
              if (lastPage && lastPage > 1 && lastPage <= document.numPages) {
                setCurrentPage(lastPage);
                currentPageRef.current = lastPage;
                console.log(`Restored last viewed page: ${lastPage}`);
              } else {
                setCurrentPage(1);
                currentPageRef.current = 1;
              }
            } catch (e) {
              console.error('Failed to load last viewed page:', e);
              setCurrentPage(1);
              currentPageRef.current = 1;
            }
            setInitialPageLoaded(true);
          } else {
            setCurrentPage(1);
            currentPageRef.current = 1;
          }
          
          setLoadingStatus('');

          // Auto-focus the PDF content container for keyboard navigation
          setTimeout(() => {
            if (pdfContentRef.current) {
              pdfContentRef.current.focus();
            }
          }, 100);

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
        } catch (dataError) {
          console.error('Error processing PDF data:', dataError);
          throw new Error(`Failed to process PDF data: ${dataError.message}`);
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
  }, [validFilePath, onFullTextExtracted]);

  // Update refs when state changes
  useEffect(() => {
    pdfDocumentRef.current = pdfDocument;
  }, [pdfDocument]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  // Update ref when currentPage changes and save current page
  useEffect(() => {
    currentPageRef.current = currentPage;
    
    if (!validFilePath || !initialPageLoaded) return;
    
    const savePageNumber = async () => {
      try {
        await window.electron.saveLastViewedPage(validFilePath, currentPage);
      } catch (e) {
        console.error('Failed to save last viewed page:', e);
      }
    };
    
    // Debounce save to avoid excessive writes
    const timeoutId = setTimeout(savePageNumber, 500);
    return () => clearTimeout(timeoutId);
  }, [currentPage, validFilePath, initialPageLoaded]);

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
          id: Date.now().toString(), // Convert to string to match schema
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

  const goToPage = () => {
    const pageNumber = parseInt(pageInputValue, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      setPageInputError(`Page ${pageInputValue} doesn't exist. Valid range: 1-${totalPages}`);
      setTimeout(() => setPageInputError(''), 3000);
      return;
    }
    
    setCurrentPage(pageNumber);
    setPageInputValue('');
    setPageInputError('');
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      goToPage();
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
      console.log('PDFViewer: Removing highlight with ID:', highlightIdToRemove);
      setPersistentHighlights(currentHighlights => {
        const updatedHighlights = currentHighlights.filter(h => h.id !== highlightIdToRemove);
        console.log(`PDFViewer: Filtered highlights from ${currentHighlights.length} to ${updatedHighlights.length}`);
        
        // Save updated highlights to persistent storage immediately
        if (validFilePath && updatedHighlights.length !== currentHighlights.length) {
          console.log('PDFViewer: Saving updated highlights to storage after removal');
          const saveUpdatedHighlights = async () => {
            try {
              const cleanHighlights = updatedHighlights.map(highlight => ({
                id: String(highlight.id),
                pageNumber: highlight.pageNumber,
                text: highlight.text,
                rectsOnPage: highlight.rectsOnPage.map(rect => ({
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height
                }))
              }));
              
              await window.electron.saveDocumentHighlights(validFilePath, cleanHighlights);
              console.log(`PDFViewer: Saved ${cleanHighlights.length} highlights after removing highlight ${highlightIdToRemove}`);
            } catch (e) {
              console.error("PDFViewer: Failed to save highlights after removal", e);
            }
          };
          
          // Save immediately without debounce since this is a removal
          saveUpdatedHighlights();
        }
        
        return updatedHighlights;
      });
    }
  }));

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle keys when not typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Only handle navigation if we have a PDF loaded - use refs for current values
      if (!pdfDocumentRef.current || totalPagesRef.current === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
        case 'PageUp':
          event.preventDefault();
          if (currentPageRef.current > 1) {
            setCurrentPage(currentPageRef.current - 1);
          }
          break;
        case 'ArrowRight':
        case 'ArrowUp':
        case 'PageDown':
          event.preventDefault();
          if (currentPageRef.current < totalPagesRef.current) {
            setCurrentPage(currentPageRef.current + 1);
          }
          break;
        default:
          break;
      }
    };

    // Add event listener to the PDF content container
    const pdfElement = pdfContentRef.current;
    if (pdfElement) {
      pdfElement.addEventListener('keydown', handleKeyDown);
      // Auto-focus the PDF container when PDF loads
      if (pdfDocumentRef.current) {
        pdfElement.focus();
      }
    }

    return () => {
      if (pdfElement) {
        pdfElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [pdfDocument]); // Re-run when PDF document changes to auto-focus

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
      {/* Add CSS for placeholder styling */}
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          input::placeholder {
            color: rgba(255, 255, 255, 0.5);
            opacity: 1;
          }
          input::-webkit-input-placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          input::-moz-placeholder {
            color: rgba(255, 255, 255, 0.5);
            opacity: 1;
          }
          input:-ms-input-placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
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
        
        {/* Page input field and go button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <input
            type="number"
            value={pageInputValue}
            onChange={(e) => setPageInputValue(e.target.value)}
            onKeyPress={handlePageInputKeyPress}
            placeholder="Page"
            min="1"
            max={totalPages}
            style={{
              width: '70px',
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              textAlign: 'center',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            disabled={loading || !totalPages}
          />
          <button
            onClick={goToPage}
            disabled={loading || !totalPages || !pageInputValue}
            style={{
              padding: '8px 12px',
              cursor: (!loading && totalPages && pageInputValue) ? 'pointer' : 'not-allowed',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (!loading && totalPages && pageInputValue) ? 1 : 0.5,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </button>
          
          {/* Error message */}
          {pageInputError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '100%',
              marginLeft: '10px',
              transform: 'translateY(-50%)',
              padding: '8px 12px',
              background: 'rgba(178, 34, 34, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}>
              {pageInputError}
            </div>
          )}
        </div>
        
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
      <div 
        ref={pdfContentRef}
        tabIndex={0}
        style={{ 
          flex: 1, 
          overflow: 'auto',
          backgroundColor: '#0c1821',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '20px',
          position: 'relative',
          outline: 'none', // Remove focus outline for better visual experience
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