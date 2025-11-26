/**
 * InstancedEnemies - Uses instanced rendering for all enemies
 * Reduces draw calls from N to 1 for all enemies
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { Enemy } from '../types'
import { trackGeometry, getGeometryDisposalTracker } from '../utils/geometryDisposalTracker'
import { getPooledGeometry, releasePooledGeometry } from '../utils/geometryPool'

interface InstancedEnemiesProps {
  enemies: Map<string, Enemy>
}

export default function InstancedEnemies({ enemies }: InstancedEnemiesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometryTrackedRef = useRef<boolean>(false)
  // Use selective subscription to reduce re-renders
  const player = useGameStore((state) => state.player)

  // Create geometry and material once (using geometry pool)
  const geometry = useMemo(() => {
    const geom = getPooledGeometry('enemy-box', () => new THREE.BoxGeometry(1, 1, 1))
    // Track geometry for disposal monitoring (only once)
    if (!geometryTrackedRef.current) {
      trackGeometry(geom, `instanced-enemies-geometry`, 'InstancedEnemies')
      geometryTrackedRef.current = true
    }
    return geom
  }, [])
  // Batch entities by material type for better GPU efficiency
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ff0000',
    emissive: '#ff0000',
    emissiveIntensity: 0.3
  }), [])
  
  // Note: For material batching with multiple materials, we would need to
  // group enemies by material type and create separate instanced meshes
  // This is a simplified version with a single material
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark geometry as disposed in tracker before releasing
      const tracker = getGeometryDisposalTracker()
      tracker.markDisposed('instanced-enemies-geometry')
      // Release geometry back to pool instead of disposing
      releasePooledGeometry('enemy-box')
      material.dispose()
      geometryTrackedRef.current = false
    }
  }, [geometry, material])

  // Update instances every frame
  useFrame(() => {
    if (!meshRef.current || !player) return

    const enemyArray = Array.from(enemies.values())
    const instanceCount = enemyArray.length

    // Resize instance matrix if needed
    if (meshRef.current.count !== instanceCount) {
      meshRef.current.count = instanceCount
    }

    // Update each instance
    enemyArray.forEach((enemy, index) => {
      const matrix = new THREE.Matrix4()
      
      // Calculate health-based color
      const healthPercent = enemy.health / enemy.maxHealth
      const color = healthPercent > 0.5 ? '#ff0000' : healthPercent > 0.25 ? '#ff6600' : '#ff0000'
      
      // Set position and rotation
      matrix.compose(
        new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, enemy.rotation, 0)),
        new THREE.Vector3(1, 1, 1)
      )
      
      meshRef.current!.setMatrixAt(index, matrix)
      
      // Set color per instance (if supported)
      if (meshRef.current!.instanceColor) {
        meshRef.current!.setColorAt(index, new THREE.Color(color))
      }
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (enemies.size === 0) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, enemies.size]}
      frustumCulled={true}
    />
  )
}

