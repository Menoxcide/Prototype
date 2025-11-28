/**
 * Enhanced Sprite Character - Adds subtle 3D depth to billboard sprites
 * Maintains performance while improving visual appearance
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { spriteCharacterLoader, getDirectionFromRotation } from '../assets/spriteCharacterLoader'
import { spriteAnimationSystem, SpriteAnimationType } from '../assets/spriteAnimationSystem'

interface EnhancedSpriteCharacterProps {
  characterId: string
  position: [number, number, number]
  rotation: number
  scale?: number
  animation?: SpriteAnimationType
  instanceId?: string
  enableDepth?: boolean // Add subtle depth shadow
  depthOffset?: number // Depth shadow offset (default: 0.05)
}

export default function EnhancedSpriteCharacter({
  characterId,
  position,
  rotation,
  scale = 1,
  animation = 'idle',
  instanceId,
  enableDepth = true,
  depthOffset = 0.05
}: EnhancedSpriteCharacterProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const shadowMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const { camera } = useThree()
  const [spriteTexture, setSpriteTexture] = useState<THREE.Texture | null>(null)
  const [characterLoaded, setCharacterLoaded] = useState(false)
  const uniqueInstanceId = useMemo(() => instanceId || `sprite-${characterId}-${Math.random()}`, [instanceId, characterId])

  const direction = useMemo(() => getDirectionFromRotation(rotation), [rotation])
  
  const currentAnimation: SpriteAnimationType = useMemo(() => {
    if (animation) return animation
    return 'idle'
  }, [animation])

  // Load character sprites
  useEffect(() => {
    const loadCharacter = async () => {
      try {
        const character = await spriteCharacterLoader.loadCharacter(characterId)
        if (character) {
          const animatedTexture = spriteAnimationSystem.getAnimation(characterId, currentAnimation, direction)
          if (animatedTexture && animatedTexture.frames.length > 0) {
            setSpriteTexture(animatedTexture.frames[0].texture)
            spriteAnimationSystem.playAnimation(uniqueInstanceId, characterId, currentAnimation, direction)
          } else {
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

  // Update animation
  useEffect(() => {
    if (characterLoaded) {
      const animatedTexture = spriteAnimationSystem.getAnimation(characterId, currentAnimation, direction)
      if (animatedTexture && animatedTexture.frames.length > 0) {
        spriteAnimationSystem.playAnimation(uniqueInstanceId, characterId, currentAnimation, direction)
      }
    }
  }, [currentAnimation, direction, characterId, characterLoaded, uniqueInstanceId])

  // Update frame
  useFrame((_state, delta) => {
    if (!meshRef.current || !materialRef.current) return
    
    meshRef.current.position.set(position[0], position[1], position[2])
    
    // Update shadow position
    if (shadowRef.current && enableDepth) {
      shadowRef.current.position.set(
        position[0],
        position[1] - depthOffset,
        position[2]
      )
    }
    
    // Update animation frame
    const animatedTexture = spriteAnimationSystem.updateAnimation(uniqueInstanceId, delta)
    if (animatedTexture && materialRef.current) {
      materialRef.current.map = animatedTexture
      materialRef.current.needsUpdate = true
    } else if (!animatedTexture && characterLoaded) {
      const staticTexture = spriteCharacterLoader.getSprite(characterId, direction)
      if (staticTexture && materialRef.current.map !== staticTexture) {
        materialRef.current.map = staticTexture
        materialRef.current.needsUpdate = true
      }
    }
    
    // Face camera
    const cameraPosition = camera.position
    const spritePosition = meshRef.current.position
    
    const directionToCamera = new THREE.Vector3()
    directionToCamera.subVectors(cameraPosition, spritePosition)
    directionToCamera.y = 0
    
    if (directionToCamera.length() > 0.01) {
      directionToCamera.normalize()
      const angle = Math.atan2(directionToCamera.x, directionToCamera.z)
      meshRef.current.rotation.y = angle
      
      // Rotate shadow to match
      if (shadowRef.current) {
        shadowRef.current.rotation.y = angle
      }
    }
  })

  if (!spriteTexture) {
    return null
  }

  const spriteWidth = 1 * scale
  const spriteHeight = 1 * scale

  return (
    <group>
      {/* Depth shadow (behind main sprite) */}
      {enableDepth && (
        <mesh
          ref={shadowRef}
          renderOrder={99}
        >
          <planeGeometry args={[spriteWidth * 1.05, spriteHeight * 1.05]} />
          <meshBasicMaterial
            ref={shadowMaterialRef}
            color={0x000000}
            transparent
            opacity={0.2}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Main sprite */}
      <mesh
        ref={meshRef}
        position={position}
        renderOrder={100}
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
    </group>
  )
}

