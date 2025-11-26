/**
 * InstancedResourceNodes - Uses instanced rendering for resource nodes
 * Reduces draw calls from N to 1 for all resource nodes
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ResourceNode } from '../types'
import { trackGeometry } from '../utils/geometryDisposalTracker'

interface InstancedResourceNodesProps {
  resourceNodes: Map<string, ResourceNode>
}

export default function InstancedResourceNodes({ resourceNodes }: InstancedResourceNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Create geometry and material once
  const geometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 8)
    // Track geometry for disposal monitoring
    trackGeometry(geom, `instanced-resource-nodes-geometry`, 'InstancedResourceNodes')
    return geom
  }, [])
  
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00ff00',
    emissive: '#00ff00',
    emissiveIntensity: 0.4
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

    const nodeArray = Array.from(resourceNodes.values())
    const instanceCount = nodeArray.length

    // Only use instancing if count > 10
    if (instanceCount <= 10) {
      return null
    }

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

  if (resourceNodes.size === 0 || resourceNodes.size <= 10) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, resourceNodes.size]}
      frustumCulled={true}
    />
  )
}

