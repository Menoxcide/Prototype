/**
 * Tileset Loader - Handles loading pixel art tilesets from Pixellab
 * Supports zone-specific tilesets and texture caching
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

// Zone tileset IDs from Pixellab MCP
export const ZONE_TILESETS: Record<string, string> = {
  nexus_city: '40b8bc42-eb26-4b55-9265-5da20238c992',
  quantum_peak: 'a513db54-6bd9-464f-8670-cf40b0632f1f',
  void_depths: 'b719057f-c055-4e6d-933b-5137d1cfa987',
  neon_district: '7ee11e2a-e4c5-405d-892d-ab0c831b2745',
  data_stream: '08604457-a55d-462f-b247-7b02365e0a6a'
}

// CyberpunkCity specific terrain tilesets
export const CYBERPUNK_TERRAIN_TILESETS: Record<string, string> = {
  roads: 'ff25a566-d0f0-4c30-bed8-61e8cba689f2',
  grass: 'cf165ce0-165e-4a96-9aff-bc0e2f06010b',
  pavement: 'b4e2f611-9d12-44ea-8d62-a0519637b3c8'
}

// Tileset image URLs
const TILESET_IMAGE_URLS: Record<string, string> = {
  nexus_city: 'https://api.pixellab.ai/mcp/tilesets/40b8bc42-eb26-4b55-9265-5da20238c992/image',
  quantum_peak: 'https://api.pixellab.ai/mcp/tilesets/a513db54-6bd9-464f-8670-cf40b0632f1f/image',
  void_depths: 'https://api.pixellab.ai/mcp/tilesets/b719057f-c055-4e6d-933b-5137d1cfa987/image',
  neon_district: 'https://api.pixellab.ai/mcp/tilesets/7ee11e2a-e4c5-405d-892d-ab0c831b2745/image',
  data_stream: 'https://api.pixellab.ai/mcp/tilesets/08604457-a55d-462f-b247-7b02365e0a6a/image',
  // CyberpunkCity terrain tilesets
  'cyberpunk-roads': 'https://api.pixellab.ai/mcp/tilesets/ff25a566-d0f0-4c30-bed8-61e8cba689f2/image',
  'cyberpunk-grass': 'https://api.pixellab.ai/mcp/tilesets/cf165ce0-165e-4a96-9aff-bc0e2f06010b/image',
  'cyberpunk-pavement': 'https://api.pixellab.ai/mcp/tilesets/b4e2f611-9d12-44ea-8d62-a0519637b3c8/image'
}

/**
 * Map biomes to appropriate zone tilesets
 * Biomes without direct tileset URLs fall back to appropriate zone tilesets
 */
function mapBiomeToZone(biomeId: string): string {
  // If it's already a zone with a tileset, return it
  if (TILESET_IMAGE_URLS[biomeId]) {
    return biomeId
  }

  // Map biomes to zones based on level ranges and characteristics
  const biomeToZoneMap: Record<string, string> = {
    // Starting biomes (level 1-8) -> nexus_city
    'sunflower_meadows': 'nexus_city',
    'crystal_forest': 'nexus_city',
    'rainbow_hills': 'nexus_city',
    
    // Mid-level biomes (level 5-18) -> neon_district or quantum_peak
    'candy_canyon': 'neon_district',
    'ocean_reef': 'quantum_peak', // Water-themed, use quantum_peak
    'starlight_desert': 'neon_district',
    'frosty_peaks': 'quantum_peak',
    'volcano_islands': 'quantum_peak',
    'cloud_kingdom': 'quantum_peak',
    
    // High-level biomes (level 15+) -> void_depths or data_stream
    'enchanted_grove': 'data_stream',
    'neon_city': 'neon_district',
    'cosmic_garden': 'void_depths',
  }

  // Return mapped zone or default to nexus_city
  return biomeToZoneMap[biomeId] || 'nexus_city'
}

class TilesetLoader {
  private loadedTextures: Map<string, THREE.Texture> = new Map()
  private loadingPromises: Map<string, Promise<THREE.Texture>> = new Map()

