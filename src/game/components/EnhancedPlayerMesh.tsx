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
  const { player } = useGameStore()

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
      meshRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      )
      meshRef.current.rotation.y = player.rotation

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

  return (
    <group ref={meshRef}>
      {/* Enhanced player body with better geometry */}
      <mesh ref={bodyRef}>
        <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
        <primitive object={material} />
      </mesh>

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

