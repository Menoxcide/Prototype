/**
 * Landing Feedback Component
 * Provides visual and haptic feedback for successful landings
 */

import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import EnhancedParticleSystem from './EnhancedParticleSystem'

let landingCallbacks: Array<{ position: { x: number; y: number; z: number }; velocity: number }> = []

export function triggerLanding(position: { x: number; y: number; z: number }, velocity: number) {
  landingCallbacks.push({ position, velocity })
}

export default function LandingFeedback() {
  const setScreenShakeIntensity = useGameStore((s) => s.setScreenShakeIntensity)
  const activeLandings = useRef<Array<{ id: string; position: [number, number, number]; velocity: number; startTime: number }>>([])
  const landingIdCounter = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      // Process landing callbacks
      while (landingCallbacks.length > 0) {
        const landing = landingCallbacks.shift()
        if (landing) {
          const id = `landing_${landingIdCounter.current++}`
          activeLandings.current.push({
            id,
            position: [landing.position.x, landing.position.y, landing.position.z],
            velocity: landing.velocity,
            startTime: Date.now()
          })

          // Screen shake based on velocity
          const shakeIntensity = Math.min(0.2, landing.velocity / 40)
          setScreenShakeIntensity(shakeIntensity)

          // Auto-remove after 1 second
          setTimeout(() => {
            activeLandings.current = activeLandings.current.filter(l => l.id !== id)
          }, 1000)
        }
      }

      // Clean up old landings
      const now = Date.now()
      activeLandings.current = activeLandings.current.filter(l => now - l.startTime < 1000)
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [setScreenShakeIntensity])

  return (
    <>
      {activeLandings.current.map((landing) => (
        <EnhancedParticleSystem
          key={landing.id}
          position={landing.position}
          type="impact"
          color={landing.velocity > 10 ? '#00ffff' : '#ffffff'}
          count={Math.min(30, Math.floor(landing.velocity / 2))}
          duration={500}
        />
      ))}
    </>
  )
}

