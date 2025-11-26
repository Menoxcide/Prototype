/**
 * FINAL MinecraftControls — Physics + Prediction + Real Ground
 */

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { predictMovement } from '../network/prediction'
import { isMobile } from '../data/config'
import { cameraOrbit } from '../utils/cameraOrbit'
import { getVector3, releaseVector3, getEuler, releaseEuler } from '../utils/movementObjectPools'

// Mars gravity: ~38% of Earth's gravity
const GRAVITY = -11.4  // Mars gravity (Earth is -30)
const JUMP_FORCE = 18  // Reduced from 25 - still feels like low gravity but less moon-like
// const _PLAYER_HEIGHT = 2 // Reserved for future use
// const _CROUCH_HEIGHT = 1.0 // Reserved for future use
const WALK_ACCELERATION = 50
const RUN_ACCELERATION = 100
const CROUCH_ACCELERATION = 25
const FRICTION = 0.91
const AIR_FRICTION = 0.98
const PLAYER_RADIUS = 0.4  // Player collision radius
const WALL_RUN_DISTANCE = 0.5  // Distance from wall to enable wall-running
const MAX_GROUND_DISTANCE = 10  // Maximum distance to check for ground
const CITY_SIZE = 500  // City boundary size (must match CyberpunkCity)
const CITY_BOUNDARY = CITY_SIZE / 2 - 2  // Boundary with small margin to prevent clipping through walls

