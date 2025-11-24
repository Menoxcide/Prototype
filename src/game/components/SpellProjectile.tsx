import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SpellProjectile as SpellProjectileType } from '../systems/spellSystem'

interface SpellProjectileProps {
  projectile: SpellProjectileType
}

export default function SpellProjectile({ projectile }: SpellProjectileProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z
      )
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial
          color={projectile.spell.color}
          emissive={projectile.spell.color}
          emissiveIntensity={1}
        />
      </mesh>
      <pointLight
        position={[
          projectile.position.x,
          projectile.position.y,
          projectile.position.z
        ]}
        intensity={0.5}
        color={projectile.spell.color}
        distance={3}
      />
    </group>
  )
}

