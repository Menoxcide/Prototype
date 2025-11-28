/**
 * Grapple Trail Component
 * Dynamic particle trails for grapple movement with neon particles
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

interface GrappleTrailProps {
  visible: boolean
}

const MAX_PARTICLES = 50 // Optimized for mobile
const PARTICLE_LIFETIME = 1.0 // seconds
const TRAIL_COLORS = {
  cyan: new THREE.Color(0x00ffff),
  magenta: new THREE.Color(0xff00ff),
  yellow: new THREE.Color(0xffff00)
}

export default function GrappleTrail({ visible }: GrappleTrailProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const player = useGameStore((s) => s.player)
  const grappledBuilding = useGameStore((s) => s.grappledBuilding)
  const isGrappling = grappledBuilding !== null && visible

  // Particle system
  const particles = useRef<Array<{
    position: THREE.Vector3
    velocity: THREE.Vector3
    age: number
    lifetime: number
    color: THREE.Color
  }>>([])

  // Track last position for velocity calculation (must be at component level)
  const lastPos = useRef<THREE.Vector3>(new THREE.Vector3())

  // Geometry and material
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const sizes = new Float32Array(MAX_PARTICLES)
    const alphas = new Float32Array(MAX_PARTICLES)

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geom.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))

    return geom
  }, [])

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.3,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8
    })
  }, [])

  // Update particles
  useFrame((_, delta) => {
    if (!isGrappling || !player || !particlesRef.current) return

    const positions = geometry.attributes.position.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array
    const sizes = geometry.attributes.size.array as Float32Array
    const alphas = geometry.attributes.alpha.array as Float32Array

    // Get player velocity (approximate from position change)
    const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    // Initialize lastPos if not set
    if (lastPos.current.length() === 0) {
      lastPos.current.copy(currentPos)
    }
    const velocity = new THREE.Vector3().subVectors(currentPos, lastPos.current).divideScalar(delta || 0.016)
    lastPos.current.copy(currentPos)

    // Emit new particles based on velocity
    const speed = velocity.length()
    if (speed > 2) {
      // Emit particles when moving fast
      const emitRate = Math.min(30, speed * 5) // Up to 30 particles per second
      const particlesToEmit = emitRate * delta

      for (let i = 0; i < particlesToEmit && particles.current.length < MAX_PARTICLES; i++) {
        // Random color from neon palette
        const colorKeys = Object.keys(TRAIL_COLORS) as Array<keyof typeof TRAIL_COLORS>
        const randomColor = TRAIL_COLORS[colorKeys[Math.floor(Math.random() * colorKeys.length)]]

        particles.current.push({
          position: currentPos.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.5,
              (Math.random() - 0.5) * 0.5,
              (Math.random() - 0.5) * 0.5
            )
          ),
          velocity: velocity.clone().multiplyScalar(0.3).add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            )
          ),
          age: 0,
          lifetime: PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4), // Vary lifetime
          color: randomColor
        })
      }
    }

    // Update existing particles
    const activeParticles: typeof particles.current = []
    for (let i = 0; i < particles.current.length; i++) {
      const particle = particles.current[i]
      particle.age += delta
      particle.position.add(particle.velocity.clone().multiplyScalar(delta))
      
      // Apply gravity
      particle.velocity.y -= 9.8 * delta

      // Fade out over lifetime
      const lifePercent = particle.age / particle.lifetime
      if (lifePercent < 1) {
        activeParticles.push(particle)
      }
    }
    particles.current = activeParticles

    // Update geometry
    const particleCount = Math.min(particles.current.length, MAX_PARTICLES)
    for (let i = 0; i < particleCount; i++) {
      const particle = particles.current[i]
      const lifePercent = particle.age / particle.lifetime
      const alpha = 1 - lifePercent

      positions[i * 3] = particle.position.x
      positions[i * 3 + 1] = particle.position.y
      positions[i * 3 + 2] = particle.position.z

      colors[i * 3] = particle.color.r
      colors[i * 3 + 1] = particle.color.g
      colors[i * 3 + 2] = particle.color.b

      sizes[i] = 0.3 * (1 - lifePercent * 0.5) // Shrink over time
      alphas[i] = alpha
    }

    // Update geometry attributes
    geometry.setDrawRange(0, particleCount)
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
    geometry.attributes.alpha.needsUpdate = true
  })

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  if (!isGrappling) return null

  return (
    <points ref={particlesRef} geometry={geometry} material={material} />
  )
}

