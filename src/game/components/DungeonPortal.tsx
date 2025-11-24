import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DungeonPortal as DungeonPortalType } from '../systems/dungeonSystem'
import { useGameStore } from '../store/useGameStore'

interface DungeonPortalProps {
  portal: DungeonPortalType
}

export default function DungeonPortal({ portal }: DungeonPortalProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rotationRef = useRef(0)
  const { player } = useGameStore()

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(
        portal.position.x,
        portal.position.y,
        portal.position.z
      )
      rotationRef.current += delta * 0.5
      meshRef.current.rotation.y = rotationRef.current
    }
  })

  const canEnter = player && player.level >= portal.requiredLevel
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - portal.position.x, 2) +
    Math.pow(player.position.z - portal.position.z, 2)
  ) : Infinity

  const isClose = distance < 3

  return (
    <group>
      {/* Portal mesh */}
      <mesh ref={meshRef}>
        <torusGeometry args={[1, 0.3, 8, 16]} />
        <meshStandardMaterial
          color={canEnter ? '#9d00ff' : '#666666'}
          emissive={canEnter ? '#9d00ff' : '#333333'}
          emissiveIntensity={canEnter ? 1 : 0.3}
          transparent
          opacity={canEnter ? 0.9 : 0.5}
        />
      </mesh>

      {/* Portal center */}
      <mesh position={[portal.position.x, portal.position.y, portal.position.z]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial
          color="#9d00ff"
          emissive="#9d00ff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow effect */}
      {canEnter && (
        <pointLight
          position={[portal.position.x, portal.position.y, portal.position.z]}
          intensity={0.8}
          color="#9d00ff"
          distance={5}
        />
      )}

      {/* Name tag */}
      <mesh position={[portal.position.x, portal.position.y + 2, portal.position.z]}>
        <planeGeometry args={[3, 0.6]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Enter prompt */}
      {canEnter && isClose && (
        <mesh position={[portal.position.x, portal.position.y + 2.5, portal.position.z + 0.01]}>
          <planeGeometry args={[2.5, 0.4]} />
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

