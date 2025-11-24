/**
 * CAMERA COMPONENT
 * First-person camera that follows player (Minecraft-style)
 * Camera rotation is controlled by MinecraftControls via mouse
 */

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

export default function PlayerCamera() {
  const { camera } = useThree()
  
  useFrame(() => {
    const player = useGameStore.getState().player
    if (!player) {
      // Default camera position when no player
      camera.position.lerp(new THREE.Vector3(0, 10, 10), 0.1)
      camera.lookAt(0, 0, 0)
      return
    }
    
    const playerPos = player.position
    const cameraMode = useGameStore.getState().cameraMode
    
    if (cameraMode === 'first-person') {
      // First-person: camera at eye level, rotation controlled by mouse
      camera.position.set(
        playerPos.x,
        playerPos.y + 1.6, // Eye level
        playerPos.z
      )
      // Camera rotation is handled by MinecraftControls via mouse
      // No need to set lookAt here - mouse controls handle it
    } else {
      // Third-person: camera behind and above player
      const cameraDistance = 8
      const cameraHeight = 5
      
      // Calculate offset based on player rotation
      const offsetX = -Math.sin(player.rotation) * cameraDistance
      const offsetZ = -Math.cos(player.rotation) * cameraDistance
      
      const targetX = playerPos.x + offsetX
      const targetY = playerPos.y + cameraHeight
      const targetZ = playerPos.z + offsetZ
      
      // Smooth follow
      camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1)
      
      // Look at player (slightly above ground)
      camera.lookAt(
        playerPos.x,
        playerPos.y + 1,
        playerPos.z
      )
    }
    
    camera.updateMatrixWorld(true)
  })
  
  return null
}

