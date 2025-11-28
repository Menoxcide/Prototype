/**
 * Asset Manager - Centralized asset loading and management
 * Handles textures, sprites, icons, sounds, and animations
 */

import * as THREE from 'three'
import { modelLoader } from './modelLoader'
import { isMobileDevice, getMobileOptimizationFlags } from '../utils/mobileOptimizations'
import { getPooledTexture, releasePooledTexture } from '../utils/texturePool'
import { materialPool } from '../utils/materialBatching'

export interface AssetDefinition {
  id: string
  type: 'texture' | 'sprite' | 'icon' | 'sound' | 'model' | 'animation'
  path?: string
  data?: string // For inline SVG/data URLs
  options?: Record<string, unknown>
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
  
  // Unused asset cleanup - aggressive timeout to prevent memory buildup
  private unusedAssetCheckInterval: NodeJS.Timeout | null = null
  private readonly UNUSED_ASSET_TIMEOUT = 30000 // 30 seconds (reduced from 60 to prevent memory buildup)
  private lastUsedTime: Map<string, number> = new Map()
  
  /**
   * Get adaptive cleanup interval based on device type
   * Mobile: 30 seconds, Desktop: 90 seconds
   */
  private getCleanupInterval(): number {
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    return isMobile ? 30000 : 90000 // 30s mobile, 90s desktop
  }
  
  // Zone-based asset loading
  private loadedZones: Set<string> = new Set()
  private zoneAssets: Map<string, Set<string>> = new Map() // zone -> set of asset IDs
  private assetZones: Map<string, Set<string>> = new Map() // asset ID -> set of zones
  private loadingQueue: Array<{ id: string; priority: number; loadFn: () => Promise<void> }> = []
  private isLoading: boolean = false

  /**
   * Get optimal texture size based on quality settings
   */
  private getOptimalTextureSize(baseSize: number, quality: 'low' | 'medium' | 'high' = 'medium'): number {
    switch (quality) {
      case 'low':
        return Math.max(128, baseSize / 4)
      case 'medium':
        return Math.max(256, baseSize / 2)
      case 'high':
        return baseSize
      default:
        return baseSize
    }
  }

  /**
   * Generate procedural texture with optimization
   */
  generateTexture(
    id: string,
    width: number = 512,
    height: number = 512,
    generator: (ctx: CanvasRenderingContext2D) => void,
    options?: {
      quality?: 'low' | 'medium' | 'high'
      generateMipmaps?: boolean
      minFilter?: THREE.TextureFilter
      magFilter?: THREE.TextureFilter
      anisotropy?: number
    }
  ): THREE.Texture {
    if (this.textures.has(id)) {
      // Increment reference count
      this.incrementTextureRef(id)
      return this.textures.get(id)!
    }

    // Optimize texture size based on quality
    const quality = options?.quality || 'medium'
    const optimalWidth = this.getOptimalTextureSize(width, quality)
    const optimalHeight = this.getOptimalTextureSize(height, quality)

    const canvas = document.createElement('canvas')
    canvas.width = optimalWidth
    canvas.height = optimalHeight
    const ctx = canvas.getContext('2d')!
    
    // Scale context if needed for quality
    if (optimalWidth !== width || optimalHeight !== height) {
      ctx.scale(optimalWidth / width, optimalHeight / height)
    }
    
    generator(ctx)
    
    // Use texture pool for efficient reuse
    const texture = getPooledTexture(id, () => {
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      
      // Texture optimization settings
      tex.generateMipmaps = options?.generateMipmaps !== false
      tex.minFilter = options?.minFilter || (tex.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter)
      tex.magFilter = (options?.magFilter as THREE.MagnificationTextureFilter) || THREE.LinearFilter
      tex.anisotropy = options?.anisotropy || (quality === 'high' ? 16 : quality === 'medium' ? 8 : 4)
      
      // Compression hints (WebGL will use these if supported)
      tex.format = THREE.RGBAFormat
      tex.type = THREE.UnsignedByteType
      
      // Set wrap mode for better tiling
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      
      return tex
    })
    
    // Also track in asset manager for compatibility
    this.textures.set(id, texture)
    this.textureRefs.set(id, 1)
    this.lastUsedTime.set(id, Date.now())
    
    return texture
  }
  
