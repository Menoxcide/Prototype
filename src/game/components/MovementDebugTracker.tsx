/**
 * Movement Debug Tracker
 * Tracks performance metrics inside Canvas (requires useFrame)
 */

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'

// Global metrics store (shared between tracker and display)
export const movementMetrics = {
  fps: 0,
  frameTime: 0,
  positionUpdates: 0,
  reconciliationEvents: 0,
  activeUseFrameHooks: 0
}

export function MovementDebugTracker() {
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const positionUpdateCountRef = useRef(0)
  const reconciliationCountRef = useRef(0)
  const lastPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const frameTimeHistoryRef = useRef<number[]>([])
  const useFrameHookCountRef = useRef(0)
  
  const player = useGameStore((state) => state.player)
  const fps = useGameStore((state) => state.fps)
  
  // Track frame metrics and position updates (in useFrame to catch all updates)
  useFrame((_, delta) => {
    // Track position updates every frame (more reliable than useEffect)
    if (player) {
      const currentPos = player.position
      if (lastPositionRef.current) {
        const dx = Math.abs(currentPos.x - lastPositionRef.current.x)
        const dy = Math.abs(currentPos.y - lastPositionRef.current.y)
        const dz = Math.abs(currentPos.z - lastPositionRef.current.z)
        
        // Consider it an update if position changed by more than 0.001 units
        if (dx > 0.001 || dy > 0.001 || dz > 0.001) {
          positionUpdateCountRef.current++
        }
      }
      lastPositionRef.current = { 
        x: currentPos.x, 
        y: currentPos.y, 
        z: currentPos.z 
      }
    }
    
    frameCountRef.current++
    useFrameHookCountRef.current++
    
    const now = performance.now()
    const frameTime = delta * 1000 // Convert to milliseconds
    frameTimeHistoryRef.current.push(frameTime)
    
    // Keep only last 60 frames (1 second at 60fps)
    if (frameTimeHistoryRef.current.length > 60) {
      frameTimeHistoryRef.current.shift()
    }
    
    // Update metrics every second
    if (now - lastTimeRef.current >= 1000) {
      const avgFrameTime = frameTimeHistoryRef.current.reduce((a, b) => a + b, 0) / frameTimeHistoryRef.current.length
      
      movementMetrics.fps = fps || Math.round(1000 / avgFrameTime)
      movementMetrics.frameTime = avgFrameTime
      movementMetrics.positionUpdates = positionUpdateCountRef.current
      movementMetrics.reconciliationEvents = reconciliationCountRef.current
      movementMetrics.activeUseFrameHooks = useFrameHookCountRef.current
      
      // Reset counters
      positionUpdateCountRef.current = 0
      reconciliationCountRef.current = 0
      useFrameHookCountRef.current = 0
      lastTimeRef.current = now
    }
  })
  
  // Listen for reconciliation events
  useEffect(() => {
    const handleReconciliation = () => {
      reconciliationCountRef.current++
    }
    
    window.addEventListener('player-reconciliation', handleReconciliation)
    
    return () => {
      window.removeEventListener('player-reconciliation', handleReconciliation)
    }
  }, [])
  
  return null // This component doesn't render anything
}

// Export as default for lazy loading compatibility
export default MovementDebugTracker

