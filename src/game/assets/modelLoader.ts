/**
 * Model Loader - Handles loading and caching of 3D models (GLTF/GLB)
 * Supports LOD versions and model instancing
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { getOptimalCompressionFormat } from '../utils/compressionSupport'
import { assetManifest } from './assetManifest'
import { assetCache } from '../utils/assetCache'

export interface ModelCache {
  model: THREE.Group | THREE.Object3D
  lodVersions?: {
    high?: THREE.Group | THREE.Object3D
    medium?: THREE.Group | THREE.Object3D
    low?: THREE.Group | THREE.Object3D
  }
  animations?: THREE.AnimationClip[]
  lastUsed: number
  refCount: number
}

class ModelLoader {
  private models: Map<string, ModelCache> = new Map()
  private loader: GLTFLoader
  private dracoLoader: DRACOLoader | null = null
  private loadingPromises: Map<string, Promise<THREE.Group | THREE.Object3D>> = new Map()
  private compressionFormat: 'draco' | 'glb' = 'glb'

  constructor() {
    this.loader = new GLTFLoader()
    
    // Initialize Draco loader if supported
    const compressionFormat = getOptimalCompressionFormat()
    this.compressionFormat = compressionFormat.model
    
    if (compressionFormat.model === 'draco') {
      this.dracoLoader = new DRACOLoader()
      // Use CDN for Draco decoder (or local if available)
      this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
      this.loader.setDRACOLoader(this.dracoLoader)
    }
  }

  /**
   * Check if a model file exists (for converted 3D models)
   * Uses asset manifest to avoid individual HEAD requests
   */
  private async checkModelExists(path: string): Promise<{ exists: boolean; compressed?: boolean; path?: string }> {
    try {
      // Try to use asset manifest first
      const manifest = assetManifest.getManifest()
      if (manifest) {
        // Extract model ID from path
        const modelId = path.replace(/^\/assets\/models\//, '').replace(/\.glb$/, '').replace(/\.drc$/, '')
        
        // Check compressed version first if Draco is supported
        if (this.compressionFormat === 'draco') {
          const compressedPath = await assetManifest.getModelPath(modelId, true)
          if (compressedPath) {
            return { exists: true, compressed: true, path: compressedPath }
          }
        }
        
        // Check regular version
        const regularPath = await assetManifest.getModelPath(modelId, false)
        if (regularPath) {
          return { exists: true, compressed: false, path: regularPath }
        }
      }
      
      // Fallback to HEAD request if manifest not available
      if (this.compressionFormat === 'draco') {
        const compressedPath = path.replace(/\.glb$/, '.drc.glb').replace(/\.gltf$/, '.drc.gltf')
        const compressedResponse = await fetch(compressedPath, { method: 'HEAD' })
        if (compressedResponse.ok) {
          return { exists: true, compressed: true, path: compressedPath }
        }
      }
      
      const response = await fetch(path, { method: 'HEAD' })
      if (response.ok) {
        return { exists: true, compressed: false, path }
      }
      
      return { exists: false }
    } catch {
      return { exists: false }
    }
  }

  /**
   * Load a GLTF/GLB model
   * Supports both file paths and asset IDs (for converted 3D models)
   */
  async loadModel(
    id: string,
    path: string,
    options?: {
      lodVersions?: {
        high?: string
        medium?: string
        low?: string
      }
      scale?: number
      onProgress?: (progress: number) => void
    }
  ): Promise<THREE.Group | THREE.Object3D> {
    // Check if path is an asset ID (for converted 3D models)
    if (!path.includes('/') && !path.includes('\\') && !path.startsWith('http')) {
      // Try to load from converted models directory
      const convertedPath = `/assets/models/${path}/${id}.glb`
      const exists = await this.checkModelExists(convertedPath)
      if (exists.exists && exists.path) {
        // Use the path returned from check (already includes compression if available)
        return this.loadModel(id, exists.path, options)
      }
    }
    // Return cached model if available
    if (this.models.has(id)) {
      const cached = this.models.get(id)!
      cached.refCount++
      cached.lastUsed = Date.now()
      return cached.model.clone()
    }

    // Return existing loading promise if model is already loading
    if (this.loadingPromises.has(path)) {
      const model = await this.loadingPromises.get(path)!
      return model.clone()
    }

    // Check IndexedDB cache first
    const cachedData = await assetCache.getCachedModel(id)
    if (cachedData) {
      // Load from cache
      const blob = new Blob([cachedData], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      try {
        const gltf = await this.loader.loadAsync(url)
        URL.revokeObjectURL(url)
        const model = gltf.scene
        if (options?.scale) {
          model.scale.setScalar(options.scale)
        }
        this.optimizeTextures(model)
        return model.clone()
      } catch (error) {
        URL.revokeObjectURL(url)
        console.warn(`Failed to load cached model ${id}, falling back to network:`, error)
      }
    }

    // Start loading from network
    const loadPromise = this.loader.loadAsync(
      path,
      options?.onProgress ? (progress) => {
        if (progress.total > 0) {
          options.onProgress!(progress.loaded / progress.total)
        }
      } : undefined
    ).then(async (gltf) => {
      let model = gltf.scene

      // Apply scale if specified
      if (options?.scale) {
        model.scale.setScalar(options.scale)
      }

      // Optimize textures: detect and apply compression
      this.optimizeTextures(model)

      // Cache the model data in IndexedDB (in background)
      fetch(path)
        .then(response => response.arrayBuffer())
        .then(data => assetCache.cacheModel(id, data))
        .catch(err => console.warn(`Failed to cache model ${id}:`, err))

      // Load LOD versions if specified
      const lodVersions: ModelCache['lodVersions'] = {}
      if (options?.lodVersions) {
        // Load LOD versions asynchronously
        const lodPromises: Promise<void>[] = []
        
        if (options.lodVersions.high) {
          lodPromises.push(
            this.loadLODVersion(options.lodVersions.high, 'high', lodVersions)
          )
        }
        if (options.lodVersions.medium) {
          lodPromises.push(
            this.loadLODVersion(options.lodVersions.medium, 'medium', lodVersions)
          )
        }
        if (options.lodVersions.low) {
          lodPromises.push(
            this.loadLODVersion(options.lodVersions.low, 'low', lodVersions)
          )
        }
        
        // Don't wait for LOD versions - load them in background
        Promise.all(lodPromises).catch(err => {
          console.warn(`Failed to load some LOD versions for ${id}:`, err)
        })
      }

      // Cache the model
      const cache: ModelCache = {
        model: model.clone(),
        lodVersions,
        animations: gltf.animations,
        lastUsed: Date.now(),
        refCount: 1
      }
      this.models.set(id, cache)

      this.loadingPromises.delete(path)
      return model
    }).catch((error) => {
      this.loadingPromises.delete(path)
      console.error(`Failed to load model ${path}:`, error)
      throw error
    })

    this.loadingPromises.set(path, loadPromise)
    const model = await loadPromise
    return model.clone()
  }

  /**
   * Get a model from cache (increments ref count)
   */
  getModel(id: string, lodLevel: 'high' | 'medium' | 'low' = 'high'): THREE.Group | THREE.Object3D | null {
    const cached = this.models.get(id)
    if (!cached) return null

    cached.refCount++
    cached.lastUsed = Date.now()

    // Return appropriate LOD version
    if (lodLevel !== 'high' && cached.lodVersions?.[lodLevel]) {
      return cached.lodVersions[lodLevel]!.clone()
    }

    return cached.model.clone()
  }

  /**
   * Release a model reference (decrements ref count)
   */
  releaseModel(id: string): void {
    const cached = this.models.get(id)
    if (!cached) return

    cached.refCount = Math.max(0, cached.refCount - 1)
  }

  /**
   * Optimize textures in a model (detect compression, reduce quality if needed)
   */
  private optimizeTextures(model: THREE.Group | THREE.Object3D): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material]

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || 
              material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshPhongMaterial) {
            
            // Optimize texture maps (only for MeshStandardMaterial which has all these properties)
            const textureMaps: Array<{ map: THREE.Texture | null; name: string }> = []
            if (material instanceof THREE.MeshStandardMaterial) {
              textureMaps.push(
                { map: material.map, name: 'map' },
                { map: material.normalMap, name: 'normalMap' },
                { map: material.roughnessMap, name: 'roughnessMap' },
                { map: material.metalnessMap, name: 'metalnessMap' },
                { map: material.emissiveMap, name: 'emissiveMap' },
                { map: material.aoMap, name: 'aoMap' }
              )
            } else if (material instanceof THREE.MeshPhongMaterial) {
              textureMaps.push(
                { map: material.map, name: 'map' },
                { map: material.normalMap, name: 'normalMap' },
                { map: material.emissiveMap, name: 'emissiveMap' }
              )
            } else if (material instanceof THREE.MeshBasicMaterial) {
              textureMaps.push(
                { map: material.map, name: 'map' }
              )
            }

            textureMaps.forEach(({ map, name }) => {
              if (map && map instanceof THREE.Texture) {
                // Detect compression format
                const isCompressed = this.detectTextureCompression(map)
                
                // Apply optimizations based on compression
                if (!isCompressed) {
                  // For uncompressed textures, reduce quality during loading
                  map.generateMipmaps = true
                  map.minFilter = THREE.LinearMipmapLinearFilter
                  map.magFilter = THREE.LinearFilter
                  
                  // Reduce anisotropy for non-critical textures
                  if (name !== 'map') { // Keep full quality for main texture
                    map.anisotropy = Math.min(4, map.anisotropy || 1)
                  }
                } else {
                  // Compressed textures can use higher quality
                  map.anisotropy = 16
                }
                
                // Set texture format based on compression
                if (map.format === THREE.RGBAFormat) {
                  // Prefer compressed formats if available
                  map.format = THREE.RGBAFormat // Keep RGBA for now, could use compressed formats
                }
              }
            })
          }
        })
      }
    })
  }

  /**
   * Detect if a texture is using compression
   */
  private detectTextureCompression(texture: THREE.Texture): boolean {
    // Check if texture uses compressed format
    // This is a simplified check - in practice, you'd check the actual format
    // Check texture internal format (if available)
    // WebGL2 supports compressed texture formats
    return texture.format !== THREE.RGBAFormat && texture.format !== THREE.RGBFormat
  }

  /**
   * Load a LOD version of a model
   */
  private async loadLODVersion(
    path: string,
    level: 'high' | 'medium' | 'low',
    lodVersions: ModelCache['lodVersions']
  ): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(path)
      if (!lodVersions) {
        return
      }
      lodVersions[level] = gltf.scene
      
      // Optimize LOD textures (lower quality for lower LOD)
      const lodVersion = lodVersions[level]
      if (lodVersion) {
        this.optimizeLODTextures(lodVersion, level)
      }
    } catch (error) {
      console.warn(`Failed to load ${level} LOD version from ${path}:`, error)
    }
  }

  /**
   * Optimize textures for LOD versions (reduce quality for lower LOD)
   */
  private optimizeLODTextures(model: THREE.Group | THREE.Object3D, level: 'high' | 'medium' | 'low'): void {
    const qualityMultiplier = level === 'high' ? 1.0 : level === 'medium' ? 0.75 : 0.5
    
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material]

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || 
              material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshPhongMaterial) {
            
            if (material.map && material.map instanceof THREE.Texture) {
              // Reduce anisotropy for lower LOD
              material.map.anisotropy = Math.max(1, Math.floor(16 * qualityMultiplier))
              
              // Use simpler filtering for low LOD
              if (level === 'low') {
                material.map.minFilter = THREE.LinearMipmapNearestFilter
              }
            }
          }
        })
      }
    })
  }

  /**
   * Create a procedural model as fallback
   */
  createProceduralModel(
    _id: string,
    type: 'player' | 'enemy-basic' | 'enemy-elite' | 'enemy-boss' | 'resource-node' | 'loot-drop',
    options?: {
      color?: string
      emissive?: string
      scale?: number
    }
  ): THREE.Group {
    const group = new THREE.Group()
    const scale = options?.scale || 1
    const color = options?.color || '#ffffff'
    const emissive = options?.emissive || color

    switch (type) {
      case 'player': {
        // Enhanced player model - capsule with details
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.4 * scale, 1.6 * scale, 8, 16),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.6,
            metalness: 0.7,
            roughness: 0.2
          })
        )
        group.add(body)

        // Add head detail
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.3 * scale, 16, 16),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.8,
            metalness: 0.8,
            roughness: 0.1
          })
        )
        head.position.y = 0.9 * scale
        group.add(head)

        // Add glow effect
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.35 * scale, 16, 16),
          new THREE.MeshStandardMaterial({
            color: emissive,
            emissive,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
          })
        )
        glow.position.y = 0.9 * scale
        group.add(glow)
        break
      }

      case 'enemy-basic': {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 * scale, 1 * scale, 0.8 * scale),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.4,
            metalness: 0.5,
            roughness: 0.3
          })
        )
        group.add(body)

        // Add spikes/edges for detail
        const spike1 = new THREE.Mesh(
          new THREE.ConeGeometry(0.1 * scale, 0.3 * scale, 4),
          new THREE.MeshStandardMaterial({
            color: emissive,
            emissive,
            emissiveIntensity: 0.8
          })
        )
        spike1.position.set(0, 0.6 * scale, 0)
        group.add(spike1)
        break
      }

      case 'enemy-elite': {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.5 * scale, 1.2 * scale, 8, 16),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.5,
            metalness: 0.6,
            roughness: 0.2
          })
        )
        group.add(body)

        // Add armor plates
        const plate1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.6 * scale, 0.2 * scale, 0.1 * scale),
          new THREE.MeshStandardMaterial({
            color: emissive,
            emissive,
            emissiveIntensity: 0.7,
            metalness: 0.9,
            roughness: 0.1
          })
        )
        plate1.position.set(0, 0.3 * scale, 0.5 * scale)
        group.add(plate1)
        break
      }

      case 'enemy-boss': {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.7 * scale, 1.8 * scale, 12, 20),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.8,
            metalness: 0.7,
            roughness: 0.15
          })
        )
        group.add(body)

        // Add multiple armor pieces
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2
          const plate = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 * scale, 0.4 * scale, 0.1 * scale),
            new THREE.MeshStandardMaterial({
              color: emissive,
              emissive,
              emissiveIntensity: 0.9,
              metalness: 0.9,
              roughness: 0.1
            })
          )
          plate.position.set(
            Math.cos(angle) * 0.4 * scale,
            0.2 * scale,
            Math.sin(angle) * 0.4 * scale
          )
          group.add(plate)
        }
        break
      }

      case 'resource-node': {
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.5 * scale, 0),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.8,
            metalness: 0.3,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9
          })
        )
        group.add(crystal)
        break
      }

      case 'loot-drop': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale),
          new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.8,
            metalness: 0.5,
            roughness: 0.3
          })
        )
        group.add(box)

        // Add glow
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.3 * scale, 16, 16),
          new THREE.MeshStandardMaterial({
            color: emissive,
            emissive,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.4
          })
        )
        group.add(glow)
        break
      }
    }

    return group
  }

  /**
   * Get model statistics
   */
  getStats(): {
    total: number
    inUse: number
    memoryEstimate: number
  } {
    let inUse = 0
    let memoryEstimate = 0

    this.models.forEach((cache) => {
      if (cache.refCount > 0) {
        inUse++
      }
      // Rough memory estimate (very approximate)
      memoryEstimate += 1024 * 100 // ~100KB per model estimate
    })

    return {
      total: this.models.size,
      inUse,
      memoryEstimate
    }
  }

  /**
   * Cleanup unused models
   */
  cleanup(maxAge: number = 60000): void {
    const now = Date.now()
    this.models.forEach((cache, id) => {
      if (cache.refCount === 0 && (now - cache.lastUsed) > maxAge) {
        // Dispose of geometries and materials
        cache.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
        this.models.delete(id)
      }
    })
  }
}

// Singleton instance
export const modelLoader = new ModelLoader()

