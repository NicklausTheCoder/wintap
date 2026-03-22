// src/components/MobileOnly.jsx
import React, { useEffect, useState, useRef } from 'react';
import { isMobileDevice, startMobileMonitoring, blockDesktopAccess } from '../utils/mobileCheck';
import './MobileWarning.css';

function MobileOnly({ children }) {
  const [isMobile, setIsMobile] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const hasShownWarning = useRef(false);
  const checkInterval = useRef(null);

  useEffect(() => {
    // Initial check with a slight delay to avoid hydration issues
    const initialCheck = setTimeout(() => {
      const { isMobile: mobile } = isMobileDevice(true);
      setIsMobile(mobile);
      
      // If not mobile, show warning
      if (!mobile && !hasShownWarning.current) {
        hasShownWarning.current = true;
        setShowWarning(true);
        blockDesktopAccess(); // Use the direct block function
      }
    }, 100);
    
    // Set up periodic checking but less frequently
    checkInterval.current = setInterval(() => {
      if (!hasShownWarning.current) {
        const { isMobile: mobile } = isMobileDevice();
        setIsMobile(mobile);
        
        if (!mobile && !hasShownWarning.current) {
          hasShownWarning.current = true;
          setShowWarning(true);
          blockDesktopAccess();
        }
      }
    }, 2000); // Check every 2 seconds instead of 500ms
    
    // Start continuous monitoring (this has its own intervals)
    const cleanupMonitoring = startMobileMonitoring();
    
    // Cleanup
    return () => {
      clearTimeout(initialCheck);
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      cleanupMonitoring();
    };
  }, []);
  
  // If warning should be shown
  if (showWarning || !isMobile) {
    return (
      <div className="mobile-only-overlay">
        <div className="mobile-only-card">
          <div className="phone-icon">📱</div>
          <h1>Mobile Only</h1>
          <p className="message">
            WinTap Games is exclusively designed for mobile devices.
          </p>
          
          <div className="instruction-box">
            <div className="instruction-content">
              <span className="arrow-icon">📲</span>
              <div className="instruction-text">
                <div className="instruction-title">Use your phone</div>
                <div className="instruction-subtitle">
                  This site does not work on desktop
                </div>
              </div>
            </div>
          </div>

          <div className="url-box">
            <span className="url-value">{window.location.host}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // If mobile, render children
  return children;
}

export default MobileOnly;