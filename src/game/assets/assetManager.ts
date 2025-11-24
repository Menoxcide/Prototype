/**
 * Asset Manager - Centralized asset loading and management
 * Handles textures, sprites, icons, sounds, and animations
 */

import * as THREE from 'three'

export interface AssetDefinition {
  id: string
  type: 'texture' | 'sprite' | 'icon' | 'sound' | 'model' | 'animation'
  path?: string
  data?: string // For inline SVG/data URLs
  options?: any
}

export interface TextureAsset extends AssetDefinition {
  type: 'texture'
  wrapS?: THREE.Wrapping
  wrapT?: THREE.Wrapping
  repeat?: [number, number]
}

export interface IconAsset extends AssetDefinition {
  type: 'icon'
  size?: number
  color?: string
}

class AssetManager {
  private textures: Map<string, THREE.Texture> = new Map()
  private icons: Map<string, string> = new Map()
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private materials: Map<string, THREE.Material> = new Map()
  
  // Reference counting for automatic unloading
  private textureRefs: Map<string, number> = new Map()
  private materialRefs: Map<string, number> = new Map()
  private soundRefs: Map<string, number> = new Map()
  
  // Unused asset cleanup
  private unusedAssetCheckInterval: NodeJS.Timeout | null = null
  private readonly UNUSED_ASSET_TIMEOUT = 60000 // 60 seconds
  private lastUsedTime: Map<string, number> = new Map()
  
  // Zone-based asset loading
  private loadedZones: Set<string> = new Set()
  private zoneAssets: Map<string, Set<string>> = new Map() // zone -> set of asset IDs
  private assetZones: Map<string, Set<string>> = new Map() // asset ID -> set of zones
  private loadingQueue: Array<{ id: string; priority: number; loadFn: () => Promise<void> }> = []
  private isLoading: boolean = false

