/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics display for debugging and monitoring
 */

import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { performanceProfiler } from '../utils/performanceProfiler'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  memory: number
  networkLatency?: number
  packetLoss?: number
}

export default function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memory: 0
  })
  const isConnected = useGameStore(state => state.isConnected)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      const profilerStats = performanceProfiler.getMetrics()
      const memoryInfo = (performance as any).memory
      
      setMetrics({
        fps: profilerStats.fps,
        frameTime: profilerStats.frameTime,
        drawCalls: profilerStats.drawCalls,
        triangles: profilerStats.triangles,
        geometries: profilerStats.geometries,
        textures: profilerStats.textures,
        memory: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1048576) : 0,
        networkLatency: useGameStore.getState().networkLatency,
        packetLoss: useGameStore.getState().packetLoss
      })
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isVisible])

  // Toggle with F3 key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!isVisible) return null

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMemoryColor = (memory: number) => {
    if (memory < 200) return 'text-green-400'
    if (memory < 400) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="fixed top-4 right-4 bg-black/90 border border-cyan-500 rounded-lg p-4 font-mono text-xs z-50 min-w-[250px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-cyan-400 font-bold">Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">FPS:</span>
          <span className={getFPSColor(metrics.fps)}>{metrics.fps.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Frame Time:</span>
          <span className="text-white">{metrics.frameTime.toFixed(2)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Draw Calls:</span>
          <span className="text-white">{metrics.drawCalls}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Triangles:</span>
          <span className="text-white">{metrics.triangles.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Geometries:</span>
          <span className="text-white">{metrics.geometries}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Textures:</span>
          <span className="text-white">{metrics.textures}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Memory:</span>
          <span className={getMemoryColor(metrics.memory)}>{metrics.memory}MB</span>
        </div>
        
        {isConnected && (
          <>
            {metrics.networkLatency !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Latency:</span>
                <span className="text-white">{metrics.networkLatency}ms</span>
              </div>
            )}
            
            {metrics.packetLoss !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Packet Loss:</span>
                <span className={metrics.packetLoss > 5 ? 'text-red-400' : 'text-white'}>
                  {metrics.packetLoss.toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-700">
        <p className="text-gray-500 text-xs">Press F3 to toggle</p>
      </div>
    </div>
  )
}

