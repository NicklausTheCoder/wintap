// src/utils/mobileCheck.js
/**
 * Advanced Mobile Detection Utility
 * Multiple layers of detection to prevent desktop bypass
 */

let hasBlocked = false; // Global flag to prevent multiple blocks
let cachedResult = null; // Cache the detection result
let lastCheckTime = 0;
const CHECK_COOLDOWN = 1000; // Only check once per second

export const isMobileDevice = (forceCheck = false) => {
  const now = Date.now();
  
  // Return cached result if within cooldown period and not forcing check
  if (!forceCheck && cachedResult && (now - lastCheckTime) < CHECK_COOLDOWN) {
    return cachedResult;
  }
  
  // Layer 1: User Agent Detection (hardest to fake)
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Comprehensive mobile user agent patterns
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Windows Phone/i,
    /Mobile/i,
    /mobile/i,
    /CriOS/i, // Chrome on iOS
    /FxiOS/i, // Firefox on iOS
    /EdgiOS/i, // Edge on iOS
    /DartWeb/i // Dart language
  ];

  const hasMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
  
  // Check for iPad specifically (can be detected as desktop with newer iPads)
  const isIPad = /iPad/i.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Layer 2: Touch Capability Detection
  const hasTouch = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );

  // Layer 3: Screen Metrics (adjusted for modern phones)
  const screenWidth = window.innerWidth || document.documentElement.clientWidth;
  const screenHeight = window.innerHeight || document.documentElement.clientHeight;
  
  // Updated mobile screen detection - more inclusive
  const isMobileScreen = screenWidth <= 768; // Increased from 428
  const isMobileAspectRatio = screenHeight / screenWidth > 1.3; // Lowered from 1.5
  
  // Layer 4: Device Memory (mobile devices typically have less)
  const deviceMemory = navigator.deviceMemory || 0;
  const isLowMemory = deviceMemory > 0 && deviceMemory <= 8; // Increased from 4
  
  // Layer 5: CPU Cores (mobile devices typically have fewer)
  const cpuCores = navigator.hardwareConcurrency || 0;
  const isLowCoreCount = cpuCores > 0 && cpuCores <= 12; // Increased from 8
  
  // Layer 6: Connection Type (mobile often uses cellular)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const connectionType = connection?.effectiveType || '';
  const isCellular = connectionType.includes('4g') || connectionType.includes('3g') || connectionType.includes('2g');
  
  // Layer 7: Screen Orientation Support (using window instead of screen)
  const hasOrientationSupport = 'orientation' in window || 'onorientationchange' in window;
  
  // Layer 8: Max Touch Points (real mobile has multiple)
  const hasMultiTouch = navigator.maxTouchPoints > 1;
  
  // Layer 9: Platform check
  const platform = navigator.platform || '';
  const isDesktopPlatform = platform.includes('Win') || platform.includes('Mac') || platform.includes('Linux');
  
  // Scoring system - adjusted weights to favor mobile more
  let mobileScore = 0;
  let desktopScore = 0;
  
  // Mobile points - increased weights
  if (hasMobileUA) mobileScore += 40;
  if (isIPad) mobileScore += 35; // iPad should be treated as mobile/tablet
  if (hasTouch) mobileScore += 25;
  if (isMobileScreen) mobileScore += 20;
  if (isMobileAspectRatio) mobileScore += 15;
  if (isLowMemory) mobileScore += 8;
  if (isLowCoreCount) mobileScore += 8;
  if (isCellular) mobileScore += 15;
  if (hasOrientationSupport) mobileScore += 10;
  if (hasMultiTouch) mobileScore += 15;
  
  // Desktop points - reduced weights
  if (!hasTouch) desktopScore += 15;
  if (screenWidth > 1024 && !isIPad) desktopScore += 10; // Only count for non-iPad
  if (isDesktopPlatform && !isIPad) desktopScore += 10;
  if (!hasMobileUA && !isIPad) desktopScore += 5;
  
  // Special case: Large tablets should still be considered mobile
  const isLargeTablet = screenWidth >= 768 && screenWidth <= 1024 && hasTouch && hasMultiTouch;
  if (isLargeTablet) {
    mobileScore += 25;
    desktopScore -= 20;
  }
  
  // Lower the threshold for mobile detection
  const isMobile = (hasMobileUA && hasTouch) || // Strong indicator
                   (mobileScore > desktopScore && mobileScore > 25) || // Lowered from 40
                   (isIPad) || // iPads are mobile
                   (isLargeTablet); // Large tablets are mobile
  
  const result = {
    isMobile,
    mobileScore,
    desktopScore,
    details: {
      hasMobileUA,
      hasTouch,
      isMobileScreen,
      isMobileAspectRatio,
      deviceMemory: deviceMemory || 'unknown',
      cpuCores: cpuCores || 'unknown',
      connectionType: connectionType || 'unknown',
      isCellular,
      hasMultiTouch,
      isDesktopPlatform,
      screenWidth,
      screenHeight,
      isIPad,
      isLargeTablet
    }
  };
  
  // Cache the result
  cachedResult = result;
  lastCheckTime = now;
  
  return result;
};

