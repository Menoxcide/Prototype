/**
 * Enhanced Asset Loader
 * Loads and manages Pixellab-generated enhanced textures and city objects
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

export interface EnhancedAsset {
  id: string
  pixellabObjectId: string
  type: 'texture' | 'object'
  category: string
  url?: string
  texture?: THREE.Texture
}

class EnhancedAssetLoader {
  private loadedAssets: Map<string, EnhancedAsset> = new Map()
  private loadingPromises: Map<string, Promise<THREE.Texture>> = new Map()
  
  // Pixellab tile/object IDs for created assets
  // Using isometric tiles for textures and objects
  private readonly ASSET_OBJECT_IDS: Record<string, string> = {
    // Textures (isometric tiles)
    'rain-texture': '0cd37bbc-60c5-4c69-b4c1-3454f5ce4edb',
    'skybox-texture': 'aaf0ef1a-3d4b-4c0d-8164-9dee1d0bf3b4',
    'ground-texture': '6e11a612-7a36-46f8-933c-8ea5759f01ed',
    'building-texture': '8c1a8436-1fe4-4689-b722-371bad82c468',
    
    // City Objects (isometric tiles)
    'park-bench': '58bd0b6a-43c0-4cc8-bfeb-8aad9c1f7213',
    'garden-bed': '3ef24f07-de5a-44e6-9248-cff08a390b92', // Processing
    'grass-patch': '6e11a612-7a36-46f8-933c-8ea5759f01ed', // Same as ground
    'tree': 'f34da9e9-a278-4979-9c16-f09256c48ba6',
    'stone-walkway': 'ca6034c6-31b6-454c-8072-b4168762f10e', // Processing
    'fountain': 'c226d1a6-0aaa-439e-846f-17bdc1fd4909',
    'npc-character': 'ee604b8a-300c-4979-88c1-36d56f488b13', // Character - processing
    'animal-cat': '7972f4e0-f3e7-4491-869c-6d66ef10491b', // Character - processing
    'animal-dog': '02e61a00-8c4a-4bbb-a80f-33b05e9f1150', // Character - processing
    'flower-red': 'd8392f38-962c-434b-935f-aba3f95c3dc1',
    'flower-yellow': '9a4eae15-e0e4-4d98-8b16-70b4156e6f9f',
    'flower-blue': 'eb1321d5-7857-49b6-a8ca-f6b7fb2d0324',
  }
  
  /**
   * Get Pixellab download URL for an isometric tile
   */
  private getPixellabTileUrl(tileId: string): string {
    return `https://api.pixellab.ai/mcp/isometric-tile/${tileId}/download`
  }
  
  
  /**
   * Load a texture from Pixellab
   */
  async loadTexture(assetId: string): Promise<THREE.Texture> {
    // Check cache
    if (this.loadedAssets.has(assetId)) {
      const asset = this.loadedAssets.get(assetId)!
      if (asset.texture) {
        return asset.texture
      }
    }
    
    // Check if already loading
    if (this.loadingPromises.has(assetId)) {
      return this.loadingPromises.get(assetId)!
    }
    
    // Start loading
    const loadPromise = this.loadTextureInternal(assetId)
    this.loadingPromises.set(assetId, loadPromise)
    
    try {
      const texture = await loadPromise
      this.loadingPromises.delete(assetId)
      return texture
    } catch (error) {
      this.loadingPromises.delete(assetId)
      throw error
    }
  }
  
  private async loadTextureInternal(assetId: string): Promise<THREE.Texture> {
    const objectId = this.ASSET_OBJECT_IDS[assetId]
    if (!objectId) {
      throw new Error(`No object ID found for asset: ${assetId}`)
    }
    
    const url = this.getPixellabTileUrl(objectId)
    const textureId = `enhanced-${assetId}`
    
    // Check if already loaded in asset manager
    let texture = assetManager.getTexture(textureId)
    if (texture) {
      return texture
    }
    
    // Load from Pixellab
    return new Promise<THREE.Texture>((resolve) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        url,
        (loadedTexture) => {
          // Configure texture
          loadedTexture.flipY = false
          loadedTexture.generateMipmaps = true
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
          loadedTexture.magFilter = THREE.LinearFilter
          loadedTexture.anisotropy = 16
          
          // Cache in asset manager
          ;(assetManager as any).textures.set(textureId, loadedTexture)
          
          // Store asset info
          const asset: EnhancedAsset = {
            id: assetId,
            pixellabObjectId: objectId,
            type: 'texture',
            category: this.getCategory(assetId),
            url,
            texture: loadedTexture
          }
          this.loadedAssets.set(assetId, asset)
          
          resolve(loadedTexture)
        },
        undefined,
        (error) => {
          console.error(`Failed to load enhanced asset ${assetId}:`, error)
          // Create fallback texture
          const fallback = assetManager.generateTexture(textureId, 64, 64, (ctx) => {
            ctx.fillStyle = '#333333'
            ctx.fillRect(0, 0, 64, 64)
            ctx.fillStyle = '#ffffff'
            ctx.font = '12px Arial'
            ctx.fillText(assetId, 5, 32)
          })
          resolve(fallback)
        }
      )
    })
  }
  
  /**
   * Get category for an asset
   */
  private getCategory(assetId: string): string {
    if (assetId.includes('texture')) return 'texture'
    if (assetId.includes('bench') || assetId.includes('fountain') || assetId.includes('garden')) return 'decoration'
    if (assetId.includes('tree') || assetId.includes('grass') || assetId.includes('flower')) return 'vegetation'
    if (assetId.includes('walkway') || assetId.includes('path')) return 'path'
    if (assetId.includes('npc') || assetId.includes('character')) return 'character'
    if (assetId.includes('animal')) return 'animal'
    return 'object'
  }
  
  /**
   * Register a new asset object ID (called after asset creation)
   */
  registerAsset(assetId: string, objectId: string): void {
    this.ASSET_OBJECT_IDS[assetId] = objectId
  }
  
  /**
   * Get asset info
   */
  getAsset(assetId: string): EnhancedAsset | undefined {
    return this.loadedAssets.get(assetId)
  }
  
  /**
   * Preload all enhanced textures
   */
  async preloadTextures(): Promise<void> {
    const textureAssets = Object.keys(this.ASSET_OBJECT_IDS).filter(id => 
      id.includes('texture') && this.ASSET_OBJECT_IDS[id]
    )
    
    console.log(`Preloading ${textureAssets.length} enhanced textures...`)
    
    const loadPromises = textureAssets.map(id => 
      this.loadTexture(id).catch(err => {
        console.warn(`Failed to preload ${id}:`, err)
        return null
      })
    )
    
    await Promise.all(loadPromises)
    console.log('Enhanced textures preloaded')
  }
}

export const enhancedAssetLoader = new EnhancedAssetLoader()