  /**
   * Load a tileset texture for a zone or biome
   * Automatically maps biomes to appropriate zone tilesets
   */
  async loadZoneTileset(zoneId: string): Promise<THREE.Texture> {
    // Map biome to zone if needed
    const mappedZoneId = mapBiomeToZone(zoneId)
    
    // Check cache (check both original and mapped IDs)
    if (this.loadedTextures.has(zoneId)) {
      return this.loadedTextures.get(zoneId)!
    }
    if (this.loadedTextures.has(mappedZoneId)) {
      const texture = this.loadedTextures.get(mappedZoneId)!
      // Cache under original ID too for future lookups
      this.loadedTextures.set(zoneId, texture)
      return texture
    }

    // Check if already loading
    if (this.loadingPromises.has(zoneId)) {
      return this.loadingPromises.get(zoneId)!
    }
    if (this.loadingPromises.has(mappedZoneId)) {
      const promise = this.loadingPromises.get(mappedZoneId)!
      // Also cache the promise under original ID
      this.loadingPromises.set(zoneId, promise)
      return promise
    }

    // Start loading
    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      const imageUrl = TILESET_IMAGE_URLS[mappedZoneId]
      if (!imageUrl) {
        reject(new Error(`No tileset URL found for zone: ${zoneId} (mapped to: ${mappedZoneId})`))
        return
      }

      const loader = new THREE.TextureLoader()
      loader.load(
        imageUrl,
        (texture) => {
          // Configure texture for tiling
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(1, 1)
          texture.generateMipmaps = true
          texture.minFilter = THREE.LinearMipmapLinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.anisotropy = 16
          
          // Cache under both original and mapped IDs
          this.loadedTextures.set(mappedZoneId, texture)
          this.loadedTextures.set(zoneId, texture)
          this.loadingPromises.delete(mappedZoneId)
          this.loadingPromises.delete(zoneId)
          resolve(texture)
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(mappedZoneId)
          this.loadingPromises.delete(zoneId)
          console.error(`Failed to load tileset for zone ${zoneId} (mapped to ${mappedZoneId}):`, error)
          // Fallback to procedural texture
          const fallbackTexture = assetManager.getTexture(`ground-${zoneId}`) || 
            assetManager.generateTexture(`ground-${zoneId}`, 512, 512, (ctx) => {
              ctx.fillStyle = '#0a0a0a'
              ctx.fillRect(0, 0, 512, 512)
            })
          // Cache fallback texture
          this.loadedTextures.set(zoneId, fallbackTexture)
          resolve(fallbackTexture)
        }
      )
    })

    // Cache promise under both IDs
    this.loadingPromises.set(mappedZoneId, loadPromise)
    this.loadingPromises.set(zoneId, loadPromise)
    return loadPromise
  }

  /**
   * Get a cached tileset texture
   */
  getZoneTileset(zoneId: string): THREE.Texture | null {
    return this.loadedTextures.get(zoneId) || null
  }

  /**
   * Load a cyberpunk terrain tileset (roads, grass, pavement)
   */
  async loadCyberpunkTerrainTileset(terrainType: 'roads' | 'grass' | 'pavement'): Promise<THREE.Texture> {
    const tilesetId = `cyberpunk-${terrainType}`
    
    // Check cache
    if (this.loadedTextures.has(tilesetId)) {
      return this.loadedTextures.get(tilesetId)!
    }
    
    // Check if already loading
    if (this.loadingPromises.has(tilesetId)) {
      return this.loadingPromises.get(tilesetId)!
    }
    
    // Start loading
    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      const imageUrl = TILESET_IMAGE_URLS[tilesetId]
      if (!imageUrl) {
        reject(new Error(`No tileset URL found for terrain type: ${terrainType}`))
        return
      }

      const loader = new THREE.TextureLoader()
      loader.load(
        imageUrl,
        (texture) => {
          // Configure texture for tiling
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.generateMipmaps = true
          texture.minFilter = THREE.LinearMipmapLinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.anisotropy = 16
          texture.flipY = false
          
          this.loadedTextures.set(tilesetId, texture)
          this.loadingPromises.delete(tilesetId)
          resolve(texture)
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(tilesetId)
          console.error(`Failed to load cyberpunk terrain tileset ${terrainType}:`, error)
          // Create fallback texture
          const fallbackTexture = assetManager.generateTexture(tilesetId, 512, 512, (ctx) => {
            if (terrainType === 'roads') {
              ctx.fillStyle = '#2a2a3a'
              ctx.fillRect(0, 0, 512, 512)
              ctx.strokeStyle = '#ffff00'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.moveTo(256, 0)
              ctx.lineTo(256, 512)
              ctx.stroke()
            } else if (terrainType === 'grass') {
              ctx.fillStyle = '#1a3a1a'
              ctx.fillRect(0, 0, 512, 512)
            } else {
              ctx.fillStyle = '#3a3a3a'
              ctx.fillRect(0, 0, 512, 512)
            }
          })
          this.loadedTextures.set(tilesetId, fallbackTexture)
          resolve(fallbackTexture)
        }
      )
    })

    this.loadingPromises.set(tilesetId, loadPromise)
    return loadPromise
  }

  /**
   * Preload all zone tilesets
   */
  async preloadAllTilesets(): Promise<void> {
    const promises = Object.keys(ZONE_TILESETS).map(zoneId => 
      this.loadZoneTileset(zoneId).catch(err => {
        console.error(`Failed to preload tileset for ${zoneId}:`, err)
      })
    )
    await Promise.all(promises)
  }
}

export const tilesetLoader = new TilesetLoader()

