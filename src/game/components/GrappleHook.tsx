/**
 * Grapple Hook Visual Component
 * Renders a 3D hook model at the attachment point with glow effects
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GrappleHookProps {
  position: THREE.Vector3
  visible: boolean
  ropeDirection?: THREE.Vector3 // Direction from hook to player
}

export default function GrappleHook({ position, visible, ropeDirection }: GrappleHookProps) {
  const hookRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  // Create hook geometry - simple 3D hook shape
  const hookGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    // Create a hook shape: curved hook with attachment point
    shape.moveTo(0, 0)
    shape.lineTo(0.1, 0)
    shape.quadraticCurveTo(0.15, 0.05, 0.15, 0.1)
    shape.lineTo(0.15, 0.2)
    shape.quadraticCurveTo(0.15, 0.25, 0.1, 0.25)
    shape.lineTo(0.05, 0.25)
    shape.quadraticCurveTo(0, 0.2, 0, 0.15)
    shape.lineTo(0, 0.1)
    shape.quadraticCurveTo(0, 0.05, 0.05, 0.05)
    shape.lineTo(0.1, 0.05)
    shape.quadraticCurveTo(0.1, 0, 0, 0)
    
    const extrudeSettings = {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [])

  // Create glow sphere geometry
  const glowGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.15, 16, 16)
  }, [])

  // Hook material - metallic with emissive glow
  const hookMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5,
    })
  }, [])

  // Glow material - pulsing green
  const glowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00ff00,
      emissiveIntensity: 1.5,
      side: THREE.DoubleSide,
    })
  }, [])

  // Update hook orientation and glow animation
  useFrame((_, delta) => {
    if (!visible) return

    timeRef.current += delta * 2

    // Orient hook based on rope direction
    if (hookRef.current && ropeDirection) {
      const direction = ropeDirection.clone().normalize()
      // Create a look-at matrix for the hook
      const up = new THREE.Vector3(0, 1, 0)
      const right = new THREE.Vector3().crossVectors(up, direction).normalize()
      const correctedUp = new THREE.Vector3().crossVectors(direction, right).normalize()
      
      hookRef.current.lookAt(
        hookRef.current.position.clone().add(direction)
      )
    }

    // Pulse the glow
    if (glowRef.current && glowMaterial) {
      const pulse = Math.sin(timeRef.current * 4) * 0.3 + 0.7
      glowMaterial.opacity = pulse * 0.6
      glowMaterial.emissiveIntensity = pulse * 1.5
      
      // Scale pulse
      const scale = 1 + Math.sin(timeRef.current * 3) * 0.1
      glowRef.current.scale.set(scale, scale, scale)
    }

    // Pulse hook emissive
    if (hookRef.current && hookMaterial) {
      const pulse = Math.sin(timeRef.current * 5) * 0.2 + 0.5
      hookMaterial.emissiveIntensity = pulse
    }
  })

  if (!visible) return null

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Glow sphere */}
      <mesh
        ref={glowRef}
        geometry={glowGeometry}
        material={glowMaterial}
        renderOrder={1}
      />
      
      {/* Hook mesh */}
      <group ref={hookRef}>
        <mesh
          geometry={hookGeometry}
          material={hookMaterial}
          renderOrder={2}
          scale={[2, 2, 2]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>
    </group>
  )
}

