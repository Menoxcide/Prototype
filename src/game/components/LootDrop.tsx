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

  // Determine color based on rarity
  const rarityColors: Record<string, string> = {
    common: '#c8c8c8',
    uncommon: '#00ff00',
    rare: '#0099ff',
    epic: '#9d00ff',
    legendary: '#ffa500'
  }

  const itemColor = rarityColors[item.rarity] || '#ffff00'
  const glowColor = canPickup && isClose ? '#00ff00' : itemColor

  return (
    <group ref={meshRef}>
      {/* Enhanced loot item mesh */}
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.9}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* Glowing outline for rare items */}
      {item.rarity !== 'common' && (
        <mesh scale={[1.2, 1.2, 1.2]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial
            color={itemColor}
            emissive={itemColor}
            emissiveIntensity={0.3}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Enhanced item name tag */}
      <mesh position={[0, 1.2, 0]}>
        <planeGeometry args={[2, 0.4]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rarity indicator ring */}
      <mesh position={[0, 0.3, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshStandardMaterial
          color={itemColor}
          emissive={itemColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Enhanced glow effect */}
      <pointLight
        position={[0, 0.3, 0]}
        intensity={canPickup && isClose ? 1.0 : 0.6}
        color={glowColor}
        distance={4}
        decay={2}
      />

      {/* Pickup indicator */}
      {canPickup && isClose && (
        <>
          <mesh position={[0, 1.6, 0]}>
            <planeGeometry args={[2, 0.5]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Pulsing pickup ring */}
          <mesh position={[0, 0.3, 0]}>
            <ringGeometry args={[0.6, 0.7, 32]} />
            <meshStandardMaterial
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={0.8}
              transparent
              opacity={0.5}
            />
          </mesh>
        </>
      )}

      {/* Particle effect for rare items */}
      {item.rarity !== 'common' && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial
            color={itemColor}
            emissive={itemColor}
            emissiveIntensity={0.2}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

