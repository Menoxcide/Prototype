/**
 * Quest Objective Marker - Shows 3D markers for quest objectives in the world
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'
import * as THREE from 'three'
import { getItem } from '../data/items'
import { ZONES } from '../data/zones'
import type { Enemy, LootDrop } from '../types'

interface QuestObjectiveMarkerProps {
  questId: string
  objectiveId: string
  type: string
  target: string
  position?: { x: number; y: number; z: number }
}

export default function QuestObjectiveMarker({
  questId: _questId,
  objectiveId: _objectiveId,
  type,
  target,
  position
}: QuestObjectiveMarkerProps) {
  const markerRef = useRef<THREE.Group>(null)
  const { player, enemies, lootDrops } = useGameStore()

  // Determine marker position based on objective type
  const markerPosition = useRef<THREE.Vector3>(new THREE.Vector3())

  useFrame((state) => {
    if (!markerRef.current || !player) return

    // Update marker position based on objective type
    if (type === 'reach') {
      // For 'reach' objectives, use the target as a zone/position identifier
      const zone = ZONES.find(z => z.id === target)
      // Zone doesn't have center property, use position if provided
      if (position) {
        markerPosition.current.set(position.x, position.y + 5, position.z)
      } else if (zone) {
        // Default to zone center at origin if no position provided
        markerPosition.current.set(0, 5, 0)
      }
    } else if (type === 'kill') {
      // For 'kill' objectives, find the nearest enemy of the target type
      const targetEnemies = Array.from(enemies.values()).filter((e: Enemy) => e.type === target || target === 'any')
      if (targetEnemies.length > 0) {
        // Find nearest enemy
        let nearest = targetEnemies[0]
        let nearestDist = Infinity
        targetEnemies.forEach((enemy: Enemy) => {
          const dist = Math.sqrt(
            Math.pow(player.position.x - enemy.position.x, 2) +
            Math.pow(player.position.y - enemy.position.y, 2) +
            Math.pow(player.position.z - enemy.position.z, 2)
          )
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = enemy
          }
        })
        markerPosition.current.set(nearest.position.x, nearest.position.y + 3, nearest.position.z)
      }
    } else if (type === 'collect') {
      // For 'collect' objectives, find the nearest loot of the target type
      const targetLoot = Array.from(lootDrops.values()).filter((l: LootDrop) => {
        const item = getItem(l.item.id)
        return item && item.id === target
      })
      if (targetLoot.length > 0) {
        // Find nearest loot
        let nearest = targetLoot[0]
        let nearestDist = Infinity
        targetLoot.forEach((loot: LootDrop) => {
          const dist = Math.sqrt(
            Math.pow(player.position.x - loot.position.x, 2) +
            Math.pow(player.position.y - loot.position.y, 2) +
            Math.pow(player.position.z - loot.position.z, 2)
          )
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = loot
          }
        })
        markerPosition.current.set(nearest.position.x, nearest.position.y + 2, nearest.position.z)
      }
    }

    // Animate marker
    markerRef.current.position.copy(markerPosition.current)
    markerRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.3
    markerRef.current.rotation.y = state.clock.elapsedTime
  })

  // Don't render if no valid position
  if (!markerPosition.current || markerPosition.current.length() === 0) return null

  const color = type === 'reach' ? '#00ff00' : type === 'kill' ? '#ff0000' : '#ffff00'

  return (
    <group ref={markerRef}>
      {/* Glowing orb */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Pulsing ring */}
      <mesh>
        <ringGeometry args={[0.6, 1.0, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Arrow pointing down */}
      <mesh position={[0, -1, 0]}>
        <coneGeometry args={[0.2, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Point light */}
      <pointLight
        position={[0, 0, 0]}
        intensity={1}
        color={color}
        distance={10}
      />
    </group>
  )
}

