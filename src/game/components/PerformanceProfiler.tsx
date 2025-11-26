/**
 * Performance Profiler Component
 * In-game performance monitoring and profiling UI
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  triangles: number
  entities: number
}

export default function PerformanceProfiler() {
  const { fps: _fps, setFPS } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    drawCalls: 0,
    triangles: 0,
    entities: 0
  })
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  // Toggle with F3 key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3' && import.meta.env.DEV) {
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Update metrics
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      const now = performance.now()
      const delta = now - lastTimeRef.current
      frameCountRef.current++

      if (delta >= 1000) {
        const currentFPS = Math.round((frameCountRef.current * 1000) / delta)
        const frameTime = delta / frameCountRef.current

        setMetrics(prev => ({
          ...prev,
          fps: currentFPS,
          frameTime: Math.round(frameTime * 100) / 100,
          memoryUsage: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0
        }))

        setFPS(currentFPS)
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isOpen, setFPS])

  if (!isOpen || !import.meta.env.DEV) return null

  const getFPSColor = (fps: number) => {
    if (fps >= 60) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="fixed top-4 left-4 bg-black/80 border-2 border-cyan-500 rounded-lg p-4 font-mono text-xs z-50 pointer-events-auto">
      <div className="text-cyan-400 font-bold mb-2">Performance Profiler (F3 to close)</div>
      <div className="space-y-1 text-white">
        <div>
          FPS: <span className={getFPSColor(metrics.fps)}>{metrics.fps}</span>
        </div>
        <div>
          Frame Time: <span className="text-cyan-300">{metrics.frameTime}ms</span>
        </div>
        {metrics.memoryUsage > 0 && (
          <div>
            Memory: <span className="text-cyan-300">{metrics.memoryUsage}MB</span>
          </div>
        )}
        <div>
          Draw Calls: <span className="text-cyan-300">{metrics.drawCalls}</span>
        </div>
        <div>
          Triangles: <span className="text-cyan-300">{metrics.triangles.toLocaleString()}</span>
        </div>
        <div>
          Entities: <span className="text-cyan-300">{metrics.entities}</span>
        </div>
      </div>
    </div>
  )
}

