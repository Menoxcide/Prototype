import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'

export default function PlayerMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { player } = useGameStore()

  if (!player) return null

  const raceData = RACES[player.race]

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

  return (
    <group>
      {/* Player character - simple capsule shape */}
      <mesh ref={meshRef} position={[player.position.x, player.position.y, player.position.z]}>
        <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
        <meshStandardMaterial
          color={raceData.color}
          emissive={raceData.color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Name tag */}
      <mesh position={[player.position.x, player.position.y + 2, player.position.z]}>
        <planeGeometry args={[2, 0.5]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow effect */}
      <pointLight
        position={[player.position.x, player.position.y + 1, player.position.z]}
        intensity={0.5}
        color={raceData.color}
        distance={5}
      />
    </group>
  )
}

