import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from '../types'
import { RACES } from '../data/races'

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

      {/* Name tag */}
      <mesh position={[player.position.x, player.position.y + 2, player.position.z]}>
        <planeGeometry args={[3, 0.6]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Name text would go here - for now just a placeholder */}
      <mesh position={[player.position.x, player.position.y + 2.2, player.position.z + 0.01]}>
        <planeGeometry args={[2.5, 0.3]} />
        <meshBasicMaterial
          color={raceData.color}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Guild tag */}
      {player.guildTag && (
        <mesh position={[player.position.x, player.position.y + 1.7, player.position.z + 0.01]}>
          <planeGeometry args={[1.5, 0.25]} />
          <meshBasicMaterial
            color="#9d00ff"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

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

