/**
 * Minecraft-style 3D movement controls
 * WASD for movement, Space for jump, Mouse for camera
 */

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../data/config'
import { isMobile } from '../data/config'

const GRAVITY = -20 // Gravity acceleration
const JUMP_FORCE = 8 // Initial jump velocity
const GROUND_Y = 0 // Ground level
const PLAYER_HEIGHT = 2 // Player height for ground collision
const ACCELERATION = 30 // Movement acceleration
const FRICTION = 20 // Ground friction
const AIR_FRICTION = 5 // Air friction

export default function MinecraftControls() {
  const { camera } = useThree()
  const keysPressed = useRef<Set<string>>(new Set())
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const isGrounded = useRef<boolean>(true)
  const mouseLocked = useRef<boolean>(false)
  const euler = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isMovingRef = useRef<boolean>(false)
  const jumpCooldown = useRef<number>(0) // Prevent multiple jumps
  const lastJumpTime = useRef<number>(0)

  // Mouse lock for camera control
  useEffect(() => {
    if (isMobile()) return

    const handleMouseDown = () => {
      // Only lock pointer in first-person mode
      const cameraMode = useGameStore.getState().cameraMode
      if (cameraMode === 'first-person' && !mouseLocked.current) {
        document.body.requestPointerLock?.()
      }
    }

    const handlePointerLockChange = () => {
      mouseLocked.current = !!document.pointerLockElement
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseLocked.current) return
      
      // Only allow mouse look in first-person mode
      const cameraMode = useGameStore.getState().cameraMode
      if (cameraMode !== 'first-person') {
        // Release pointer lock if switching to third-person
        if (document.pointerLockElement) {
          document.exitPointerLock()
        }
        return
      }

      const sensitivity = 0.002
      euler.current.setFromQuaternion(camera.quaternion)
      euler.current.y -= e.movementX * sensitivity
      euler.current.x -= e.movementY * sensitivity
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
      camera.quaternion.setFromEuler(euler.current)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [camera])

  // Release pointer lock when switching to third-person mode
  useEffect(() => {
    if (isMobile()) return
    
    const unsubscribe = useGameStore.subscribe(
      (state) => state.cameraMode,
      (cameraMode) => {
        if (cameraMode === 'third-person' && document.pointerLockElement) {
          document.exitPointerLock()
        }
      }
    )

    return unsubscribe
  }, [])

  // Keyboard input
  useEffect(() => {
    if (isMobile()) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const { 
        isInventoryOpen, isCraftingOpen, isMarketOpen, isSpellbookOpen, 
        isChatOpen, isGuildOpen, isQuestOpen, isBattlePassOpen, 
        isShopOpen, isTradeOpen, isAchievementOpen 
      } = useGameStore.getState()
      
      const isAnyModalOpen = isInventoryOpen || isCraftingOpen || isMarketOpen || 
        isSpellbookOpen || isChatOpen || isGuildOpen || isQuestOpen || 
        isBattlePassOpen || isShopOpen || isTradeOpen || isAchievementOpen

      // Camera mode toggle (V key)
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault()
        const { toggleCameraMode } = useGameStore.getState()
        toggleCameraMode()
        return
      }

      if (isAnyModalOpen && ['w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
        return
      }

      if (['w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
      keysPressed.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Movement physics
  useFrame((state, delta) => {
    const player = useGameStore.getState().player
    if (!player || isMobile()) return

    const { 
      isInventoryOpen, isCraftingOpen, isMarketOpen, isSpellbookOpen, 
      isChatOpen, isGuildOpen, isQuestOpen, isBattlePassOpen, 
      isShopOpen, isTradeOpen, isAchievementOpen 
    } = useGameStore.getState()
    
    const isAnyModalOpen = isInventoryOpen || isCraftingOpen || isMarketOpen || 
      isSpellbookOpen || isChatOpen || isGuildOpen || isQuestOpen || 
      isBattlePassOpen || isShopOpen || isTradeOpen || isAchievementOpen

    if (isAnyModalOpen) {
      keysPressed.current.clear()
      if (isMovingRef.current) {
        isMovingRef.current = false
        useGameStore.getState().setIsPlayerMoving(false)
      }
      return
    }

    const keys = keysPressed.current
    const maxSpeed = GAME_CONFIG.playerSpeed * 2.0 // Base movement speed

    // Get camera forward and right vectors
    // In Three.js, camera looks down negative Z by default
    // Get the camera's world direction
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    
    // Get right vector (cross product of forward and up)
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
    right.normalize()
    
    // Flatten to horizontal plane (remove vertical component)
    forward.y = 0
    forward.normalize()
    
    // Calculate desired movement direction relative to camera
    // W = forward, S = backward, A = left, D = right
    const desiredDirection = new THREE.Vector3(0, 0, 0)
    if (keys.has('w')) desiredDirection.add(forward)      // Move forward (camera direction)
    if (keys.has('s')) desiredDirection.sub(forward)      // Move backward (opposite camera)
    if (keys.has('a')) desiredDirection.sub(right)        // Move left (negative right)
    if (keys.has('d')) desiredDirection.add(right)        // Move right (positive right)

    // Normalize desired direction
    if (desiredDirection.length() > 0) {
      desiredDirection.normalize()
      
      if (!isMovingRef.current) {
        isMovingRef.current = true
        useGameStore.getState().setIsPlayerMoving(true)
      }
    } else {
      if (isMovingRef.current) {
        isMovingRef.current = false
        useGameStore.getState().setIsPlayerMoving(false)
      }
    }

    // Apply acceleration-based movement (smooth, not instant)
    const currentHorizontalVel = new THREE.Vector3(velocity.current.x, 0, velocity.current.z)
    const targetVelocity = desiredDirection.clone().multiplyScalar(maxSpeed)
    
    // Calculate acceleration/friction based on whether we're moving or stopping
    const friction = isGrounded.current ? FRICTION : AIR_FRICTION
    const acceleration = desiredDirection.length() > 0 ? ACCELERATION : friction
    
    // Smoothly interpolate velocity towards target using frame-rate independent delta
    const velocityDiff = targetVelocity.sub(currentHorizontalVel)
    const velocityDelta = velocityDiff.multiplyScalar(Math.min(acceleration * delta, 1.0)) // Clamp to prevent overshoot
    velocity.current.x += velocityDelta.x
    velocity.current.z += velocityDelta.z
    
    // Apply friction when no input (gradual stop)
    if (desiredDirection.length() === 0) {
      const frictionFactor = 1 - (friction * delta)
      velocity.current.x *= Math.max(0, frictionFactor)
      velocity.current.z *= Math.max(0, frictionFactor)
      
      // Stop completely if velocity is very small
      if (Math.abs(velocity.current.x) < 0.01) velocity.current.x = 0
      if (Math.abs(velocity.current.z) < 0.01) velocity.current.z = 0
    }
    
    // Clamp horizontal velocity to max speed (safety check)
    const horizontalSpeed = Math.sqrt(velocity.current.x * velocity.current.x + velocity.current.z * velocity.current.z)
    if (horizontalSpeed > maxSpeed * 1.1) { // Allow slight overshoot, then clamp
      const scale = maxSpeed / horizontalSpeed
      velocity.current.x *= scale
      velocity.current.z *= scale
    }

    // Jump with cooldown to prevent multiple jumps
    const now = Date.now()
    if (keys.has(' ') && isGrounded.current && (now - lastJumpTime.current) > 300) {
      velocity.current.y = JUMP_FORCE
      isGrounded.current = false
      lastJumpTime.current = now
    }

    // Apply gravity
    if (!isGrounded.current) {
      velocity.current.y += GRAVITY * delta
    }

    // Update position with velocity
    const newX = player.position.x + velocity.current.x * delta
    const newY = player.position.y + velocity.current.y * delta
    const newZ = player.position.z + velocity.current.z * delta

    // Ground collision - check if we hit the ground
    const groundLevel = GROUND_Y + PLAYER_HEIGHT / 2
    if (newY <= groundLevel) {
      // Hit ground - snap to ground level and stop vertical velocity
      const finalY = groundLevel
      if (isGrounded.current === false) {
        // Just landed - reset vertical velocity
        velocity.current.y = 0
      }
      isGrounded.current = true
      
      // Update position
      useGameStore.getState().updatePlayerPosition({ x: newX, y: finalY, z: newZ })
    } else {
      // In air
      isGrounded.current = false
      useGameStore.getState().updatePlayerPosition({ x: newX, y: newY, z: newZ })
    }

    // Calculate rotation from movement direction (only if moving)
    if (desiredDirection.length() > 0.1) {
      const newRotation = Math.atan2(desiredDirection.x, desiredDirection.z)
      useGameStore.getState().updatePlayerRotation(newRotation)
    }
  })

  return null
}

