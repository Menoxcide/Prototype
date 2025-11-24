import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'

export default function PerformanceMonitor() {
  const fps = useGameStore((state) => state.fps)
  const [show, setShow] = useState(false)

  // Toggle with Ctrl+Shift+P
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShow(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!show) return null

  const color = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed top-20 left-4 bg-gray-900/90 border-2 border-cyan-500 rounded-lg p-3 pointer-events-auto z-50 neon-border">
      <div className="text-sm">
        <div className="text-cyan-400 font-bold mb-1">Performance</div>
        <div className={color}>FPS: {fps}</div>
        <div className="text-gray-400 text-xs mt-1">
          Press Ctrl+Shift+P to toggle
        </div>
      </div>
    </div>
  )
}

