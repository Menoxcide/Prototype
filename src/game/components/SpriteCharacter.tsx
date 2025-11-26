/**
 * Sprite Character Component - Renders 2.5D isometric Pixellab characters as billboards
 * Always faces the camera for proper isometric sprite display
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { spriteCharacterLoader, getDirectionFromRotation } from '../assets/spriteCharacterLoader'
import { spriteAnimationSystem, SpriteAnimationType } from '../assets/spriteAnimationSystem'
import { useGameStore } from '../store/useGameStore'

interface SpriteCharacterProps {
  characterId: string
  position: [number, number, number]
  rotation: number
  scale?: number
  animation?: SpriteAnimationType
  instanceId?: string
}

export default function SpriteCharacter({
  characterId,
  position,
  rotation,
  scale = 1,
  animation = 'idle',
  instanceId
}: SpriteCharacterProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const { camera } = useThree()
  const [spriteTexture, setSpriteTexture] = useState<THREE.Texture | null>(null)
  const [characterLoaded, setCharacterLoaded] = useState(false)
  const uniqueInstanceId = useMemo(() => instanceId || `sprite-${characterId}-${Math.random()}`, [instanceId, characterId])
  const { isPlayerMoving: _isPlayerMoving } = useGameStore()

  // Get current direction from rotation
  const direction = useMemo(() => getDirectionFromRotation(rotation), [rotation])
  
  // Determine animation based on movement
  const currentAnimation: SpriteAnimationType = useMemo(() => {
    if (animation) return animation
    // Check if player is moving from store
    const storeState = useGameStore.getState()
    return storeState.isPlayerMoving ? 'walk' : 'idle'
  }, [animation])

  // Load character sprites and animations
  useEffect(() => {
    const loadCharacter = async () => {
      try {
        const character = await spriteCharacterLoader.loadCharacter(characterId)
        if (character) {
          // Try to get animated texture first, fallback to static rotation
          const animatedTexture = spriteAnimationSystem.getAnimation(characterId, currentAnimation, direction)
          if (animatedTexture && animatedTexture.frames.length > 0) {
            setSpriteTexture(animatedTexture.frames[0].texture)
            spriteAnimationSystem.playAnimation(uniqueInstanceId, characterId, currentAnimation, direction)
          } else {
            // Fallback to static rotation sprite
            const texture = character.directions.get(direction) || character.directions.get('south')
            if (texture) {
              setSpriteTexture(texture)
            }
          }
          setCharacterLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load sprite character:', error)
      }
    }
    
    loadCharacter()
    
    return () => {
      spriteAnimationSystem.stopAnimation(uniqueInstanceId)
    }
  }, [characterId, direction, currentAnimation, uniqueInstanceId])

  // Update animation when it changes
  useEffect(() => {
    if (characterLoaded) {
      const animatedTexture = spriteAnimationSystem.getAnimation(characterId, currentAnimation, direction)
      if (animatedTexture && animatedTexture.frames.length > 0) {
        spriteAnimationSystem.playAnimation(uniqueInstanceId, characterId, currentAnimation, direction)
      }
    }
  }, [currentAnimation, direction, characterId, characterLoaded, uniqueInstanceId])

  // Update position, animation frames, and make sprite face camera
  useFrame((_state, delta) => {
    if (meshRef.current && materialRef.current) {
      // Update position from props
      meshRef.current.position.set(position[0], position[1], position[2])
      
      // Update animation frame
      const animatedTexture = spriteAnimationSystem.updateAnimation(uniqueInstanceId, delta)
      if (animatedTexture && materialRef.current) {
        materialRef.current.map = animatedTexture
        materialRef.current.needsUpdate = true
      } else if (!animatedTexture && characterLoaded) {
        // Fallback to static sprite if animation not available
        const staticTexture = spriteCharacterLoader.getSprite(characterId, direction)
        if (staticTexture && materialRef.current.map !== staticTexture) {
          materialRef.current.map = staticTexture
          materialRef.current.needsUpdate = true
        }
      }
      
      // For isometric sprites, rotate to face camera direction
      // This creates a billboard effect while maintaining isometric perspective
      const cameraPosition = camera.position
      const spritePosition = meshRef.current.position
      
      // Calculate direction to camera (projected onto XZ plane for isometric)
      const directionToCamera = new THREE.Vector3()
      directionToCamera.subVectors(cameraPosition, spritePosition)
      directionToCamera.y = 0 // Keep sprite upright (no tilting)
      
      if (directionToCamera.length() > 0.01) {
        directionToCamera.normalize()
        // Calculate rotation angle
        const angle = Math.atan2(directionToCamera.x, directionToCamera.z)
        meshRef.current.rotation.y = angle
      }
    }
  })

  if (!spriteTexture) {
    return null
  }

  // Calculate sprite size (maintain aspect ratio)
  const spriteWidth = 1 * scale
  const spriteHeight = 1 * scale

  return (
    <mesh
      ref={meshRef}
      position={position}
      renderOrder={100} // Render sprites after 3D objects and UI elements (high value ensures it renders on top)
    >
      <planeGeometry args={[spriteWidth, spriteHeight]} />
      <meshBasicMaterial
        ref={materialRef}
        map={spriteTexture}
        transparent
        alphaTest={0.1}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

