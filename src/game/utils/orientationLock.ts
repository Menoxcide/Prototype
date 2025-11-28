/**
 * Mobile orientation lock utility
 * Handles locking the screen to landscape orientation on mobile devices
 */

type OrientationLockType = 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary'

// Extend ScreenOrientation interface to include lock method
declare global {
  interface ScreenOrientation {
    lock(orientation: OrientationLockType): Promise<void>
    unlock(): void
  }
}

/**
 * Check if device is in portrait mode
 */
export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth
}

/**
 * Check if device is in landscape mode
 */
export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight
}

/**
 * Get current orientation angle
 */
export function getOrientationAngle(): number {
  return window.orientation || (screen.orientation?.angle ?? 0)
}

/**
 * Lock screen orientation to landscape
 * Attempts to use Screen Orientation API if available, otherwise falls back to other methods
 */
export async function lockToLandscape(): Promise<boolean> {
  try {
    // Try Screen Orientation API (most modern and reliable)
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock('landscape')
        return true
      } catch (err: any) {
        // Suppress AbortError - it's expected when lock/unlock is canceled
        if (err.name === 'AbortError') {
          // This is expected when a previous lock attempt is canceled
          return false
        }
        // Suppress NotSupportedError - it's expected on devices that don't support orientation lock
        if (err.name === 'NotSupportedError') {
          return false
        }
        // Orientation lock may require fullscreen or user gesture
        // Try alternative landscape types
        try {
          await screen.orientation.lock!('landscape-primary')
          return true
        } catch (altErr: any) {
          if (altErr.name === 'AbortError') {
            return false
          }
          // Suppress NotSupportedError - it's expected on devices that don't support orientation lock
          if (altErr.name === 'NotSupportedError') {
            return false
          }
          try {
            await screen.orientation.lock!('landscape-secondary')
            return true
          } catch (altErr2: any) {
            if (altErr2.name === 'AbortError') {
              return false
            }
            // Suppress NotSupportedError - it's expected on devices that don't support orientation lock
            if (altErr2.name === 'NotSupportedError') {
              return false
            }
            // Only log non-AbortError and non-NotSupportedError failures
            if (import.meta.env.DEV && altErr2.name !== 'NotSupportedError') {
              console.warn('Screen Orientation API lock failed:', altErr2)
            }
          }
        }
      }
    }

    // Fallback: Try legacy iOS orientation lock
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // iOS orientation is locked via meta tag, but we can try to manipulate it
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, orientation=landscape'
        )
      }
    }

    return false
  } catch (error: any) {
    // Suppress NotSupportedError - it's expected on devices that don't support orientation lock
    if (error.name !== 'NotSupportedError' && import.meta.env.DEV) {
      console.warn('Failed to lock orientation:', error)
    }
    return false
  }
}

/**
 * Unlock screen orientation
 */
export function unlockOrientation(): void {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock()
    }
  } catch (error: any) {
    // Suppress AbortError - it's expected when unlock is canceled
    if (error.name !== 'AbortError' && import.meta.env.DEV) {
      console.warn('Failed to unlock orientation:', error)
    }
  }
}

/**
 * Setup orientation lock with automatic enforcement
 * Listens for orientation changes and attempts to lock to landscape
 */
export function setupOrientationLock(): () => void {
  let locked = false
  let unlockTimeout: NodeJS.Timeout | null = null
  let lockDebounceTimeout: NodeJS.Timeout | null = null
  const DEBOUNCE_DELAY = 300 // Debounce lock attempts to prevent rapid calls

  const attemptLock = async () => {
    // Clear any pending debounce
    if (lockDebounceTimeout) {
      clearTimeout(lockDebounceTimeout)
      lockDebounceTimeout = null
    }
    
    // Debounce lock attempts to prevent conflicts
    lockDebounceTimeout = setTimeout(async () => {
      if (isPortrait()) {
        // Small delay to allow browser to register orientation change
        if (unlockTimeout) {
          clearTimeout(unlockTimeout)
        }
        unlockTimeout = setTimeout(async () => {
          locked = await lockToLandscape()
        }, 100)
      } else if (!locked && isLandscape()) {
        // Lock when in landscape
        locked = await lockToLandscape()
      }
    }, DEBOUNCE_DELAY)
  }

  // Initial lock attempt
  attemptLock()

  // Listen for orientation changes
  const handleOrientationChange = () => {
    attemptLock()
  }

  const handleResize = () => {
    // Resize can indicate orientation change on some devices
    if (isPortrait()) {
      attemptLock()
    }
  }

  // Use multiple events for better compatibility
  window.addEventListener('orientationchange', handleOrientationChange)
  window.addEventListener('resize', handleResize)
  
  // Screen orientation API change event
  if (screen.orientation) {
    screen.orientation.addEventListener('change', handleOrientationChange)
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange)
    window.removeEventListener('resize', handleResize)
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', handleOrientationChange)
    }
    if (unlockTimeout) {
      clearTimeout(unlockTimeout)
    }
    if (lockDebounceTimeout) {
      clearTimeout(lockDebounceTimeout)
    }
    unlockOrientation()
  }
}

/**
 * Check if orientation lock is supported
 */
export function isOrientationLockSupported(): boolean {
  return !!(screen.orientation && screen.orientation.lock)
}
