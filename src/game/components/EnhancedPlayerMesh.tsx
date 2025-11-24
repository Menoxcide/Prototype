import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'
import { assetManager } from '../assets/assetManager'
import { createAnimationController, AnimationController } from '../systems/animationSystem'
import PlayerNameplate from './PlayerNameplate'

export default function EnhancedPlayerMesh() {
  const meshRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const animationControllerRef = useRef<AnimationController | null>(null)
  
  // Get player from store - use selector to ensure reactivity
  const player = useGameStore((state) => state.player)

  if (!player) return null

  const raceData = RACES[player.race]
  let material
  try {
    material = assetManager.createEnhancedMaterial(
      `player-${player.race}`,
      raceData.color,
      raceData.glowColor,
      { emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.2 }
    )
  } catch (error) {
    console.error('Failed to create enhanced material, using fallback:', error)
    material = new THREE.MeshStandardMaterial({
      color: raceData.color,
      emissive: raceData.glowColor,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.2
    })
  }

  // Initialize animation controller
  useEffect(() => {
    if (meshRef.current && !animationControllerRef.current) {
      animationControllerRef.current = createAnimationController(meshRef.current)
      animationControllerRef.current.play('idle')
    }
  }, [])

  useFrame((state, delta) => {
    if (!meshRef.current) {
      if (import.meta.env.DEV && Math.random() < 0.001) {
        console.error('❌ meshRef.current is NULL in useFrame!')
      }
      return
    }
    
    // Get fresh player state from store every frame
    const currentPlayer = useGameStore.getState().player
    if (!currentPlayer) {
      return
    }
    
    // Get current mesh position BEFORE update
    const oldX = meshRef.current.position.x
    const oldY = meshRef.current.position.y
    const oldZ = meshRef.current.position.z
    
    // Update mesh position from player state - FORCE update every frame
    const newX = currentPlayer.position.x
    const newY = currentPlayer.position.y
    const newZ = currentPlayer.position.z
    
    // CRITICAL: Always set position, even if it seems the same
    // Directly set position values (more reliable than copy)
    meshRef.current.position.x = newX
    meshRef.current.position.y = newY
    meshRef.current.position.z = newZ
    meshRef.current.rotation.y = currentPlayer.rotation
    
    // Force matrix update IMMEDIATELY - this is critical for rendering
    meshRef.current.updateMatrixWorld(false) // false = don't update children yet
    
    // Update matrix world for all children explicitly
    meshRef.current.traverse((child) => {
      if (child instanceof THREE.Object3D) {
        child.updateMatrixWorld(false)
      }
    })
    
    // Final update to ensure everything is synced
    meshRef.current.updateMatrixWorld(true)
    
    // Get world position after update
    const worldPos = new THREE.Vector3()
    meshRef.current.getWorldPosition(worldPos)
    
    // Debug: Log when position actually changes
    const positionChanged = Math.abs(oldX - newX) > 0.01 || 
                            Math.abs(oldY - newY) > 0.01 || 
                            Math.abs(oldZ - newZ) > 0.01
    
    // Debug logging - log every significant movement
    if (import.meta.env.DEV && positionChanged) {
      const { isPlayerMoving } = useGameStore.getState()
      console.log('🎯 MESH POS:', {
        store: `(${newX.toFixed(2)}, ${newZ.toFixed(2)})`,
        local: `(${meshRef.current.position.x.toFixed(2)}, ${meshRef.current.position.z.toFixed(2)})`,
        world: `(${worldPos.x.toFixed(2)}, ${worldPos.z.toFixed(2)})`,
        moved: `${((newX - oldX) * 100).toFixed(1)}m, ${((newZ - oldZ) * 100).toFixed(1)}m`,
        visible: meshRef.current.visible,
        children: meshRef.current.children.length,
        inScene: meshRef.current.parent !== null
      })
    }
    
    // Also log every 60 frames to verify mesh exists even when not moving
    if (import.meta.env.DEV && state.clock.elapsedTime % 1 < delta) {
      console.log('🔍 MESH STATUS:', {
        exists: !!meshRef.current,
        visible: meshRef.current?.visible,
        position: meshRef.current ? `(${meshRef.current.position.x.toFixed(2)}, ${meshRef.current.position.y.toFixed(2)}, ${meshRef.current.position.z.toFixed(2)})` : 'N/A',
        worldPos: `(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`,
        children: meshRef.current?.children.length || 0
      })
    }

    // Update animations based on actual movement state from store
    if (animationControllerRef.current) {
      const { isPlayerMoving } = useGameStore.getState()
      // Use store's isPlayerMoving flag instead of position check
      const isMoving = isPlayerMoving || positionChanged
      const currentState = animationControllerRef.current.getCurrentState()
      
      if (isMoving && currentState === 'idle') {
        animationControllerRef.current.play('walk')
      } else if (!isMoving && currentState === 'walk') {
        animationControllerRef.current.play('idle')
      }
      
      animationControllerRef.current.update(delta)
    }

    // Subtle floating animation (fallback if no animation controller)
    if (bodyRef.current && !animationControllerRef.current) {
      bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }

    // Pulsing glow
    if (glowRef.current) {
      const glowIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
      if (glowRef.current.material instanceof THREE.MeshStandardMaterial) {
        glowRef.current.material.emissiveIntensity = glowIntensity
      }
    }
  })

  // Get camera mode to hide player in first person
  const cameraMode = useGameStore((state) => state.cameraMode)
  const isFirstPerson = cameraMode === 'first-person'

  // Debug: Log when player mesh renders (only once)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('✅ EnhancedPlayerMesh RENDERED:', {
        playerId: player.id,
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        race: player.race,
        cameraMode,
        meshRefExists: !!meshRef.current
      })
      
      // Set initial position immediately
      if (meshRef.current) {
        meshRef.current.position.set(player.position.x, player.position.y, player.position.z)
        console.log('✅ Initial mesh position set:', {
          x: meshRef.current.position.x,
          y: meshRef.current.position.y,
          z: meshRef.current.position.z
        })
      }
    }
  }, [player.id]) // Only log when player ID changes

  return (
    <group 
      ref={meshRef} 
      visible={true}
    >
      {/* Enhanced player body with better geometry - larger and more visible */}
      <mesh ref={bodyRef} visible={!isFirstPerson}>
        <capsuleGeometry args={[1.5, 4.0, 8, 16]} />
        <primitive object={material} />
      </mesh>
      
      {/* Debug: HUGE visible box INSIDE group - should move with group */}
      {import.meta.env.DEV && (
        <mesh position={[0, 0, 0]} visible={true}>
          <boxGeometry args={[5, 5, 5]} />
          <meshStandardMaterial 
            color="#00ff00" 
            emissive="#00ff00" 
            emissiveIntensity={20}
            transparent={false}
          />
        </mesh>
      )}
      
      {/* Debug: Another box INSIDE group */}
      {import.meta.env.DEV && (
        <mesh position={[0, 3, 0]} visible={true}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial 
            color="#ffff00" 
            emissive="#ffff00" 
            emissiveIntensity={20}
            transparent={false}
          />
        </mesh>
      )}

      {/* Glow effect mesh */}
      <mesh ref={glowRef} scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color={raceData.glowColor}
          emissive={raceData.glowColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Enhanced name tag with better styling */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[2.5, 0.6]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Race-specific visual effects */}
      {player.race === 'voidborn' && (
        <mesh position={[0, 0.5, 0]}>
          <ringGeometry args={[0.8, 1.2, 32]} />
          <meshStandardMaterial
            color={raceData.glowColor}
            emissive={raceData.glowColor}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {player.race === 'quantum' && (
        <>
          <mesh position={[0, 0.3, 0]}>
            <torusGeometry args={[0.7, 0.1, 16, 32]} />
            <meshStandardMaterial
              color={raceData.glowColor}
              emissive={raceData.glowColor}
              emissiveIntensity={0.7}
            />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <torusGeometry args={[0.7, 0.1, 16, 32]} />
            <meshStandardMaterial
              color={raceData.glowColor}
              emissive={raceData.glowColor}
              emissiveIntensity={0.7}
            />
          </mesh>
        </>
      )}

      {/* Enhanced point light */}
      <pointLight
        position={[0, 1, 0]}
        intensity={0.8}
        color={raceData.glowColor}
        distance={8}
        decay={2}
      />

      {/* Additional ambient glow */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={0.3}
        color={raceData.glowColor}
        distance={5}
      />

      {/* Player Nameplate with HP Bar - positioned relative to mesh group */}
      <PlayerNameplate 
        playerId={player.id} 
        position={[0, 2.5, 0]} 
      />
    </group>
  )
}

