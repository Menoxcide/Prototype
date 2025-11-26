/**
 * Building Grapple System
 * Detects nearby buildings, highlights them, and allows grappling on click
 */

import { useEffect, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import GrappleLine from './GrappleLine'
import GrappleHook from './GrappleHook'

const GRAPPLE_DISTANCE = 60 // Maximum distance to grapple (doubled from 30)
const HIGHLIGHT_DISTANCE = 50 // Distance to start highlighting buildings (doubled from 25)
const GRAPPLE_COST = 20 // Stamina cost per grapple
const HIGHLIGHT_SMOOTH_SPEED = 3 // Speed for smooth highlight interpolation

// Physics constants
const GRAVITY = 9.8 // Gravity acceleration
const DAMPING = 0.95 // Air resistance/damping factor (0-1, lower = more damping)
const RETRACTION_SPEED = 15 // Speed at which player can pull themselves up
const MIN_ROPE_LENGTH = 2 // Minimum rope length
const MAX_SWING_ANGLE = Math.PI * 0.4 // Maximum swing angle (about 72 degrees)

export default function BuildingGrappleSystem() {
  const { camera, scene, raycaster } = useThree()
  const player = useGameStore((s) => s.player)
  const stamina = useGameStore((s) => s.stamina)
  const consumeStamina = useGameStore((s) => s.consumeStamina)
  const setCanGrapple = useGameStore((s) => s.setCanGrapple)
  const setGrappledBuilding = useGameStore((s) => s.setGrappledBuilding)
  const updatePlayerPosition = useGameStore((s) => s.updatePlayerPosition)
  
  const highlightedBuildings = useRef<Map<string, THREE.Mesh>>(new Map())
  const highlightIntensities = useRef<Map<string, number>>(new Map()) // Track highlight intensity for smooth interpolation
  const mouseDownRef = useRef(false)
  const grappleTargetRef = useRef<{ id: string; position: THREE.Vector3 } | null>(null)
  
  // Physics state for swinging
  const swingAngleRef = useRef(0) // Current angle from vertical (radians)
  const angularVelocityRef = useRef(0) // Angular velocity (rad/s)
  const ropeLengthRef = useRef(0) // Current rope length
  const initialRopeLengthRef = useRef(0) // Initial rope length when grapple started
  const swingPlaneNormalRef = useRef<THREE.Vector3 | null>(null) // Normal vector for swing plane
  const isRetractingRef = useRef(false) // Whether player is retracting (pulling up)

  // Find all buildings in the scene
  const findBuildings = (): THREE.Mesh[] => {
    const buildings: THREE.Mesh[] = []
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.isBuilding) {
        buildings.push(obj)
      }
    })
    return buildings
  }

  // Check if player can grapple to a building
  const checkGrappleable = (building: THREE.Mesh): boolean => {
    if (!player) return false
    
    const buildingPos = new THREE.Vector3()
    building.getWorldPosition(buildingPos)
    
    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    const distance = playerPos.distanceTo(buildingPos)
    
    // Check distance and stamina
    return distance <= GRAPPLE_DISTANCE && stamina >= GRAPPLE_COST
  }

  // Highlight a building (smooth interpolation)
  const highlightBuilding = (building: THREE.Mesh, delta: number) => {
    if (!highlightedBuildings.current.has(building.uuid)) {
      // Store original material on first highlight
      const originalMaterial = building.material as THREE.MeshStandardMaterial
      building.userData.originalEmissive = originalMaterial.emissive.clone()
      building.userData.originalEmissiveIntensity = originalMaterial.emissiveIntensity || 0
      highlightedBuildings.current.set(building.uuid, building)
      highlightIntensities.current.set(building.uuid, 0) // Start at 0
    }
    
    // Smoothly interpolate highlight intensity
    const currentIntensity = highlightIntensities.current.get(building.uuid) || 0
    const targetIntensity = 0.8
    const newIntensity = Math.min(targetIntensity, currentIntensity + HIGHLIGHT_SMOOTH_SPEED * delta)
    highlightIntensities.current.set(building.uuid, newIntensity)
    
    // Apply smooth highlight
    const material = building.material as THREE.MeshStandardMaterial
    if (material) {
      // Blend between original emissive and cyan highlight
      const originalEmissive = building.userData.originalEmissive || new THREE.Color(0x000000)
      const highlightColor = new THREE.Color(0x00ffff) // Cyan
      material.emissive.lerpColors(originalEmissive, highlightColor, newIntensity)
      material.emissiveIntensity = (building.userData.originalEmissiveIntensity || 0) * (1 - newIntensity) + newIntensity
    }
  }

  // Remove highlight from building (smooth fade out)
  const removeHighlight = (building: THREE.Mesh, delta: number) => {
    if (!highlightedBuildings.current.has(building.uuid)) return
    
    // Smoothly fade out highlight
    const currentIntensity = highlightIntensities.current.get(building.uuid) || 0
    if (currentIntensity > 0.01) {
      const newIntensity = Math.max(0, currentIntensity - HIGHLIGHT_SMOOTH_SPEED * delta)
      highlightIntensities.current.set(building.uuid, newIntensity)
      
      // Apply fade out
      const material = building.material as THREE.MeshStandardMaterial
      if (material && building.userData.originalEmissive) {
        const originalEmissive = building.userData.originalEmissive
        const highlightColor = new THREE.Color(0x00ffff)
        material.emissive.lerpColors(originalEmissive, highlightColor, newIntensity)
        material.emissiveIntensity = (building.userData.originalEmissiveIntensity || 0) * (1 - newIntensity) + newIntensity
      }
    } else {
      // Fully removed, restore original
      const originalMaterial = building.material as THREE.MeshStandardMaterial
      if (originalMaterial && building.userData.originalEmissive) {
        // Copy the original emissive color (don't assign reference)
        originalMaterial.emissive.copy(building.userData.originalEmissive)
        originalMaterial.emissiveIntensity = building.userData.originalEmissiveIntensity || 0
        // Mark material as needing update
        originalMaterial.needsUpdate = true
      }
      highlightedBuildings.current.delete(building.uuid)
      highlightIntensities.current.delete(building.uuid)
    }
  }

  // Release grapple function
  const releaseGrapple = useCallback(() => {
    if (grappleTargetRef.current) {
      const grappledBuildingId = grappleTargetRef.current.id
      const buildings = findBuildings()
      const grappledBuilding = buildings.find(b => b.uuid === grappledBuildingId)
      if (grappledBuilding) {
        const material = grappledBuilding.material as THREE.MeshStandardMaterial
        if (material && grappledBuilding.userData.originalEmissive) {
          material.emissive.copy(grappledBuilding.userData.originalEmissive)
          material.emissiveIntensity = grappledBuilding.userData.originalEmissiveIntensity || 0
          material.needsUpdate = true
        }
        highlightedBuildings.current.delete(grappledBuildingId)
        highlightIntensities.current.delete(grappledBuildingId)
      }
    }
    grappleTargetRef.current = null
    setGrappledBuilding(null)
    swingAngleRef.current = 0
    angularVelocityRef.current = 0
    ropeLengthRef.current = 0
    initialRopeLengthRef.current = 0
    swingPlaneNormalRef.current = null
    isRetractingRef.current = false
  }, [])

  // Handle mouse click for grappling
  useEffect(() => {
    if (!player) return

    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left click
      if (e.button !== 0) return
      
      mouseDownRef.current = true
      
      // Raycast from camera to find clicked object
      const mouse = new THREE.Vector2()
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(findBuildings(), true)
      
      if (intersects.length > 0) {
        const hit = intersects[0]
        const building = hit.object as THREE.Mesh
        
        if (building.userData.isBuilding && checkGrappleable(building)) {
          const buildingPos = new THREE.Vector3()
          building.getWorldPosition(buildingPos)
          
          // Get building height from userData
          const buildingHeight = building.userData.buildingHeight || 10
          buildingPos.y = buildingHeight / 2 // Grapple to middle of building
          
          // Calculate initial rope length and swing parameters
          const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
          const initialDistance = playerPos.distanceTo(buildingPos)
          initialRopeLengthRef.current = initialDistance
          ropeLengthRef.current = initialDistance
          
          // Calculate swing plane normal (perpendicular to gravity and initial direction)
          const initialDirection = new THREE.Vector3().subVectors(buildingPos, playerPos).normalize()
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
            id: building.uuid,
            position: buildingPos
          }
          
          // Consume stamina
          consumeStamina(GRAPPLE_COST)
          
          if (import.meta.env.DEV) {
            console.log('🎯 Grappling to building:', {
              buildingId: building.uuid,
              targetPos: buildingPos.toArray(),
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
      // Shift + Space: retract grapple (hold to pull up)
      if ((e.shiftKey && e.code === 'Space') && grappleTargetRef.current) {
        isRetractingRef.current = true
        e.preventDefault()
      }
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
  }, [camera, raycaster, player, stamina, consumeStamina, releaseGrapple])

  // Update building highlights and handle grappling
  useFrame((_, delta) => {
    if (!player) return

    const buildings = findBuildings()
    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    
    // Check each building for highlighting (with smooth interpolation)
    let foundGrappleable = false
    buildings.forEach((building) => {
      const buildingPos = new THREE.Vector3()
      building.getWorldPosition(buildingPos)
      const distance = playerPos.distanceTo(buildingPos)
      
      if (distance <= HIGHLIGHT_DISTANCE && checkGrappleable(building)) {
        highlightBuilding(building, delta)
        foundGrappleable = true
      } else {
        // Remove highlight if building is too far or not grappleable
        // Also remove highlight if this building is currently being grappled
        const isCurrentlyGrappled = grappleTargetRef.current?.id === building.uuid
        if (!isCurrentlyGrappled) {
          removeHighlight(building, delta)
        }
      }
    })
    
    setCanGrapple(foundGrappleable)

    // Handle active grapple with physics-based swinging
    if (grappleTargetRef.current && initialRopeLengthRef.current > 0) {
      const attachmentPoint = grappleTargetRef.current.position
      const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
      
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
      
      // Calculate direction from attachment point to player
      const ropeDirection = new THREE.Vector3().subVectors(currentPos, attachmentPoint)
      const distance = ropeDirection.length()
      
      // Normalize rope direction
      if (distance > 0.01) {
        ropeDirection.normalize()
      } else {
        ropeDirection.set(0, -1, 0) // Default to straight down
      }
      
      // Calculate swing angle from vertical
      const vertical = new THREE.Vector3(0, -1, 0)
      const angle = Math.acos(Math.max(-1, Math.min(1, ropeDirection.dot(vertical))))
      swingAngleRef.current = angle
      
      // Pendulum physics: θ'' = -(g/L) * sin(θ) - damping * θ'
      const L = ropeLengthRef.current
      if (L > 0.1) {
        // Angular acceleration due to gravity
        const angularAcceleration = -(GRAVITY / L) * Math.sin(swingAngleRef.current)
        
        // Apply damping
        angularVelocityRef.current *= DAMPING
        
        // Update angular velocity
        angularVelocityRef.current += angularAcceleration * delta
        
        // Clamp angular velocity to prevent excessive speeds
        const MAX_ANGULAR_VELOCITY = 10
        angularVelocityRef.current = Math.max(-MAX_ANGULAR_VELOCITY, Math.min(MAX_ANGULAR_VELOCITY, angularVelocityRef.current))
        
        // Update swing angle
        swingAngleRef.current += angularVelocityRef.current * delta
        
        // Clamp swing angle to prevent going too far
        swingAngleRef.current = Math.max(-MAX_SWING_ANGLE, Math.min(MAX_SWING_ANGLE, swingAngleRef.current))
      }
      
      // Calculate new position based on swing physics
      // Position = attachmentPoint + ropeLength * direction(angle)
      const swingDirection = new THREE.Vector3()
      
      // Calculate direction in swing plane
      if (swingPlaneNormalRef.current) {
        // Create a vector perpendicular to both vertical and plane normal
        const vertical = new THREE.Vector3(0, -1, 0)
        const right = new THREE.Vector3().crossVectors(vertical, swingPlaneNormalRef.current).normalize()
        const forward = new THREE.Vector3().crossVectors(swingPlaneNormalRef.current, right).normalize()
        
        // Calculate direction based on swing angle
        swingDirection.copy(vertical).multiplyScalar(-Math.cos(swingAngleRef.current))
        swingDirection.addScaledVector(right, Math.sin(swingAngleRef.current))
        swingDirection.normalize()
      } else {
        // Fallback: use simple vertical + horizontal component
        swingDirection.set(
          Math.sin(swingAngleRef.current),
          -Math.cos(swingAngleRef.current),
          0
        ).normalize()
      }
      
      // Calculate new position
      const newPos = attachmentPoint.clone().add(swingDirection.multiplyScalar(ropeLengthRef.current))
      
      // Cap maximum grapple height to prevent launching too high (max 50 units above ground)
      const MAX_GRAPPLE_HEIGHT = 50
      if (newPos.y > MAX_GRAPPLE_HEIGHT) {
        newPos.y = MAX_GRAPPLE_HEIGHT
        // If we hit the height cap, cancel grapple
        if (grappleTargetRef.current) {
          const grappledBuildingId = grappleTargetRef.current.id
          const buildings = findBuildings()
          const grappledBuilding = buildings.find(b => b.uuid === grappledBuildingId)
          if (grappledBuilding) {
            const material = grappledBuilding.material as THREE.MeshStandardMaterial
            if (material && grappledBuilding.userData.originalEmissive) {
              material.emissive.copy(grappledBuilding.userData.originalEmissive)
              material.emissiveIntensity = grappledBuilding.userData.originalEmissiveIntensity || 0
              material.needsUpdate = true
            }
            highlightedBuildings.current.delete(grappledBuildingId)
            highlightIntensities.current.delete(grappledBuildingId)
          }
        }
        grappleTargetRef.current = null
        setGrappledBuilding(null)
        swingAngleRef.current = 0
        angularVelocityRef.current = 0
        ropeLengthRef.current = 0
        initialRopeLengthRef.current = 0
        swingPlaneNormalRef.current = null
      } else {
        // Update player position
        updatePlayerPosition({
          x: newPos.x,
          y: newPos.y,
          z: newPos.z
        })
        
        // Update grappled building state
        if (grappleTargetRef.current) {
          setGrappledBuilding({
            id: grappleTargetRef.current.id,
            position: { x: attachmentPoint.x, y: attachmentPoint.y, z: attachmentPoint.z }
          })
        }
      }
    } else if (grappleTargetRef.current) {
      // Clean up if grapple target exists but physics not initialized
      const grappledBuildingId = grappleTargetRef.current.id
      const buildings = findBuildings()
      const grappledBuilding = buildings.find(b => b.uuid === grappledBuildingId)
      if (grappledBuilding) {
        const material = grappledBuilding.material as THREE.MeshStandardMaterial
        if (material && grappledBuilding.userData.originalEmissive) {
          material.emissive.copy(grappledBuilding.userData.originalEmissive)
          material.emissiveIntensity = grappledBuilding.userData.originalEmissiveIntensity || 0
          material.needsUpdate = true
        }
        highlightedBuildings.current.delete(grappledBuildingId)
        highlightIntensities.current.delete(grappledBuildingId)
      }
      grappleTargetRef.current = null
      setGrappledBuilding(null)
    }
  })

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      highlightedBuildings.current.forEach((building) => {
        const originalMaterial = building.material as THREE.MeshStandardMaterial
        if (originalMaterial && building.userData.originalEmissive && typeof building.userData.originalEmissive.copy === 'function') {
          // Copy the original emissive color (don't assign reference)
          // Only copy if originalEmissive is a valid THREE.Color object with copy method
          try {
            originalMaterial.emissive.copy(building.userData.originalEmissive)
            originalMaterial.emissiveIntensity = building.userData.originalEmissiveIntensity || 0
            originalMaterial.needsUpdate = true
          } catch (error) {
            // Fallback: set emissive to black if copy fails
            if (import.meta.env.DEV) {
              console.warn('Failed to restore building emissive color:', error)
            }
            originalMaterial.emissive.set(0, 0, 0)
            originalMaterial.emissiveIntensity = 0
            originalMaterial.needsUpdate = true
          }
        }
      })
      highlightedBuildings.current.clear()
      highlightIntensities.current.clear()
    }
  }, [])

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
      
      // End position: grappled building position (attachment point)
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

