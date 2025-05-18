import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './components/App';
import store from '../state/store';
import { initializeRecentDocuments } from '../state/slices/pdfSlice';

// Initialize app state
store.dispatch(initializeRecentDocuments());

// Create root and render the App with Redux Provider
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
