import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'
import { assetManager } from '../assets/assetManager'
import { createAnimationController, AnimationController } from '../systems/animationSystem'

export default function EnhancedPlayerMesh() {
  const meshRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const animationControllerRef = useRef<AnimationController | null>(null)
  
  // Get player from store - use selector to ensure reactivity
  const player = useGameStore((state) => state.player)

  if (!player) return null

  const raceData = RACES[player.race]
  let material
  try {
    material = assetManager.createEnhancedMaterial(
      `player-${player.race}`,
      raceData.color,
      raceData.glowColor,
      { emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.2 }
    )
  } catch (error) {
    console.error('Failed to create enhanced material, using fallback:', error)
    material = new THREE.MeshStandardMaterial({
      color: raceData.color,
      emissive: raceData.glowColor,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.2
    })
  }

  // Initialize animation controller
  useEffect(() => {
    if (meshRef.current && !animationControllerRef.current) {
      animationControllerRef.current = createAnimationController(meshRef.current)
      animationControllerRef.current.play('idle')
    }
  }, [])

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Get fresh player state from store every frame to ensure we have latest position
      const currentPlayer = useGameStore.getState().player
      if (!currentPlayer) {
        if (import.meta.env.DEV && Math.random() < 0.01) {
          console.warn('⚠️ EnhancedPlayerMesh: No player in store!')
        }
        return
      }
      
      // Update mesh position from player state - ALWAYS update to ensure reactivity
      const newX = currentPlayer.position.x
      const newY = currentPlayer.position.y
      const newZ = currentPlayer.position.z
      
      // Get current mesh position
      const oldX = meshRef.current.position.x
      const oldY = meshRef.current.position.y
      const oldZ = meshRef.current.position.z
      
      // FORCE update position - use set() which is more reliable than direct assignment
      meshRef.current.position.set(newX, newY, newZ)
      meshRef.current.rotation.y = currentPlayer.rotation
      
      // Force matrix update to ensure position change is applied
      meshRef.current.updateMatrixWorld(true)
      
      // Debug: Log mesh position updates (more frequent)
      if (import.meta.env.DEV) {
        const moved = Math.abs(oldX - newX) > 0.001 || Math.abs(oldZ - newZ) > 0.001
        if (moved) {
          console.log('🎯 Mesh position updated:', { 
            from: { x: oldX.toFixed(3), y: oldY.toFixed(3), z: oldZ.toFixed(3) },
            to: { x: newX.toFixed(3), y: newY.toFixed(3), z: newZ.toFixed(3) },
            delta: { x: (newX - oldX).toFixed(4), y: (newY - oldY).toFixed(4), z: (newZ - oldZ).toFixed(4) },
            meshVisible: meshRef.current.visible,
            actualMeshPos: {
              x: meshRef.current.position.x.toFixed(3),
              y: meshRef.current.position.y.toFixed(3),
              z: meshRef.current.position.z.toFixed(3)
            }
          })
        }
      }

      // Update animations
      if (animationControllerRef.current) {
        // Determine animation state based on player movement
        const isMoving = Math.abs(player.position.x) > 0.01 || Math.abs(player.position.z) > 0.01
        const currentState = animationControllerRef.current.getCurrentState()
        
        if (isMoving && currentState === 'idle') {
          animationControllerRef.current.play('walk')
        } else if (!isMoving && currentState === 'walk') {
          animationControllerRef.current.play('idle')
        }
        
        animationControllerRef.current.update(delta)
      }

      // Subtle floating animation (fallback if no animation controller)
      if (bodyRef.current && !animationControllerRef.current) {
        bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
      }

      // Pulsing glow
      if (glowRef.current) {
        const glowIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
        if (glowRef.current.material instanceof THREE.MeshStandardMaterial) {
          glowRef.current.material.emissiveIntensity = glowIntensity
        }
      }
    }
  })

  // Get camera mode to hide player in first person
  const cameraMode = useGameStore((state) => state.cameraMode)

  // Debug: Log when player mesh renders (only once)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('EnhancedPlayerMesh rendered:', {
        playerId: player.id,
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        race: player.race,
        cameraMode
      })
    }
  }, [player.id]) // Only log when player ID changes

  return (
    <group ref={meshRef} visible={true}>
      {/* Enhanced player body with better geometry - larger and more visible */}
      {/* Always visible for debugging - will hide in first person later */}
      <mesh ref={bodyRef} visible={true}>
        <capsuleGeometry args={[1.0, 3.0, 8, 16]} />
        <primitive object={material} />
      </mesh>
      
      {/* Debug: Always visible test sphere to verify player position */}
      {import.meta.env.DEV && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshStandardMaterial 
            color="#ff0000" 
            emissive="#ff0000" 
            emissiveIntensity={3}
            transparent={false}
          />
        </mesh>
      )}

      {/* Glow effect mesh */}
      <mesh ref={glowRef} scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color={raceData.glowColor}
          emissive={raceData.glowColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Enhanced name tag with better styling */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[2.5, 0.6]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Race-specific visual effects */}
      {player.race === 'voidborn' && (
        <mesh position={[0, 0.5, 0]}>
          <ringGeometry args={[0.8, 1.2, 32]} />
          <meshStandardMaterial
            color={raceData.glowColor}
            emissive={raceData.glowColor}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {player.race === 'quantum' && (
        <>
          <mesh position={[0, 0.3, 0]}>
            <torusGeometry args={[0.7, 0.1, 16, 32]} />
            <meshStandardMaterial
              color={raceData.glowColor}
              emissive={raceData.glowColor}
              emissiveIntensity={0.7}
            />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <torusGeometry args={[0.7, 0.1, 16, 32]} />
            <meshStandardMaterial
              color={raceData.glowColor}
              emissive={raceData.glowColor}
              emissiveIntensity={0.7}
            />
          </mesh>
        </>
      )}

      {/* Enhanced point light */}
      <pointLight
        position={[0, 1, 0]}
        intensity={0.8}
        color={raceData.glowColor}
        distance={8}
        decay={2}
      />

      {/* Additional ambient glow */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={0.3}
        color={raceData.glowColor}
        distance={5}
      />
    </group>
  )
}

