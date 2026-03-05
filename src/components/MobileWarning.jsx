// src/components/MobileOnly.jsx
import React, { useEffect, useState } from 'react';
import { isMobileDevice, startMobileMonitoring } from '../utils/mobileCheck';
import './MobileWarning.css';

function MobileOnly({ children }) {
  const [isMobile, setIsMobile] = useState(true);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const checkDevice = () => {
      const { isMobile } = isMobileDevice();
      setIsMobile(isMobile);
      
      if (!isMobile) {
        setCheckCount(prev => prev + 1);
      }
    };

    // Initial check
    checkDevice();

    // Check frequently (prevents devtools manipulation)
    const interval = setInterval(checkDevice, 500);

    // Start continuous monitoring
    startMobileMonitoring();

    // Monitor for devtools
    const devtoolsInterval = setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      // If devtools is open (typical sizes)
      if (widthDiff > 100 || heightDiff > 100) {
        setIsMobile(false);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(devtoolsInterval);
    };
  }, []);

  // If multiple desktop detections, block permanently
  if (!isMobile || checkCount > 5) {
    return (
      <div className="mobile-only-overlay">
        <div className="mobile-only-card">
          <div className="phone-icon">📱</div>
          <h1>Mobile Only</h1>
          <p className="message">
            WinTap Games is exclusively designed for mobile devices.
          </p>
          
          <div className="detection-warning">
            ⚠️ Desktop access detected ({checkCount})
          </div>
          
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

          <div className="device-details">
            <div className="detail-row">
              <span>Status:</span>
              <strong className="blocked">BLOCKED</strong>
            </div>
            <div className="detail-row">
              <span>Screen:</span>
              <strong>{window.innerWidth} x {window.innerHeight}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default MobileOnly;