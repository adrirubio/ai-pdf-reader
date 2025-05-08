import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from '../slices/pdfSlice';

export const usePdfActions = () => {
  const dispatch = useDispatch();
  const {
    filePath,
    pdfDocument,
    currentPage,
    totalPages,
    scale,
    selectedText,
    recentDocuments,
    loading,
    loadingStatus,
    error,
  } = useSelector((state) => state.pdf);

  const openPdf = useCallback((path) => {
    dispatch(setPdfPath(path));
  }, [dispatch]);

  const setPdf = useCallback((document) => {
    dispatch(setPdfDocument(document));
  }, [dispatch]);

  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      dispatch(setCurrentPage(pageNumber));
    }
  }, [dispatch, totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      dispatch(setCurrentPage(currentPage + 1));
    }
  }, [dispatch, currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      dispatch(setCurrentPage(currentPage - 1));
    }
  }, [dispatch, currentPage]);

  const zoomIn = useCallback(() => {
    dispatch(setScale(scale * 1.1));
  }, [dispatch, scale]);

  const zoomOut = useCallback(() => {
    dispatch(setScale(scale / 1.1));
  }, [dispatch, scale]);

  const resetZoom = useCallback(() => {
    dispatch(setScale(1.5)); // Reset to default zoom
  }, [dispatch]);

  const selectText = useCallback((text) => {
    dispatch(setSelectedText(text));
  }, [dispatch]);

  const setLoadingState = useCallback((isLoading, status = '') => {
    dispatch(setLoading(isLoading));
    dispatch(setLoadingStatus(status));
  }, [dispatch]);

  const setErrorState = useCallback((errorMessage) => {
    dispatch(setError(errorMessage));
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch(resetPdfState());
  }, [dispatch]);

  const removeRecent = useCallback((path) => {
    dispatch(removeRecentDocument(path));
  }, [dispatch]);

  const clearRecent = useCallback(() => {
    dispatch(clearRecentDocuments());
  }, [dispatch]);

  return {
    // State
    filePath,
    pdfDocument,
    currentPage,
    totalPages,
    scale,
    selectedText,
    recentDocuments,
    loading,
    loadingStatus,
    error,
    
    // Actions
    openPdf,
    setPdf,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    selectText,
    setLoadingState,
    setErrorState,
    resetState,
    removeRecent,
    clearRecent,
  };
}; 