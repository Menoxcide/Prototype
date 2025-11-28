/**
 * InstancedResourceNodes - Uses instanced rendering for resource nodes
 * Reduces draw calls from N to 1 for all resource nodes
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ResourceNode } from '../types'
import { trackGeometry, getGeometryDisposalTracker } from '../utils/geometryDisposalTracker'
import { materialPool } from '../utils/materialBatching'

interface InstancedResourceNodesProps {
  resourceNodes: Map<string, ResourceNode>
}

export default function InstancedResourceNodes({ resourceNodes }: InstancedResourceNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometryTrackedRef = useRef<boolean>(false)

  // Create geometry and material once
  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.5, 0.5, 1, 8)
  }, [])
  
  // Track geometry for disposal monitoring (only once, using useEffect to prevent re-tracking on re-renders)
  useEffect(() => {
    if (!geometryTrackedRef.current && geometry) {
      trackGeometry(geometry, `instanced-resource-nodes-geometry`, 'InstancedResourceNodes')
      geometryTrackedRef.current = true
    }
  }, [geometry])
  
  // Use material pool for efficient material reuse
  const material = useMemo(() => {
    return materialPool.getMaterial('resource-node-default', () => new THREE.MeshStandardMaterial({
      color: '#00ff00',
      emissive: '#00ff00',
      emissiveIntensity: 0.4
    }))
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark geometry as disposed in tracker before disposing
      const tracker = getGeometryDisposalTracker()
      tracker.markDisposed('instanced-resource-nodes-geometry')
      geometry.dispose()
      // Release material reference (pool handles disposal)
      materialPool.releaseMaterial('resource-node-default')
      geometryTrackedRef.current = false
    }
  }, [geometry, material])

  // Update instances every frame
  useFrame(() => {
    if (!meshRef.current) return

    const nodeArray = Array.from(resourceNodes.values())
    const instanceCount = nodeArray.length

    // ALWAYS use instancing (no count threshold) for optimal performance
    // Resize instance matrix if needed
    if (meshRef.current.count !== instanceCount) {
      meshRef.current.count = instanceCount
    }

    // Update each instance
    const time = Date.now() * 0.001
    nodeArray.forEach((node, index) => {
      const matrix = new THREE.Matrix4()
      
      // Animate rotation and slight bob
      const rotationY = time + index * 0.1
      const bobY = Math.sin(time * 2 + index) * 0.05
      
      matrix.compose(
        new THREE.Vector3(node.position.x, node.position.y + bobY, node.position.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
        new THREE.Vector3(1, 1, 1)
      )
      
      meshRef.current!.setMatrixAt(index, matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // ALWAYS render with instancing (no count threshold)
  if (resourceNodes.size === 0) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, Math.max(resourceNodes.size, 1)]}
      frustumCulled={true}
    />
  )
}

