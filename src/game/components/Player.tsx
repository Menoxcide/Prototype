/**
 * SIMPLIFIED PLAYER COMPONENT
 * Single source of truth for player position and rendering
 * Based on React Three Fiber best practices
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'
import PlayerNameplate from './PlayerNameplate'

export default function Player() {
  const groupRef = useRef<THREE.Group>(null)
  const player = useGameStore((state) => state.player)
  
  if (!player) return null

  const raceData = RACES[player.race]
  
  // Create material once
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: raceData.color,
      emissive: raceData.glowColor,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2
    })
  }, [player.race])

  // Update position EVERY frame - this is the key
  useFrame(() => {
    if (!groupRef.current) {
      if (import.meta.env.DEV && Math.random() < 0.01) {
        console.error('❌ Player groupRef is null in useFrame!')
      }
      return
    }
    
    // Get fresh player state
    const currentPlayer = useGameStore.getState().player
    if (!currentPlayer) return
    
    const oldX = groupRef.current.position.x
    const oldZ = groupRef.current.position.z
    
    // CRITICAL: Update group position directly
    groupRef.current.position.set(
      currentPlayer.position.x,
      currentPlayer.position.y,
      currentPlayer.position.z
    )
    groupRef.current.rotation.y = currentPlayer.rotation
    
    // Force update
    groupRef.current.updateMatrixWorld(true)
    
    // Debug: Log movement
    if (import.meta.env.DEV) {
      const moved = Math.abs(oldX - currentPlayer.position.x) > 0.01 || 
                    Math.abs(oldZ - currentPlayer.position.z) > 0.01
      if (moved) {
        console.log('🎮 Player group moved:', {
          from: { x: oldX.toFixed(2), z: oldZ.toFixed(2) },
          to: { x: currentPlayer.position.x.toFixed(2), z: currentPlayer.position.z.toFixed(2) },
          visible: groupRef.current.visible,
          worldPos: groupRef.current.getWorldPosition(new THREE.Vector3())
        })
      }
    }
  })

  // Get camera mode to hide player in first person
  const cameraMode = useGameStore((state) => state.cameraMode)
  const isFirstPerson = cameraMode === 'first-person'

  // Set initial position on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      )
      groupRef.current.rotation.y = player.rotation
      groupRef.current.updateMatrixWorld(true)
      
      if (import.meta.env.DEV) {
        console.log('✅ Player group initialized:', {
          position: { x: player.position.x, y: player.position.y, z: player.position.z },
          rotation: player.rotation,
          visible: groupRef.current.visible,
          inScene: groupRef.current.parent !== null
        })
      }
    }
  }, [player.id]) // Only on player ID change

  return (
    <group 
      ref={groupRef}
      userData={{ isPlayerGroup: true, playerId: player.id }}
    >
      {/* Main player body - Enhanced with better visuals */}
      <mesh visible={!isFirstPerson} castShadow receiveShadow>
        <capsuleGeometry args={[0.8, 2.0, 8, 16]} />
        <primitive object={material} />
      </mesh>

      {/* Player armor/equipment visual layers */}
      <mesh visible={!isFirstPerson} position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.0, 1.0, 0.5]} />
        <meshStandardMaterial
          color={raceData.glowColor}
          emissive={raceData.glowColor}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Debug box - only in dev mode */}
      {import.meta.env.DEV && (
        <mesh position={[0, 1, 0]} visible={true}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color="#ff0000" 
            emissive="#ff0000" 
            emissiveIntensity={20}
            transparent={false}
          />
        </mesh>
      )}

      {/* Glow effect */}
      <mesh scale={[1.2, 1.2, 1.2]}>
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

      {/* Point light */}
      <pointLight
        position={[0, 1, 0]}
        intensity={0.8}
        color={raceData.glowColor}
        distance={8}
        decay={2}
      />

      {/* Nameplate - as child of group, will move with player */}
      <PlayerNameplate 
        playerId={player.id} 
        position={[0, 3, 0]} 
      />
    </group>
  )
}

