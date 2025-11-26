import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from '../types'
import { RACES } from '../data/races'
import PlayerNameplate from './PlayerNameplate'
import { addSnapshot, getInterpolatedState } from '../network/snapshotInterpolation'

interface OtherPlayerProps {
  player: Player
}

export default function OtherPlayer({ player }: OtherPlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  // Add snapshot for interpolation when position changes
  useEffect(() => {
    addSnapshot(player.id, player.position, player.rotation)
  }, [player.position.x, player.position.y, player.position.z, player.rotation, player.id])

  useFrame(() => {
    if (groupRef.current) {
      // Use interpolated state for smooth movement
      const interpolated = getInterpolatedState(player.id)
      const position = interpolated?.position || player.position
      const rotation = interpolated?.rotation ?? player.rotation
      
      // Update group position (so PlayerNameplate child tracks correctly)
      groupRef.current.position.set(
        position.x,
        position.y,
        position.z
      )
      groupRef.current.rotation.y = rotation
      groupRef.current.updateMatrixWorld(true) // Critical for Html components
    }
    
    if (meshRef.current) {
      // Mesh position is relative to group (0,0,0)
      meshRef.current.position.set(0, 0, 0)
      meshRef.current.rotation.y = 0
    }
  })

  const raceData = RACES[player.race]

  return (
    <group ref={groupRef}>
      {/* Other player mesh */}
      <mesh ref={meshRef}>
        <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
        <meshStandardMaterial
          color={raceData.color}
          emissive={raceData.color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Player Nameplate with HP Bar - use relative offset like Player.tsx */}
      <PlayerNameplate 
        key={`other-player-nameplate-${player.id}`}
        playerId={player.id} 
        position={[0, 2.2, 0]} 
      />

      {/* Glow effect */}
      <pointLight
        position={[0, 1, 0]} // Relative to group
        intensity={0.3}
        color={raceData.color}
        distance={4}
      />
    </group>
  )
}

