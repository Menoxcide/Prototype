/**
 * Character 3D Component - Renders 3D character models with billboard-style sprites
 * Combines 3D depth with sprite-based rendering for best appearance
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { spriteCharacterLoader, getDirectionFromRotation } from '../assets/spriteCharacterLoader'
import { spriteAnimationSystem, SpriteAnimationType } from '../assets/spriteAnimationSystem'

interface Character3DProps {
  characterId: string
  position: [number, number, number]
  rotation: number
  scale?: number
  animation?: SpriteAnimationType
  instanceId?: string
  modelPath?: string // Path to 3D GLB model
  method?: 'billboard' | 'billboard-depth' | 'capsule'
}

export default function Character3D({
  characterId,
  position,
  rotation,
  scale = 1,
  animation = 'idle',
  instanceId,
  modelPath,
  method: _method = 'billboard-depth'
}: Character3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const billboardRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const { camera } = useThree()
  const [spriteTexture, setSpriteTexture] = useState<THREE.Texture | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [model, setModel] = useState<THREE.Group | null>(null)
  const uniqueInstanceId = useMemo(() => instanceId || `char3d-${characterId}-${Math.random()}`, [instanceId, characterId])

  // Get current direction from rotation
  const direction = useMemo(() => getDirectionFromRotation(rotation), [rotation])
  
  // Determine animation
  const currentAnimation: SpriteAnimationType = useMemo(() => {
    if (animation) return animation
    return 'idle'
  }, [animation])

  // Load 3D model if path provided
  useEffect(() => {
    if (!modelPath) return
    
    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf) => {
        const loadedModel = gltf.scene
        loadedModel.scale.setScalar(scale)
        setModel(loadedModel)
        setModelLoaded(true)
      },
      undefined,
      (error) => {
        console.error('Failed to load 3D character model:', error)
      }
    )
  }, [modelPath, scale])

  // Load character sprite
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
    if (spriteTexture) {
      const animatedTexture = spriteAnimationSystem.getAnimation(characterId, currentAnimation, direction)
      if (animatedTexture && animatedTexture.frames.length > 0) {
        spriteAnimationSystem.playAnimation(uniqueInstanceId, characterId, currentAnimation, direction)
      }
    }
  }, [currentAnimation, direction, characterId, spriteTexture, uniqueInstanceId])

  // Update frame
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2])
    }
    
    // Update animation frame
    if (materialRef.current) {
      const animatedTexture = spriteAnimationSystem.updateAnimation(uniqueInstanceId, delta)
      if (animatedTexture) {
        materialRef.current.map = animatedTexture
        materialRef.current.needsUpdate = true
      }
    }
    
    // Make billboard face camera
    if (billboardRef.current) {
      const cameraPosition = camera.position
      const spritePosition = billboardRef.current.position
      
      const directionToCamera = new THREE.Vector3()
      directionToCamera.subVectors(cameraPosition, spritePosition)
      directionToCamera.y = 0
      
      if (directionToCamera.length() > 0.01) {
        directionToCamera.normalize()
        const angle = Math.atan2(directionToCamera.x, directionToCamera.z)
        billboardRef.current.rotation.y = angle
      }
    }
  })

  if (!spriteTexture) {
    return null
  }

  const spriteWidth = 1 * scale
  const spriteHeight = 1 * scale

  return (
    <group ref={groupRef} userData={{ isCharacter3D: true, characterId }}>
      {/* 3D Model (if loaded) */}
      {modelLoaded && model && (
        <primitive 
          object={model.clone()} 
          castShadow 
          receiveShadow
        />
      )}
      
      {/* Billboard Sprite (always visible, main rendering) */}
      <mesh
        ref={billboardRef}
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

