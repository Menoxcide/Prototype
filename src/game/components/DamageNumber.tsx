import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

interface DamageNumberProps {
  id: string
  damage: number
  position: { x: number; y: number; z: number }
  isCrit?: boolean
}

export default function DamageNumber({ id, position, isCrit = false }: DamageNumberProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { updateDamageNumber, removeDamageNumber } = useGameStore()
  
  // Create geometry and material once (memoized)
  const geometry = useMemo(() => new THREE.PlaneGeometry(0.5, 0.3), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: isCrit ? '#ff00ff' : '#ff0000',
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide
  }), [isCrit])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((_state, delta) => {
    const damageNumber = useGameStore.getState().damageNumbers.get(id)
    if (!damageNumber || !meshRef.current) return
    
    // Update position and opacity
    const newYOffset = damageNumber.yOffset + delta * 2
    const newOpacity = Math.max(0, damageNumber.opacity - delta * 0.5)
    
    meshRef.current.position.set(
      damageNumber.position.x,
      damageNumber.position.y + newYOffset,
      damageNumber.position.z
    )
    
    material.opacity = newOpacity
    
    // Update store
    updateDamageNumber(id, {
      yOffset: newYOffset,
      opacity: newOpacity
    })
    
    // Remove if faded out
    if (newOpacity <= 0) {
      removeDamageNumber(id)
    }
  })

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <primitive object={geometry} />
      <primitive object={material} />
      {/* Text would be rendered via HTML overlay or texture - simplified for now */}
    </mesh>
  )
}

