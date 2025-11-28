/**
 * Monster Sprite Loader - Handles loading monster sprites from Pixellab map objects
 * 
 * Monsters are loaded from static assets in /assets/monsters/
 * These are downloaded via scripts/download-pixellab-assets.js using Pixellab MCP
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

// Map game monster IDs to Pixellab object IDs
// These will be populated as monsters are created
export const MONSTER_TO_SPRITE: Record<string, string> = {
  // Starting area monsters
  bumblebee: '', // Will be created
  butterfly_swarm: '', // Will be created
  meadow_sprite: '', // Will be created
  crystal_sprite: '', // Will be created
  forest_guardian: '', // Will be created
  glow_worm: '', // Will be created
  cloud_bunny: '', // Will be created
  rainbow_slime: '', // Will be created
  sky_whale: '', // Will be created
  // Mid-level monsters
  gingerbread_guard: '', // Will be created
  lollipop_slime: '', // Will be created
  candy_golem: '', // Will be created
  jellyfish: '', // Will be created
  crab_guard: '', // Will be created
  sea_snake: '', // Will be created
  friendly_scorpion: '', // Will be created
  sand_ghost: '', // Will be created
  desert_fox: '', // Will be created
  snow_sprite: '', // Will be created
  ice_golem: '', // Will be created
  polar_bear_cub: '', // Will be created
  // Advanced monsters
  lava_slime: '', // Will be created
  fire_sprite: '', // Will be created
  volcano_guardian: '', // Will be created
  cloud_dragon: '', // Will be created
  wind_spirit: '', // Will be created
  sky_knight: '', // Will be created
  forest_dragon: '', // Will be created
  tree_guardian: '', // Will be created
  magic_wisp: '', // Will be created
  friendly_robot: '', // Will be created
  cyber_slime: '', // Will be created
  neon_guardian: '', // Will be created
  star_sprite: '', // Will be created
  comet_creature: '', // Will be created
  cosmic_guardian: '', // Will be created
}

interface MonsterSprite {
  texture: THREE.Texture
  width: number
  height: number
}

class MonsterSpriteLoader {
  private loadedSprites: Map<string, MonsterSprite> = new Map()
  private loadingPromises: Map<string, Promise<MonsterSprite>> = new Map()

  /**
   * Load a monster sprite
   */
  async loadMonster(monsterId: string): Promise<MonsterSprite> {
    // Check cache
    if (this.loadedSprites.has(monsterId)) {
      return this.loadedSprites.get(monsterId)!
    }

    // Check if already loading
    if (this.loadingPromises.has(monsterId)) {
      return this.loadingPromises.get(monsterId)!
    }

    // Start loading
    const loadPromise = this.loadMonsterInternal(monsterId)
    this.loadingPromises.set(monsterId, loadPromise)

    try {
      const sprite = await loadPromise
      this.loadingPromises.delete(monsterId)
      return sprite
    } catch (error) {
      this.loadingPromises.delete(monsterId)
      throw error
    }
  }

  private async loadMonsterInternal(monsterId: string): Promise<MonsterSprite> {
    const objectId = MONSTER_TO_SPRITE[monsterId]
    if (!objectId) {
      // Fallback to procedural sprite
      return this.createFallbackSprite(monsterId)
    }

    const textureId = `monster-${monsterId}`
    
    // Check if already loaded in asset manager
    let texture = assetManager.getTexture(textureId)
    if (texture) {
      const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | null
      const sprite: MonsterSprite = {
        texture,
        width: image?.width || 32,
        height: image?.height || 32
      }
      this.loadedSprites.set(monsterId, sprite)
      return sprite
    }

    // Load from static path
    const imageUrl = `/assets/monsters/${objectId}.png`
    
    return new Promise<MonsterSprite>((resolve) => {
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
          
          const sprite: MonsterSprite = {
            texture: loadedTexture,
            width: loadedTexture.image?.width || 32,
            height: loadedTexture.image?.height || 32
          }
          this.loadedSprites.set(monsterId, sprite)
          resolve(sprite)
        },
        undefined,
        (error) => {
          console.warn(`Failed to load monster sprite ${monsterId}, using fallback:`, error)
          resolve(this.createFallbackSprite(monsterId))
        }
      )
    })
  }

  private createFallbackSprite(monsterId: string): MonsterSprite {
    const textureId = `monster-fallback-${monsterId}`
    const texture = assetManager.generateTexture(textureId, 32, 32, (ctx) => {
      ctx.fillStyle = '#ff0000'
      ctx.fillRect(0, 0, 32, 32)
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.fillText(monsterId.substring(0, 4), 4, 20)
    })
    
    const sprite: MonsterSprite = {
      texture,
      width: 32,
      height: 32
    }
    this.loadedSprites.set(monsterId, sprite)
    return sprite
  }

  /**
   * Register a new monster sprite ID
   */
  registerMonster(monsterId: string, objectId: string): void {
    MONSTER_TO_SPRITE[monsterId] = objectId
  }

  /**
   * Get a cached monster sprite
   */
  getMonster(monsterId: string): MonsterSprite | null {
    return this.loadedSprites.get(monsterId) || null
  }
}

export const monsterSpriteLoader = new MonsterSpriteLoader()

