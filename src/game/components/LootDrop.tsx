import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LootDrop as LootDropType } from '../types'
import { getItem } from '../data/items'
import { useGameStore } from '../store/useGameStore'

interface LootDropProps {
  loot: LootDropType
}

export default function LootDrop({ loot }: LootDropProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rotationRef = useRef(0)
  const { player, isConnected } = useGameStore()

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(
        loot.position.x,
        loot.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.2,
        loot.position.z
      )
      rotationRef.current += delta * 2
      meshRef.current.rotation.y = rotationRef.current
    }
  })

  const item = getItem(loot.item.id)
  if (!item) return null

  const canPickup = player && isConnected && (
    !loot.ownerId || loot.ownerId === player.id
  )

  // Check distance to player
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - loot.position.x, 2) +
    Math.pow(player.position.y - loot.position.y, 2) +
    Math.pow(player.position.z - loot.position.z, 2)
  ) : Infinity

  const isClose = distance < 2

  return (
    <group>
      {/* Loot item mesh */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={canPickup && isClose ? '#00ff00' : '#ffff00'}
          emissive={canPickup && isClose ? '#00ff00' : '#ffff00'}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Item icon/name above */}
      <mesh position={[loot.position.x, loot.position.y + 1, loot.position.z]}>
        <planeGeometry args={[1, 0.3]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow effect */}
      <pointLight
        position={[loot.position.x, loot.position.y, loot.position.z]}
        intensity={canPickup && isClose ? 0.8 : 0.4}
        color={canPickup && isClose ? '#00ff00' : '#ffff00'}
        distance={3}
      />

      {/* Pickup indicator */}
      {canPickup && isClose && (
        <mesh position={[loot.position.x, loot.position.y + 1.5, loot.position.z]}>
          <planeGeometry args={[1.5, 0.4]} />
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

