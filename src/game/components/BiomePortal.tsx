/**
 * Biome Portal Component
 * Creates a portal to a specific biome with visual effects
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Biome } from '../data/biomes'
import { useGameStore } from '../store/useGameStore'
import { COOLDOWN_PORTAL } from '../data/cooldowns'

interface BiomePortalProps {
  biome: Biome
  position: [number, number, number]
  onEnter?: () => void
}

export default function BiomePortal({ biome, position, onEnter }: BiomePortalProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rotationRef = useRef(0)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const { player, isOnCooldown, startCooldown } = useGameStore()
  const hasEnteredRef = useRef(false) // Prevent spam - only trigger once per entry
  const actionId = `portal:${biome.id}`

  // Create particle system for portal effect
  const particles = useRef<THREE.BufferGeometry | null>(null)
  const particleMaterial = useRef<THREE.PointsMaterial | null>(null)

  // Initialize particles
  if (!particles.current) {
    const particleCount = 100
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      // Random position in a sphere around portal
      const radius = Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      
      positions[i3] = position[0] + radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = position[1] + radius * Math.cos(phi)
      positions[i3 + 2] = position[2] + radius * Math.sin(phi) * Math.sin(theta)
      
      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * 0.5
      velocities[i3 + 1] = Math.random() * 0.3
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5
    }
    
    particles.current = new THREE.BufferGeometry()
    particles.current.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particles.current.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    
    particleMaterial.current = new THREE.PointsMaterial({
      color: biome.color,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
  }

  useFrame((_state, delta) => {
    if (meshRef.current) {
      rotationRef.current += delta * 0.8
      meshRef.current.rotation.y = rotationRef.current
    }
    
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -rotationRef.current * 1.5
    }
    
    // Animate particles
    if (particles.current && particleMaterial.current) {
      const positions = particles.current.attributes.position.array as Float32Array
      const velocities = particles.current.attributes.velocity.array as Float32Array
      
      for (let i = 0; i < positions.length; i += 3) {
        // Update position
        positions[i] += velocities[i] * delta
        positions[i + 1] += velocities[i + 1] * delta
        positions[i + 2] += velocities[i + 2] * delta
        
        // Reset particles that drift too far
        const dx = positions[i] - position[0]
        const dy = positions[i + 1] - position[1]
        const dz = positions[i + 2] - position[2]
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        
        if (distance > 3) {
          // Reset to portal center
          positions[i] = position[0] + (Math.random() - 0.5) * 0.5
          positions[i + 1] = position[1]
          positions[i + 2] = position[2] + (Math.random() - 0.5) * 0.5
        }
      }
      
      particles.current.attributes.position.needsUpdate = true
    }
    
    // Check if player is close enough to enter (with cooldown to prevent spam)
    if (player && onEnter) {
      const dx = player.position.x - position[0]
      const dz = player.position.z - position[2]
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      if (distance < 2.5) {
        // Check cooldown and if player hasn't already entered
        if (!hasEnteredRef.current && !isOnCooldown(actionId)) {
          hasEnteredRef.current = true
          startCooldown(actionId, COOLDOWN_PORTAL * 1000)
          onEnter()
        }
      } else {
        // Reset when player moves away (allows re-entry after leaving portal range)
        if (distance > 3.5) {
          hasEnteredRef.current = false
        }
      }
    }
  })

  return (
    <group>
      {/* Outer portal ring */}
      <mesh ref={meshRef} position={position}>
        <torusGeometry args={[1.5, 0.2, 16, 32]} />
        <meshStandardMaterial
          color={biome.color}
          emissive={biome.color}
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Inner rotating ring */}
      <mesh ref={innerRingRef} position={position}>
        <torusGeometry args={[1.2, 0.15, 12, 24]} />
        <meshStandardMaterial
          color={biome.groundColor}
          emissive={biome.color}
          emissiveIntensity={1.2}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Portal center - shimmering effect */}
      <mesh position={position}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial
          color={biome.color}
          emissive={biome.color}
          emissiveIntensity={1.0}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Particle system */}
      {particles.current && particleMaterial.current && (
        <points
          ref={particlesRef}
          geometry={particles.current}
          material={particleMaterial.current}
        />
      )}
      
      {/* Point light for glow */}
      <pointLight
        position={position}
        intensity={1.5}
        color={biome.color}
        distance={8}
        decay={2}
      />
      
      {/* Biome name label with HTML text */}
      <Html
        position={[position[0], position[1] + 2.5, position[2]]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: `2px solid ${biome.color}`,
            borderRadius: '8px',
            padding: '8px 16px',
            textAlign: 'center',
            minWidth: '200px',
            boxShadow: `0 0 20px ${biome.color}40`,
          }}
        >
          <div
            style={{
              color: biome.color,
              fontSize: '18px',
              fontWeight: 'bold',
              textShadow: `0 0 10px ${biome.color}`,
              marginBottom: '4px',
            }}
          >
            {biome.name}
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '12px',
              opacity: 0.9,
            }}
          >
            Levels {biome.levelRange[0]}-{biome.levelRange[1]}
          </div>
          <div
            style={{
              color: '#cccccc',
              fontSize: '11px',
              opacity: 0.7,
              marginTop: '4px',
              fontStyle: 'italic',
            }}
          >
            {biome.description}
          </div>
        </div>
      </Html>
    </group>
  )
}

