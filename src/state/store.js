import { configureStore } from '@reduxjs/toolkit';
import pdfReducer from './slices/pdfSlice';
import chatReducer from './slices/chatSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    pdf: pdfReducer,
    chat: chatReducer,
    ui: uiReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types as they might contain non-serializable data
        ignoredActions: ['pdf/setPdfDocument'],
        // Ignore these paths in the state
        ignoredPaths: ['pdf.pdfDocument'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store; 