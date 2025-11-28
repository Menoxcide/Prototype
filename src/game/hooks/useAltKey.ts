import { useState, useEffect } from 'react'

/**
 * Hook to track Alt key state
 * Returns true when Alt key is held down
 */
export function useAltKey(): boolean {
  const [isAltPressed, setIsAltPressed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.altKey) {
        setIsAltPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || !e.altKey) {
        setIsAltPressed(false)
      }
    }

    // Also handle when Alt is released via blur (window loses focus)
    const handleBlur = () => {
      setIsAltPressed(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  return isAltPressed
}

