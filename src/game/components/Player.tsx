/**
 * SIMPLIFIED PLAYER COMPONENT
 * Single source of truth for player position and rendering
 * Based on React Three Fiber best practices
 */

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'
import { assetManager } from '../assets/assetManager'
import { RACE_TO_CHARACTER } from '../assets/spriteCharacterLoader'
import EnhancedSpriteCharacter from './EnhancedSpriteCharacter'
import PlayerNameplate from './PlayerNameplate'
import { loadingOrchestrator } from '../utils/loadingOrchestrator'

export default function Player() {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group | THREE.Object3D | null>(null)
  // Use selective subscription to reduce re-renders
  const player = useGameStore((state) => state.player)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [useSprite, setUseSprite] = useState(false)
  const [spriteCharacterId, setSpriteCharacterId] = useState<string | null>(null)
  
  // Get camera mode to hide player in first person
  const cameraMode = useGameStore((state) => state.cameraMode)
  const isFirstPerson = cameraMode === 'first-person'
  
  // Performance: Only update matrix when position actually changes
  const lastPosition = useRef<{ x: number; y: number; z: number; rotation: number } | null>(null)
  
  // Check if we have a Pixellab character for this race
  useEffect(() => {
    if (!player) return
    const characterId = RACE_TO_CHARACTER[player.race]
    if (characterId) {
      setSpriteCharacterId(characterId)
      setUseSprite(true)
    }
  }, [player?.race])
  
  // Mark player as loaded when model is ready
  useEffect(() => {
    if (modelLoaded && player) {
      loadingOrchestrator.markFeatureLoaded('Player')
    }
  }, [modelLoaded, player])
  
  // Load player model using model loader
  useEffect(() => {
    if (!player) return
    
    const raceData = RACES[player.race]
    const loadModel = async () => {
      try {
        // Try to load from path first, fallback to procedural
        const modelId = `player-${player.race}`
        let model: THREE.Group | THREE.Object3D | null = null
        
        // Check if we have a cached model
        model = assetManager.getModel(modelId, 'high')
        
        if (!model) {
          // Load procedural model with race-specific colors
          model = await assetManager.loadModel(
            modelId,
            'player',
            {
              color: raceData.color,
              emissive: raceData.glowColor,
              scale: 1.0
            }
          )
        }
        
        if (model && groupRef.current) {
          // Remove old model if it exists
          if (modelRef.current) {
            groupRef.current.remove(modelRef.current)
          }
          
          // Clone and add new model
          const clonedModel = model.clone()
          modelRef.current = clonedModel
          groupRef.current.add(clonedModel)
          setModelLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load player model:', error)
        setModelLoaded(false)
      }
    }
    
    loadModel()
    
    // Cleanup on unmount
    return () => {
      if (modelRef.current && groupRef.current) {
        groupRef.current.remove(modelRef.current)
        modelRef.current = null
      }
      assetManager.releaseModel(`player-${player.race}`)
    }
  }, [player?.race])

  // Update position EVERY frame - sync with store
  
  useFrame(() => {
    if (!groupRef.current) return
    
    // Get fresh player state
    const currentPlayer = useGameStore.getState().player
    if (!currentPlayer) return
    
    // Check if position actually changed to avoid unnecessary updates
    const posChanged = !lastPosition.current ||
      Math.abs(currentPlayer.position.x - lastPosition.current.x) > 0.001 ||
      Math.abs(currentPlayer.position.y - lastPosition.current.y) > 0.001 ||
      Math.abs(currentPlayer.position.z - lastPosition.current.z) > 0.001 ||
      Math.abs(currentPlayer.rotation - lastPosition.current.rotation) > 0.001
    
    if (posChanged) {
      // Directly set position - immediate sync with store
      groupRef.current.position.set(
        currentPlayer.position.x,
        currentPlayer.position.y,
        currentPlayer.position.z
      )
      groupRef.current.rotation.y = currentPlayer.rotation
      
      // CRITICAL: Update matrix BEFORE Html components try to read it
      // Html components from drei (PlayerNameplate) need the parent matrix updated
      // Use true to update children recursively (needed for Html components)
      // Performance: Only update matrix when position changed (already checked above)
      groupRef.current.updateMatrixWorld(true)
      
      // Update cached position
      lastPosition.current = {
        x: currentPlayer.position.x,
        y: currentPlayer.position.y,
        z: currentPlayer.position.z,
        rotation: currentPlayer.rotation
      }
    }
  })

  // Check if player is crouching (we'll get this from controls via a store state or prop)
  // For now, we'll use a simple approach - check player Y position
  const isCrouching = player?.position.y ? player.position.y < 0.6 : false // Crouched players are lower

  // Set initial position on mount
  useEffect(() => {
    if (!player || !groupRef.current) return
    
    groupRef.current.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    )
    groupRef.current.rotation.y = player.rotation
    groupRef.current.updateMatrixWorld(true)
    
    if (import.meta.env.DEV) {
      console.log('✅ Player group initialized:', {
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        rotation: player.rotation,
        visible: groupRef.current.visible,
        inScene: groupRef.current.parent !== null
      })
    }
  }, [player?.id]) // Only on player ID change

  // Apply crouching scale to model
  useEffect(() => {
    if (!player || !modelRef.current || !groupRef.current) return
    
    const scale = isCrouching ? 0.6 : 1.0
    modelRef.current.scale.y = scale
  }, [isCrouching, player])

  // Early return AFTER all hooks are declared (fixes React error #310)
  if (!player) return null

  const raceData = RACES[player.race]

  return (
    <group 
      ref={groupRef}
      userData={{ isPlayerGroup: true, playerId: player.id }}
    >
      {/* Use 2.5D isometric sprite if available */}
      {useSprite && spriteCharacterId && !isFirstPerson && (
        <EnhancedSpriteCharacter
          characterId={spriteCharacterId}
          position={[
            player.position.x,
            // Player center is at y = 1.1 (terrainHeight + PLAYER_HEIGHT/2 + 0.1)
            // Sprite height is 1.5 (1 * scale), centered on position, so bottom is at position.y - 0.75
            // To position sprite bottom clearly above ground (y = 0.3): spriteY = 0.3 + 0.75 = 1.05
            // Offset from player center: 1.05 - 1.1 = -0.05
            player.position.y - 0.05, // Position sprite so bottom edge is clearly above ground
            player.position.z
          ]}
          rotation={player.rotation}
          scale={1.5}
          instanceId={`player-${player.id}`}
          enableDepth={true}
          depthOffset={0.05}
        />
      )}

      {/* 3D Model loaded from model loader (fallback if no sprite) */}
      {!useSprite && modelLoaded && modelRef.current && (
        <primitive 
          object={modelRef.current} 
          visible={!isFirstPerson}
          castShadow 
          receiveShadow
        />
      )}

      {/* Fallback to simple geometry if model not loaded and no sprite */}
      {!useSprite && !modelLoaded && (
        <>
          <mesh visible={!isFirstPerson} castShadow receiveShadow scale={[1, isCrouching ? 0.6 : 1, 1]}>
            <capsuleGeometry args={[0.4, 1.6, 8, 16]} />
            <meshStandardMaterial
              color={raceData.color}
              emissive={raceData.glowColor}
              emissiveIntensity={0.8}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          <mesh visible={!isFirstPerson} scale={[1.1, 1.1, 1.1]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial
              color={raceData.glowColor}
              emissive={raceData.glowColor}
              emissiveIntensity={0.2}
              transparent
              opacity={0.2}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      )}

      {/* Subtle point light */}
      <pointLight
        position={[0, 0.8, 0]}
        intensity={0.4}
        color={raceData.glowColor}
        distance={5}
        decay={2}
      />

      {/* Nameplate - rendered as standalone component that tracks player position */}
      <PlayerNameplate 
        key={`player-nameplate-${player.id}`}
        playerId={player.id} 
        position={[0, 2.2, 0]} 
      />
    </group>
  )
}

