/**
 * ShadowOptimizer - Optimizes shadow map updates based on quality settings
 * Reduces shadow update frequency to improve performance
 * Enhanced with movement threshold detection
 */

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getQualitySettings } from '../utils/qualitySettings'
import { useGameStore } from '../store/useGameStore'

export default function ShadowOptimizer() {
  const { scene, camera } = useThree()
  const frameCount = useRef(0)
  const shadowUpdateInterval = useRef<number>(1)
  const lastCameraPosition = useRef<THREE.Vector3>(new THREE.Vector3())
  const lastCameraRotation = useRef<THREE.Euler>(new THREE.Euler())
  const movementThreshold = useRef<number>(0.5) // Minimum movement to trigger shadow update
  const qualitySettings = getQualitySettings()
  
  // Get player position for movement detection
  const player = useGameStore((state) => state.player)
  const lastPlayerPosition = useRef<{ x: number; y: number; z: number } | null>(null)

  useEffect(() => {
    // Set shadow update interval based on quality preset
    // Lower quality = less frequent shadow updates
    switch (qualitySettings.preset) {
      case 'low':
        shadowUpdateInterval.current = 3 // Update every 3 frames
        movementThreshold.current = 1.0 // Higher threshold for low quality
        break
      case 'medium':
        shadowUpdateInterval.current = 2 // Update every 2 frames
        movementThreshold.current = 0.5
        break
      case 'high':
        shadowUpdateInterval.current = 2 // Update every 2 frames
        movementThreshold.current = 0.3
        break
      case 'ultra':
        shadowUpdateInterval.current = 1 // Update every frame
        movementThreshold.current = 0.1
        break
    }
    
    // Initialize positions
    if (camera) {
      lastCameraPosition.current.copy(camera.position)
      lastCameraRotation.current.copy(camera.rotation)
    }
    if (player) {
      lastPlayerPosition.current = { ...player.position }
    }
  }, [qualitySettings.preset, camera, player])

  useFrame(() => {
    frameCount.current++
    
    // Check if significant movement occurred
    let shouldUpdate = false
    
    // Check camera movement
    if (camera) {
      const cameraMoved = camera.position.distanceTo(lastCameraPosition.current) > movementThreshold.current
      const cameraRotated = Math.abs(camera.rotation.y - lastCameraRotation.current.y) > 0.1
      
      if (cameraMoved || cameraRotated) {
        shouldUpdate = true
        lastCameraPosition.current.copy(camera.position)
        lastCameraRotation.current.copy(camera.rotation)
      }
    }
    
    // Check player movement (if available)
    if (player && lastPlayerPosition.current) {
      const dx = player.position.x - lastPlayerPosition.current.x
      const dy = player.position.y - lastPlayerPosition.current.y
      const dz = player.position.z - lastPlayerPosition.current.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (distance > movementThreshold.current) {
        shouldUpdate = true
        lastPlayerPosition.current = { ...player.position }
      }
    }
    
    // Update shadows if:
    // 1. Frame interval reached AND
    // 2. Significant movement occurred OR forced update interval
    const intervalReached = frameCount.current % shadowUpdateInterval.current === 0
    const forceUpdate = frameCount.current % (shadowUpdateInterval.current * 10) === 0 // Force update every 10 intervals
    
    if ((intervalReached && shouldUpdate) || forceUpdate) {
      // Find all directional lights with shadows and update their shadow maps
      scene.traverse((obj) => {
        if (obj instanceof THREE.DirectionalLight && obj.castShadow) {
          // Force shadow map update by temporarily toggling needsUpdate
          obj.shadow.needsUpdate = true
        }
      })
    }
  })

  return null
}

