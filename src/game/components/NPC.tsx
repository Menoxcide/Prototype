import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NPC as NPCType } from '../types'
import { useGameStore } from '../store/useGameStore'
import { Html } from '@react-three/drei'

interface NPCProps {
  npc: NPCType
}

export default function NPC({ npc }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { player } = useGameStore()

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        npc.position.x,
        npc.position.y + 0.5, // Slightly above ground
        npc.position.z
      )
    }
  })

  // Check distance to player
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - npc.position.x, 2) +
    Math.pow(player.position.y - npc.position.y, 2) +
    Math.pow(player.position.z - npc.position.z, 2)
  ) : Infinity

  const isClose = distance < 3
  const canInteract = isClose && player !== null

  // Determine NPC color based on type
  const typeColors: Record<NPCType['type'], string> = {
    quest_giver: '#00ff00',
    merchant: '#ffaa00',
    crafting: '#00aaff',
    guard: '#ff0000',
    story: '#ff00ff',
    pet_shop: '#ff69b4',
    fishing: '#00ffff',
    mining: '#888888'
  }

  const npcColor = typeColors[npc.type] || '#ffffff'

  // Determine NPC size based on type
  const typeSizes: Record<NPCType['type'], number> = {
    quest_giver: 1.0,
    merchant: 1.0,
    crafting: 1.0,
    guard: 1.2,
    story: 1.1,
    pet_shop: 1.0,
    fishing: 1.0,
    mining: 1.0
  }

  const npcSize = typeSizes[npc.type] || 1.0

  return (
    <group ref={groupRef}>
      {/* NPC mesh */}
      <mesh ref={meshRef}>
        <capsuleGeometry args={[0.4 * npcSize, 1.2 * npcSize, 4, 8]} />
        <meshStandardMaterial
          color={npcColor}
          emissive={npcColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* NPC icon/emblem */}
      <mesh position={[0, 1.5 * npcSize, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Nameplate */}
      <Html
        position={[0, 2.2 * npcSize, 0]}
        center
        distanceFactor={10}
        style={{
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            border: `2px solid ${npcColor}`,
            textAlign: 'center'
          }}
        >
          {npc.name}
        </div>
      </Html>

      {/* Interaction indicator */}
      {canInteract && (
        <>
          <Html
            position={[0, 1.8 * npcSize, 0]}
            center
            distanceFactor={10}
            style={{
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                background: 'rgba(0, 255, 0, 0.9)',
                color: '#000000',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                animation: 'pulse 1s infinite'
              }}
            >
              Press E to interact
            </div>
          </Html>

          {/* Glowing ring indicator */}
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.7, 32]} />
            <meshStandardMaterial
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={0.8}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Type indicator icon */}
      <mesh position={[0, 1.2 * npcSize, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial
          color={npcColor}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow effect */}
      <pointLight
        position={[0, 1 * npcSize, 0]}
        intensity={canInteract ? 0.6 : 0.3}
        color={npcColor}
        distance={5}
        decay={2}
      />

      {/* Quest indicator (if quest giver) */}
      {npc.type === 'quest_giver' && npc.quests && npc.quests.length > 0 && (
        <mesh position={[0.5, 1.8 * npcSize, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={1.0}
          />
        </mesh>
      )}

      {/* Shop indicator (if merchant) */}
      {npc.type === 'merchant' && npc.shopItems && npc.shopItems.length > 0 && (
        <mesh position={[0.5, 1.8 * npcSize, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial
            color="#ffaa00"
            emissive="#ffaa00"
            emissiveIntensity={1.0}
          />
        </mesh>
      )}
    </group>
  )
}

