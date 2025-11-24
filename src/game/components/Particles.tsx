import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getPerformanceSettings } from '../systems/performanceSystem'

export default function Particles() {
  const particlesRef = useRef<THREE.Points>(null)
  const settings = getPerformanceSettings()

  const particleCount = settings.maxParticles

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      // Random positions in a large area
      positions[i3] = (Math.random() - 0.5) * 100
      positions[i3 + 1] = Math.random() * 20
      positions[i3 + 2] = (Math.random() - 0.5) * 100

      // Random neon colors
      const colorChoice = Math.random()
      if (colorChoice < 0.33) {
        colors[i3] = 0 // R
        colors[i3 + 1] = 1 // G (cyan)
        colors[i3 + 2] = 1 // B
      } else if (colorChoice < 0.66) {
        colors[i3] = 1 // R (pink)
        colors[i3 + 1] = 0 // G
        colors[i3 + 2] = 1 // B
      } else {
        colors[i3] = 0.6 // R (purple)
        colors[i3 + 1] = 0 // G
        colors[i3 + 2] = 1 // B
      }

      sizes[i] = Math.random() * 0.5 + 0.1
    }

    return { positions, colors, sizes }
  }, [particleCount])

  useFrame((_state, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.1
    }
  })
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (particlesRef.current) {
        const geometry = particlesRef.current.geometry
        const material = particlesRef.current.material as THREE.PointsMaterial
        geometry.dispose()
        material.dispose()
      }
    }
  }, [])

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
          count={particleCount}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
          count={particleCount}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[particles.sizes, 1]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        sizeAttenuation={true}
        vertexColors={true}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

