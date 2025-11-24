/**
 * Enhanced terrain with textures and biomes
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

const TERRAIN_SIZE = 200
const GRID_SIZE = 20

export default function EnhancedTerrain() {
  const player = useGameStore((state) => state.player)

  // Create ground material with cyberpunk aesthetic
  const groundMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#1a1a2e', // Dark blue-gray base (cyberpunk)
      emissive: '#000011', // Subtle blue glow
      emissiveIntensity: 0.2,
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [])

  // Create grid helper for better visibility
  const gridHelper = useMemo(() => {
    return new THREE.GridHelper(TERRAIN_SIZE, GRID_SIZE, '#4a6a4a', '#2a4a2a')
  }, [])

  // Create ground plane with height variation
  const groundGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 50, 50)
    const positions = geometry.attributes.position
    
    // Add some height variation (simple noise-like pattern)
    // PlaneGeometry: X and Z are in the plane, Y is the height
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.3
      positions.setY(i, y)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  return (
    <>
      {/* Main ground plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <primitive object={groundGeometry} />
        <primitive object={groundMaterial} />
      </mesh>

      {/* Grid helper for visual reference */}
      <primitive object={gridHelper} />

      {/* Add some decorative elements */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2
        const radius = 15 + Math.random() * 10
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const height = 0.5 + Math.random() * 1.5
        
        return (
          <mesh key={i} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[0.5, height, 0.5]} />
            <meshStandardMaterial 
              color={new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.6, 0.4)}
              roughness={0.7}
            />
          </mesh>
        )
      })}
    </>
  )
}

