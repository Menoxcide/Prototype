/**
 * Pathfinder-Style Grapple System
 * Detects nearby objects and allows grappling on click
 * Works with any object within range (like Pathfinder from Apex Legends)
 * No visual indicators - relies on intuitive gameplay like Apex Legends
 */

import { useEffect, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import GrappleLine from './GrappleLine'
import GrappleHook from './GrappleHook'
import { useAltKey } from '../hooks/useAltKey'
import { hapticManager } from '../utils/haptics'
import { playMovementSound } from '../assets/expandedSounds'
import { COOLDOWN_GRAPPLE } from '../data/cooldowns'

const GRAPPLE_DISTANCE = 60 // Maximum distance to grapple (doubled from 30)
const GRAPPLE_COST = 20 // Stamina cost per grapple
const GRAPPLE_ACTION_ID = 'grapple'

// Physics constants
const RETRACTION_SPEED = 15 // Speed at which player can pull themselves up
const MIN_ROPE_LENGTH = 2 // Minimum rope length
const GRAPPLE_PULL_STRENGTH = 40 // Base pull strength towards grapple point
const GRAPPLE_MAX_PULL_DISTANCE = 60 // Maximum distance to apply pull (same as grapple distance)
const GRAPPLE_RELEASE_DISTANCE = 3 // Distance at which grapple auto-releases (player reached target)

export default function BuildingGrappleSystem() {
  const { camera, scene, raycaster } = useThree()
  const player = useGameStore((s) => s.player)
  const stamina = useGameStore((s) => s.stamina)
  const consumeStamina = useGameStore((s) => s.consumeStamina)
  const setCanGrapple = useGameStore((s) => s.setCanGrapple)
  const setGrappledBuilding = useGameStore((s) => s.setGrappledBuilding)
  const setGrapplePullVelocity = useGameStore((s) => s.setGrapplePullVelocity)
  const isOnCooldown = useGameStore((s) => s.isOnCooldown)
  const startCooldown = useGameStore((s) => s.startCooldown)
  
  const mouseDownRef = useRef(false)
  const grappleTargetRef = useRef<{ id: string; position: THREE.Vector3 } | null>(null)
  
  // Physics state for swinging
  const swingAngleRef = useRef(0) // Current angle from vertical (radians)
  const angularVelocityRef = useRef(0) // Angular velocity (rad/s)
  const ropeLengthRef = useRef(0) // Current rope length
  const initialRopeLengthRef = useRef(0) // Initial rope length when grapple started
  const swingPlaneNormalRef = useRef<THREE.Vector3 | null>(null) // Normal vector for swing plane
  const isRetractingRef = useRef(false) // Whether player is retracting (pulling up)
  const wasGrappling = useRef(false) // Track previous grappling state for logging
  
  // Momentum conservation: Store velocity before release
  const momentumOnReleaseRef = useRef<THREE.Vector3 | null>(null)
  const setMomentumOnRelease = useGameStore((s) => s.setMomentumOnRelease)
  const lastVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3())

  // Find all grappleable objects in the scene (any mesh - walls and objects)
  const findGrappleableObjects = (): THREE.Mesh[] => {
    if (!player) return []
    
    const objects: THREE.Mesh[] = []
    
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Skip player, UI elements, and explicitly non-grappleable objects
        // Include all walls (userData.isWall) and all other objects
        if (obj.userData.isPlayer || obj.userData.isUI || obj.userData.isGrappleable === false) {
          return
        }
        
        // Include all meshes (walls, buildings, objects) - range check happens on hit point
        objects.push(obj)
      }
    })
    return objects
  }

  // Check if player can grapple to a hit point (not object center)
  const checkGrappleable = (hitPoint: THREE.Vector3): boolean => {
    if (!player) return false
    
    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    const distance = playerPos.distanceTo(hitPoint)
    
    // Check distance and stamina
    return distance <= GRAPPLE_DISTANCE && stamina >= GRAPPLE_COST
  }

  // Release grapple function with momentum conservation
  const releaseGrapple = useCallback(() => {
    // Sound effect for grapple release
    if (wasGrappling.current) {
      playMovementSound('grappleRetract', 0.6)
    }
    
    // Store momentum before release for conservation
    if (player && wasGrappling.current) {
      // Use stored velocity from last frame (tracked in useFrame)
      if (momentumOnReleaseRef.current) {
        // Boost momentum for better feel (1.3x multiplier)
        const momentum = momentumOnReleaseRef.current.clone().multiplyScalar(1.3)
        setMomentumOnRelease({
          x: momentum.x,
          y: momentum.y,
          z: momentum.z
        })
        momentumOnReleaseRef.current.set(0, 0, 0)
      } else {
        const grapplePullVelocity = useGameStore.getState().grapplePullVelocity
        if (grapplePullVelocity) {
          // Fallback: Estimate velocity from grapple pull direction
          const momentum = new THREE.Vector3(
            grapplePullVelocity.x * 0.6,
            grapplePullVelocity.y * 0.6,
            grapplePullVelocity.z * 0.6
          )
          momentum.multiplyScalar(1.2)
          setMomentumOnRelease({
            x: momentum.x,
            y: momentum.y,
            z: momentum.z
          })
        }
      }
    }
    
    // Log grapple stop
    if (wasGrappling.current) {
      import('../utils/combatLog').then(({ addStatusLog }) => {
        addStatusLog('Released grapple', '#888888')
      })
      wasGrappling.current = false
    }
    
    grappleTargetRef.current = null
    setGrappledBuilding(null)
    setGrapplePullVelocity(null)
    swingAngleRef.current = 0
    angularVelocityRef.current = 0
    ropeLengthRef.current = 0
    initialRopeLengthRef.current = 0
    swingPlaneNormalRef.current = null
    isRetractingRef.current = false
    }, [setGrapplePullVelocity, setMomentumOnRelease, player])

  // Track Alt key state for UI interaction
  const isAltPressed = useAltKey()

  // Handle mouse click for grappling
  useEffect(() => {
    if (!player) return

    const handleMouseDown = (e: MouseEvent) => {
      // Don't handle clicks when Alt is held (user wants to interact with UI)
      if (isAltPressed) return
      
      // Only handle left click
      if (e.button !== 0) return
      
      mouseDownRef.current = true
      
      // Raycast from camera to find clicked object
      const mouse = new THREE.Vector2()
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      
      raycaster.setFromCamera(mouse, camera)
      // Find all objects in scene (not just buildings)
      const allObjects: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !obj.userData.isPlayer && !obj.userData.isUI && obj.userData.isGrappleable !== false) {
          allObjects.push(obj)
        }
      })
      const intersects = raycaster.intersectObjects(allObjects, true)
      
      if (intersects.length > 0) {
        const hit = intersects[0]
        const obj = hit.object as THREE.Mesh
        
        // Use the hit point directly (any point on wall/object surface)
        const targetPos = hit.point.clone()
        
        // Check cooldown before grappling
        if (isOnCooldown(GRAPPLE_ACTION_ID)) {
          return
        }
        
        // Check if hit point is within range
        if (checkGrappleable(targetPos)) {
          
          // Calculate initial rope length and swing parameters
          const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
          const initialDistance = playerPos.distanceTo(targetPos)
          initialRopeLengthRef.current = initialDistance
          ropeLengthRef.current = initialDistance
          
          // Calculate swing plane normal (perpendicular to gravity and initial direction)
          const initialDirection = new THREE.Vector3().subVectors(targetPos, playerPos).normalize()
          const gravityDir = new THREE.Vector3(0, -1, 0)
          swingPlaneNormalRef.current = new THREE.Vector3().crossVectors(initialDirection, gravityDir).normalize()
          if (swingPlaneNormalRef.current.length() < 0.1) {
            // If vectors are parallel, use a default plane
            swingPlaneNormalRef.current = new THREE.Vector3(1, 0, 0)
          }
          
          // Initialize swing angle (angle from vertical)
          const vertical = new THREE.Vector3(0, -1, 0)
          const angle = Math.acos(Math.max(-1, Math.min(1, initialDirection.dot(vertical))))
          swingAngleRef.current = angle
          angularVelocityRef.current = 0
          
          // Start grapple
          grappleTargetRef.current = {
            id: obj.uuid,
            position: targetPos
          }
          
          // Consume stamina
          consumeStamina(GRAPPLE_COST)
          
          // Haptic feedback for grapple
          hapticManager.grapple()
          
          // Sound effect for grapple deployment
          playMovementSound('grappleDeploy', 0.8)
          
          // Start cooldown
          startCooldown(GRAPPLE_ACTION_ID, COOLDOWN_GRAPPLE * 1000)
          
          if (import.meta.env.DEV) {
            console.log('🎯 Grappling to object:', {
              objectId: obj.uuid,
              targetPos: targetPos.toArray(),
              initialRopeLength: initialRopeLengthRef.current,
              initialAngle: swingAngleRef.current,
              stamina: stamina
            })
          }
        }
      }
    }

    const handleMouseUp = () => {
      mouseDownRef.current = false
    }

    // Handle retraction and release
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Space key when grappling
      if (!grappleTargetRef.current || e.code !== 'Space') return
      
      // Shift + Space: retract grapple (hold to pull up) - check this first
      if (e.shiftKey) {
        isRetractingRef.current = true
        e.preventDefault()
        return
      }
      
      // Space (without Shift): release grapple
      releaseGrapple()
      e.preventDefault()
    }

    const handleRightClick = (e: MouseEvent) => {
      // Right click to release grapple
      if (e.button === 2 && grappleTargetRef.current) {
        e.preventDefault()
        releaseGrapple()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release retraction when shift+space is released
      if (e.code === 'Space') {
        isRetractingRef.current = false
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', handleRightClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', handleRightClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [camera, raycaster, player, stamina, consumeStamina, releaseGrapple, setGrapplePullVelocity, isAltPressed])

  // Handle grappling
  useFrame((_, delta) => {
    if (!player) return

    // Track velocity for momentum conservation
    const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    if (grappleTargetRef.current) {
      // Calculate velocity from position change
      const velocity = new THREE.Vector3().subVectors(
        currentPos,
        lastVelocityRef.current
      ).divideScalar(delta || 0.016)
      momentumOnReleaseRef.current = velocity.clone()
    }
    lastVelocityRef.current.copy(currentPos)

    // Note: Grapple availability is now checked by GrappleIndicator component
    // This check is kept for backward compatibility but is less accurate
    const objects = findGrappleableObjects()
    setCanGrapple(objects.length > 0 && stamina >= GRAPPLE_COST)

    // Handle active grapple with velocity-based pulling
    if (grappleTargetRef.current && initialRopeLengthRef.current > 0) {
      const attachmentPoint = grappleTargetRef.current.position
      const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
      
      // Calculate direction from player to attachment point (pull direction)
      const pullDirection = new THREE.Vector3().subVectors(attachmentPoint, currentPos)
      const distanceToTarget = pullDirection.length()
      
      // Auto-release if player is very close to target
      if (distanceToTarget < GRAPPLE_RELEASE_DISTANCE) {
        // Log grapple stop
        if (wasGrappling.current) {
          import('../utils/combatLog').then(({ addStatusLog }) => {
            addStatusLog('Reached grapple target', '#00ff88')
          })
          wasGrappling.current = false
        }
        releaseGrapple()
        return
      }
      
      // Handle retraction (player pulling themselves up)
      if (isRetractingRef.current && ropeLengthRef.current > MIN_ROPE_LENGTH) {
        ropeLengthRef.current = Math.max(MIN_ROPE_LENGTH, ropeLengthRef.current - RETRACTION_SPEED * delta)
      }
      
      // Calculate current rope length
      const currentRopeLength = currentPos.distanceTo(attachmentPoint)
      
      // Update rope length if it's significantly different (player movement)
      if (Math.abs(currentRopeLength - ropeLengthRef.current) > 0.5) {
        ropeLengthRef.current = currentRopeLength
      }
      
      // Calculate pull acceleration towards grapple point
      // Pull strength increases with distance (stronger pull when farther away)
      const normalizedDistance = Math.min(1, distanceToTarget / GRAPPLE_MAX_PULL_DISTANCE)
      const pullStrength = GRAPPLE_PULL_STRENGTH * (1 + normalizedDistance * 0.5) // 1x to 1.5x strength
      
      // Normalize pull direction
      if (distanceToTarget > 0.01) {
        pullDirection.normalize()
      } else {
        pullDirection.set(0, 1, 0) // Default upward if too close
      }
      
      // Calculate pull acceleration (units per second squared)
      // This will be applied to velocity in the movement system
      const pullAcceleration = pullDirection.multiplyScalar(pullStrength)
      
      // Store pull acceleration for movement system to apply
      setGrapplePullVelocity({
        x: pullAcceleration.x,
        y: pullAcceleration.y,
        z: pullAcceleration.z
      })
      
      // Update grappled object state
      setGrappledBuilding({
        id: grappleTargetRef.current.id,
        position: { x: attachmentPoint.x, y: attachmentPoint.y, z: attachmentPoint.z }
      })
      
      // Log grapple start
      if (!wasGrappling.current) {
        import('../utils/combatLog').then(({ addStatusLog }) => {
          addStatusLog('Grappled to object', '#00ffff')
        })
        wasGrappling.current = true
      }
    } else if (grappleTargetRef.current) {
      // Clean up if grapple target exists but physics not initialized
      // Log grapple stop
      if (wasGrappling.current) {
        import('../utils/combatLog').then(({ addStatusLog }) => {
          addStatusLog('Grapple ended', '#888888')
        })
        wasGrappling.current = false
      }
      grappleTargetRef.current = null
      setGrappledBuilding(null)
      setGrapplePullVelocity(null)
    } else {
      // No active grapple - clear pull velocity
      setGrapplePullVelocity(null)
    }
  })


  // Get grapple line positions
  const grappledBuilding = useGameStore((s) => s.grappledBuilding)
  const grappleStart = useRef(new THREE.Vector3())
  const grappleEnd = useRef(new THREE.Vector3())
  const ropeDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const isGrappling = grappledBuilding !== null

  // Update grapple line positions every frame
  useFrame(() => {
    if (isGrappling && player && grappledBuilding && grappleTargetRef.current) {
      // Start position: player position + offset for hand/attachment point (slightly above center)
      grappleStart.current.set(
        player.position.x,
        player.position.y + 1.2, // Hand/attachment point height
        player.position.z
      )
      
      // End position: grappled object position (attachment point)
      const attachmentPoint = grappleTargetRef.current.position
      grappleEnd.current.set(
        attachmentPoint.x,
        attachmentPoint.y,
        attachmentPoint.z
      )
      
      // Calculate rope direction for hook orientation (from hook to player)
      ropeDirectionRef.current.subVectors(grappleStart.current, grappleEnd.current)
      if (ropeDirectionRef.current.length() > 0.01) {
        ropeDirectionRef.current.normalize()
      } else {
        ropeDirectionRef.current.set(0, 1, 0) // Default upward if too close
      }
    }
  })

  return (
    <>
      {/* Render grapple line when grappling */}
      {isGrappling && grappleTargetRef.current && (
        <>
          <GrappleLine
            start={grappleStart.current}
            end={grappleEnd.current}
            visible={isGrappling}
            ropeLength={ropeLengthRef.current}
            isTaut={Math.abs(ropeLengthRef.current - initialRopeLengthRef.current) < 0.5}
          />
          <GrappleHook
            position={grappleEnd.current}
            visible={isGrappling}
            ropeDirection={ropeDirectionRef.current}
          />
        </>
      )}
    </>
  )
}

