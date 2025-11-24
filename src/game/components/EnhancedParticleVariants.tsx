/**
 * Additional Particle Variants
 * More particle effect types for various game events
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { assetManager } from '../assets/assetManager'

interface ParticleVariantProps {
  position: [number, number, number]
  type: 'spark' | 'smoke' | 'electric' | 'void' | 'data' | 'explosion-ring' | 'heal-ring'
  color?: string
  count?: number
  duration?: number
}

function ParticleVariant({
  position,
  type,
  color,
  count = 30,
  duration = 1000
}: ParticleVariantProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const startTime = useRef(Date.now())

  const config = useMemo(() => {
    const configs: Record<string, {
      color: string
      size: number
      speed: number
      gravity: number
      spread: number
      lifetime: number
    }> = {
      spark: {
        color: color || '#ffff00',
        size: 0.05,
        speed: 3,
        gravity: -0.2,
        spread: 1,
        lifetime: 0.5
      },
      smoke: {
        color: color || '#888888',
        size: 0.3,
        speed: 0.5,
        gravity: -0.1,
        spread: 2,
        lifetime: 2.0
      },
      electric: {
        color: color || '#00ffff',
        size: 0.1,
        speed: 5,
        gravity: 0,
        spread: 1.5,
        lifetime: 0.4
      },
      void: {
        color: color || '#9d00ff',
        size: 0.2,
        speed: 1,
        gravity: 0,
        spread: 2,
        lifetime: 1.5
      },
      data: {
        color: color || '#00ff00',
        size: 0.15,
        speed: 2,
        gravity: 0,
        spread: 1.5,
        lifetime: 1.0
      },
      'explosion-ring': {
        color: color || '#ff00ff',
        size: 0.2,
        speed: 8,
        gravity: 0,
        spread: 3,
        lifetime: 0.6
      },
      'heal-ring': {
        color: color || '#00ff00',
        size: 0.15,
        speed: 2,
        gravity: -0.5,
        spread: 2,
        lifetime: 1.2
      }
    }
    return configs[type] || configs.spark
  }, [type, color])

  const { positions, velocities, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const particleColor = new THREE.Color(config.color)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Starting position
      if (type === 'explosion-ring' || type === 'heal-ring') {
        // Ring pattern
        const angle = (i / count) * Math.PI * 2
        const radius = 0.5
        positions[i3] = Math.cos(angle) * radius
        positions[i3 + 1] = 0
        positions[i3 + 2] = Math.sin(angle) * radius
      } else {
        positions[i3] = (Math.random() - 0.5) * config.spread
        positions[i3 + 1] = (Math.random() - 0.5) * config.spread
        positions[i3 + 2] = (Math.random() - 0.5) * config.spread
      }

      // Velocity based on type
      if (type === 'explosion-ring' || type === 'heal-ring') {
        const angle = (i / count) * Math.PI * 2
        velocities[i3] = Math.cos(angle) * config.speed
        velocities[i3 + 1] = type === 'heal-ring' ? config.speed : 0
        velocities[i3 + 2] = Math.sin(angle) * config.speed
      } else {
        const angle = Math.random() * Math.PI * 2
        const speed = config.speed * (0.5 + Math.random() * 0.5)
        velocities[i3] = Math.cos(angle) * speed
        velocities[i3 + 1] = Math.sin(angle) * speed
        velocities[i3 + 2] = (Math.random() - 0.5) * speed
      }

      // Color
      colors[i3] = particleColor.r
      colors[i3 + 1] = particleColor.g
      colors[i3 + 2] = particleColor.b

      // Size
      sizes[i] = config.size * (0.5 + Math.random() * 0.5)
    }

    return { positions, velocities, colors, sizes }
  }, [count, config, type])

  useFrame((_state, delta) => {
    if (!particlesRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    if (elapsed >= duration / 1000) return

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    const colors = particlesRef.current.geometry.attributes.color?.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const age = elapsed / config.lifetime

      if (age >= 1) continue

      // Update position
      positions[i3] += velocities[i3] * delta
      positions[i3 + 1] += (velocities[i3 + 1] + config.gravity) * delta
      positions[i3 + 2] += velocities[i3 + 2] * delta

      // Update color/alpha
      if (colors) {
        const alpha = 1 - age
        const color = new THREE.Color(config.color)
        colors[i3] = color.r * alpha
        colors[i3 + 1] = color.g * alpha
        colors[i3 + 2] = color.b * alpha
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
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geom
  }, [positions, colors, sizes])

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

export default ParticleVariant

/**
 * Pre-built particle components
 */
export function SparkParticles({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="spark" color={color} count={20} duration={500} />
}

export function SmokeParticles({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="smoke" color={color} count={15} duration={2000} />
}

export function ElectricParticles({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="electric" color={color} count={25} duration={400} />
}

export function VoidParticles({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="void" color={color} count={30} duration={1500} />
}

export function DataParticles({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="data" color={color} count={25} duration={1000} />
}

export function ExplosionRing({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="explosion-ring" color={color} count={20} duration={600} />
}

export function HealRing({ position, color }: { position: [number, number, number], color?: string }) {
  return <ParticleVariant position={position} type="heal-ring" color={color} count={16} duration={1200} />
}

