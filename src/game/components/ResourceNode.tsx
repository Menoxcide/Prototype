import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ResourceNode as ResourceNodeType } from '../types'

interface ResourceNodeProps {
  node: ResourceNodeType
}

export default function ResourceNode({ node }: ResourceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rotationRef = useRef(0)

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(
        node.position.x,
        node.position.y,
        node.position.z
      )
      rotationRef.current += delta * 0.5
      meshRef.current.rotation.y = rotationRef.current
    }
  })

  const canHarvest = !node.lastHarvested || 
    Date.now() - node.lastHarvested > node.respawnTime

  return (
    <group>
      {/* Resource node - crystal shape */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={canHarvest ? '#00ff00' : '#666666'}
          emissive={canHarvest ? '#00ff00' : '#333333'}
          emissiveIntensity={canHarvest ? 0.8 : 0.2}
          transparent
          opacity={canHarvest ? 1 : 0.5}
        />
      </mesh>

      {/* Glow effect */}
      {canHarvest && (
        <pointLight
          position={[node.position.x, node.position.y, node.position.z]}
          intensity={0.5}
          color="#00ff00"
          distance={2}
        />
      )}
    </group>
  )
}

