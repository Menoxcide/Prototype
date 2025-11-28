/**
 * NPC Sprite Loader - Handles loading NPC sprites from Pixellab map objects
 * 
 * NPCs are loaded from static assets in /assets/npcs/
 * These are downloaded via scripts/download-pixellab-assets.js using Pixellab MCP
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

// Map game NPC IDs to Pixellab object IDs
// These will be populated as NPCs are created
export const NPC_TO_SPRITE: Record<string, string> = {
  // Sunflower Meadows
  farmer_npc: '', // Will be created
  beekeeper_npc: '', // Will be created
  // Crystal Forest
  crystal_keeper: '', // Will be created
  forest_ranger: '', // Will be created
  // Rainbow Hills
  color_master: '', // Will be created
  cloud_merchant: '', // Will be created
  // Candy Canyon
  candy_chef: '', // Will be created
  sweet_tooth_merchant: '', // Will be created
  // Ocean Reef
  mermaid_merchant: '', // Will be created
  diver_npc: '', // Will be created
  // Starlight Desert
  desert_nomad: '', // Will be created
  star_gazer: '', // Will be created
  // Frosty Peaks
  snowman_npc: '', // Will be created
  ice_merchant: '', // Will be created
  // Volcano Islands
  volcano_explorer: '', // Will be created
  fire_mage: '', // Will be created
  // Cloud Kingdom
  cloud_king: '', // Will be created
  sky_merchant: '', // Will be created
  // Enchanted Grove
  ancient_druid: '', // Will be created
  fairy_queen: '', // Will be created
  // Neon City
  robot_merchant: '', // Will be created
  tech_master: '', // Will be created
  // Cosmic Garden
  star_keeper: '', // Will be created
  cosmic_merchant: '', // Will be created
}

interface NPCSprite {
  texture: THREE.Texture
  width: number
  height: number
}

class NPCSpriteLoader {
  private loadedSprites: Map<string, NPCSprite> = new Map()
  private loadingPromises: Map<string, Promise<NPCSprite>> = new Map()

  /**
   * Load an NPC sprite
   */
  async loadNPC(npcId: string): Promise<NPCSprite> {
    // Check cache
    if (this.loadedSprites.has(npcId)) {
      return this.loadedSprites.get(npcId)!
    }

    // Check if already loading
    if (this.loadingPromises.has(npcId)) {
      return this.loadingPromises.get(npcId)!
    }

    // Start loading
    const loadPromise = this.loadNPCInternal(npcId)
    this.loadingPromises.set(npcId, loadPromise)

    try {
      const sprite = await loadPromise
      this.loadingPromises.delete(npcId)
      return sprite
    } catch (error) {
      this.loadingPromises.delete(npcId)
      throw error
    }
  }

  private async loadNPCInternal(npcId: string): Promise<NPCSprite> {
    const objectId = NPC_TO_SPRITE[npcId]
    if (!objectId) {
      // Fallback to procedural sprite
      return this.createFallbackSprite(npcId)
    }

    const textureId = `npc-${npcId}`
    
    // Check if already loaded in asset manager
    let texture = assetManager.getTexture(textureId)
    if (texture) {
      const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | null
      const sprite: NPCSprite = {
        texture,
        width: image?.width || 32,
        height: image?.height || 32
      }
      this.loadedSprites.set(npcId, sprite)
      return sprite
    }

    // Load from static path
    const imageUrl = `/assets/npcs/${objectId}.png`
    
    return new Promise<NPCSprite>((resolve) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        imageUrl,
        (loadedTexture) => {
          // Configure texture
          loadedTexture.flipY = false
          loadedTexture.generateMipmaps = true
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
          loadedTexture.magFilter = THREE.LinearFilter
          loadedTexture.anisotropy = 16
          
          // Cache in asset manager
          ;(assetManager as any).textures.set(textureId, loadedTexture)
          
          const sprite: NPCSprite = {
            texture: loadedTexture,
            width: loadedTexture.image?.width || 32,
            height: loadedTexture.image?.height || 32
          }
          this.loadedSprites.set(npcId, sprite)
          resolve(sprite)
        },
        undefined,
        (error) => {
          console.warn(`Failed to load NPC sprite ${npcId}, using fallback:`, error)
          resolve(this.createFallbackSprite(npcId))
        }
      )
    })
  }

  private createFallbackSprite(npcId: string): NPCSprite {
    const textureId = `npc-fallback-${npcId}`
    const texture = assetManager.generateTexture(textureId, 32, 32, (ctx) => {
      ctx.fillStyle = '#00ff00'
      ctx.fillRect(0, 0, 32, 32)
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.fillText(npcId.substring(0, 4), 4, 20)
    })
    
    const sprite: NPCSprite = {
      texture,
      width: 32,
      height: 32
    }
    this.loadedSprites.set(npcId, sprite)
    return sprite
  }

  /**
   * Register a new NPC sprite ID
   */
  registerNPC(npcId: string, objectId: string): void {
    NPC_TO_SPRITE[npcId] = objectId
  }

  /**
   * Get a cached NPC sprite
   */
  getNPC(npcId: string): NPCSprite | null {
    return this.loadedSprites.get(npcId) || null
  }
}

export const npcSpriteLoader = new NPCSpriteLoader()

