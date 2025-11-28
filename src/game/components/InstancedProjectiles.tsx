/**
 * InstancedProjectiles - Uses instanced rendering for spell projectiles
 * Reduces draw calls from N to 1 for all projectiles
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { trackGeometry, getGeometryDisposalTracker } from '../utils/geometryDisposalTracker'
import { materialPool } from '../utils/materialBatching'

interface SpellProjectile {
  id: string
  position: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  speed: number
  lifetime: number
  color?: string
}

interface InstancedProjectilesProps {
  projectiles: Map<string, SpellProjectile>
}

export default function InstancedProjectiles({ projectiles }: InstancedProjectilesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Create geometry and material once
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(0.2, 8, 8)
  }, [])
  
  const geometryTrackedRef = useRef<boolean>(false)
  
  // Track geometry for disposal monitoring (only once, using useEffect to prevent re-tracking on re-renders)
  useEffect(() => {
    if (!geometryTrackedRef.current && geometry) {
      trackGeometry(geometry, `instanced-projectiles-geometry`, 'InstancedProjectiles')
      geometryTrackedRef.current = true
    }
  }, [geometry])
  
  const material = useMemo(() => {
    return materialPool.getMaterial('projectile-default', () => new THREE.MeshStandardMaterial({
      color: '#00ffff',
      emissive: '#00ffff',
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9
    }))
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark geometry as disposed in tracker before disposing
      const tracker = getGeometryDisposalTracker()
      tracker.markDisposed('instanced-projectiles-geometry')
      geometry.dispose()
      // Release material reference (pool handles disposal)
      materialPool.releaseMaterial('projectile-default')
      geometryTrackedRef.current = false
    }
  }, [geometry, material])

  // Update instances every frame
  useFrame(() => {
    if (!meshRef.current) return

    const projectileArray = Array.from(projectiles.values())
    const instanceCount = projectileArray.length

    // ALWAYS use instancing (no count threshold) for optimal performance
    // Resize instance matrix if needed
    if (meshRef.current.count !== instanceCount) {
      meshRef.current.count = instanceCount
    }

    // Update each instance
    projectileArray.forEach((projectile, index) => {
      const matrix = new THREE.Matrix4()
      
      // Set position and rotation based on direction
      const direction = new THREE.Vector3(projectile.direction.x, projectile.direction.y, projectile.direction.z).normalize()
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      )
      
      matrix.compose(
        new THREE.Vector3(projectile.position.x, projectile.position.y, projectile.position.z),
        quaternion,
        new THREE.Vector3(1, 1, 1)
      )
      
      meshRef.current!.setMatrixAt(index, matrix)
      
      // Set color per instance if provided
      if (projectile.color && meshRef.current!.instanceColor) {
        meshRef.current!.setColorAt(index, new THREE.Color(projectile.color))
      }
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  // ALWAYS render with instancing (no count threshold)
  if (projectiles.size === 0) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, Math.max(projectiles.size, 1)]}
      frustumCulled={true}
    />
  )
}