  /**
   * Generate procedural texture
   */
  generateTexture(
    id: string,
    width: number = 512,
    height: number = 512,
    generator: (ctx: CanvasRenderingContext2D) => void
  ): THREE.Texture {
    if (this.textures.has(id)) {
      // Increment reference count
      this.incrementTextureRef(id)
      return this.textures.get(id)!
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    generator(ctx)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    this.textures.set(id, texture)
    this.textureRefs.set(id, 1)
    this.lastUsedTime.set(id, Date.now())
    
    return texture
  }
  
  /**
   * Increment texture reference count
   */
  private incrementTextureRef(id: string): void {
    const current = this.textureRefs.get(id) || 0
    this.textureRefs.set(id, current + 1)
    this.lastUsedTime.set(id, Date.now())
  }
  
  /**
   * Decrement texture reference count
   */
  releaseTexture(id: string): void {
    const current = this.textureRefs.get(id) || 0
    if (current > 1) {
      this.textureRefs.set(id, current - 1)
    } else {
      // Last reference - mark for potential cleanup
      this.textureRefs.set(id, 0)
    }
  }

  /**
   * Generate grass texture
   */
  generateGrassTexture(): THREE.Texture {
    return this.generateTexture('grass', 512, 512, (ctx) => {
      // Base green
      const gradient = ctx.createLinearGradient(0, 0, 0, 512)
      gradient.addColorStop(0, '#1a4d1a')
      gradient.addColorStop(0.5, '#2d7a2d')
      gradient.addColorStop(1, '#1a4d1a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 512, 512)

      // Add grass blades
      ctx.strokeStyle = '#0f3d0f'
      ctx.lineWidth = 2
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const height = 10 + Math.random() * 20
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 5, y - height)
        ctx.stroke()
      }

      // Add highlights
      ctx.strokeStyle = '#4a9a4a'
      ctx.lineWidth = 1
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const height = 5 + Math.random() * 10
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 3, y - height)
        ctx.stroke()
      }
    })
  }

  /**
   * Generate sky texture
   */
  generateSkyTexture(): THREE.Texture {
    return this.generateTexture('sky', 1024, 512, (ctx) => {
      // Cyberpunk sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 512)
      gradient.addColorStop(0, '#000011') // Dark blue-black at top
      gradient.addColorStop(0.3, '#1a0033') // Purple
      gradient.addColorStop(0.6, '#330066') // Bright purple
      gradient.addColorStop(0.8, '#6600cc') // Cyan-purple
      gradient.addColorStop(1, '#000033') // Dark at horizon
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 1024, 512)

      // Add stars
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * 1024
        const y = Math.random() * 256 // Only in upper half
        const size = Math.random() * 2
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Add neon city glow at horizon
      ctx.fillStyle = '#00ffff'
      ctx.globalAlpha = 0.3
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 1024
        const y = 400 + Math.random() * 112
        const width = 20 + Math.random() * 40
        const height = 10 + Math.random() * 30
        ctx.fillRect(x, y, width, height)
      }
      ctx.globalAlpha = 1.0
    })
  }

  /**
   * Generate cyberpunk ground texture
   */
  generateGroundTexture(): THREE.Texture {
    return this.generateTexture('ground', 512, 512, (ctx) => {
      // Dark base
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, 512, 512)

      // Grid pattern
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.2
      for (let i = 0; i < 32; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 16, 0)
        ctx.lineTo(i * 16, 512)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * 16)
        ctx.lineTo(512, i * 16)
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0

      // Add some wear and texture
      ctx.fillStyle = '#1a1a1a'
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const size = Math.random() * 10
        ctx.fillRect(x, y, size, size)
      }
    })
  }

  /**
   * Generate material with enhanced properties
   */
  createEnhancedMaterial(
    id: string,
    baseColor: string,
    emissiveColor?: string,
    options?: {
      metalness?: number
      roughness?: number
      emissiveIntensity?: number
      normalMap?: THREE.Texture
    }
  ): THREE.MeshStandardMaterial {
    if (this.materials.has(id)) {
      // Increment reference count
      this.incrementMaterialRef(id)
      return this.materials.get(id) as THREE.MeshStandardMaterial
    }

    const materialOptions: any = {
      color: baseColor,
      emissive: emissiveColor || baseColor,
      emissiveIntensity: options?.emissiveIntensity || 0.3,
      metalness: options?.metalness || 0.5,
      roughness: options?.roughness || 0.3,
    }
    
    // Only include normalMap if it's actually provided
    if (options?.normalMap) {
      materialOptions.normalMap = options.normalMap
    }
    
    const material = new THREE.MeshStandardMaterial(materialOptions)

    this.materials.set(id, material)
    this.materialRefs.set(id, 1)
    this.lastUsedTime.set(id, Date.now())
    return material
  }
  
  /**
   * Increment material reference count
   */
  private incrementMaterialRef(id: string): void {
    const current = this.materialRefs.get(id) || 0
    this.materialRefs.set(id, current + 1)
    this.lastUsedTime.set(id, Date.now())
  }
  
  /**
   * Decrement material reference count
   */
  releaseMaterial(id: string): void {
    const current = this.materialRefs.get(id) || 0
    if (current > 1) {
      this.materialRefs.set(id, current - 1)
    } else {
      this.materialRefs.set(id, 0)
    }
  }

  /**
   * Get texture by ID
   */
  getTexture(id: string): THREE.Texture | undefined {
    return this.textures.get(id)
  }

  /**
   * Get icon by ID
   */
  getIcon(id: string): string | undefined {
    return this.icons.get(id)
  }

  /**
   * Start automatic cleanup of unused assets
   */
  startAutoCleanup(): void {
    if (this.unusedAssetCheckInterval) return
    
    this.unusedAssetCheckInterval = setInterval(() => {
      this.cleanupUnusedAssets()
    }, 30000) // Check every 30 seconds
  }
  
  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.unusedAssetCheckInterval) {
      clearInterval(this.unusedAssetCheckInterval)
      this.unusedAssetCheckInterval = null
    }
  }
  
  /**
   * Cleanup unused assets
   */
  private cleanupUnusedAssets(): void {
    const now = Date.now()
    const toRemove: string[] = []
    
    // Check textures
    this.textureRefs.forEach((refCount, id) => {
      if (refCount === 0) {
        const lastUsed = this.lastUsedTime.get(id) || 0
        if (now - lastUsed > this.UNUSED_ASSET_TIMEOUT) {
          toRemove.push(id)
        }
      }
    })
    
    // Remove unused textures
    toRemove.forEach(id => {
      const texture = this.textures.get(id)
      if (texture) {
        texture.dispose()
        this.textures.delete(id)
        this.textureRefs.delete(id)
        this.lastUsedTime.delete(id)
      }
    })
    
    // Check materials
    const materialsToRemove: string[] = []
    this.materialRefs.forEach((refCount, id) => {
      if (refCount === 0) {
        const lastUsed = this.lastUsedTime.get(id) || 0
        if (now - lastUsed > this.UNUSED_ASSET_TIMEOUT) {
          materialsToRemove.push(id)
        }
      }
    })
    
    // Remove unused materials
    materialsToRemove.forEach(id => {
      const material = this.materials.get(id)
      if (material) {
        material.dispose()
        this.materials.delete(id)
        this.materialRefs.delete(id)
        this.lastUsedTime.delete(id)
      }
    })
  }
  
  /**
   * Get asset usage statistics
   */
  getAssetStats(): {
    textures: { total: number; inUse: number; unused: number }
    materials: { total: number; inUse: number; unused: number }
    sounds: { total: number }
  } {
    let texturesInUse = 0
    let materialsInUse = 0
    
    this.textureRefs.forEach(refCount => {
      if (refCount > 0) texturesInUse++
    })
    
    this.materialRefs.forEach(refCount => {
      if (refCount > 0) materialsInUse++
    })
    
    return {
      textures: {
        total: this.textures.size,
        inUse: texturesInUse,
        unused: this.textures.size - texturesInUse
      },
      materials: {
        total: this.materials.size,
        inUse: materialsInUse,
        unused: this.materials.size - materialsInUse
      },
      sounds: {
        total: this.sounds.size
      }
    }
  }

  /**
   * Preload all assets
   */
  async preloadAssets(): Promise<void> {
    // Generate procedural textures
    this.generateGrassTexture()
    this.generateSkyTexture()
    this.generateGroundTexture()
    
    // Generate materials
    this.createEnhancedMaterial('player-human', '#00ffff', '#00ffff', { emissiveIntensity: 0.5 })
    this.createEnhancedMaterial('player-cyborg', '#ff00ff', '#ff00ff', { emissiveIntensity: 0.6 })
    this.createEnhancedMaterial('player-android', '#0099ff', '#0099ff', { emissiveIntensity: 0.5 })
    this.createEnhancedMaterial('player-voidborn', '#9d00ff', '#9d00ff', { emissiveIntensity: 0.7 })
    this.createEnhancedMaterial('player-quantum', '#00ff00', '#00ff00', { emissiveIntensity: 0.6 })
    
    this.createEnhancedMaterial('enemy-basic', '#ff0000', '#ff0000', { emissiveIntensity: 0.4 })
    this.createEnhancedMaterial('enemy-elite', '#ff6600', '#ff6600', { emissiveIntensity: 0.5 })
    this.createEnhancedMaterial('enemy-boss', '#ff00ff', '#ff00ff', { emissiveIntensity: 0.8 })
    
    // Preload expanded textures
    const { preloadExpandedTextures } = await import('./expandedTextures')
    preloadExpandedTextures()
    
    // Create texture atlas for common textures (especially important on mobile)
    const { isMobileDevice } = await import('../utils/mobileOptimizations')
    if (isMobileDevice()) {
      await this.createTextureAtlas()
    }
    
    // Start automatic cleanup
    this.startAutoCleanup()
  }
  
  /**
   * Create texture atlas for performance
   * Mobile-optimized: uses smaller atlas size (1024x1024) on mobile
   */
  private async createTextureAtlas(): Promise<void> {
    const { textureAtlasManager } = await import('../utils/textureAtlas')
    const { getMobileOptimizationFlags } = await import('../utils/mobileOptimizations')
    
    const mobileFlags = getMobileOptimizationFlags()
    
    // Collect textures to atlas
    const texturesToAtlas: Array<{ id: string; texture: THREE.Texture; width: number; height: number }> = []
    
    // Add common textures
    const commonTextures = ['grass', 'ground', 'sky']
    for (const id of commonTextures) {
      const texture = this.textures.get(id)
      if (texture) {
        const image = texture.image as { width?: number; height?: number } | undefined
        texturesToAtlas.push({
          id,
          texture,
          width: image?.width || 512,
          height: image?.height || 512
        })
      }
    }
    
    if (texturesToAtlas.length > 0) {
      // Use mobile-specific atlas size
      const atlasSize = mobileFlags.isMobile ? mobileFlags.textureAtlasSize : 2048
      textureAtlasManager.createAtlas('common', texturesToAtlas, atlasSize)
    }
  }

  /**
   * Load assets for a specific zone
   * Implements lazy loading - only loads assets needed for current zone
   */
  async loadAssetsForZone(zoneId: string, assetIds: string[]): Promise<void> {
    // Mark zone as loaded
    this.loadedZones.add(zoneId)
    
    if (!this.zoneAssets.has(zoneId)) {
      this.zoneAssets.set(zoneId, new Set())
    }
    
    const zoneAssetSet = this.zoneAssets.get(zoneId)!
    
    // Add assets to zone mapping
    for (const assetId of assetIds) {
      zoneAssetSet.add(assetId)
      
      if (!this.assetZones.has(assetId)) {
        this.assetZones.set(assetId, new Set())
      }
      this.assetZones.get(assetId)!.add(zoneId)
    }
    
    // Load assets with priority (critical assets first)
    const criticalAssets = assetIds.filter(id => 
      id.includes('player') || id.includes('ground') || id.includes('sky')
    )
    const normalAssets = assetIds.filter(id => !criticalAssets.includes(id))
    
    // Load critical assets first
    for (const assetId of criticalAssets) {
      await this.loadAsset(assetId, 1) // Priority 1 = high
    }
    
    // Load normal assets progressively
    for (const assetId of normalAssets) {
      this.queueAssetLoad(assetId, 2) // Priority 2 = normal
    }
    
    // Process loading queue
    this.processLoadingQueue()
  }
  
  /**
   * Unload assets for a zone when leaving it
   */
  unloadZoneAssets(zoneId: string): void {
    if (!this.zoneAssets.has(zoneId)) return
    
    const zoneAssetSet = this.zoneAssets.get(zoneId)!
    
    for (const assetId of zoneAssetSet) {
      // Check if asset is used by other zones
      const zones = this.assetZones.get(assetId)
      if (zones && zones.size > 1) {
        // Asset is used by other zones, don't unload
        zones.delete(zoneId)
        continue
      }
      
      // Asset is only used by this zone, safe to unload
      this.unloadAsset(assetId)
      this.assetZones.delete(assetId)
    }
    
    this.zoneAssets.delete(zoneId)
    this.loadedZones.delete(zoneId)
  }
  
  /**
   * Unload unused assets
   */
  unloadUnusedAssets(): void {
    const now = Date.now()
    const toUnload: string[] = []
    
    // Find assets that haven't been used recently
    this.lastUsedTime.forEach((lastUsed, id) => {
      if (now - lastUsed > this.UNUSED_ASSET_TIMEOUT) {
        const refCount = this.textureRefs.get(id) || 0
        if (refCount === 0) {
          toUnload.push(id)
        }
      }
    })
    
    // Unload unused assets
    toUnload.forEach(id => this.unloadAsset(id))
  }
  
  /**
   * Load a single asset
   */
  private async loadAsset(assetId: string, priority: number): Promise<void> {
    // Check if already loaded
    if (this.textures.has(assetId) || this.materials.has(assetId)) {
      this.incrementTextureRef(assetId)
      return
    }
    
    // For now, assets are generated procedurally
    // In a real implementation, this would load from files
    // This is a placeholder for the lazy loading system
    console.log(`Loading asset: ${assetId} (priority: ${priority})`)
  }
  
  /**
   * Queue an asset for loading
   */
  private queueAssetLoad(assetId: string, priority: number): void {
    this.loadingQueue.push({
      id: assetId,
      priority,
      loadFn: async () => {
        await this.loadAsset(assetId, priority)
      }
    })
    
    // Sort by priority (lower number = higher priority)
    this.loadingQueue.sort((a, b) => a.priority - b.priority)
  }
  
  /**
   * Process loading queue progressively
   */
  private async processLoadingQueue(): Promise<void> {
    if (this.isLoading || this.loadingQueue.length === 0) return
    
    this.isLoading = true
    
    // Process a few assets at a time to avoid blocking
    const batchSize = 3
    const batch = this.loadingQueue.splice(0, batchSize)
    
    await Promise.all(batch.map(item => item.loadFn()))
    
    this.isLoading = false
    
    // Continue processing if more items in queue
    if (this.loadingQueue.length > 0) {
      // Use setTimeout to yield to browser, preventing blocking
      setTimeout(() => this.processLoadingQueue(), 0)
    }
  }
  
  /**
   * Unload a specific asset
   */
  private unloadAsset(assetId: string): void {
    const texture = this.textures.get(assetId)
    if (texture) {
      texture.dispose()
      this.textures.delete(assetId)
      this.textureRefs.delete(assetId)
      this.lastUsedTime.delete(assetId)
    }
    
    const material = this.materials.get(assetId)
    if (material) {
      material.dispose()
      this.materials.delete(assetId)
      this.materialRefs.delete(assetId)
      this.lastUsedTime.delete(assetId)
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Stop auto cleanup
    this.stopAutoCleanup()
    
    // Dispose all textures
    this.textures.forEach(texture => texture.dispose())
    this.textures.clear()
    this.textureRefs.clear()
    
    // Dispose all materials
    this.materials.forEach(material => material.dispose())
    this.materials.clear()
    this.materialRefs.clear()
    
    // Cleanup sounds
    this.sounds.forEach(sound => sound.pause())
    this.sounds.clear()
    this.soundRefs.clear()
    
    // Clear tracking
    this.lastUsedTime.clear()
    this.loadedZones.clear()
    this.zoneAssets.clear()
    this.assetZones.clear()
    this.loadingQueue = []
  }
}

export const assetManager = new AssetManager()

