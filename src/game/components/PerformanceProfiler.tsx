/**
 * Performance Profiler Component
 * In-game performance monitoring and profiling UI
 */

import { useState, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  triangles: number
  entities: number
  geometries?: number
  textures?: number
}

export default function PerformanceProfiler() {
  const { fps: _fps, setFPS } = useGameStore()
  const enemies = useGameStore((s) => s.enemies)
  const npcs = useGameStore((s) => s.npcs)
  const lootDrops = useGameStore((s) => s.lootDrops)
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  // Get renderer from Three.js context
  const { gl } = useThree()
  useEffect(() => {
    rendererRef.current = gl
  }, [gl])

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

        // Get renderer info (draw calls, triangles, etc.)
        const renderer = rendererRef.current
        let drawCalls = 0
        let triangles = 0
        let geometries = 0
        let textures = 0
        
        if (renderer && renderer.info) {
          const info = renderer.info
          drawCalls = info.render.calls || 0
          triangles = info.render.triangles || 0
          geometries = info.memory.geometries || 0
          textures = info.memory.textures || 0
        }

        // Count entities
        const entityCount = enemies.size + npcs.size + lootDrops.size

        setMetrics(prev => ({
          ...prev,
          fps: currentFPS,
          frameTime: Math.round(frameTime * 100) / 100,
          memoryUsage: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0,
          drawCalls,
          triangles,
          entities: entityCount,
          geometries,
          textures
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
          Draw Calls: <span className={metrics.drawCalls > 100 ? 'text-red-400' : 'text-cyan-300'}>{metrics.drawCalls}</span>
          {metrics.drawCalls > 100 && <span className="text-red-400 text-xs ml-1">⚠</span>}
        </div>
        <div>
          Triangles: <span className={metrics.triangles > 50000 ? 'text-red-400' : 'text-cyan-300'}>{metrics.triangles.toLocaleString()}</span>
          {metrics.triangles > 50000 && <span className="text-red-400 text-xs ml-1">⚠</span>}
        </div>
        <div>
          Geometries: <span className="text-cyan-300">{metrics.geometries || 0}</span>
        </div>
        <div>
          Textures: <span className="text-cyan-300">{metrics.textures || 0}</span>
        </div>
        <div>
          Entities: <span className="text-cyan-300">{metrics.entities}</span>
        </div>
      </div>
    </div>
  )
}

