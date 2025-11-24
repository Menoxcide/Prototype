import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SpellProjectile as SpellProjectileType } from '../systems/spellSystem'

interface EnhancedSpellProjectileProps {
  projectile: SpellProjectileType
}

export default function EnhancedSpellProjectile({ projectile }: EnhancedSpellProjectileProps) {
  const meshRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z
      )

      // Rotate projectile
      meshRef.current.rotation.y += 0.1
      meshRef.current.rotation.x += 0.05

      // Pulsing core
      if (coreRef.current) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.2
        coreRef.current.scale.set(scale, scale, scale)
      }

      // Trail effect
      if (trailRef.current) {
        trailRef.current.rotation.y = meshRef.current.rotation.y
      }
    }
  })

  const spellColor = projectile.spell.color

  return (
    <group ref={meshRef}>
      {/* Enhanced projectile core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={spellColor}
          emissive={spellColor}
          emissiveIntensity={1.5}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh scale={[1.5, 1.5, 1.5]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={spellColor}
          emissive={spellColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Energy trail */}
      <mesh ref={trailRef} position={[0, 0, -0.5]}>
        <coneGeometry args={[0.15, 1, 8]} />
        <meshStandardMaterial
          color={spellColor}
          emissive={spellColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Particle ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 16]} />
        <meshStandardMaterial
          color={spellColor}
          emissive={spellColor}
          emissiveIntensity={0.7}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Enhanced point light */}
      <pointLight
        position={[0, 0, 0]}
        intensity={1.0}
        color={spellColor}
        distance={5}
        decay={2}
      />
    </group>
  )
}

