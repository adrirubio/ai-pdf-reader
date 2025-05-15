import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  filePath: null,
  pdfDocument: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.5,
  selectedText: '',
  recentDocuments: [], // Now stores objects with path, name, and lastAccessed
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
      // Note: We no longer update recentDocuments here directly
      // This is now handled by the addOrUpdateRecentDocument action
      // which will be dispatched along with setPdfPath
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
    // New actions for the enhanced recent documents feature
    loadRecentDocuments: (state, action) => {
      state.recentDocuments = action.payload;
    },
    addOrUpdateRecentDocument: (state, action) => {
      const newDoc = action.payload;
      // Remove existing entry if present
      state.recentDocuments = state.recentDocuments.filter(
        doc => doc.path !== newDoc.path
      );
      // Add new document at the beginning of the list
      state.recentDocuments = [
        newDoc,
        ...state.recentDocuments
      ].slice(0, 10); // Keep only 10 most recent
    },
    removeRecentDocument: (state, action) => {
      // Now expects a filePath string, not a document object
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
  loadRecentDocuments,
  addOrUpdateRecentDocument,
  removeRecentDocument,
  clearRecentDocuments,
} = pdfSlice.actions;

export default pdfSlice.reducer; 