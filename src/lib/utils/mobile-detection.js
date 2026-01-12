/**
 * Detects if the user is on a mobile device using aspect ratio
 * @returns {boolean} True if mobile device detected
 */
export function isMobileByAspectRatio() {
  if (typeof window === 'undefined') return false;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;

  // Portrait mobile: tall and narrow screens
  const isPortraitMobile = aspectRatio < 0.8 && width < 768;

  // Landscape mobile: wide but short screens (typical phone landscape)
  const isLandscapeMobile = aspectRatio > 1.2 && aspectRatio < 2.2 &&
                           height < 500 && width < 1000;

  // Also check for touch capability as additional confirmation
  const hasTouch = 'ontouchstart' in window ||
                  (navigator && navigator.maxTouchPoints > 0);

  return (isPortraitMobile || isLandscapeMobile) && hasTouch;
}

/**
 * Gets the current device type based on aspect ratio
 * @returns {string} 'mobile', 'tablet', or 'desktop'
 */
export function getDeviceType() {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;

  // Mobile detection
  if (isMobileByAspectRatio()) {
    return 'mobile';
  }

  // Tablet detection (medium screens, reasonable aspect ratios)
  if (width >= 768 && width < 1200 && aspectRatio > 0.5 && aspectRatio < 2.5) {
    return 'tablet';
  }

  // Desktop (large screens)
  return 'desktop';
}
