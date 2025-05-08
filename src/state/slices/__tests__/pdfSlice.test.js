import { pdfSlice, setPdfPath, setCurrentPage, setScale } from '../pdfSlice';

describe('pdfSlice', () => {
  const initialState = {
    filePath: null,
    pdfDocument: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.5,
    selectedText: '',
    recentDocuments: [],
    loading: false,
    loadingStatus: '',
    error: null,
  };

  test('should return the initial state', () => {
    expect(pdfSlice.reducer(undefined, { type: undefined })).toEqual(initialState);
  });

  test('should set PDF path', () => {
    const filePath = '/path/to/test.pdf';
    const newState = pdfSlice.reducer(initialState, setPdfPath(filePath));
    
    expect(newState.filePath).toBe(filePath);
    expect(newState.recentDocuments).toContain(filePath);
  });

  test('should keep recent documents unique', () => {
    const filePath = '/path/to/test.pdf';
    
    // Add the same file path twice
    let state = pdfSlice.reducer(initialState, setPdfPath(filePath));
    state = pdfSlice.reducer(state, setPdfPath(filePath));
    
    expect(state.recentDocuments.length).toBe(1);
    expect(state.recentDocuments).toEqual([filePath]);
  });

  test('should update current page', () => {
    const newState = pdfSlice.reducer(initialState, setCurrentPage(5));
    
    expect(newState.currentPage).toBe(5);
  });

  test('should update scale', () => {
    const newState = pdfSlice.reducer(initialState, setScale(2.0));
    
    expect(newState.scale).toBe(2.0);
  });
}); 