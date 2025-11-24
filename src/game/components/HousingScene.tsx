/**
 * Housing Scene - 3D rendering for player housing
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HousingInstance, FurnitureItem } from '../../../shared/src/types/housing'

interface HousingSceneProps {
  housing: HousingInstance
  onFurnitureClick?: (furniture: FurnitureItem) => void
}

export default function HousingScene({ housing, onFurnitureClick }: HousingSceneProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Create floor
  const floorGeometry = useMemo(() => new THREE.PlaneGeometry(housing.size.width, housing.size.depth), [housing.size])
  const floorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    emissive: '#001122',
    emissiveIntensity: 0.2
  }), [])

  // Create walls
  const wallHeight = housing.size.height
  const walls = useMemo(() => {
    const wallGroup = new THREE.Group()
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: '#0a0a0a',
      emissive: '#000011',
      emissiveIntensity: 0.1
    })

    // Create 4 walls
    const wallThickness = 0.2
    const positions = [
      { x: 0, z: housing.size.depth / 2 }, // Front
      { x: 0, z: -housing.size.depth / 2 }, // Back
      { x: housing.size.width / 2, z: 0, rotation: Math.PI / 2 }, // Right
      { x: -housing.size.width / 2, z: 0, rotation: Math.PI / 2 } // Left
    ]

    positions.forEach(({ x, z, rotation = 0 }) => {
      const wallGeometry = new THREE.BoxGeometry(
        rotation === 0 ? housing.size.width : wallThickness,
        wallHeight,
        rotation === 0 ? wallThickness : housing.size.depth
      )
      const wall = new THREE.Mesh(wallGeometry, wallMaterial)
      wall.position.set(x, wallHeight / 2, z)
      wall.rotation.y = rotation
      wallGroup.add(wall)
    })

    return wallGroup
  }, [housing.size])

  useFrame(() => {
    // Update camera or lighting if needed
  })

  return (
    <group ref={groupRef}>
      {/* Floor */}
      <mesh
        geometry={floorGeometry}
        material={floorMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      />

      {/* Walls */}
      <primitive object={walls} />

      {/* Furniture */}
      {housing.furniture.map(furniture => (
        <FurnitureMesh
          key={furniture.id}
          furniture={furniture}
          onClick={() => onFurnitureClick?.(furniture)}
        />
      ))}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, housing.size.height, 0]} intensity={1} color="#ffffff" />
      <pointLight position={[housing.size.width / 2, housing.size.height / 2, housing.size.depth / 2]} intensity={0.5} color="#00ffff" />
    </group>
  )
}

function FurnitureMesh({ furniture, onClick }: { furniture: FurnitureItem; onClick?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Simple furniture representation (would load actual models in production)
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#444444',
    emissive: '#222222',
    emissiveIntensity: 0.2
  }), [])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[furniture.position.x, furniture.position.y, furniture.position.z]}
      rotation={[0, furniture.rotation, 0]}
      scale={furniture.scale}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    />
  )
}

