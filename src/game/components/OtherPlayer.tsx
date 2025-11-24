import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from '../types'
import { RACES } from '../data/races'
import PlayerNameplate from './PlayerNameplate'

interface OtherPlayerProps {
  player: Player
}

export default function OtherPlayer({ player }: OtherPlayerProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      )
      meshRef.current.rotation.y = player.rotation
    }
  })

  const raceData = RACES[player.race]

  return (
    <group>
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

      {/* Player Nameplate with HP Bar */}
      <PlayerNameplate 
        playerId={player.id} 
        position={[player.position.x, player.position.y, player.position.z]} 
      />

      {/* Glow effect */}
      <pointLight
        position={[player.position.x, player.position.y + 1, player.position.z]}
        intensity={0.3}
        color={raceData.color}
        distance={4}
      />
    </group>
  )
}

