import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { DungeonPortal as DungeonPortalType } from '../systems/dungeonSystem'
import { useGameStore } from '../store/useGameStore'
import { useTranslation } from '../hooks/useTranslation'
import { enterDungeon } from '../network/colyseus'

interface DungeonPortalProps {
  portal: DungeonPortalType
}

export default function DungeonPortal({ portal }: DungeonPortalProps) {
  const { t } = useTranslation()
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
  
  // Calculate distance to portal for proximity-based UI prompts
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - portal.position.x, 2) +
    Math.pow(player.position.z - portal.position.z, 2)
  ) : Infinity
  const isClose = distance < 3 // Within 3 units to show "Enter" prompt

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

      {/* Proximity-based enter prompt */}
      {isClose && canEnter && (
        <Html position={[portal.position.x, portal.position.y + 2, portal.position.z]} center>
          <div className="bg-black/80 text-cyan-400 px-3 py-1 rounded text-sm font-bold border border-cyan-500">
            {t('dungeon.enter')} ({t('dungeon.requiredLevel', { level: portal.requiredLevel })})
          </div>
        </Html>
      )}
    </group>
  )
}

