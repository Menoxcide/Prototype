/**
 * Cyberpunk Rain Effect
 * Creates atmospheric rain for the cyberpunk city
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RAIN_COUNT = 2000
const RAIN_SPEED = 20

export default function CyberpunkRain() {
  const rainRef = useRef<THREE.Points>(null)
  
  // Create rain particles
  const { geometry } = useMemo(() => {
    const positions = new Float32Array(RAIN_COUNT * 3)
    
    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200 // x
      positions[i * 3 + 1] = Math.random() * 100 + 20 // y (start above)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200 // z
    }
    
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    return { geometry: geom }
  }, [])
  
  useFrame((_state, delta) => {
    if (!rainRef.current) return
    
    const positions = rainRef.current.geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < RAIN_COUNT; i++) {
      const y = positions[i * 3 + 1]
      
      // Move rain down
      positions[i * 3 + 1] = y - RAIN_SPEED * delta
      
      // Reset if below ground
      if (y < 0) {
        positions[i * 3] = (Math.random() - 0.5) * 200
        positions[i * 3 + 1] = 100 + Math.random() * 20
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200
      }
    }
    
    rainRef.current.geometry.attributes.position.needsUpdate = true
  })
  
  return (
    <points ref={rainRef} geometry={geometry}>
      <pointsMaterial
        size={0.1}
        color="#88ccff"
        transparent
        opacity={0.6}
        sizeAttenuation={true}
      />
    </points>
  )
}