export const blockDesktopAccess = () => {
  // Prevent multiple blocks
  if (hasBlocked) return false;
  
  const { isMobile, mobileScore, desktopScore, details } = isMobileDevice(true);
  
  if (!isMobile) {
    hasBlocked = true;
    
    // Clear everything
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    // Create fullscreen mobile-only message
    const overlay = document.createElement('div');
    overlay.id = 'mobile-only-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    `;

    // Create content
    const content = document.createElement('div');
    content.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 2px solid #fbbf24;
      border-radius: 30px;
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      color: white;
      animation: slideUp 0.5s ease;
    `;

    // Add styles for animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    // Create detection details string
    const detectionDetails = `
      Mobile Score: ${mobileScore}/100
      Desktop Score: ${desktopScore}/100
      
      Detection Details:
      • Mobile UA: ${details.hasMobileUA ? '✅' : '❌'}
      • iPad Detected: ${details.isIPad ? '✅' : '❌'}
      • Large Tablet: ${details.isLargeTablet ? '✅' : '❌'}
      • Touch Support: ${details.hasTouch ? '✅' : '❌'}
      • Mobile Screen: ${details.isMobileScreen ? '✅' : '❌'}
      • Tall Aspect: ${details.isMobileAspectRatio ? '✅' : '❌'}
      • Multi-touch: ${details.hasMultiTouch ? '✅' : '❌'}
      • Desktop Platform: ${details.isDesktopPlatform ? '✅' : '❌'}
      • Connection: ${details.connectionType}
      • CPU Cores: ${details.cpuCores}
      • RAM: ${details.deviceMemory}GB
    `;

    // Add content
    content.innerHTML = `
      <div style="font-size: 80px; margin-bottom: 20px; animation: float 3s infinite;">📱</div>
      <h1 style="color: #fbbf24; font-size: 32px; margin-bottom: 15px; font-weight: bold;">
        Mobile Only
      </h1>
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        WinTap Games is exclusively designed for mobile devices. 
        Please access this site from your smartphone.
      </p>
      
      <div style="background: rgba(251, 191, 36, 0.1); border-radius: 16px; padding: 20px; margin-bottom: 25px; border: 1px solid rgba(251, 191, 36, 0.3);">
        <div style="display: flex; align-items: center; gap: 15px; justify-content: center;">
          <span style="font-size: 48px; animation: pulse 2s infinite;">📲</span>
          <div style="text-align: left;">
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 5px; font-size: 16px;">
              Open on your phone
            </div>
            <div style="color: #94a3b8; font-size: 13px;">
              This site is not available on desktop
            </div>
          </div>
        </div>
      </div>
      
      <div style="background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <span style="color: #94a3b8;">Detected:</span>
          <strong style="color: #fbbf24;">Desktop Environment</strong>
        </div>

      </div>

    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Prevent any interaction
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Disable all input events
    ['click', 'touchstart', 'keydown', 'keyup', 'mousedown'].forEach(event => {
      document.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, true);
    });

    return true;
  }
  
  return false;
};

// Continuous monitoring (detects devtools resizing)
export const startMobileMonitoring = () => {
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  let checkCount = 0;
  
  const monitorInterval = setInterval(() => {
    // Don't monitor if already blocked
    if (!hasBlocked) {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      // If dimensions changed significantly
      if (Math.abs(currentWidth - lastWidth) > 50 || Math.abs(currentHeight - lastHeight) > 50) {
        checkCount++;
        
        // If multiple size changes detected (likely resizing in devtools)
        if (checkCount > 3) {
          blockDesktopAccess();
        }
        
        lastWidth = currentWidth;
        lastHeight = currentHeight;
      }
    }
  }, 500);
  
  // Also check for devtools detection
  const devtoolsInterval = setInterval(() => {
    if (!hasBlocked) {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        blockDesktopAccess();
      }
    }
  }, 1000);
  
  // Return cleanup function
  return () => {
    clearInterval(monitorInterval);
    clearInterval(devtoolsInterval);
  };
};

// Helper function to log detection results for debugging
export const logMobileDetection = () => {
  const result = isMobileDevice(true);
  console.log('Mobile Detection Results:', {
    isMobile: result.isMobile,
    mobileScore: result.mobileScore,
    desktopScore: result.desktopScore,
    details: result.details
  });
  return result;
};

// Reset function for testing
export const resetMobileDetection = () => {
  hasBlocked = false;
  cachedResult = null;
  lastCheckTime = 0;
};