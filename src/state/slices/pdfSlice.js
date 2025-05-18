import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  filePath: null,
  pdfDocument: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.5,
  selectedText: '',
  recentDocuments: [], // Store recently opened documents in format { path, name, lastAccessed }
  loading: false,
  loadingStatus: '',
  error: null,
};

export const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    setPdfPath: (state, action) => {
      // Ensure filePath is a string to avoid serialization issues
      let filePath = action.payload;
      
      if (typeof filePath !== 'string') {
        console.warn('Converting non-string filePath to string in setPdfPath reducer');
        try {
          if (filePath && typeof filePath === 'object' && filePath.toString) {
            filePath = filePath.toString();
          } else {
            filePath = String(filePath || '');
          }
          console.log('Converted filePath to string:', filePath);
        } catch (error) {
          console.error('Failed to convert filePath to string in setPdfPath:', error);
          filePath = '';
        }
      }
      
      state.filePath = filePath;
      // Note: Recent documents are now managed by the main process through electron-store
      // and will be loaded/synced through loadRecentDocuments action
    },
    loadRecentDocuments: (state, action) => {
      state.recentDocuments = action.payload;
    },
    addOrUpdateRecentDocument: (state, action) => {
      try {
        // Get the document info from payload
        const rawDocumentInfo = action.payload;
        
        // Create a clean copy with proper string conversion
        const documentInfo = {
          path: typeof rawDocumentInfo.path === 'string' ? 
            rawDocumentInfo.path : String(rawDocumentInfo.path || ''),
          
          name: typeof rawDocumentInfo.name === 'string' ? 
            rawDocumentInfo.name : String(rawDocumentInfo.name || ''),
          
          lastAccessed: typeof rawDocumentInfo.lastAccessed === 'string' ?
            rawDocumentInfo.lastAccessed : new Date().toISOString()
        };
        
        console.log('Using clean document info in addOrUpdateRecentDocument:', documentInfo);
        
        // Check if this document is already in the list
        const existingIndex = state.recentDocuments.findIndex(doc => doc.path === documentInfo.path);
        if (existingIndex >= 0) {
          // Remove the existing entry
          state.recentDocuments.splice(existingIndex, 1);
        }
        
        // Add the document to the beginning of the list
        state.recentDocuments.unshift(documentInfo);
        
        // Ensure the list doesn't exceed 10 items
        if (state.recentDocuments.length > 10) {
          state.recentDocuments = state.recentDocuments.slice(0, 10);
        }
      } catch (error) {
        console.error('Error in addOrUpdateRecentDocument reducer:', error);
      }
    },
    setPdfDocument: (state, action) => {
      state.pdfDocument = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setTotalPages: (state, action) => {
      state.totalPages = action.payload;
    },
    setScale: (state, action) => {
      state.scale = action.payload;
    },
    setSelectedText: (state, action) => {
      state.selectedText = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setLoadingStatus: (state, action) => {
      state.loadingStatus = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetPdfState: (state) => {
      return {
        ...initialState,
        recentDocuments: state.recentDocuments, // Preserve recent documents
      };
    },
    removeRecentDocument: (state, action) => {
      const pathToRemove = action.payload;
      state.recentDocuments = state.recentDocuments.filter(
        doc => doc.path !== pathToRemove
      );
    },
    clearRecentDocuments: (state) => {
      state.recentDocuments = [];
    },
  },
});

export const {
  setPdfPath,
  setPdfDocument,
  setCurrentPage,
  setTotalPages,
  setScale,
  setSelectedText,
  setLoading,
  setLoadingStatus,
  setError,
  resetPdfState,
  removeRecentDocument,
  clearRecentDocuments,
  loadRecentDocuments,
  addOrUpdateRecentDocument,
} = pdfSlice.actions;

// Thunk to initialize recent documents from electron-store
export const initializeRecentDocuments = () => async (dispatch) => {
  try {
    if (window.electron && window.electron.getRecentDocuments) {
      const recentDocs = await window.electron.getRecentDocuments();
      dispatch(loadRecentDocuments(recentDocs));
    }
  } catch (error) {
    console.error('Error initializing recent documents:', error);
  }
};

export default pdfSlice.reducer; 