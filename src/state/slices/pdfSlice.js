import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  filePath: null,
  pdfDocument: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.5,
  selectedText: '',
  recentDocuments: [], // Store recently opened documents
  loading: false,
  loadingStatus: '',
  error: null,
};

export const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    setPdfPath: (state, action) => {
      state.filePath = action.payload;
      // Add to recent documents if not already present
      if (action.payload && !state.recentDocuments.includes(action.payload)) {
        state.recentDocuments = [
          action.payload,
          ...state.recentDocuments.filter(path => path !== action.payload)
        ].slice(0, 10); // Keep only the 10 most recent
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
      state.recentDocuments = state.recentDocuments.filter(
        path => path !== action.payload
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
} = pdfSlice.actions;

export default pdfSlice.reducer; 