/**
 * Enhanced Particle System
 * Advanced particle effects for spells, impacts, and environment
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { assetManager } from '../assets/assetManager'

interface ParticleSystemProps {
  position: [number, number, number]
  type: 'spell' | 'explosion' | 'impact' | 'pickup' | 'level-up' | 'heal' | 'damage'
  color?: string
  count?: number
  duration?: number
  onComplete?: () => void
}

export default function EnhancedParticleSystem({
  position,
  type,
  color,
  count = 50,
  duration = 1000,
  onComplete
}: ParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const startTime = useRef(Date.now())
  const particleTexture = useMemo(() => {
    return assetManager.getTexture('particle') || assetManager.generateTexture('particle', 64, 64, (ctx) => {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.3, '#ffffff80')
      gradient.addColorStop(1, '#ffffff00')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)
    })
  }, [])

  // Configure particle system based on type
  const config = useMemo(() => {
    const configs: Record<string, {
      color: string
      size: number
      speed: number
      gravity: number
      lifetime: number
    }> = {
      spell: {
        color: color || '#00ffff',
        size: 0.1,
        speed: 2,
        gravity: -0.5,
        lifetime: 1.0
      },
      explosion: {
        color: color || '#ff00ff',
        size: 0.2,
        speed: 5,
        gravity: -0.2,
        lifetime: 0.8
      },
      impact: {
        color: color || '#ffffff',
        size: 0.15,
        speed: 3,
        gravity: -0.3,
        lifetime: 0.5
      },
      pickup: {
        color: color || '#00ff00',
        size: 0.1,
        speed: 1,
        gravity: 0.5,
        lifetime: 1.5
      },
      'level-up': {
        color: color || '#ffff00',
        size: 0.2,
        speed: 2,
        gravity: -0.1,
        lifetime: 2.0
      },
      heal: {
        color: color || '#00ff00',
        size: 0.1,
        speed: 1.5,
        gravity: -0.2,
        lifetime: 1.2
      },
      damage: {
        color: color || '#ff0000',
        size: 0.15,
        speed: 2.5,
        gravity: -0.4,
        lifetime: 0.8
      }
    }
    return configs[type] || configs.spell
  }, [type, color])

  // Initialize particles
  const { positions, velocities, lifetimes, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const lifetimes = new Float32Array(count)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Random position around origin
      positions[i3] = (Math.random() - 0.5) * 0.5
      positions[i3 + 1] = (Math.random() - 0.5) * 0.5
      positions[i3 + 2] = (Math.random() - 0.5) * 0.5

      // Random velocity
      const angle = Math.random() * Math.PI * 2
      const speed = config.speed * (0.5 + Math.random() * 0.5)
      velocities[i3] = Math.cos(angle) * speed
      velocities[i3 + 1] = Math.sin(angle) * speed + config.speed * 0.5
      velocities[i3 + 2] = (Math.random() - 0.5) * speed

      // Lifetime
      lifetimes[i] = config.lifetime * (0.5 + Math.random() * 0.5)
      
      // Size
      sizes[i] = config.size * (0.5 + Math.random() * 0.5)
    }

    return { positions, velocities, lifetimes, sizes }
  }, [count, config])

  useFrame((_state, delta) => {
    if (!particlesRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const normalizedTime = elapsed / (duration / 1000)

    if (normalizedTime >= 1) {
      if (onComplete) {
        onComplete()
      }
      return
    }

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    const colors = particlesRef.current.geometry.attributes.color?.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const lifetime = lifetimes[i]
      const age = elapsed / lifetime

      if (age >= 1) {
        // Reset particle
        positions[i3] = (Math.random() - 0.5) * 0.5
        positions[i3 + 1] = (Math.random() - 0.5) * 0.5
        positions[i3 + 2] = (Math.random() - 0.5) * 0.5
        startTime.current = Date.now()
        continue
      }

      // Update position
      positions[i3] += velocities[i3] * delta
      positions[i3 + 1] += (velocities[i3 + 1] + config.gravity) * delta
      positions[i3 + 2] += velocities[i3 + 2] * delta

      // Update color based on lifetime
      if (colors) {
        const color = new THREE.Color(config.color)
        colors[i3] = color.r
        colors[i3 + 1] = color.g
        colors[i3 + 2] = color.b
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
    if (particlesRef.current.geometry.attributes.color) {
      particlesRef.current.geometry.attributes.color.needsUpdate = true
    }
  })

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    // Add color attribute
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color(config.color)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    // Add size attribute
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geom
  }, [count, config.color, positions, sizes])

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: config.size,
      map: particleTexture,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [config.size, particleTexture])

  return (
    <points
      ref={particlesRef}
      position={position}
      geometry={geometry}
      material={material}
    />
  )
}

/**
 * Spell impact particle effect
 */
export function SpellImpactParticles({ position, color }: { position: [number, number, number], color: string }) {
  return (
    <EnhancedParticleSystem
      position={position}
      type="explosion"
      color={color}
      count={30}
      duration={500}
    />
  )
}

/**
 * Level up particle effect
 */
export function LevelUpParticles({ position }: { position: [number, number, number] }) {
  return (
    <EnhancedParticleSystem
      position={position}
      type="level-up"
      color="#ffff00"
      count={100}
      duration={2000}
    />
  )
}

/**
 * Heal particle effect
 */
export function HealParticles({ position }: { position: [number, number, number] }) {
  return (
    <EnhancedParticleSystem
      position={position}
      type="heal"
      color="#00ff00"
      count={40}
      duration={1000}
    />
  )
}

/**
 * Damage particle effect
 */
export function DamageParticles({ position }: { position: [number, number, number] }) {
  return (
    <EnhancedParticleSystem
      position={position}
      type="damage"
      color="#ff0000"
      count={20}
      duration={600}
    />
  )
}

