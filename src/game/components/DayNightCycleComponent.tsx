/**
 * Day/Night Cycle Component
 * React component wrapper for day/night cycle system
 */

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DayNightCycle } from '../systems/dayNightCycle'
import { getQualitySettings } from '../utils/qualitySettings'

interface DayNightCycleComponentProps {
  enabled?: boolean
  cycleDuration?: number
  startTime?: number
}

export default function DayNightCycleComponent({
  enabled = true,
  cycleDuration = 300, // 5 minutes
  startTime = 0.5 // Start at noon
}: DayNightCycleComponentProps) {
  const { scene } = useThree()
  const cycleRef = useRef<DayNightCycle | null>(null)
  const qualitySettings = getQualitySettings()

  useEffect(() => {
    if (!enabled || qualitySettings.preset === 'low') return

    // Find lights in scene
    let ambientLight: THREE.AmbientLight | null = null
    let directionalLight: THREE.DirectionalLight | null = null

    scene.traverse((object) => {
      if (object instanceof THREE.AmbientLight && !ambientLight) {
        ambientLight = object
      }
      if (object instanceof THREE.DirectionalLight && !directionalLight) {
        directionalLight = object
      }
    })

    if (ambientLight && directionalLight) {
      cycleRef.current = new DayNightCycle(ambientLight, directionalLight, {
        cycleDuration,
        currentTime: startTime,
        enabled: true
      })
    }

    return () => {
      cycleRef.current = null
    }
  }, [scene, enabled, cycleDuration, startTime, qualitySettings.preset])

  useFrame((_state, delta) => {
    if (cycleRef.current && enabled && qualitySettings.preset !== 'low') {
      cycleRef.current.update(delta)
    }
  })

  return null
}

