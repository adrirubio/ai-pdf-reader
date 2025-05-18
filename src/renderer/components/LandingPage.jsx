import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPdfPath, loadRecentDocuments } from '../../state/slices/pdfSlice';

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

  return (
    <div style={{ 
      height: '100%',
      background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
      backgroundSize: '600% 600%',
      animation: 'gradientBG 15s ease infinite',
      padding: '40px',
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
        padding: '40px',
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
          marginBottom: '20px',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        
        <h1 style={{ 
          fontSize: '3.5rem',
          textAlign: 'center',
          margin: '0 0 10px 0',
          color: 'white',
          fontWeight: '800',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          letterSpacing: '-0.5px',
        }}>
          AI PDF Reader
        </h1>
        
        <p style={{ 
          fontSize: '1.3rem',
          textAlign: 'center',
          margin: '0 0 40px 0',
          color: 'rgba(255, 255, 255, 0.8)',
          maxWidth: '600px',
          lineHeight: '1.6',
          alignSelf: 'center',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Enhance your reading experience with AI-powered explanations.
          Simply highlight text in any PDF to get instant insights tailored to your needs.
        </p>
        
        {/* Feature cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginBottom: '40px',
        }}>
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              ),
              title: "Custom Explanations",
              desc: "Control how the AI explains content by providing your own custom instructions."
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              ),
              title: "Interactive Chat",
              desc: "Ask follow-up questions to get more details or clarification on any topic."
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              ),
              title: "Cross-Platform",
              desc: "Works seamlessly on Windows, macOS, and Linux with the same great experience."
            }
          ].map((feature, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '25px',
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
                width: '50px', 
                height: '50px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                marginBottom: '15px',
                color: 'white',
              }}>
                {feature.icon}
              </div>
              
              <h3 style={{ 
                fontSize: '1.3rem', 
                margin: '0 0 10px 0',
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
            marginTop: '40px',
            width: '100%',
            transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
            opacity: animateIn ? 1 : 0,
            transition: 'all 0.6s ease-out',
            transitionDelay: '0.4s',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              color: 'white',
              marginBottom: '20px',
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
                    
                    if (pathToUse) {
                      console.log('Opening document with path:', pathToUse);
                      dispatch(setPdfPath(pathToUse));
                    }
                    
                    // Always pass a clean value (string or null)
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
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Version info */}
        <div style={{ 
          marginTop: '40px',
          fontSize: '0.85rem',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          opacity: animateIn ? 0.8 : 0,
          transition: 'opacity 0.6s ease-out',
          transitionDelay: '0.6s',
        }}>
          <p>AI PDF Reader v1.0 • Powered by PDF.js</p>
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
