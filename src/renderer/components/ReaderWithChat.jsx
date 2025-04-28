import React, { useState } from 'react';
import PDFViewer from './PDFViewer';
import AIPanel     from './AIPanel';

export default function ReaderWithChat({ filePath }) {
  const [messages, setMessages] = useState([]);

  // whenever PDFViewer calls onTextSelected, append a new message
  const handleTextSelected = (text, style) => {
    // here you'd fetch your AI response; for now we mock with '...'
    setMessages(m => [...m, { text, style, response: '...' }]);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1,
        position: 'relative',   // so PDFViewer tooltip can use fixed coords
      }}>
        <PDFViewer 
          filePath={filePath} 
          onTextSelected={handleTextSelected} 
        />
      </div>
      <div style={{
        width: '350px',          // fixed chat width
        borderLeft: '1px solid #333',
        overflowY: 'auto',
      }}>
        <AIPanel messages={messages} />
      </div>
    </div>
  );
}
