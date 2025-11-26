/**
 * Grapple Line Visual Component
 * Renders a striking green animated line with glow effects and particles
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GrappleLineProps {
  start: THREE.Vector3
  end: THREE.Vector3
  visible: boolean
  ropeLength?: number // Current rope length for tension visualization
  isTaut?: boolean // Whether rope is taut or slack
}

export default function GrappleLine({ start, end, visible, ropeLength, isTaut = true }: GrappleLineProps) {
  const lineRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const timeRef = useRef(0)

  // Create initial tube geometries
  const createLineGeometry = () => {
    const curve = new THREE.LineCurve3(start.clone(), end.clone())
    return new THREE.TubeGeometry(curve, 20, 0.08, 8, false) // radius 0.08
  }

  const createGlowGeometry = () => {
    const curve = new THREE.LineCurve3(start.clone(), end.clone())
    return new THREE.TubeGeometry(curve, 20, 0.15, 8, false) // radius 0.15 (thicker)
  }

  const lineGeometry = useMemo(() => createLineGeometry(), [])
  const glowGeometry = useMemo(() => createGlowGeometry(), [])

  // Create particles along the line
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const particleCount = 50
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1)
      const pos = new THREE.Vector3().lerpVectors(start, end, t)
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [start, end])

  // Main line material - bright green with glow
  // Note: linewidth doesn't work in WebGL, so we'll use tube geometry for thickness
  const lineMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x00ff00, // Bright green
      transparent: true,
      opacity: 1,
      emissive: 0x00ff00,
      emissiveIntensity: 1.5,
    })
  }, [])

  // Glow line material - softer green, thicker
  const glowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x00ff88, // Softer green
      transparent: true,
      opacity: 0.4,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
    })
  }, [])

  // Particle material - glowing green dots
  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  // Cleanup geometries and materials on unmount
  useEffect(() => {
    return () => {
      lineGeometry.dispose()
      glowGeometry.dispose()
      particlesGeometry.dispose()
      lineMaterial.dispose()
      glowMaterial.dispose()
      particleMaterial.dispose()
    }
  }, [lineGeometry, glowGeometry, particlesGeometry, lineMaterial, glowMaterial, particleMaterial])

  // Update line positions and animate
  useFrame((_, delta) => {
    if (!visible) return

    timeRef.current += delta * 2

    // Get current positions (they're updated every frame from parent)
    const currentStart = start
    const currentEnd = end
    
    // Calculate actual distance
    const actualDistance = currentStart.distanceTo(currentEnd)
    
    // Create curve - add sag if rope is slack
    let curve: THREE.Curve<THREE.Vector3>
    if (!isTaut && ropeLength && ropeLength > actualDistance) {
      // Add sag to the rope when slack
      const sagAmount = (ropeLength - actualDistance) * 0.3 // 30% of excess length becomes sag
      const midPoint = new THREE.Vector3().lerpVectors(currentStart, currentEnd, 0.5)
      midPoint.y -= sagAmount // Sag downward
      
      // Create a quadratic curve for sag
      curve = new THREE.QuadraticBezierCurve3(
        currentStart.clone(),
        midPoint,
        currentEnd.clone()
      )
    } else {
      // Straight line when taut
      curve = new THREE.LineCurve3(currentStart.clone(), currentEnd.clone())
    }

    // Update line geometry by recreating it
    if (lineRef.current) {
      const oldGeometry = lineRef.current.geometry
      const segments = Math.max(20, Math.floor(actualDistance * 2)) // More segments for longer ropes
      const radius = isTaut ? 0.08 : 0.06 // Slightly thinner when slack
      const newGeometry = new THREE.TubeGeometry(curve, segments, radius, 8, false)
      lineRef.current.geometry = newGeometry
      if (oldGeometry && oldGeometry !== lineGeometry) {
        oldGeometry.dispose()
      }
    }

    // Update glow geometry by recreating it
    if (glowRef.current) {
      const oldGeometry = glowRef.current.geometry
      const segments = Math.max(20, Math.floor(actualDistance * 2))
      const radius = isTaut ? 0.15 : 0.12
      const newGeometry = new THREE.TubeGeometry(curve, segments, radius, 8, false)
      glowRef.current.geometry = newGeometry
      if (oldGeometry && oldGeometry !== glowGeometry) {
        oldGeometry.dispose()
      }
    }

    // Animate particles - move along the line
    if (particlesRef.current && particlesGeometry.attributes.position) {
      const positions = particlesGeometry.attributes.position.array as Float32Array
      const particleCount = positions.length / 3
      
      const currentStart = start
      const currentEnd = end
      
      for (let i = 0; i < particleCount; i++) {
        // Animate particles moving along the line
        const t = ((i / particleCount) + timeRef.current * 0.5) % 1
        const pos = new THREE.Vector3().lerpVectors(currentStart, currentEnd, t)
        positions[i * 3] = pos.x
        positions[i * 3 + 1] = pos.y
        positions[i * 3 + 2] = pos.z
      }
      
      particlesGeometry.attributes.position.needsUpdate = true
    }

    // Pulse the glow - stronger when taut
    if (glowMaterial) {
      const basePulse = isTaut ? 0.5 : 0.3
      const pulse = Math.sin(timeRef.current * 3) * 0.2 + basePulse
      glowMaterial.opacity = pulse
      glowMaterial.emissiveIntensity = isTaut ? 0.8 : 0.5
    }

    // Pulse the main line - brighter when taut
    if (lineMaterial) {
      const pulse = Math.sin(timeRef.current * 4) * 0.1 + 0.9
      lineMaterial.opacity = pulse
      lineMaterial.emissiveIntensity = isTaut ? 1.5 : 1.0
    }
  })

  if (!visible) return null

  return (
    <group>
      {/* Glow line (thicker, softer) - using mesh for tube geometry */}
      <mesh
        ref={glowRef}
        geometry={glowGeometry}
        material={glowMaterial}
        renderOrder={1}
      />
      
      {/* Main line (bright, thinner) - using mesh for tube geometry */}
      <mesh
        ref={lineRef}
        geometry={lineGeometry}
        material={lineMaterial}
        renderOrder={2}
      />
      
      {/* Animated particles */}
      <points
        ref={particlesRef}
        geometry={particlesGeometry}
        material={particleMaterial}
        renderOrder={3}
      />
    </group>
  )
}

