/**
 * CAMERA COMPONENT
 * First-person camera that follows player (Minecraft-style)
 * Camera rotation is controlled by MinecraftControls via mouse
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { cameraOrbit } from '../utils/cameraOrbit'

export default function PlayerCamera() {
  const { camera } = useThree()
  const isInitialized = useRef(false)
  const lastCameraMode = useRef<'first-person' | 'third-person' | null>(null)
  // Store orbit angles separately to avoid conflicts with mouse controls
  const orbitAngleY = useRef<number>(0) // Horizontal orbit angle
  const orbitAngleX = useRef<number>(0) // Vertical orbit angle
  
  // Get player and camera mode from store for dependencies
  // Use getState() in useFrame to avoid re-renders
  const player = useGameStore((state) => state.player)
  const cameraMode = useGameStore((state) => state.cameraMode)
  
  // Initialize camera rotation when player is first created or camera mode changes
  useEffect(() => {
    if (!player) {
      isInitialized.current = false
      return
    }
    
    // Initialize camera rotation based on player rotation
    if (!isInitialized.current || lastCameraMode.current !== cameraMode) {
      if (import.meta.env.DEV) {
        console.log('📷 PlayerCamera: Initializing camera', { cameraMode, playerPos: player.position, playerRot: player.rotation })
      }
      
      if (cameraMode === 'first-person') {
        // Set initial rotation based on player's rotation
        // Player rotation is around Y axis (horizontal)
        const euler = new THREE.Euler(0, player.rotation, 0, 'YXZ')
        camera.quaternion.setFromEuler(euler)
        camera.position.set(player.position.x, player.position.y + 1.6, player.position.z)
        camera.updateMatrixWorld(true)
        isInitialized.current = true
      } else {
        // Third-person: initialize camera behind player
        const cameraDistance = 8
        const playerCenterY = player.position.y + 0.8
        
        // Initialize orbit angles - start behind player looking slightly down
        // Orbit offset starts at 0 (camera directly behind player)
        orbitAngleY.current = 0
        orbitAngleX.current = Math.PI / 4 // 45 degrees down from horizontal
        // Also initialize shared orbit angles (offset from player rotation)
        cameraOrbit.y = 0 // No horizontal offset - camera directly behind
        cameraOrbit.x = Math.PI / 4
        
        // Calculate initial position using spherical coordinates
        // theta = player rotation + orbit offset
        const theta = player.rotation + orbitAngleY.current
        const phi = orbitAngleX.current
        const horizontalDistance = cameraDistance * Math.cos(phi)
        const verticalOffset = cameraDistance * Math.sin(phi)
        const offsetX = -horizontalDistance * Math.sin(theta)
        const offsetZ = -horizontalDistance * Math.cos(theta)
        
        camera.position.set(
          player.position.x + offsetX,
          playerCenterY + verticalOffset,
          player.position.z + offsetZ
        )
        camera.lookAt(player.position.x, playerCenterY, player.position.z)
        camera.updateMatrixWorld(true)
        isInitialized.current = true
      }
      lastCameraMode.current = cameraMode
    }
  }, [camera, player?.id, cameraMode])
  
  // Subscribe to camera mode changes
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state) => {
      const cameraMode = state.cameraMode
      const player = state.player
      
      if (!player || cameraMode === lastCameraMode.current) return
      
      if (cameraMode === 'first-person') {
        // When switching to first-person, set rotation based on player rotation
        const euler = new THREE.Euler(0, player.rotation, 0, 'YXZ')
        camera.quaternion.setFromEuler(euler)
      }
      lastCameraMode.current = cameraMode
    })
    
    return unsubscribe
  }, [camera])
  
  const frameCount = useRef(0)
  const lastCameraPosition = useRef<THREE.Vector3>(new THREE.Vector3())
  const lastCameraRotation = useRef<THREE.Quaternion>(new THREE.Quaternion())
  const lastOrbitY = useRef<number>(0)
  const lastOrbitX = useRef<number>(0)
  const lastPlayerRotation = useRef<number>(0)
  
  // Screen shake for combat feedback
  const shakeIntensity = useRef(0)
  const shakeDecay = useRef(0.9) // How quickly shake fades
  const lastPlayerHealth = useRef<number | null>(null)
  
  useFrame((_, delta) => {
    // Add null check at the top to prevent errors when no player
    if (!player) return
    frameCount.current++
    const currentPlayer = useGameStore.getState().player
    if (!currentPlayer) {
      // Default camera position when no player
      const targetPos = new THREE.Vector3(0, 10, 10)
      // Delta-based smoothing: lerp factor based on frame time for consistent feel
      const lerpFactor = 1 - Math.exp(-10 * delta) // Equivalent to ~0.1 at 60fps
      camera.position.lerp(targetPos, lerpFactor)
      camera.lookAt(0, 0, 0)
      isInitialized.current = false
      return
    }
    
    // Check for health decrease (damage taken) to trigger screen shake
    if (lastPlayerHealth.current !== null && currentPlayer.health < lastPlayerHealth.current) {
      const damageTaken = lastPlayerHealth.current - currentPlayer.health
      const damagePercent = damageTaken / currentPlayer.maxHealth
      // Shake intensity based on damage percentage (more damage = more shake)
      shakeIntensity.current = Math.min(0.3, damagePercent * 2) // Cap at 0.3
    }
    lastPlayerHealth.current = currentPlayer.health
    
    // Decay screen shake
    shakeIntensity.current *= shakeDecay.current
    if (shakeIntensity.current < 0.001) {
      shakeIntensity.current = 0
    }
    
    // Calculate shake offset
    const shakeX = (Math.random() - 0.5) * shakeIntensity.current
    const shakeY = (Math.random() - 0.5) * shakeIntensity.current
    const shakeZ = (Math.random() - 0.5) * shakeIntensity.current
    
    const playerPos = currentPlayer.position
    const currentCameraMode = useGameStore.getState().cameraMode
    
    // Calculate delta-based lerp factor for consistent smoothing across frame rates
    // Higher values = faster smoothing, lower = slower
    // Third-person: slightly slower (equivalent to 0.9 at 60fps)
    const thirdPersonLerpSpeed = 10
    const thirdPersonLerp = 1 - Math.exp(-thirdPersonLerpSpeed * delta)
    
    // Debug logging (every 1800 frames = ~30 seconds at 60fps) - very infrequent
    if (import.meta.env.DEV && frameCount.current % 1800 === 0 && frameCount.current > 0) {
      console.log('📷 PlayerCamera: Frame update', {
        cameraPos: camera.position.toArray().map(v => v.toFixed(2)),
        playerPos: [playerPos.x.toFixed(2), playerPos.y.toFixed(2), playerPos.z.toFixed(2)],
        cameraMode: currentCameraMode,
        isInitialized: isInitialized.current
      })
    }
    
    if (currentCameraMode === 'first-person') {
      // First-person: camera at eye level, rotation controlled by mouse
      // Use direct position assignment (no lerp) for instant sync and to prevent sprite visibility
      const targetY = playerPos.y + 1.6 // Eye level
      const targetPos = new THREE.Vector3(
        playerPos.x + shakeX,
        targetY + shakeY,
        playerPos.z + shakeZ
      )
      camera.position.copy(targetPos) // Direct copy for instant sync - no lerp smoothing
      // Camera rotation is handled by MinecraftControls via mouse
      // Player can naturally look up with mouse when climbing
      } else {
        // Third-person: camera orbits around player using spherical coordinates
        // Cache calculations to avoid redundant work
        
        const cameraDistance = 8 // Distance from player
        const playerCenterY = playerPos.y + 0.8 // Player visual center (where sprite is rendered)
        
        // Get orbit angles from shared module (updated by MinecraftControls on mouse move)
        // Orbit is relative to player's facing direction
        let orbitOffsetY = cameraOrbit.y // Horizontal orbit offset from player facing
        let phi = cameraOrbit.x   // Vertical angle (pitch) - 0 = horizontal, positive = up, negative = down
        
        // When climbing, adjust camera to look upward
        const isClimbingBuilding = useGameStore.getState().isClimbingBuilding
        if (isClimbingBuilding) {
          // Add upward tilt when climbing - smoothly transition to looking up
          const maxClimbTilt = Math.PI / 3 // 60 degrees up
          phi = Math.max(phi, maxClimbTilt * 0.7) // Look up at least 70% of max tilt
        }
        
        // Calculate absolute camera angle: player rotation + orbit offset
        const theta = player.rotation + orbitOffsetY
        
        // Check if orbit angles or player rotation changed
        // We still need to recalculate every frame for player position, but can skip some work
        const orbitChanged = Math.abs(orbitOffsetY - lastOrbitY.current) > 0.001 ||
                            Math.abs(phi - lastOrbitX.current) > 0.001 ||
                            Math.abs(player.rotation - lastPlayerRotation.current) > 0.001
        
        // Update cached values if orbit changed
        if (orbitChanged) {
          orbitAngleY.current = theta
          orbitAngleX.current = phi
          lastOrbitY.current = orbitOffsetY
          lastOrbitX.current = phi
          lastPlayerRotation.current = player.rotation
        }
        
        let cameraX: number, cameraY: number, cameraZ: number
        
        // Calculate camera position using spherical coordinates
        // Standard spherical to cartesian conversion:
        // x = r * sin(phi) * cos(theta)
        // y = r * cos(phi)
        // z = r * sin(phi) * sin(theta)
        // But we want camera behind player, so we use negative of forward direction
        const horizontalDistance = cameraDistance * Math.cos(phi) // Distance in horizontal plane
        const verticalOffset = cameraDistance * Math.sin(phi)     // Vertical offset
        
        // Calculate position behind player based on theta (horizontal rotation)
        const offsetX = -horizontalDistance * Math.sin(theta) // Behind player on X
        const offsetZ = -horizontalDistance * Math.cos(theta) // Behind player on Z
        const offsetY = verticalOffset // Vertical offset
        
        // Position camera relative to player (always update with current player position)
        // Add screen shake for combat feedback
        cameraX = playerPos.x + offsetX + shakeX
        cameraY = playerCenterY + offsetY + shakeY
        cameraZ = playerPos.z + offsetZ + shakeZ
        
        // Clamp camera Y to prevent going underground
        const minCameraY = playerPos.y + 1.0 // Minimum height above ground
        const finalCameraY = Math.max(cameraY, minCameraY)
        
        // Delta-based smoothing for camera movement (prevents jittery updates)
        const targetPos = new THREE.Vector3(cameraX, finalCameraY, cameraZ)
        camera.position.lerp(targetPos, thirdPersonLerp)
        
        // Look at player center - smooth update
        camera.lookAt(playerPos.x, playerCenterY, playerPos.z)
      }
    
    // Conditional matrix update - only update if camera actually moved
    // This reduces unnecessary matrix calculations
    // Using squared distance for performance (avoids sqrt calculation)
    // Threshold: 0.0004 squared = 0.02 units (small enough to be imperceptible, large enough to reduce updates)
    const positionChanged = camera.position.distanceToSquared(lastCameraPosition.current) > 0.0004
    const rotationChanged = !camera.quaternion.equals(lastCameraRotation.current)
    
    if (positionChanged || rotationChanged) {
      // Update matrix only when camera actually changed
      // Use false to avoid recursive updates (performance optimization)
      camera.updateMatrixWorld(false)
      
      // Update cached values
      lastCameraPosition.current.copy(camera.position)
      lastCameraRotation.current.copy(camera.quaternion)
    }
  })
  
  return null
}

