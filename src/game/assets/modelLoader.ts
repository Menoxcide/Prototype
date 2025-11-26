/**
 * Model Loader - Handles loading and caching of 3D models (GLTF/GLB)
 * Supports LOD versions and model instancing
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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
  private loadingPromises: Map<string, Promise<THREE.Group | THREE.Object3D>> = new Map()

  constructor() {
    this.loader = new GLTFLoader()
  }

  /**
   * Load a GLTF/GLB model
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

    // Start loading
    const loadPromise = this.loader.loadAsync(
      path,
      options?.onProgress ? (progress) => {
        if (progress.total > 0) {
          options.onProgress!(progress.loaded / progress.total)
        }
      } : undefined
    ).then((gltf) => {
      let model = gltf.scene

      // Apply scale if specified
      if (options?.scale) {
        model.scale.setScalar(options.scale)
      }

      // Load LOD versions if specified
      const lodVersions: ModelCache['lodVersions'] = {}
      if (options?.lodVersions) {
        // LOD versions would be loaded here
        // For now, we'll create simplified versions procedurally
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

