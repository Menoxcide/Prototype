import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getPerformanceSettings } from '../systems/performanceSystem'
import { getMobileOptimizationFlags } from '../utils/mobileOptimizations'

export default function Particles() {
  const particlesRef = useRef<THREE.Points>(null)
  const settings = getPerformanceSettings()
  const mobileFlags = getMobileOptimizationFlags()
  
  // Throttle updates on mobile to 30FPS (update every 2 frames)
  const frameCountRef = useRef(0)
  const lastUpdateTime = useRef(0)
  const MOBILE_UPDATE_INTERVAL = 1000 / 30 // 30 FPS = ~33ms

  // Use mobile-specific particle limit if on mobile
  const particleCount = mobileFlags.isMobile 
    ? Math.min(settings.maxParticles, mobileFlags.particleLimit)
    : settings.maxParticles

  // Use instanced rendering for better performance
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const velocities = new Float32Array(particleCount * 3) // Store velocities for GPU-based animation

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      // Random positions in a large area
      positions[i3] = (Math.random() - 0.5) * 100
      positions[i3 + 1] = Math.random() * 20
      positions[i3 + 2] = (Math.random() - 0.5) * 100

      // Random velocities for GPU animation
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = Math.random() * 0.01
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02

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

    return { positions, colors, sizes, velocities }
  }, [particleCount])

  // Throttled update for mobile (30FPS), full speed on desktop
  useFrame((_state, delta) => {
    if (!particlesRef.current) return

    frameCountRef.current++
    const now = Date.now()
    
    // On mobile, throttle to 30FPS
    if (mobileFlags.isMobile) {
      if (now - lastUpdateTime.current < MOBILE_UPDATE_INTERVAL) {
        return // Skip this frame
      }
      lastUpdateTime.current = now
    }

    const geometry = particlesRef.current.geometry
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute
    
    if (positionAttribute && mobileFlags.isMobile) {
      // Update positions on GPU (throttled)
      const positions = positionAttribute.array as Float32Array
      const velocities = particles.velocities
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        positions[i3] += velocities[i3] * delta * 30 // Scale by 30 to account for throttling
        positions[i3 + 1] += velocities[i3 + 1] * delta * 30
        positions[i3 + 2] += velocities[i3 + 2] * delta * 30
        
        // Wrap around bounds
        if (positions[i3] > 50) positions[i3] = -50
        if (positions[i3] < -50) positions[i3] = 50
        if (positions[i3 + 1] > 20) positions[i3 + 1] = 0
        if (positions[i3 + 1] < 0) positions[i3 + 1] = 20
        if (positions[i3 + 2] > 50) positions[i3 + 2] = -50
        if (positions[i3 + 2] < -50) positions[i3 + 2] = 50
      }
      
      positionAttribute.needsUpdate = true
    } else {
      // Desktop: full speed rotation
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
          usage={THREE.DynamicDrawUsage} // Mark as dynamic for GPU updates
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
        size={mobileFlags.isMobile ? 0.4 : 0.5} // Slightly smaller on mobile
        sizeAttenuation={true}
        vertexColors={true}
        transparent
        opacity={mobileFlags.isMobile ? 0.5 : 0.6} // Slightly less opacity on mobile
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

