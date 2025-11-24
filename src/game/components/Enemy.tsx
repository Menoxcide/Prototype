import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Enemy as EnemyType } from '../types'
import { useGameStore } from '../store/useGameStore'
import { getLODLevel, getPerformanceSettings } from '../systems/performanceSystem'

interface EnemyProps {
  enemy: EnemyType
}

export default function Enemy({ enemy }: EnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { player } = useGameStore()
  const settings = getPerformanceSettings()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        enemy.position.x,
        enemy.position.y,
        enemy.position.z
      )
      meshRef.current.rotation.y = enemy.rotation
    }
  })

  // LOD: Calculate distance to player
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - enemy.position.x, 2) +
    Math.pow(player.position.y - enemy.position.y, 2) +
    Math.pow(player.position.z - enemy.position.z, 2)
  ) : 0

  const lodLevel = getLODLevel(distance, settings.renderDistance)

  // Cull if too far
  if (distance > settings.renderDistance) {
    return null
  }

  const healthPercent = enemy.health / enemy.maxHealth
  const color = healthPercent > 0.5 ? '#ff0000' : healthPercent > 0.25 ? '#ff6600' : '#ff0000'
  
  // Use simpler geometry for low LOD
  const geometry = lodLevel === 'low' 
    ? new THREE.BoxGeometry(0.8, 0.8, 0.8)
    : new THREE.BoxGeometry(1, 1, 1)

  return (
    <group>
      {/* Enemy mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={lodLevel === 'low' ? 0.2 : 0.3}
        />
      </mesh>

      {/* Health bar - only show for medium/high LOD */}
      {lodLevel !== 'low' && (
        <>
          <mesh position={[enemy.position.x, enemy.position.y + 1.5, enemy.position.z]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh
            position={[
              enemy.position.x - (1 - healthPercent) * 0.5,
              enemy.position.y + 1.5,
              enemy.position.z + 0.01
            ]}
          >
            <planeGeometry args={[healthPercent, 0.08]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </>
      )}

      {/* Level indicator - only for high LOD */}
      {lodLevel === 'high' && (
        <mesh position={[enemy.position.x, enemy.position.y + 1.8, enemy.position.z]}>
          <planeGeometry args={[0.5, 0.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Glow - only for medium/high LOD */}
      {lodLevel !== 'low' && (
        <pointLight
          position={[enemy.position.x, enemy.position.y, enemy.position.z]}
          intensity={lodLevel === 'high' ? 0.3 : 0.2}
          color={color}
          distance={3}
        />
      )}
    </group>
  )
}

