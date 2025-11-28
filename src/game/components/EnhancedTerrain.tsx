/**
 * Enhanced Cyberpunk Terrain for MARS://NEXUS
 * Uses pixel art tilesets from Pixellab for zone-specific terrain
 * Loads progressively: Phase 1 (critical) loads basic terrain, Phase 2 loads enhanced textures
 */

import { useEffect, useState, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { tilesetLoader } from '../assets/tilesetLoader'
import { assetManager } from '../assets/assetManager'
import { progressiveLoader } from '../utils/progressiveLoader'
import { useLoadingPhase } from '../hooks/useLoadingPhase'
import { loadingOrchestrator } from '../utils/loadingOrchestrator'

export default function EnhancedTerrain() {
  const player = useGameStore((state) => state.player)
  const currentZoneFromStore = useGameStore((state) => state.currentZone)
  const [_terrainTexture, setTerrainTexture] = useState<THREE.Texture | null>(null)
  const { phase } = useLoadingPhase()
  
  // Track registered assets to prevent duplicates (React StrictMode double-invocation)
  const registeredAssetsRef = useRef<Set<string>>(new Set())
  
  // Determine current zone - prefer store, fallback to player.zone, then default
  const currentZone = currentZoneFromStore || player?.zone || 'nexus_city'

  // Phase 1: Load basic terrain texture (critical for entering world)
  useEffect(() => {
    if (phase !== 'phase1' && phase !== 'phase2' && phase !== 'phase3' && phase !== 'complete') {
      return // Wait for phase system to initialize
    }

    const loadBasicTexture = async () => {
      const textureId = `terrain-basic-${currentZone}`
      
      // Only register if not already registered (prevents React StrictMode duplicates)
      if (!registeredAssetsRef.current.has(textureId)) {
        registeredAssetsRef.current.add(textureId)
        
        // Register with progressive loader
        progressiveLoader.addAsset({
          id: textureId,
          type: 'texture',
          priority: 10, // High priority for Phase 1
          critical: true,
          phase: 'phase1'
        })
      }

      try {
        // Try to load tileset texture
        const texture = await tilesetLoader.loadZoneTileset(currentZone)
        setTerrainTexture(texture)
        
        // Mark as loaded
        progressiveLoader.markAssetLoaded(textureId, 'phase1')
        // Also mark texture feature as loaded in orchestrator
        loadingOrchestrator.markFeatureLoaded('Textures')
      } catch (error) {
        console.error('Failed to load terrain texture:', error)
        // Fallback to procedural texture (faster, no network)
        const fallback = assetManager.getTexture(`ground-${currentZone}`) ||
          assetManager.generateTexture(`ground-${currentZone}`, 512, 512, (ctx) => {
            ctx.fillStyle = '#0a0a0a'
            ctx.fillRect(0, 0, 512, 512)
          })
        setTerrainTexture(fallback)
        
        // Mark as loaded even with fallback
        progressiveLoader.markAssetLoaded(textureId, 'phase1')
      }
    }
    
    loadBasicTexture()
  }, [currentZone, phase])

  // Phase 2: Load enhanced textures (non-critical, can load after entering world)
  useEffect(() => {
    if (phase !== 'phase2' && phase !== 'phase3' && phase !== 'complete') {
      return // Wait for Phase 2
    }

    const loadEnhancedTexture = async () => {
      const textureId = `terrain-enhanced-${currentZone}`
      
      // Only register if not already registered (prevents React StrictMode duplicates)
      if (!registeredAssetsRef.current.has(textureId)) {
        registeredAssetsRef.current.add(textureId)
        
        // Register with progressive loader for Phase 2
        progressiveLoader.addAsset({
          id: textureId,
          type: 'texture',
          priority: 5, // Medium priority for Phase 2
          critical: false,
          phase: 'phase2'
        })
      }

      try {
        // Try enhanced ground texture
        const { enhancedAssetLoader } = await import('../assets/enhancedAssetLoader')
        const enhancedTexture = await enhancedAssetLoader.loadTexture('ground-texture')
        
        // Update to enhanced texture if available
        if (enhancedTexture) {
          setTerrainTexture(enhancedTexture)
        }
        
        // Mark as loaded
        progressiveLoader.markAssetLoaded(textureId, 'phase2')
      } catch (enhancedError) {
        // Enhanced texture failed, but we already have basic texture
        console.warn('Enhanced terrain texture not available, using basic texture')
        
        // Mark as loaded anyway (we have fallback)
        progressiveLoader.markAssetLoaded(textureId, 'phase2')
      }
    }
    
    loadEnhancedTexture()
  }, [currentZone, phase])

  // Note: Ground material, grid helper, and ground geometry are commented out
  // because CyberpunkCity component handles the ground rendering to prevent z-fighting
  // These could be uncommented if needed for a different terrain system

  // Remove decorative elements - city buildings handle this

  return (
    <>
      {/* Main ground plane - properly oriented for traversal */}
      {/* Note: CyberpunkCity also has a ground plane, so this one is disabled to prevent z-fighting */}
      {/* Uncomment if you want EnhancedTerrain's ground instead of CyberpunkCity's */}
      {/* 
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
        renderOrder={-1}
      >
        <primitive object={groundGeometry} />
        <primitive object={groundMaterial} />
      </mesh>
      */}

      {/* Cyberpunk grid helper for visual reference - disabled to prevent z-fighting */}
      {/* Grid is now integrated into CyberpunkCity's ground texture */}
      {/* <primitive object={gridHelper} /> */}
    </>
  )
}
