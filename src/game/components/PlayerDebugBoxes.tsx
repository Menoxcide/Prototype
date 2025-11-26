import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import * as THREE from 'three'

/**
 * Standalone debug boxes that update position every frame
 * These are OUTSIDE the player mesh group to verify rendering
 * DEV ONLY - Disabled in production builds
 */
export default function PlayerDebugBoxes() {
  // Only render in development mode
  if (import.meta.env.PROD || process.env.NODE_ENV === 'production') {
    return null
  }
  const redBoxRef = useRef<THREE.Mesh>(null)
  const blueBoxRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    const player = useGameStore.getState().player
    if (!player) return
    
    // Update positions every frame from store
    if (redBoxRef.current) {
      redBoxRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      )
    }
    
    if (blueBoxRef.current) {
      blueBoxRef.current.position.set(
        player.position.x,
        player.position.y + 5,
        player.position.z
      )
    }
  })
  
  const player = useGameStore.getState().player
  if (!player) return null
  
  return (
    <>
      {/* HUGE red box - should be impossible to miss */}
      <mesh ref={redBoxRef} position={[player.position.x, player.position.y, player.position.z]}>
        <boxGeometry args={[10, 10, 10]} />
        <meshStandardMaterial 
          color="#ff0000" 
          emissive="#ff0000" 
          emissiveIntensity={30}
        />
      </mesh>
      
      {/* HUGE blue box - above red box */}
      <mesh ref={blueBoxRef} position={[player.position.x, player.position.y + 5, player.position.z]}>
        <boxGeometry args={[8, 8, 8]} />
        <meshStandardMaterial 
          color="#0000ff" 
          emissive="#0000ff" 
          emissiveIntensity={30}
        />
      </mesh>
    </>
  )
}