  /**
   * Compress texture using canvas compression
   * Returns a compressed data URL (for storage/transmission)
   */
  compressTexture(texture: THREE.Texture, quality: number = 0.9): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!texture.image) {
        reject(new Error('Texture has no image data'))
        return
      }

      const canvas = document.createElement('canvas')
      const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | { width?: number; height?: number } | null
      if (!image || (typeof image !== 'object') || !('width' in image) || !('height' in image)) {
        reject(new Error('Texture has no valid image data'))
        return
      }
      canvas.width = image.width || 512
      canvas.height = image.height || 512
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap) {
        ctx.drawImage(image, 0, 0)
      } else {
        reject(new Error('Texture image is not a valid CanvasImageSource'))
        return
      }
      
      // Convert to compressed format
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress texture'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read compressed texture'))
          reader.readAsDataURL(blob)
        },
        'image/webp', // Use WebP for better compression
        quality
      )
    })
  }
  
  /**
   * Create texture from compressed data
   */
  loadCompressedTexture(id: string, dataUrl: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      if (this.textures.has(id)) {
        this.incrementTextureRef(id)
        resolve(this.textures.get(id)!)
        return
      }

      const img = new Image()
      img.onload = () => {
        // Use texture pool for efficient reuse
        const texture = getPooledTexture(id, () => {
          const tex = new THREE.Texture(img)
          tex.needsUpdate = true
          tex.generateMipmaps = true
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.magFilter = THREE.LinearFilter
          return tex
        })
        
        // Also track in asset manager for compatibility
        this.textures.set(id, texture)
        this.textureRefs.set(id, 1)
        this.lastUsedTime.set(id, Date.now())
        resolve(texture)
      }
      img.onerror = () => reject(new Error('Failed to load compressed texture'))
      img.src = dataUrl
    })
  }
  
  /**
   * Load texture from path
   */
  async loadTexture(id: string, path: string): Promise<THREE.Texture> {
    if (this.textures.has(id)) {
      this.incrementTextureRef(id)
      return this.textures.get(id)!
    }

    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        path,
        (texture) => {
          texture.flipY = false
          texture.generateMipmaps = true
          texture.minFilter = THREE.LinearMipmapLinearFilter
          texture.magFilter = THREE.LinearFilter
          
          // Use texture pool for efficient reuse
          const pooledTexture = getPooledTexture(id, () => texture)
          
          // Also track in asset manager for compatibility
          this.textures.set(id, pooledTexture)
          this.textureRefs.set(id, 1)
          this.lastUsedTime.set(id, Date.now())
          resolve(pooledTexture)
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load texture from ${path}: ${error}`))
        }
      )
    })
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
      // Release from texture pool
      releasePooledTexture(id)
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
   * Enhanced with better PBR support including normal maps, ao maps, and roughness maps
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
      aoMap?: THREE.Texture
      roughnessMap?: THREE.Texture
      metalnessMap?: THREE.Texture
      envMap?: THREE.Texture
      envMapIntensity?: number
      clearcoat?: number
      clearcoatRoughness?: number
      sheen?: number
      sheenRoughness?: number
    }
  ): THREE.MeshStandardMaterial {
    if (this.materials.has(id)) {
      // Increment reference count
      this.incrementMaterialRef(id)
      return this.materials.get(id) as THREE.MeshStandardMaterial
    }
    
    const materialOptions: Record<string, unknown> = {
      color: baseColor,
      emissive: emissiveColor || baseColor,
      emissiveIntensity: options?.emissiveIntensity || 0.3,
      metalness: options?.metalness || 0.5,
      roughness: options?.roughness || 0.3,
    }
    
    // Add normal map if provided
    if (options?.normalMap) {
      materialOptions.normalMap = options.normalMap
      materialOptions.normalScale = new THREE.Vector2(1, 1)
    }
    
    // Add ambient occlusion map
    if (options?.aoMap) {
      materialOptions.aoMap = options.aoMap
      materialOptions.aoMapIntensity = 1.0
    }
    
    // Add roughness map
    if (options?.roughnessMap) {
      materialOptions.roughnessMap = options.roughnessMap
    }
    
    // Add metalness map
    if (options?.metalnessMap) {
      materialOptions.metalnessMap = options.metalnessMap
    }
    
    // Add environment map for reflections
    if (options?.envMap) {
      materialOptions.envMap = options.envMap
      materialOptions.envMapIntensity = options?.envMapIntensity || 1.0
    }
    
    // Add clearcoat for glossy surfaces (cyberpunk materials)
    if (options?.clearcoat !== undefined) {
      materialOptions.clearcoat = options.clearcoat
      materialOptions.clearcoatRoughness = options?.clearcoatRoughness || 0.1
    }
    
    // Add sheen for fabric-like materials
    if (options?.sheen !== undefined) {
      materialOptions.sheen = options.sheen
      materialOptions.sheenRoughness = options?.sheenRoughness || 0.5
    }
    
    // Use material pool for efficient reuse
    const material = materialPool.getMaterial(id, () => {
      return new THREE.MeshStandardMaterial(materialOptions)
    })

    // Also track in asset manager for compatibility
    this.materials.set(id, material)
    this.materialRefs.set(id, 1)
    this.lastUsedTime.set(id, Date.now())
    return material as THREE.MeshStandardMaterial
  }
  
  /**
   * Generate a procedural normal map texture
   */
  generateNormalMap(
    id: string,
    width: number = 512,
    height: number = 512,
    intensity: number = 1.0
  ): THREE.Texture {
    const existing = this.textures.get(`normal-${id}`)
    if (existing) {
      this.incrementTextureRef(`normal-${id}`)
      return existing
    }

    return this.generateTexture(`normal-${id}`, width, height, (ctx) => {
      // Create a simple normal map pattern
      // Normal maps use RGB where R=X, G=Y, B=Z (normalized to 0-255)
      // Default normal is (0, 0, 1) which is RGB(128, 128, 255)
      
      const imageData = ctx.createImageData(width, height)
      const data = imageData.data
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          
          // Create a subtle noise pattern for surface detail
          const noise = (Math.sin(x * 0.1) * Math.cos(y * 0.1)) * intensity
          
          // Normal vector components (default pointing up)
          const nx = 128 + noise * 20 // X component
          const ny = 128 + noise * 20 // Y component
          const nz = 255 - Math.abs(noise) * 30 // Z component (depth)
          
          data[i] = Math.max(0, Math.min(255, nx))     // R
          data[i + 1] = Math.max(0, Math.min(255, ny)) // G
          data[i + 2] = Math.max(0, Math.min(255, nz))  // B
          data[i + 3] = 255                             // A
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
    })
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
      // Release from material pool
      materialPool.releaseMaterial(id)
    }
  }

  /**
   * Get texture by ID
   */
  /**
   * Get the textures map (for internal use by sprite animation system)
   */
  getTexturesMap(): Map<string, THREE.Texture> {
    return this.textures
  }

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
   * Uses adaptive intervals: 30s for mobile, 90s for desktop
   * Integrates with memory monitor for pressure-based cleanup
   */
  startAutoCleanup(): void {
    if (this.unusedAssetCheckInterval) return
    
    const interval = this.getCleanupInterval()
    this.unusedAssetCheckInterval = setInterval(() => {
      // Check memory pressure and perform cleanup
      this.cleanupUnusedAssets()
      
      // If memory is high, perform more aggressive cleanup
      import('../utils/memoryMonitor').then(({ memoryMonitor }) => {
        if (memoryMonitor.checkMemoryThreshold(1500)) { // 1.5GB threshold
          // More aggressive cleanup when memory is high
          this.cleanupUnusedAssets(true)
        }
      }).catch(() => {
        // Memory monitor not available, continue with normal cleanup
      })
    }, interval)
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
   * @param aggressive If true, uses shorter timeout for more aggressive cleanup
   */
  public cleanupUnusedAssets(aggressive: boolean = false): void {
    const now = Date.now()
    const timeout = aggressive ? this.UNUSED_ASSET_TIMEOUT / 2 : this.UNUSED_ASSET_TIMEOUT
    const toRemove: string[] = []
    
    // Check textures
    this.textureRefs.forEach((refCount, id) => {
      if (refCount === 0) {
        const lastUsed = this.lastUsedTime.get(id) || 0
        if (now - lastUsed > timeout) {
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
        if (now - lastUsed > timeout) {
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
   * Load a 3D model (GLTF/GLB or procedural)
   */
  async loadModel(
    id: string,
    pathOrType: string,
    options?: {
      lodVersions?: { high?: string; medium?: string; low?: string }
      scale?: number
      color?: string
      emissive?: string
      onProgress?: (progress: number) => void
    }
  ): Promise<THREE.Group | THREE.Object3D> {
    // Check if it's a procedural model type
    const proceduralTypes = ['player', 'enemy-basic', 'enemy-elite', 'enemy-boss', 'resource-node', 'loot-drop']
    if (proceduralTypes.includes(pathOrType)) {
      return modelLoader.createProceduralModel(
        id,
        pathOrType as any,
        {
          color: options?.color,
          emissive: options?.emissive,
          scale: options?.scale
        }
      )
    }

    // Otherwise, load from path
    return modelLoader.loadModel(id, pathOrType, options)
  }

  /**
   * Get a cached model
   */
  getModel(id: string, lodLevel: 'high' | 'medium' | 'low' = 'high'): THREE.Group | THREE.Object3D | null {
    return modelLoader.getModel(id, lodLevel)
  }

  /**
   * Release a model reference
   */
  releaseModel(id: string): void {
    modelLoader.releaseModel(id)
  }

  /**
   * Load biome-specific asset
   */
  async loadBiomeAsset(
    biome: string,
    category: string,
    name: string,
    options?: {
      scale?: number
      onProgress?: (progress: number) => void
    }
  ): Promise<THREE.Group | THREE.Object3D> {
    const assetId = `biome-${biome}-${category}-${name}`
    const assetPath = `/assets/models/biomes/${biome}/${category}/${name}.glb`
    return this.loadModel(assetId, assetPath, options)
  }

  /**
   * Load prop asset
   */
  async loadProp(
    name: string,
    category: string = 'sci-fi',
    options?: {
      scale?: number
      onProgress?: (progress: number) => void
    }
  ): Promise<THREE.Group | THREE.Object3D> {
    const assetId = `prop-${category}-${name}`
    const assetPath = `/assets/models/props/${category}/${name}.glb`
    return this.loadModel(assetId, assetPath, options)
  }

  /**
   * Load biome texture
   */
  async loadBiomeTexture(
    biome: string,
    textureName: string,
    mapType: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'ao' = 'diffuse'
  ): Promise<THREE.Texture> {
    const textureId = `biome-texture-${biome}-${textureName}-${mapType}`
    const texturePath = `/assets/textures/${biome}/${textureName}/${textureName}_${mapType}.jpg`
    return this.loadTexture(textureId, texturePath)
  }

  /**
   * Get available assets for a biome (from registry)
   */
  async getAvailableBiomeAssets(biome: string): Promise<{
    floor: string[]
    walls: string[]
    columns: string[]
    roof: string[]
    doors: string[]
    stairs: string[]
    props: string[]
  }> {
    try {
      const response = await fetch('/assets/models/ASSET_REGISTRY.json')
      const registry = await response.json()
      
      const biomeAssets = registry.assets.filter((asset: any) => asset.biome === biome)
      
      return {
        floor: biomeAssets.filter((a: any) => a.category === 'floor').map((a: any) => a.name),
        walls: biomeAssets.filter((a: any) => a.category === 'walls').map((a: any) => a.name),
        columns: biomeAssets.filter((a: any) => a.category === 'columns').map((a: any) => a.name),
        roof: biomeAssets.filter((a: any) => a.category === 'roof').map((a: any) => a.name),
        doors: biomeAssets.filter((a: any) => a.category === 'doors').map((a: any) => a.name),
        stairs: biomeAssets.filter((a: any) => a.category === 'stairs').map((a: any) => a.name),
        props: biomeAssets.filter((a: any) => a.category === 'props').map((a: any) => a.name)
      }
    } catch (error) {
      console.warn('Failed to load asset registry:', error)
      return {
        floor: [],
        walls: [],
        columns: [],
        roof: [],
        doors: [],
        stairs: [],
        props: []
      }
    }
  }

  /**
   * Get asset usage statistics
   */
  getAssetStats(): {
    textures: { total: number; inUse: number; unused: number }
    materials: { total: number; inUse: number; unused: number }
    sounds: { total: number }
    models: { total: number; inUse: number; memoryEstimate: number }
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
      },
      models: modelLoader.getStats()
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
    
    // Preload sprite characters for races (background loading)
    const { downloadAllCharacters } = await import('../utils/downloadCharacters')
    downloadAllCharacters().catch(err => {
      console.warn('Character preloading failed (non-critical):', err)
    })
    
    // Create texture atlas for common textures (especially important on mobile)
    // isMobileDevice is imported at the top
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
    // getMobileOptimizationFlags is imported at the top
    
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

