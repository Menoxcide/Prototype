import React from 'react'
import { isPortrait } from '../utils/orientationLock'

/**
 * Warning overlay shown when device is in portrait mode
 * Prompts user to rotate device to landscape
 */
export default function OrientationWarning() {
  const [showWarning, setShowWarning] = React.useState(false)

  React.useEffect(() => {
    const checkOrientation = () => {
      const portrait = isPortrait()
      setShowWarning(portrait)
      
      // Add/remove body class for CSS styling
      if (portrait) {
        document.body.classList.add('portrait-mode')
      } else {
        document.body.classList.remove('portrait-mode')
      }
    }

    // Check initial orientation
    checkOrientation()

    // Listen for orientation changes
    window.addEventListener('orientationchange', checkOrientation)
    window.addEventListener('resize', checkOrientation)
    
    // Screen orientation API change event
    if (screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation)
    }

    return () => {
      window.removeEventListener('orientationchange', checkOrientation)
      window.removeEventListener('resize', checkOrientation)
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation)
      }
      document.body.classList.remove('portrait-mode')
    }
  }, [])

  if (!showWarning) {
    return null
  }

  return (
    <div className="orientation-warning-overlay">
      <div className="orientation-warning-content">
        <div className="orientation-warning-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="22" x2="12" y2="22" />
          </svg>
        </div>
        <h2 className="orientation-warning-title">Please Rotate Your Device</h2>
        <p className="orientation-warning-message">
          MARS://NEXUS requires landscape orientation for the best gaming experience.
        </p>
        <div className="orientation-warning-arrow">
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 5l7 7-7 7" />
            <path d="M21 12H3" />
          </svg>
        </div>
      </div>
    </div>
  )
}