export default function MinecraftControls() {
  const { camera, scene, raycaster } = useThree()
  const keysPressed = useRef<Set<string>>(new Set())
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3())
  const isGrounded = useRef<boolean>(false)  // Start as false, will be determined by ground check
  const mouseLocked = useRef<boolean>(false)
  const euler = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'))
  const initialized = useRef<boolean>(false)  // Track if we've done initial ground check

  const player = useGameStore((s) => s.player)
  const updatePlayerPosition = useGameStore((s) => s.updatePlayerPosition)
  const updatePlayerRotation = useGameStore((s) => s.updatePlayerRotation)
  const setIsPlayerMoving = useGameStore((s) => s.setIsPlayerMoving)
  const setIsClimbingBuilding = useGameStore((s) => s.setIsClimbingBuilding)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const setCameraMode = useGameStore((s) => s.setCameraMode)
  const stamina = useGameStore((s) => s.stamina)
  const maxStamina = useGameStore((s) => s.maxStamina)
  const consumeStamina = useGameStore((s) => s.consumeStamina)
  const rechargeStamina = useGameStore((s) => s.rechargeStamina)
  
  // Movement state
  const isRunning = useRef<boolean>(false)
  const isCrouching = useRef<boolean>(false)
  const jumpCooldown = useRef<number>(0)
  const isWallRunning = useRef<boolean>(false)
  const wallNormal = useRef<THREE.Vector3>(new THREE.Vector3())
  const currentGroundHeight = useRef<number>(0.8)  // Dynamic ground height
  const isClimbingBuilding = useRef<boolean>(false)  // Track if player is climbing a building
  const collidableObjectsCache = useRef<THREE.Object3D[]>([])
  const cacheFrameCount = useRef<number>(0)
  const wasGrappling = useRef<boolean>(false)  // Track previous grappling state
  const groundCheckCache = useRef<{ pos: THREE.Vector3; result: { height: number; hit: boolean }; frame: number } | null>(null)
  const wallCheckCache = useRef<{ pos: THREE.Vector3; moveDir: THREE.Vector3; result: any; frame: number } | null>(null)
  
  // Frame time smoothing for consistent physics
  const frameTimeHistory = useRef<number[]>([])
  const smoothedDelta = useRef<number>(0.016) // Default 60fps
  const lastPosition = useRef<THREE.Vector3>(new THREE.Vector3())
  const groundCheckInterval = useRef<number>(0) // Adaptive ground check counter

  // === MOUSE LOOK & POINTER LOCK ===
  useEffect(() => {
    if (isMobile()) return

    const handleMouseDown = () => {
      // Enable pointer lock for both first and third person
      if (!mouseLocked.current && document.pointerLockElement === null) {
        try {
          const promise = document.body.requestPointerLock?.()
          if (promise) {
            promise.catch((error) => {
              // Silently handle errors (user may have exited lock, browser restrictions, etc.)
              if (import.meta.env.DEV && error.name !== 'NotAllowedError') {
                console.debug('Pointer lock request failed:', error)
              }
            })
          }
        } catch (error) {
          // Fallback for browsers that don't support promise-based API
          if (import.meta.env.DEV && (error as Error).name !== 'NotAllowedError') {
            console.debug('Pointer lock request failed:', error)
          }
        }
      }
    }

    const handlePointerLockChange = () => {
      mouseLocked.current = !!document.pointerLockElement
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseLocked.current) return

      // Get current camera mode (fresh from store)
      const currentCameraMode = useGameStore.getState().cameraMode
      const sensitivity = 0.002
      
      if (currentCameraMode === 'first-person') {
        // First-person: full mouse look (both X and Y)
        euler.current.y -= e.movementX * sensitivity
        euler.current.x -= e.movementY * sensitivity
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
        camera.quaternion.setFromEuler(euler.current)
      } else {
        // Third-person: update orbit angles (shared module)
        // Orbit is relative offset from player's facing direction
        euler.current.y -= e.movementX * sensitivity
        euler.current.x -= e.movementY * sensitivity
        
        // Clamp vertical angle to prevent camera from going underground
        // Limits: -20 degrees (looking down) to +60 degrees (looking up)
        // This creates a 180-degree boundary that prevents underground movement
        const minAngle = -Math.PI / 9  // -20 degrees - prevents going underground
        const maxAngle = Math.PI / 3    // +60 degrees - allows good upward view
        euler.current.x = Math.max(minAngle, Math.min(maxAngle, euler.current.x))
        
        // Store orbit offset angles (relative to player, not absolute)
        // These will be added to player rotation in PlayerCamera
        cameraOrbit.y = euler.current.y // Horizontal orbit offset
        cameraOrbit.x = euler.current.x // Vertical orbit angle
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [camera, cameraMode])

  // === KEYBOARD INPUT ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      
      // ALWAYS prevent default for game controls to avoid browser shortcuts
      // This prevents Ctrl+W (close tab), Ctrl+R (reload), etc.
      const isGameKey = ['w', 'a', 's', 'd', ' ', 'v'].includes(key) || e.ctrlKey || e.shiftKey
      if (isGameKey) {
        e.preventDefault()
        e.stopPropagation()
        // Try to stop immediate propagation if available
        if (e.stopImmediatePropagation) {
          e.stopImmediatePropagation()
        }
      }
      
      // Movement keys
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysPressed.current.add(key)
      }
      
      // Jump (Space) - handle separately
      if (key === ' ' || key === 'space') {
        keysPressed.current.add(' ')
        keysPressed.current.add('space')
      }
      
      // Run (Shift) - check modifier key
      if (e.shiftKey) {
        isRunning.current = true
      }
      
      // Crouch (Ctrl) - ALWAYS prevent browser shortcuts when Ctrl is held
      if (e.ctrlKey) {
        isCrouching.current = true
        isRunning.current = false // Can't run while crouching
      }
      
      // Toggle camera (V) - make sure it works
      if (key === 'v') {
        e.preventDefault()
        e.stopPropagation()
        // Toggle camera mode
        const currentMode = useGameStore.getState().cameraMode
        const newMode = currentMode === 'first-person' ? 'third-person' : 'first-person'
        setCameraMode(newMode)
        
        // When switching to third-person, reset orbit offset to 0 (camera directly behind)
        if (newMode === 'third-person') {
          cameraOrbit.y = 0 // Reset horizontal orbit offset
          cameraOrbit.x = Math.PI / 4 // Default vertical angle (45 degrees down)
        }
        
        if (import.meta.env.DEV) {
          console.log('📷 Camera toggled:', newMode)
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      
      // Prevent default for game keys
      if (['w', 'a', 's', 'd', ' ', 'v'].includes(key) || e.ctrlKey || e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
      }
      
      keysPressed.current.delete(key)
      keysPressed.current.delete('space') // Also remove space variant
      
      // Release run
      if (!e.shiftKey) {
        isRunning.current = false
      }
      
      // Release crouch - check if Ctrl is actually released
      if (!e.ctrlKey) {
        isCrouching.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setCameraMode])

  // Reset initialization when player changes
  useEffect(() => {
    if (player) {
      initialized.current = false
      isGrounded.current = false
      // CRITICAL: Reset velocity to zero when player changes
      velocity.current.set(0, 0, 0)
    }
  }, [player?.id])
  
  // Initialize velocity to zero on mount
  useEffect(() => {
    velocity.current.set(0, 0, 0)
  }, [])

  // === MAIN MOVEMENT LOOP ===
  useFrame((_, delta) => {
    if (!player) return
    
    // Frame time smoothing - average over last 10 frames to reduce jitter
    frameTimeHistory.current.push(delta)
    if (frameTimeHistory.current.length > 10) {
      frameTimeHistory.current.shift()
    }
    const avgDelta = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length
    smoothedDelta.current = avgDelta
    
    // Adaptive delta clamping based on average frame time
    const maxDelta = Math.max(0.05, smoothedDelta.current * 2)
    delta = Math.min(delta, maxDelta)
    
    // Skip expensive calculations on very small deltas to reduce lag
    if (delta < 0.001) return

    const keys = keysPressed.current
    const direction = getVector3()
    const currentCameraMode = useGameStore.getState().cameraMode
    
    // Performance optimization: Skip expensive operations every other frame when not moving
    const isMoving = keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d')
    const shouldDoExpensiveChecks = isMoving || cacheFrameCount.current % 2 === 0

    // Movement direction - world space in third-person, camera-relative in first-person
    // Forward/backward
    if (keys.has('w')) direction.z -= 1  // Forward (negative Z in Three.js = north)
    if (keys.has('s')) direction.z += 1   // Backward (positive Z = south)
    // Left/right
    if (keys.has('a')) direction.x -= 1   // Left (negative X = west)
    if (keys.has('d')) direction.x += 1   // Right (positive X = east)

    const moving = direction.length() > 0
    setIsPlayerMoving(moving)

    if (moving) {
      direction.normalize()
      
      // Both first-person and third-person use camera-relative movement (same as first-person)
      // Get camera's horizontal rotation (yaw) and apply it to movement direction
      const cameraEuler = getEuler().setFromQuaternion(camera.quaternion, 'YXZ')
      const yawEuler = getEuler(0, cameraEuler.y, 0)
      direction.applyEuler(yawEuler)
      releaseEuler(cameraEuler)
      releaseEuler(yawEuler)
      
      // In third-person, also rotate player to face movement direction
      if (currentCameraMode === 'third-person') {
        const movementAngle = Math.atan2(direction.x, -direction.z)
        let currentRot = player.rotation
        
        // Normalize angles to prevent wrapping issues
        let angleDiff = movementAngle - currentRot
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        
        // Smoothly rotate player to face movement direction
        const rotationSpeed = 0.15 // How fast player rotates to face movement
        const newRotation = currentRot + angleDiff * rotationSpeed
        updatePlayerRotation(newRotation)
      }
    }

    // Determine acceleration based on movement state
    // Check stamina before allowing running
    const canRun = stamina > 5 && !isCrouching.current && isGrounded.current
    let currentAcceleration = WALK_ACCELERATION
    if (isRunning.current && canRun) {
      currentAcceleration = RUN_ACCELERATION
      // Consume stamina while running (5 per second)
      consumeStamina(5 * smoothedDelta.current)
    } else if (isCrouching.current) {
      currentAcceleration = CROUCH_ACCELERATION
    }
    
    // If trying to run but out of stamina, force walk
    if (isRunning.current && !canRun) {
      isRunning.current = false
    }

    // Apply acceleration (use smoothed delta for consistent physics)
    velocity.current.x += direction.x * currentAcceleration * smoothedDelta.current
    velocity.current.z += direction.z * currentAcceleration * smoothedDelta.current

    // Friction - stop quickly when no input to prevent lurching
    if (moving) {
      // Apply friction while moving
      if (isGrounded.current) {
        velocity.current.x *= FRICTION
        velocity.current.z *= FRICTION
      } else {
        velocity.current.x *= AIR_FRICTION
        velocity.current.z *= AIR_FRICTION
      }
    } else {
      // Stop quickly when no keys pressed - aggressive friction
      if (isGrounded.current) {
        // Stop almost immediately on ground
        velocity.current.x *= 0.7 // Strong friction
        velocity.current.z *= 0.7
        // Snap to zero if very small to prevent micro-movements
        if (Math.abs(velocity.current.x) < 0.1) velocity.current.x = 0
        if (Math.abs(velocity.current.z) < 0.1) velocity.current.z = 0
      } else {
        // In air, still apply friction
        velocity.current.x *= AIR_FRICTION
        velocity.current.z *= AIR_FRICTION
      }
    }

    // Calculate player height offset
    const STANDING_HEIGHT = 0.8 // Player center height when standing
    const CROUCH_HEIGHT_OFFSET = 0.4 // How much lower when crouching
    const playerHeightOffset = isCrouching.current 
      ? STANDING_HEIGHT - CROUCH_HEIGHT_OFFSET 
      : STANDING_HEIGHT

    // === COLLISION DETECTION SYSTEM ===
    // Cache collidable objects - only recalculate every 10 frames to reduce lag
    // Use spatial filtering to only cache objects near player
    cacheFrameCount.current++
    if (cacheFrameCount.current % 10 === 0 || collidableObjectsCache.current.length === 0) {
      collidableObjectsCache.current = []
      const playerPos = getVector3(player.position.x, player.position.y, player.position.z)
      const maxDistance = 30 // Only cache objects within 30 units
      const maxDistanceSq = maxDistance * maxDistance
      
      // Use a more efficient traversal - only check visible objects in view
      scene.traverse((obj) => {
        // Include meshes that are buildings, terrain, or other solid objects
        // Exclude player, particles, lights, etc.
        if (obj instanceof THREE.Mesh && obj.visible) {
          const userData = obj.userData
          // Skip player-related objects and non-collidable objects
          if (!userData.isPlayerGroup && !userData.isPlayer && !userData.noCollision) {
            // Spatial filtering: only cache objects near player
            const objPos = getVector3()
            obj.getWorldPosition(objPos)
            const distanceSq = playerPos.distanceToSquared(objPos)
            releaseVector3(objPos)
            
            if (distanceSq <= maxDistanceSq) {
              collidableObjectsCache.current.push(obj)
            }
          }
        }
      })
      releaseVector3(playerPos)
    }
    const collidableObjects = collidableObjectsCache.current

    // === GROUND DETECTION (Downward raycast) ===
    // CRITICAL: This function must be defined before any code that uses it
    // Cache ground check results to avoid redundant raycasts
    const checkGround = (pos: THREE.Vector3): { height: number; hit: boolean } => {
      // Use cached result if position hasn't changed much and we checked recently
      if (groundCheckCache.current) {
        const posDiff = pos.distanceTo(groundCheckCache.current.pos)
        const frameDiff = cacheFrameCount.current - groundCheckCache.current.frame
        // Cache valid for 3 frames if position changed less than 0.3 units (more aggressive caching)
        if (posDiff < 0.3 && frameDiff < 3) {
          return groundCheckCache.current.result
        }
      }
      
      // When player is very high up (grappling/climbing), use more lenient detection
      // Skip strict ground detection if player is above 15 units (likely grappling/climbing)
      const isHighAltitude = pos.y > 15
      const grappledBuilding = useGameStore.getState().grappledBuilding
      const isGrappling = grappledBuilding !== null
      
      // If player is grappling or climbing, don't try to find ground - let them fall naturally
      if (isGrappling || isClimbingBuilding.current) {
        // Return a very low ground height so player can fall
        const result = { height: playerHeightOffset, hit: false }
        groundCheckCache.current = { pos: pos.clone(), result, frame: cacheFrameCount.current }
        return result
      }
      
      // Start raycast from just above the player's current position
      // Use a small offset (2 units) to avoid hitting the player's own collision
      // But start low enough to avoid hitting buildings above
      const rayStartHeight = Math.max(pos.y + 2, 1) // Start at least 1 unit above ground
      const rayStart = getVector3(pos.x, rayStartHeight, pos.z)
      const rayDir = getVector3(0, -1, 0)
      raycaster.set(rayStart, rayDir)
      releaseVector3(rayStart)
      releaseVector3(rayDir)
      
      // When high altitude, cast further down to find actual ground (not buildings)
      raycaster.far = isHighAltitude ? pos.y + 20 : MAX_GROUND_DISTANCE + 5
      // Only check nearby objects for better performance
      const nearbyObjects = collidableObjects.filter(obj => {
        const objPos = getVector3()
        obj.getWorldPosition(objPos)
        const distance = objPos.distanceTo(pos)
        releaseVector3(objPos)
        return distance < 20 // Only check objects within 20 units
      })
      const hits = raycaster.intersectObjects(nearbyObjects, true)
      
      if (hits.length > 0) {
        // CRITICAL: Only accept hits that are BELOW the player's current position
        // The player's feet are at pos.y - playerHeightOffset, so ground should be at or below that
        // Add a small tolerance (0.5 units) for uneven terrain
        // When high altitude, be more lenient (allow hits up to 2 units below feet)
        const tolerance = isHighAltitude ? 2.0 : 0.5
        const maxValidGroundY = pos.y - playerHeightOffset + tolerance
        
      // Filter to find hits that are actually below the player
      // When high altitude, also filter out building hits (they have isBuilding userData)
      // Also filter out building hits if they're above a reasonable ground level (above 5 units)
      const validHits = hits.filter(hit => {
        const hitY = hit.point.y
        // Always skip building hits - we only want terrain/ground
        // Buildings are not valid ground surfaces
        if (hit.object.userData.isBuilding) {
          return false
        }
        // Skip hits that are clearly too high to be ground (above 5 units)
        // This prevents detecting building roofs or walls as ground
        if (hitY > 5) {
          return false
        }
        // Accept hits that are below the player's base (feet position)
        return hitY <= maxValidGroundY
      })
        
        if (validHits.length > 0) {
          // Use the closest valid hit (first one after filtering)
          const hit = validHits[0]
          // Ground height is the hit point Y + player height offset
          const groundHeight = hit.point.y + playerHeightOffset
          
          // Removed frequent debug logging - only log on actual issues
          
          const result = { height: groundHeight, hit: true }
          const cachedPos = getVector3().copy(pos)
          groundCheckCache.current = { pos: cachedPos, result, frame: cacheFrameCount.current }
          return result
        } else {
          // All hits were above player (buildings/sky), ignore them
          // When player is high up (grappling/climbing), this is expected - don't log
          if (import.meta.env.DEV && pos.y < 15 && Math.random() < 0.001) {
            console.warn('⚠️ All ground hits rejected (too high):', {
              playerY: pos.y.toFixed(2),
              playerFeetY: (pos.y - playerHeightOffset).toFixed(2),
              maxValidGroundY: maxValidGroundY.toFixed(2),
              firstHitY: hits[0]?.point.y.toFixed(2),
              totalHits: hits.length
            })
          }
        }
      }
      
      // Default to base ground level (0 + player height offset)
      // This should be a safe fallback when no ground is detected
      // When player is high up (grappling/climbing), this is expected - don't log
      const defaultHeight = playerHeightOffset
      
      // Only log if player is near ground level and no hit found (actual issue)
      if (import.meta.env.DEV && pos.y < 5 && Math.random() < 0.001) {
        console.warn('⚠️ No ground hit, using default height:', {
          defaultHeight: defaultHeight.toFixed(2),
          playerY: pos.y.toFixed(2),
          collidableObjects: collidableObjects.length
        })
      }
      
      const result = { height: defaultHeight, hit: false }
      const cachedPos = getVector3().copy(pos)
      groundCheckCache.current = { pos: cachedPos, result, frame: cacheFrameCount.current }
      return result
    }

    // CRITICAL SAFETY: Every frame, if grounded, ensure player is at ground height
    // This prevents any external systems from moving player upward
    // Note: This runs after checkGround is defined, so it can safely call it
    // IMPORTANT: Only run this check when player is actually near ground level
    // Don't clamp when player is falling or high in the air (after grappling/climbing)
    // Performance: Only check every 3 frames to reduce overhead
    if (initialized.current && isGrounded.current && player.position.y < 10 && cacheFrameCount.current % 3 === 0) {
      // Skip safety check if player has downward velocity (falling)
      // This prevents clamping to incorrect heights when falling after grappling
      // Also skip if player is grappling/climbing (handled elsewhere)
      const grappledBuilding = useGameStore.getState().grappledBuilding
      const isGrappling = grappledBuilding !== null
      
      if (velocity.current.y < -1 || isGrappling || isClimbingBuilding.current) {
        // Player is falling, grappling, or climbing - don't clamp - let physics handle it
      } else {
        const playerPos = getVector3(player.position.x, player.position.y, player.position.z)
        const safetyGroundCheck = checkGround(playerPos)
        releaseVector3(playerPos)
        const expectedGroundHeight = safetyGroundCheck.height
        
        // Only clamp if we actually detected ground (not using default height)
        // And only if player is significantly above expected ground
        if (safetyGroundCheck.hit && player.position.y > expectedGroundHeight + 0.1) {
          updatePlayerPosition({
            x: player.position.x,
            y: expectedGroundHeight,
            z: player.position.z
          })
          velocity.current.y = 0
          
          if (import.meta.env.DEV && Math.random() < 0.05) {
            console.warn('🔧 Corrected upward drift:', {
              was: player.position.y.toFixed(2),
              now: expectedGroundHeight.toFixed(2),
              groundHeight: expectedGroundHeight.toFixed(2),
              velocityY: velocity.current.y.toFixed(2)
            })
          }
        }
      }
    }

    // === WALL DETECTION (Horizontal raycasts) ===
    // Cache wall check results to avoid redundant raycasts
    const checkWalls = (pos: THREE.Vector3, moveDir: THREE.Vector3): { 
      hit: boolean; 
      normal: THREE.Vector3 | null; 
      distance: number;
      isBuilding: boolean;
      hitObject: THREE.Object3D | null;
    } => {
      if (moveDir.length() < 0.01) {
        return { hit: false, normal: null, distance: Infinity, isBuilding: false, hitObject: null }
      }

      // Use cached result if position and direction haven't changed much
      if (wallCheckCache.current) {
        const posDiff = pos.distanceTo(wallCheckCache.current.pos)
        const dirDiff = moveDir.angleTo(wallCheckCache.current.moveDir)
        const frameDiff = cacheFrameCount.current - wallCheckCache.current.frame
        // Cache valid for 1 frame if position changed less than 0.3 units and direction similar
        if (posDiff < 0.3 && dirDiff < 0.2 && frameDiff < 1) {
          return wallCheckCache.current.result
        }
      }

      // Cast rays in movement direction and to the sides
      const forward = getVector3().copy(moveDir).normalize()
      const sidewaysX = getVector3(moveDir.x, 0, 0).normalize()
      const sidewaysZ = getVector3(0, 0, moveDir.z).normalize()
      const rayDirections = [forward, sidewaysX, sidewaysZ]

      let closestHit: { normal: THREE.Vector3; distance: number; hitObject: THREE.Object3D | null } | null = null

      for (const rayDir of rayDirections) {
        if (rayDir.length() < 0.01) continue

        const rayStart = getVector3(pos.x, pos.y + playerHeightOffset, pos.z)
        raycaster.set(rayStart, rayDir)
        raycaster.far = PLAYER_RADIUS + WALL_RUN_DISTANCE
        releaseVector3(rayStart)
        
        // Only check nearby objects for better performance
        const nearbyObjects = collidableObjects.filter(obj => {
          const objPos = getVector3()
          obj.getWorldPosition(objPos)
          const distance = objPos.distanceTo(pos)
          releaseVector3(objPos)
          return distance < 10 // Only check objects within 10 units
        })
        const hits = raycaster.intersectObjects(nearbyObjects, true)

        if (hits.length > 0) {
          const hit = hits[0]
          if (hit.distance < PLAYER_RADIUS + WALL_RUN_DISTANCE) {
            const normal = hit.face?.normal.clone() || new THREE.Vector3()
            // Transform normal to world space
            if (hit.object instanceof THREE.Mesh) {
              normal.transformDirection(hit.object.matrixWorld)
            }
            
            if (!closestHit || hit.distance < closestHit.distance) {
              closestHit = { normal, distance: hit.distance, hitObject: hit.object }
            }
          }
        }
      }

      let result: { hit: boolean; normal: THREE.Vector3 | null; distance: number; isBuilding: boolean; hitObject: THREE.Object3D | null }
      
      if (closestHit) {
        // Check if the hit object is a building
        const isBuilding = closestHit.hitObject?.userData?.isBuilding === true
        result = { 
          hit: true, 
          normal: closestHit.normal, 
          distance: closestHit.distance,
          isBuilding,
          hitObject: closestHit.hitObject
        }
      } else {
        result = { hit: false, normal: null, distance: Infinity, isBuilding: false, hitObject: null }
      }
      
      // Cache the result
      const cachedPos = getVector3().copy(pos)
      const cachedDir = getVector3().copy(moveDir)
      wallCheckCache.current = { pos: cachedPos, moveDir: cachedDir, result, frame: cacheFrameCount.current }
      
      // Release temporary vectors
      rayDirections.forEach(dir => releaseVector3(dir))
      
      return result
    }

    // Check if grappling just ended - if so, reset grounded state if player is high up
    const grappledBuilding = useGameStore.getState().grappledBuilding
    const isCurrentlyGrappling = grappledBuilding !== null
    
    // If grapple just ended and player is high up, ensure they're not marked as grounded
    if (wasGrappling.current && !isCurrentlyGrappling && player.position.y > 10) {
      isGrounded.current = false
      // Allow player to fall naturally
      velocity.current.y = 0 // Start with zero velocity, gravity will handle it
      if (import.meta.env.DEV) {
        console.log('🎯 Grapple ended, resetting grounded state for fall:', {
          playerY: player.position.y.toFixed(2)
        })
      }
    }
    wasGrappling.current = isCurrentlyGrappling

    // Adaptive ground check frequency:
    // - Every frame when moving or in air
    // - Every 3-5 frames when grounded and stationary
    const playerPos = getVector3(player.position.x, player.position.y, player.position.z)
    const positionChanged = lastPosition.current.distanceToSquared(playerPos) > 0.01
    const shouldCheckGround = positionChanged || !isGrounded.current || groundCheckInterval.current >= 4
    
    if (shouldCheckGround) {
      const groundCheck = checkGround(playerPos)
      currentGroundHeight.current = groundCheck.height
      lastPosition.current.copy(playerPos)
      groundCheckInterval.current = 0
    } else {
      groundCheckInterval.current++
    }
    releaseVector3(playerPos)

    // === INITIAL GROUND CHECK ===
    // On first frame, determine if player is grounded based on actual position
    if (!initialized.current && player) {
      // CRITICAL: Ensure velocity is zero on first frame
      velocity.current.set(0, 0, 0)
      
      const distanceToGround = Math.abs(player.position.y - currentGroundHeight.current)
      const isOnGround = distanceToGround < 0.2
      
      // If player is on or very close to ground, clamp them immediately
      if (isOnGround || player.position.y <= currentGroundHeight.current + 0.2) {
        isGrounded.current = true
        // Immediately clamp player to ground on first frame
        const clampedY = currentGroundHeight.current
        updatePlayerPosition({ 
          x: player.position.x, 
          y: clampedY, 
          z: player.position.z 
        })
        velocity.current.y = 0
      } else {
        // Player starts above ground - they will fall
        isGrounded.current = false
        velocity.current.y = 0 // Start with zero velocity, gravity will handle it
      }
      
      initialized.current = true
      
      if (import.meta.env.DEV) {
        console.log('🎮 Initial ground check:', {
          playerY: player.position.y.toFixed(2),
          groundHeight: currentGroundHeight.current.toFixed(2),
          distance: distanceToGround.toFixed(2),
          isGrounded: isGrounded.current,
          clamped: isOnGround || player.position.y <= currentGroundHeight.current + 0.2
        })
      }
    }

    // === JUMP SYSTEM ===
    // Update jump cooldown
    if (jumpCooldown.current > 0) {
      jumpCooldown.current -= smoothedDelta.current
    }
    
    const jumpPressed = keys.has(' ') || keys.has('space')
    const canJump = jumpCooldown.current <= 0 && !isCrouching.current
    
    // Check if player is on ground (within 0.2 units)
    const onGround = Math.abs(player.position.y - currentGroundHeight.current) < 0.2
    
    // Allow jumping from ground or while wall-running
    // Check stamina before allowing jump (15 stamina per jump)
    const canJumpWithStamina = stamina >= 15
    if (jumpPressed && canJump && canJumpWithStamina && (onGround || isWallRunning.current)) {
      velocity.current.y = JUMP_FORCE
      
      // Consume stamina for jump
      consumeStamina(15)
      
      // If wall-running, add push away from wall
      if (isWallRunning.current && wallNormal.current.length() > 0) {
        const pushForce = wallNormal.current.clone().multiplyScalar(8)
        velocity.current.x += pushForce.x
        velocity.current.z += pushForce.z
        isWallRunning.current = false
      }
      
      isGrounded.current = false
      jumpCooldown.current = 0.2
      
      // Removed frequent jump logging - only log on issues
    }

    // === GRAVITY ===
    // Only apply gravity when not grounded and not climbing
    // CRITICAL: Never apply gravity if player is grounded - this prevents upward drift
    if (!isGrounded.current && !isClimbingBuilding.current) {
      velocity.current.y += GRAVITY * smoothedDelta.current
    } else if (isGrounded.current) {
      // When grounded, ALWAYS zero Y velocity (prevent ANY upward movement)
      velocity.current.y = 0
    }
    // When climbing, gravity is handled in the climbing section

    // === MOVEMENT WITH COLLISION ===
    // Calculate new position (use smoothed delta for consistent movement)
    let newX = player.position.x + velocity.current.x * smoothedDelta.current
    let newY = player.position.y + velocity.current.y * smoothedDelta.current
    let newZ = player.position.z + velocity.current.z * smoothedDelta.current
    
    // CRITICAL: If grounded, prevent ANY upward movement in position calculation
    if (isGrounded.current && !jumpPressed) {
      // Don't allow newY to be higher than current position when grounded
      if (newY > player.position.y) {
        newY = player.position.y
      }
    }

    // Check for wall collisions at new position - only when moving
    const moveDirection = getVector3(velocity.current.x, 0, velocity.current.z)
    const newPosForWallCheck = getVector3(newX, newY, newZ)
    const wallCheck = moveDirection.length() > 0.1 && shouldDoExpensiveChecks
      ? checkWalls(newPosForWallCheck, moveDirection)
      : { hit: false, normal: null, distance: Infinity, isBuilding: false, hitObject: null }
    releaseVector3(newPosForWallCheck)

    // === WALL-RUNNING ===
    isWallRunning.current = false
    if (wallCheck.hit && wallCheck.normal && !isGrounded.current && moveDirection.length() > 0.1) {
      // Check if wall is roughly vertical (not a floor/ceiling)
      const wallAngle = Math.abs(wallCheck.normal.y)
      if (wallAngle < 0.7) { // Wall is more vertical than horizontal
        // Check if player is moving towards the wall
        const moveDirNormalized = moveDirection.clone().normalize()
        const dotProduct = moveDirNormalized.dot(wallCheck.normal)
        
        if (dotProduct < -0.3) { // Moving towards wall
          // Enable wall-running
          isWallRunning.current = true
          wallNormal.current.copy(wallCheck.normal)
          
          // Reduce gravity while wall-running (Mars low gravity helps!)
          velocity.current.y = Math.max(velocity.current.y * 0.7, -2) // Slow fall, but don't reverse upward velocity
          
          // Allow upward movement when wall-running and moving forward
          if (keys.has('w')) {
            velocity.current.y += 8 * smoothedDelta.current // Upward boost for wall-running up
          }
          
          // Slide along wall - calculate tangent to wall surface
          const wallTangent = new THREE.Vector3()
          wallTangent.crossVectors(wallCheck.normal, new THREE.Vector3(0, 1, 0))
          if (wallTangent.length() < 0.1) {
            // If wall is vertical, try different cross product
            wallTangent.crossVectors(wallCheck.normal, new THREE.Vector3(1, 0, 0))
          }
          wallTangent.normalize()
          
          // Project movement direction onto wall tangent
          const moveDirNormalized = moveDirection.clone().normalize()
          const slideAmount = moveDirNormalized.dot(wallTangent)
          
          // Maintain movement along wall - project velocity onto wall tangent
          // Preserve player's current speed when transitioning to wall-running for natural feel
          const currentSpeed = moveDirection.length()
          const baseWallRunSpeed = isRunning.current ? 80 : 40
          // Use current speed if higher, otherwise use base wall-run speed
          const wallRunSpeed = Math.max(currentSpeed, baseWallRunSpeed)
          const targetSpeed = slideAmount * wallRunSpeed
          
          // Smoothly adjust velocity to slide along wall
          velocity.current.x = wallTangent.x * targetSpeed
          velocity.current.z = wallTangent.z * targetSpeed
        }
      }
    }

    // === BUILDING CLIMBING ===
    // If hitting a building and moving forward, allow climbing up instead of blocking
    if (wallCheck.hit && wallCheck.isBuilding && wallCheck.normal && moveDirection.length() > 0.1) {
      // Check if wall is roughly vertical (not a floor/ceiling)
      const wallAngle = Math.abs(wallCheck.normal.y)
      if (wallAngle < 0.7) { // Wall is more vertical than horizontal
        // Check if player is moving towards the wall
        const moveDirNormalized = moveDirection.clone().normalize()
        const dotProduct = moveDirNormalized.dot(wallCheck.normal)
        
        if (dotProduct < -0.3) { // Moving towards building
          isClimbingBuilding.current = true
          setIsClimbingBuilding(true)
          
          // Allow upward movement when climbing and moving forward
          if (keys.has('w') || keys.has('ArrowUp')) {
            // Calculate upward velocity based on movement speed
            const climbSpeed = isRunning.current ? 15 : 10 // Units per second upward
            // Set upward velocity for climbing, but don't reduce it immediately
            velocity.current.y = Math.max(velocity.current.y, climbSpeed)
            
            // Reduce gravity effect while climbing (but maintain upward velocity)
            // Only apply gravity reduction if falling, not if climbing up
            if (velocity.current.y < 0) {
              velocity.current.y = Math.max(velocity.current.y * 0.5, -1)
            }
            
            // Maintain forward movement along the building surface
            // Project movement onto the wall surface (tangent plane)
            const wallTangent = new THREE.Vector3()
            wallTangent.crossVectors(wallCheck.normal, new THREE.Vector3(0, 1, 0))
            if (wallTangent.length() < 0.1) {
              wallTangent.crossVectors(wallCheck.normal, new THREE.Vector3(1, 0, 0))
            }
            wallTangent.normalize()
            
            // Project movement direction onto wall tangent
            const slideAmount = moveDirNormalized.dot(wallTangent)
            // Preserve player's current speed when transitioning to building climbing
            const currentSpeed = moveDirection.length()
            const baseClimbMoveSpeed = isRunning.current ? 80 : 40
            // Use current speed if higher, otherwise use base climb speed
            const climbMoveSpeed = Math.max(currentSpeed, baseClimbMoveSpeed)
            const targetSpeed = slideAmount * climbMoveSpeed
            
            // Maintain horizontal movement along wall
            velocity.current.x = wallTangent.x * targetSpeed
            velocity.current.z = wallTangent.z * targetSpeed
          } else {
            // Not moving forward, just touching building - allow sliding down
            isClimbingBuilding.current = false
            setIsClimbingBuilding(false)
            // Reduce gravity slightly to allow controlled descent
            velocity.current.y = Math.max(velocity.current.y * 0.8, -5)
          }
        } else {
          isClimbingBuilding.current = false
          setIsClimbingBuilding(false)
        }
      } else {
        isClimbingBuilding.current = false
        setIsClimbingBuilding(false)
      }
    } else {
      isClimbingBuilding.current = false
      setIsClimbingBuilding(false)
    }

    // Prevent moving into walls (only if not climbing)
    if (wallCheck.hit && wallCheck.normal && !isWallRunning.current && !isClimbingBuilding.current) {
      // Push player back from wall
      const pushBack = wallCheck.normal.clone().multiplyScalar(0.1)
      newX -= pushBack.x
      newZ -= pushBack.z
      
      // Cancel velocity into wall
      const wallDot = new THREE.Vector3(velocity.current.x, 0, velocity.current.z).dot(wallCheck.normal)
      if (wallDot < 0) {
        velocity.current.x -= wallCheck.normal.x * wallDot
        velocity.current.z -= wallCheck.normal.z * wallDot
      }
    }

    // === GROUND COLLISION ===
    // Re-check ground at new X/Z position - only when needed
    const newPosForGround = getVector3(newX, newY, newZ)
    const newGroundCheck = shouldDoExpensiveChecks
      ? checkGround(newPosForGround)
      : { height: currentGroundHeight.current, hit: true }
    const newGroundHeight = newGroundCheck.height
    releaseVector3(newPosForGround)

    // Determine if player should be grounded
    const distanceToNewGround = newY - newGroundHeight
    const shouldBeGrounded = distanceToNewGround <= 0.2 && velocity.current.y <= 0

    if (shouldBeGrounded) {
      // Player is on or hitting ground - clamp to ground and stop falling
      newY = newGroundHeight
      velocity.current.y = 0
      isGrounded.current = true
      isWallRunning.current = false
    } else if (distanceToNewGround > 0.1) {
      // Player is above ground - they're in the air
      isGrounded.current = false
    } else {
      // Player is very close to ground but moving - clamp to ground
      newY = newGroundHeight
      velocity.current.y = 0
      isGrounded.current = true
    }
    
    // CRITICAL: When grounded and not jumping, ALWAYS clamp player to ground
    // This prevents player from floating or rising into space
    if (isGrounded.current && !jumpPressed) {
      // Force position to ground height
      newY = newGroundHeight
      // CRITICAL: ALWAYS zero Y velocity when grounded (not just if > 0)
      velocity.current.y = 0
      // Prevent any upward position
      if (newY > newGroundHeight) {
        newY = newGroundHeight
      }
      if (newY < newGroundHeight) {
        newY = newGroundHeight
      }
    }

    // Update current ground height
    currentGroundHeight.current = newGroundHeight
    
    // FINAL SAFETY CHECK: If grounded, ensure position is exactly at ground height
    // This prevents any upward drift from other systems
    // IMPORTANT: Only apply this when player is actually near ground level
    // Don't clamp when falling from high altitude (after grappling/climbing)
    if (isGrounded.current && !jumpPressed && player.position.y < 10) {
      // Skip if player is falling (has downward velocity) - let them land naturally
      // This prevents incorrect clamping when falling after grappling
      if (velocity.current.y < -1) {
        // Player is falling, don't clamp yet - let them fall to ground
        isGrounded.current = false
      } else {
        // Only clamp if we have a valid ground detection (not default height)
        // Check if newGroundHeight is reasonable (below 10 units, which is max terrain height)
        if (newGroundCheck.hit && newGroundHeight < 10) {
          newY = newGroundHeight
          velocity.current.y = 0
          
          // Log if we detect significant upward drift (only on actual issues)
          if (import.meta.env.DEV && newY > player.position.y + 0.1 && Math.random() < 0.01) {
            console.warn('🚨 Upward drift detected and corrected:', {
              oldY: player.position.y.toFixed(2),
              newY: newY.toFixed(2),
              groundHeight: newGroundHeight.toFixed(2),
              velocityY: velocity.current.y.toFixed(2)
            })
          }
        }
      }
    }
    
    const newPos = {
      x: newX,
      y: newY,
      z: newZ,
    }

    // During active movement, update position directly for maximum responsiveness
    // Only use prediction system for network sync, not for local movement
    // This prevents any smoothing or delays that could cause stuttering
    if (isGrounded.current && !jumpPressed && newPos.y > newGroundHeight + 0.1) {
      newPos.y = newGroundHeight
    }
    
    // Performance: Only update store if position changed significantly
    // This reduces unnecessary re-renders and improves performance
    const posDelta = Math.sqrt(
      Math.pow(newPos.x - player.position.x, 2) +
      Math.pow(newPos.y - player.position.y, 2) +
      Math.pow(newPos.z - player.position.z, 2)
    )
    
    // Always update when moving to ensure smooth movement
    // Only skip updates when stationary and position hasn't changed
    if (moving || posDelta > 0.001) {
      // Direct position update - no prediction system interference during movement
      // This ensures smooth, responsive movement without any lag or stuttering
      // Enforce city boundaries to prevent players from leaving the playable area
      const clampedX = Math.max(-CITY_BOUNDARY, Math.min(CITY_BOUNDARY, newPos.x))
      const clampedZ = Math.max(-CITY_BOUNDARY, Math.min(CITY_BOUNDARY, newPos.z))
      const clampedPos = { x: clampedX, y: newPos.y, z: clampedZ }
      
      // If position was clamped, also stop velocity in that direction
      if (clampedX !== newPos.x) velocity.current.x = 0
      if (clampedZ !== newPos.z) velocity.current.z = 0
      
      updatePlayerPosition(clampedPos)
      updatePlayerRotation(player.rotation)
      
      // Still update prediction system for network sync (but don't use its output for local movement)
      predictMovement(newPos, player.rotation)
    }
    
    // Release direction vector
    releaseVector3(direction)
    releaseVector3(moveDirection)
    
    // Recharge stamina when not running or jumping (20 per second)
    if (!isRunning.current && stamina < maxStamina) {
      rechargeStamina(20 * smoothedDelta.current)
    }
  })

  return null
}
