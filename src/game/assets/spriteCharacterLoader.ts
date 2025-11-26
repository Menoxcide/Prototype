/**
 * Sprite Character Loader - Handles loading 2.5D isometric characters
 * 
 * Characters are loaded from static assets in /characters/{characterId}/rotations/
 * These are downloaded via scripts/download-pixellab-characters.js using Pixellab MCP
 * 
 * Supports 8-directional sprites and animations
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

// Map game races to Pixellab character IDs
// Using characters that have 8 directions and support animations
export const RACE_TO_CHARACTER: Record<string, string> = {
  human: '6f5e80b8-417c-4960-84a6-31adb96bc5f9', // DarkKnight_Player (8 dirs, 5 anims)
  cyborg: '6f5e80b8-417c-4960-84a6-31adb96bc5f9', // DarkKnight_Player (armored, 8 dirs, 5 anims)
  android: 'd8cc9856-9a12-47f2-84e2-70f533bf4846', // Lunari_Male_Idle_128px (8 dirs)
  voidborn: '2ac79bab-b877-4f64-9001-6ef39de81c27', // Aetherborn_Male (ethereal, 8 dirs)
  quantum: 'f28518bf-a35e-4b49-bfeb-effd64958c55', // Aetherborn_Male_Idle (energy-based, 8 dirs)
}

// Direction mapping: game rotation to Pixellab direction
export const DIRECTION_MAP: Record<number, string> = {
  0: 'south',        // 0° = south
  45: 'south-west',  // 45° = south-west
  90: 'west',        // 90° = west
  135: 'north-west', // 135° = north-west
  180: 'north',      // 180° = north
  225: 'north-east', // 225° = north-east
  270: 'east',       // 270° = east
  315: 'south-east', // 315° = south-east
}

/**
 * Convert rotation angle to nearest Pixellab direction
 */
export function getDirectionFromRotation(rotation: number): string {
  // Normalize rotation to 0-360
  const normalized = ((rotation * 180 / Math.PI) % 360 + 360) % 360
  
  // Find closest direction
  const directions = [0, 45, 90, 135, 180, 225, 270, 315]
  let closest = directions[0]
  let minDiff = Math.abs(normalized - closest)
  
  for (const dir of directions) {
    const diff = Math.abs(normalized - dir)
    if (diff < minDiff) {
      minDiff = diff
      closest = dir
    }
  }
  
  return DIRECTION_MAP[closest] || 'south'
}

interface CharacterSprites {
  characterId: string
  directions: Map<string, THREE.Texture>
  animations?: Map<string, Map<string, THREE.Texture[]>>
  size: { width: number; height: number }
}

class SpriteCharacterLoader {
  private loadedCharacters: Map<string, CharacterSprites> = new Map()
  private loadingPromises: Map<string, Promise<CharacterSprites>> = new Map()

  /**
   * Load a Pixellab character with all directions
   */
  async loadCharacter(characterId: string): Promise<CharacterSprites> {
    // Check cache
    if (this.loadedCharacters.has(characterId)) {
      return this.loadedCharacters.get(characterId)!
    }

    // Check if already loading
    if (this.loadingPromises.has(characterId)) {
      return this.loadingPromises.get(characterId)!
    }

    // Start loading
    const loadPromise = this.loadCharacterFromPixellab(characterId)
    this.loadingPromises.set(characterId, loadPromise)
    
    const sprites = await loadPromise
    this.loadedCharacters.set(characterId, sprites)
    this.loadingPromises.delete(characterId)
    
    return sprites
  }

  private async loadCharacterFromPixellab(characterId: string): Promise<CharacterSprites> {
    // Load character from static assets (downloaded via Pixellab MCP)
    const directions = ['south', 'west', 'east', 'north', 'south-east', 'north-east', 'north-west', 'south-west']
    const directionTextures = new Map<string, THREE.Texture>()
    const loader = new THREE.TextureLoader()

    // Use static paths from public/characters directory
    // Path: /characters/{characterId}/rotations/{direction}.png
    const basePath = `/characters/${characterId}/rotations`

    // Load all direction textures
    const loadPromises = directions.map(async (direction) => {
      const textureId = `sprite-${characterId}-${direction}`
      
      // Check if already cached
      let texture = assetManager.getTexture(textureId)
      if (texture) {
        directionTextures.set(direction, texture)
        return
      }

      // Load from static path
      const imageUrl = `${basePath}/${direction}.png`
      
      try {
        texture = await new Promise<THREE.Texture>((resolve) => {
          loader.load(
            imageUrl,
            (loadedTexture) => {
              // Configure texture for sprite rendering
              loadedTexture.flipY = false
              loadedTexture.generateMipmaps = true
              loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
              loadedTexture.magFilter = THREE.LinearFilter
              loadedTexture.anisotropy = 16
              
              // Cache the texture
              assetManager.generateTexture(textureId, 1, 1, () => {}) // Create entry
              // Replace with actual loaded texture
              const cached = assetManager.getTexture(textureId)
              if (cached) {
                cached.dispose()
              }
              // Store in asset manager's texture map directly
              ;(assetManager as any).textures.set(textureId, loadedTexture)
              
              resolve(loadedTexture)
            },
            undefined,
            (error) => {
              console.warn(`Failed to load sprite ${direction} for character ${characterId}:`, error)
              // Create fallback placeholder
              const fallback = assetManager.generateTexture(textureId, 64, 64, (ctx) => {
                ctx.fillStyle = '#333333'
                ctx.fillRect(0, 0, 64, 64)
                ctx.fillStyle = '#00ffff'
                ctx.font = '10px Arial'
                ctx.fillText('?', 28, 32)
              })
              resolve(fallback)
            }
          )
        })
      } catch (error) {
        console.error(`Error loading sprite ${direction}:`, error)
        // Create fallback
        texture = assetManager.generateTexture(textureId, 64, 64, (ctx) => {
          ctx.fillStyle = '#333333'
          ctx.fillRect(0, 0, 64, 64)
          ctx.fillStyle = '#00ffff'
          ctx.font = '10px Arial'
          ctx.fillText('?', 28, 32)
        })
      }
      
      directionTextures.set(direction, texture)
    })

    await Promise.all(loadPromises)

    return {
      characterId,
      directions: directionTextures,
      size: { width: 64, height: 64 } // Default size, can be updated from character metadata
    }
  }

  /**
   * Get sprite texture for a character and direction
   */
  getSprite(characterId: string, direction: string): THREE.Texture | null {
    const character = this.loadedCharacters.get(characterId)
    if (!character) return null
    return character.directions.get(direction) || null
  }

  /**
   * Load character for a game race
   */
  async loadRaceCharacter(race: string): Promise<CharacterSprites | null> {
    const characterId = RACE_TO_CHARACTER[race]
    if (!characterId) return null
    
    try {
      return await this.loadCharacter(characterId)
    } catch (error) {
      console.error(`Failed to load character for race ${race}:`, error)
      return null
    }
  }
}

export const spriteCharacterLoader = new SpriteCharacterLoader()

