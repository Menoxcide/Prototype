/**
 * InstancedLootDrops - Uses instanced rendering for all loot drops
 * Reduces draw calls significantly
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LootDrop } from '../types'

interface InstancedLootDropsProps {
  lootDrops: Map<string, LootDrop>
}

export default function InstancedLootDrops({ lootDrops }: InstancedLootDropsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Create geometry and material once
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffff00',
    emissive: '#ffff00',
    emissiveIntensity: 0.5
  }), [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  // Update instances every frame
  useFrame(() => {
    if (!meshRef.current) return

    const lootArray = Array.from(lootDrops.values())
    const instanceCount = lootArray.length

    // Resize instance matrix if needed
    if (meshRef.current.count !== instanceCount) {
      meshRef.current.count = instanceCount
    }

    // Update each instance with rotation animation
    const time = Date.now() * 0.001
    lootArray.forEach((loot, index) => {
      const matrix = new THREE.Matrix4()
      
      // Animate rotation
      const rotationY = time + index * 0.1
      const bobY = Math.sin(time * 2 + index) * 0.1
      
      matrix.compose(
        new THREE.Vector3(loot.position.x, loot.position.y + bobY, loot.position.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
        new THREE.Vector3(1, 1, 1)
      )
      
      meshRef.current!.setMatrixAt(index, matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (lootDrops.size === 0) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, lootDrops.size]}
      frustumCulled={true}
    />
  )
}

