/**
 * Loading Screen Component
 * Animated loading screen with progress indicator
 */

import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  progress?: number // 0-100
  message?: string
  onComplete?: () => void
}

export default function LoadingScreen({ progress = 0, message = 'Loading...', onComplete }: LoadingScreenProps) {
  const [displayProgress, setDisplayProgress] = useState(0)
  const [dots, setDots] = useState('')

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < progress) {
          return Math.min(prev + 2, progress)
        }
        return prev
      })
    }, 50)

    return () => clearInterval(interval)
  }, [progress])

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Call onComplete when progress reaches 100
  useEffect(() => {
    if (displayProgress >= 100 && onComplete) {
      setTimeout(onComplete, 500)
    }
  }, [displayProgress, onComplete])

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="text-center">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-cyan-400 mb-2 neon-glow">NEX://VOID</h1>
          <p className="text-gray-400 text-lg">Loading{dots}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-96 bg-gray-800 border-2 border-cyan-500 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        {/* Progress Text */}
        <div className="mt-4 text-cyan-300 font-bold">
          {Math.round(displayProgress)}%
        </div>

        {/* Loading Message */}
        {message && (
          <div className="mt-4 text-gray-400 text-sm">
            {message}
          </div>
        )}

        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </div>
  )
}

