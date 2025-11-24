import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Enemy as EnemyType } from '../types'
import { useGameStore } from '../store/useGameStore'
import { getLODLevel, getPerformanceSettings } from '../systems/performanceSystem'
import { assetManager } from '../assets/assetManager'

interface EnhancedEnemyProps {
  enemy: EnemyType
}

export default function EnhancedEnemy({ enemy }: EnhancedEnemyProps) {
  const meshRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const { player } = useGameStore()
  const settings = getPerformanceSettings()

  useFrame((state) => {
    if (meshRef.current && bodyRef.current) {
      meshRef.current.position.set(
        enemy.position.x,
        enemy.position.y,
        enemy.position.z
      )
      meshRef.current.rotation.y = enemy.rotation

      // Subtle idle animation
      bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.05
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
  const isLowHealth = healthPercent < 0.3
  const isElite = enemy.level > 10
  const isBoss = enemy.level > 20

  // Determine enemy type and color
  let enemyColor = '#ff0000'
  let materialId = 'enemy-basic'
  
  if (isBoss) {
    enemyColor = '#ff00ff'
    materialId = 'enemy-boss'
  } else if (isElite) {
    enemyColor = '#ff6600'
    materialId = 'enemy-elite'
  } else if (isLowHealth) {
    enemyColor = '#ff3333'
  }

  const material = assetManager.createEnhancedMaterial(
    materialId,
    enemyColor,
    enemyColor,
    { emissiveIntensity: isBoss ? 0.8 : isElite ? 0.5 : 0.4 }
  )

  // Use simpler geometry for low LOD
  const geometry = lodLevel === 'low' 
    ? new THREE.BoxGeometry(0.8, 0.8, 0.8)
    : lodLevel === 'medium'
    ? new THREE.BoxGeometry(1, 1, 1)
    : new THREE.CapsuleGeometry(0.5, 1, 8, 16)

  return (
    <group ref={meshRef}>
      {/* Enhanced enemy mesh */}
      <mesh ref={bodyRef} geometry={geometry}>
        <primitive object={material} />
      </mesh>

      {/* Enhanced health bar - only show for medium/high LOD */}
      {lodLevel !== 'low' && (
        <>
          {/* Health bar background */}
          <mesh position={[0, 1.6, 0]}>
            <planeGeometry args={[1.2, 0.15]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          {/* Health bar fill */}
          <mesh
            position={[
              -(1 - healthPercent) * 0.6,
              1.6,
              0.01
            ]}
          >
            <planeGeometry args={[healthPercent * 1.2, 0.12]} />
            <meshBasicMaterial 
              color={healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'}
            />
          </mesh>
          {/* Health bar border */}
          <mesh position={[0, 1.6, 0.02]}>
            <ringGeometry args={[0.6, 0.61, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* Level indicator - only for high LOD */}
      {lodLevel === 'high' && (
        <mesh position={[0, 1.9, 0]}>
          <planeGeometry args={[0.6, 0.25]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Enhanced glow effect - only for medium/high LOD */}
      {lodLevel !== 'low' && (
        <>
          <pointLight
            position={[0, 0.5, 0]}
            intensity={lodLevel === 'high' ? (isBoss ? 0.8 : isElite ? 0.5 : 0.3) : 0.2}
            color={enemyColor}
            distance={isBoss ? 5 : 3}
            decay={2}
          />
          
          {/* Pulsing glow sphere for bosses */}
          {isBoss && (
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshStandardMaterial
                color={enemyColor}
                emissive={enemyColor}
                emissiveIntensity={0.3}
                transparent
                opacity={0.2}
                side={THREE.BackSide}
              />
            </mesh>
          )}
        </>
      )}

      {/* Threat indicator for elite/boss enemies */}
      {(isElite || isBoss) && lodLevel !== 'low' && (
        <mesh position={[0, 2.2, 0]}>
          <planeGeometry args={[1, 0.3]} />
          <meshBasicMaterial
            color={isBoss ? '#ff00ff' : '#ff6600'}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

