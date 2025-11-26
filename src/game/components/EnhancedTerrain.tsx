/**
 * Enhanced Cyberpunk Terrain for NEX://VOID
 * Uses pixel art tilesets from Pixellab for zone-specific terrain
 */

import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { tilesetLoader } from '../assets/tilesetLoader'
import { assetManager } from '../assets/assetManager'

export default function EnhancedTerrain() {
  const player = useGameStore((state) => state.player)
  const currentZoneFromStore = useGameStore((state) => state.currentZone)
  const [_terrainTexture, setTerrainTexture] = useState<THREE.Texture | null>(null)
  
  // Determine current zone - prefer store, fallback to player.zone, then default
  const currentZone = currentZoneFromStore || player?.zone || 'nexus_city'

  // Load tileset texture for current zone
  useEffect(() => {
    const loadTexture = async () => {
      try {
        const texture = await tilesetLoader.loadZoneTileset(currentZone)
        setTerrainTexture(texture)
      } catch (error) {
        console.error('Failed to load terrain texture:', error)
        // Try enhanced ground texture as fallback
        try {
          const { enhancedAssetLoader } = await import('../assets/enhancedAssetLoader')
          const enhancedTexture = await enhancedAssetLoader.loadTexture('ground-texture')
          setTerrainTexture(enhancedTexture)
        } catch (enhancedError) {
          // Final fallback to procedural texture
          const fallback = assetManager.getTexture(`ground-${currentZone}`) ||
            assetManager.generateTexture(`ground-${currentZone}`, 512, 512, (ctx) => {
              ctx.fillStyle = '#0a0a0a'
              ctx.fillRect(0, 0, 512, 512)
            })
          setTerrainTexture(fallback)
        }
      }
    }
    
    loadTexture()
  }, [currentZone])

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
