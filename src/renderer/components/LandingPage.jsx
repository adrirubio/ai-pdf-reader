import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPdfPath, loadRecentDocuments, removeRecentDocument } from '../../state/slices/pdfSlice';

const LandingPage = ({ onOpenPDF }) => {
  const [animateIn, setAnimateIn] = useState(false);
  const recentDocuments = useSelector(state => state.pdf.recentDocuments);
  const dispatch = useDispatch();
  
  // Animation effect when component mounts
  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
  }, []);
  
  // Load recent documents on component mount
  useEffect(() => {
    const loadRecents = async () => {
      try {
        const recents = await window.electron.getRecentDocuments();
        dispatch(loadRecentDocuments(recents));
      } catch (error) {
        console.error('Error loading recent documents:', error);
      }
    };
    
    loadRecents();
  }, [dispatch]);

  // Add a function to handle document deletion
  const handleDeleteDocument = async (e, docPath) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent opening the document when clicking delete
    
    try {
      // Remove from database via electron API
      await window.electron.removeRecentDocument(docPath);
      
      // Remove from Redux state
      dispatch(removeRecentDocument(docPath));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <div style={{ 
      height: '100%',
      background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
      backgroundSize: '600% 600%',
      animation: 'gradientBG 15s ease infinite',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      position: 'relative',
    }}>
      {/* Floating particles background */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0.2,
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            background: 'white',
            borderRadius: '50%',
            width: `${Math.random() * 20 + 5}px`,
            height: `${Math.random() * 20 + 5}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float ${Math.random() * 20 + 10}s linear infinite`,
            opacity: Math.random() * 0.5 + 0.1,
          }} />
        ))}
      </div>
      
      {/* Content container with glass morphism effect */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '25px',
        maxWidth: '900px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
        opacity: animateIn ? 1 : 0,
        transition: 'all 0.6s ease-out',
      }}>
        {/* Logo/Icon */}
        <div style={{
          textAlign: 'center',
          marginBottom: '10px',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          }}>
            <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        
        <h1 style={{ 
          fontSize: '3rem',
          textAlign: 'center',
          margin: '0 0 8px 0',
          color: 'white',
          fontWeight: '800',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          letterSpacing: '-0.5px',
        }}>
          AI PDF Reader
        </h1>
        
        <p style={{ 
          fontSize: '1.1rem',
          textAlign: 'center',
          margin: '0 0 25px 0',
          color: 'rgba(255, 255, 255, 0.8)',
          maxWidth: '600px',
          lineHeight: '1.5',
          alignSelf: 'center',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Transform your PDF reading experience with powerful AI assistance.
          Highlight text to receive instant explanations and engage in interactive chat sessions.
          Your highlights and conversations are automatically saved for a seamless experience.
        </p>
        
        {/* Feature cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px',
          marginBottom: '25px',
        }}>
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              ),
              title: "Smart AI Explanations",
              desc: "Get instant explanations by typing your own custom instructions for how the AI should explain the content, with real-time streaming responses."
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              ),
              title: "Interactive Chat System",
              desc: "Ask follow-up questions, create multiple chat sessions for different topics, and maintain a persistent conversation history about any part of your document."
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                </svg>
              ),
              title: "Seamless Experience",
              desc: "Create persistent highlights and annotations, with all your data saved automatically between sessions. Works consistently across Windows, macOS, and Linux."
            }
          ].map((feature, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '20px',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              color: 'white',
              transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
              opacity: animateIn ? 1 : 0,
              transitionDelay: `${0.2 + index * 0.1}s`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            }}
            >
              {/* Feature icon */}
              <div style={{ 
                width: '45px', 
                height: '45px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                marginBottom: '12px',
                color: 'white',
              }}>
                {feature.icon}
              </div>
              
              <h3 style={{ 
                fontSize: '1.2rem', 
                margin: '0 0 8px 0',
                fontWeight: '600',
              }}>
                {feature.title}
              </h3>
              
              <p style={{ 
                fontSize: '0.95rem', 
                margin: '0',
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.5',
                flex: 1,
              }}>
                {feature.desc}
              </p>
              
              {/* Decorative element */}
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                pointerEvents: 'none',
              }} />
            </div>
          ))}
        </div>
        
        {/* CTA button */}
        <div style={{ 
          textAlign: 'center',
          transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
          opacity: animateIn ? 1 : 0,
          transition: 'all 0.6s ease-out',
          transitionDelay: '0.5s',
        }}>
          <button 
            onClick={(e) => {
              e.preventDefault(); // Prevent the event from being passed
              onOpenPDF(); // Call without arguments to use the file dialog
            }}
            style={{
              background: 'white',
              color: '#203a43',
              border: 'none',
              padding: '15px 30px',
              fontSize: '1.1rem',
              fontWeight: '600',
              borderRadius: '30px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '10px',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Open a PDF
            </span>
          </button>
        </div>
        
        {/* Recent Documents Section */}
        {recentDocuments.length > 0 && (
          <div style={{
            marginTop: '25px',
            width: '100%',
            transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
            opacity: animateIn ? 1 : 0,
            transition: 'all 0.6s ease-out',
            transitionDelay: '0.4s',
          }}>
            <h2 style={{
              fontSize: '1.4rem',
              color: 'white',
              marginBottom: '15px',
              textAlign: 'left',
              fontWeight: '600',
            }}>
              Recent Documents
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '15px',
              width: '100%',
            }}>
              {recentDocuments.map((doc, index) => (
                <div 
                  key={doc.path}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent event propagation
                    e.stopPropagation();
                    
                    // Handle opening a recent document - ensure we have valid data
                    console.log('Recent document clicked:', doc);
                    
                    let pathToUse;
                    
                    // First try to use the full path if it's a string
                    if (doc.path && typeof doc.path === 'string' && doc.path.trim() !== '') {
                      console.log('Using path from recent document:', doc.path);
                      pathToUse = doc.path;
                    } 
                    // If we don't have a valid path, fall back to name
                    else if (doc.name && typeof doc.name === 'string' && doc.name.trim() !== '') {
                      console.log('Using name as path:', doc.name);
                      pathToUse = doc.name;
                    }
                    // If we don't have either, use file dialog
                    else {
                      console.log('No valid path or name found, opening dialog');
                      pathToUse = null; // Will cause file dialog to open
                    }
                    
                    // Always pass a clean value (string or null)
                    // Note: onOpenPDF will handle all state management including Redux updates
                    onOpenPDF(pathToUse);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '10px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
                    opacity: animateIn ? 1 : 0,
                    transitionDelay: `${0.4 + (index * 0.05)}s`,
                    position: 'relative', // Add this for delete button positioning
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  
                  <div style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '500',
                      color: 'white',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {typeof doc.name === 'string' ? doc.name : 'Unnamed Document'}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {doc.lastAccessed ? new Date(doc.lastAccessed).toLocaleString() : 'Unknown date'}
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button 
                    onClick={(e) => handleDeleteDocument(e, doc.path)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: 0,
                      color: 'rgba(255, 255, 255, 0.6)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)';
                      e.currentTarget.style.color = 'rgba(255, 59, 48, 0.9)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Version info */}
        <div style={{ 
          marginTop: '20px',
          fontSize: '0.8rem',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          opacity: animateIn ? 0.8 : 0,
          transition: 'opacity 0.6s ease-out',
          transitionDelay: '0.6s',
        }}>
          <p>AI PDF Reader v1.0.1 by Adrian Rubio • Powered by PDF.js</p>
        </div>
      </div>
      
      {/* Add animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(10px); }
          50% { transform: translateY(0) translateX(20px); }
          75% { transform: translateY(10px) translateX(10px); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}} />
    </div>
  );
};

export default LandingPage;
