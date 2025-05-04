import React, { useState } from 'react';
import PDFViewer from './PDFViewer';
import AIPanel from './AIPanel';

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
        width: '600px',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(180deg, rgba(15, 32, 39, 0.98) 0%, rgba(32, 58, 67, 0.98) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.2)',
        display: 'flex',         
        flexDirection: 'column', 
        overflow: 'hidden',
      }}>
        <AIPanel messages={messages} />
      </div>
    </div>
  );
}
