/**
 * Rendering Completion Tracker
 * Tracks when all 3D models and meshes are actually rendered and visible in the scene
 * Integrates with loading phase manager to ensure loading doesn't complete until rendering is ready
 */

import * as THREE from 'three'

export interface RenderingStatus {
  meshesLoaded: number
  meshesRendered: number
  texturesLoaded: number
  texturesReady: number
  isComplete: boolean
  progress: number // 0-100
}

class RenderingTracker {
  private scene: THREE.Scene | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private checkInterval: number | null = null
  private statusCallbacks: Set<(status: RenderingStatus) => void> = new Set()
  private lastStatus: RenderingStatus = {
    meshesLoaded: 0,
    meshesRendered: 0,
    texturesLoaded: 0,
    texturesReady: 0,
    isComplete: false,
    progress: 0
  }
  private stableFrameCount: number = 0
  private requiredStableFrames: number = 3 // Require 3 stable frames before considering complete
  private lastMeshCount: number = 0
  private lastTextureCount: number = 0

  /**
   * Initialize tracker with scene and renderer
   */
  initialize(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    this.scene = scene
    this.renderer = renderer
    this.startTracking()
  }

  /**
   * Start tracking rendering completion
   */
  private startTracking(): void {
    if (this.checkInterval !== null) return // Already tracking

    // Check every frame for rendering completion
    const checkRendering = () => {
      if (!this.scene || !this.renderer) return

      const status = this.checkRenderingStatus()
      this.updateStatus(status)

      // Continue checking until complete
      if (!status.isComplete) {
        this.checkInterval = requestAnimationFrame(checkRendering)
      } else {
        this.checkInterval = null
      }
    }

    this.checkInterval = requestAnimationFrame(checkRendering)
  }

  /**
   * Check current rendering status
   */
  private checkRenderingStatus(): RenderingStatus {
    if (!this.scene) {
      return {
        meshesLoaded: 0,
        meshesRendered: 0,
        texturesLoaded: 0,
        texturesReady: 0,
        isComplete: false,
        progress: 0
      }
    }

    let meshesLoaded = 0
    let meshesRendered = 0
    let texturesLoaded = 0
    let texturesReady = 0

    // Traverse scene to count meshes and textures
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshesLoaded++
        
        // Check if mesh is visible and has geometry/material
        if (object.visible && object.geometry && object.material) {
          meshesRendered++
        }

        // Check materials for textures
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material]

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || 
              material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshPhongMaterial) {
            
            // Check various texture maps (only for MeshStandardMaterial which has all these properties)
            const textureMaps: Array<THREE.Texture | null> = []
            if (material instanceof THREE.MeshStandardMaterial) {
              textureMaps.push(
                material.map,
                material.normalMap,
                material.roughnessMap,
                material.metalnessMap,
                material.emissiveMap,
                material.aoMap
              )
            } else if (material instanceof THREE.MeshPhongMaterial) {
              textureMaps.push(
                material.map,
                material.normalMap,
                material.emissiveMap
              )
            } else if (material instanceof THREE.MeshBasicMaterial) {
              textureMaps.push(
                material.map
              )
            }

            textureMaps.forEach((texture) => {
              if (texture) {
                texturesLoaded++
                // Texture is ready if it's loaded and not in error state
                const image = texture.image
                if (image && image instanceof HTMLImageElement && image.complete && !image.onerror) {
                  texturesReady++
                }
              }
            })
          }
        })
      }
    })

    // Calculate progress
    const meshProgress = meshesLoaded > 0 ? (meshesRendered / meshesLoaded) * 50 : 0
    const textureProgress = texturesLoaded > 0 ? (texturesReady / texturesLoaded) * 50 : 0
    const progress = Math.min(100, meshProgress + textureProgress)

    // Check if rendering is stable (counts haven't changed for required frames)
    const isStable = meshesLoaded === this.lastMeshCount && 
                     texturesLoaded === this.lastTextureCount

    if (isStable) {
      this.stableFrameCount++
    } else {
      this.stableFrameCount = 0
      this.lastMeshCount = meshesLoaded
      this.lastTextureCount = texturesLoaded
    }

    // Consider complete if:
    // 1. All meshes are rendered
    // 2. All textures are ready (or no textures to load)
    // 3. Counts have been stable for required frames
    // More lenient: allow completion even if textures are still loading if we've been stable for a while
    const hasMeshes = meshesLoaded > 0
    const allMeshesRendered = meshesRendered === meshesLoaded
    const hasTextures = texturesLoaded > 0
    const allTexturesReady = texturesReady === texturesLoaded
    const hasEnoughStableFrames = this.stableFrameCount >= this.requiredStableFrames
    
    // Complete if:
    // - We have meshes and they're all rendered
    // - Either no textures needed, or all textures are ready
    // - Scene has been stable
    const isComplete = hasMeshes &&
                       allMeshesRendered &&
                       (!hasTextures || allTexturesReady) &&
                       hasEnoughStableFrames

    return {
      meshesLoaded,
      meshesRendered,
      texturesLoaded,
      texturesReady,
      isComplete,
      progress
    }
  }

  /**
   * Update status and notify callbacks
   */
  private updateStatus(status: RenderingStatus): void {
    const hasChanged = 
      status.meshesLoaded !== this.lastStatus.meshesLoaded ||
      status.meshesRendered !== this.lastStatus.meshesRendered ||
      status.texturesLoaded !== this.lastStatus.texturesLoaded ||
      status.texturesReady !== this.lastStatus.texturesReady ||
      status.isComplete !== this.lastStatus.isComplete ||
      Math.abs(status.progress - this.lastStatus.progress) > 1

    if (hasChanged) {
      this.lastStatus = status
      
      // Notify callbacks
      this.statusCallbacks.forEach(callback => {
        try {
          callback(status)
        } catch (error) {
          console.error('Error in rendering status callback:', error)
        }
      })

      // If complete, mark rendering verification as loaded in orchestrator
      if (status.isComplete) {
        // Import orchestrator dynamically to avoid circular deps
        import('./loadingOrchestrator').then(({ loadingOrchestrator }) => {
          loadingOrchestrator.markFeatureLoaded('Rendering Verification')
        })
      }
    }
  }

  /**
   * Subscribe to rendering status updates
   */
  subscribe(callback: (status: RenderingStatus) => void): () => void {
    this.statusCallbacks.add(callback)
    
    // Immediately call with current status
    try {
      callback(this.lastStatus)
    } catch (error) {
      console.error('Error in rendering status callback:', error)
    }
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback)
    }
  }

  /**
   * Get current rendering status
   */
  getStatus(): RenderingStatus {
    return { ...this.lastStatus }
  }

  /**
   * Check if rendering is complete
   */
  isRenderingComplete(): boolean {
    return this.lastStatus.isComplete
  }

  /**
   * Reset tracker (for new game session)
   */
  reset(): void {
    if (this.checkInterval !== null) {
      cancelAnimationFrame(this.checkInterval)
      this.checkInterval = null
    }
    
    this.lastStatus = {
      meshesLoaded: 0,
      meshesRendered: 0,
      texturesLoaded: 0,
      texturesReady: 0,
      isComplete: false,
      progress: 0
    }
    
    this.stableFrameCount = 0
    this.lastMeshCount = 0
    this.lastTextureCount = 0
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.reset()
    this.statusCallbacks.clear()
    this.scene = null
    this.renderer = null
  }
}

// Singleton instance
export const renderingTracker = new RenderingTracker()

