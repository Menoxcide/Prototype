import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'
import { adjustPerformanceForFPS } from '../systems/performanceSystem'
import { getQualityManager } from '../utils/qualitySettings'

let frameCount = 0
let lastTime = performance.now()

/**
 * Component that tracks FPS inside the Canvas and updates the store
 * This must be rendered inside a Canvas component
 */
export default function FPSTracker() {
  const setFPS = useGameStore((state) => state.setFPS)

  useFrame(() => {
    frameCount++
    const now = performance.now()
    const delta = now - lastTime

    if (delta >= 1000) {
      const fps = Math.round((frameCount * 1000) / delta)
      frameCount = 0
      lastTime = now
      
      // Update store
      setFPS(fps)
      
      // Auto-adjust performance
      adjustPerformanceForFPS(fps)
      
      // Auto-adjust quality settings based on FPS
      getQualityManager().adjustQualityBasedOnPerformance(fps)
    }
  })

  return null // This component doesn't render anything
}

