/**
 * Texture Streaming System
 * Loads low-resolution textures first, then upgrades to full resolution in background
 */

import * as THREE from 'three'

export interface TextureStream {
  id: string
  lowResTexture: THREE.Texture | null
  highResTexture: THREE.Texture | null
  onUpgrade?: (texture: THREE.Texture) => void
}

class TextureStreamingManager {
  private streams: Map<string, TextureStream> = new Map()
  private upgradeQueue: string[] = []
  private isUpgrading: boolean = false

  /**
   * Load a texture with streaming (low-res first, then upgrade)
   */
  async loadTexture(
    id: string,
    lowResPath: string,
    highResPath: string,
    onUpgrade?: (texture: THREE.Texture) => void
  ): Promise<THREE.Texture> {
    // Check if already streaming
    if (this.streams.has(id)) {
      const stream = this.streams.get(id)!
      if (stream.highResTexture) {
        return stream.highResTexture
      }
      if (stream.lowResTexture) {
        return stream.lowResTexture
      }
    }

    // Create stream entry
    const stream: TextureStream = {
      id,
      lowResTexture: null,
      highResTexture: null,
      onUpgrade
    }
    this.streams.set(id, stream)

    // Load low-res texture first (1/4 resolution)
    const lowResTexture = await this.loadTextureInternal(lowResPath, 0.25)
    stream.lowResTexture = lowResTexture

    // Queue high-res upgrade
    this.queueUpgrade(id, highResPath)

    return lowResTexture
  }

  /**
   * Load texture from path with optional scale
   */
  private async loadTextureInternal(path: string, scale: number = 1.0): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        path,
        (texture) => {
          texture.flipY = false
          texture.generateMipmaps = true
          texture.minFilter = THREE.LinearMipmapLinearFilter
          texture.magFilter = THREE.LinearFilter

          // Scale down texture if needed (for low-res version)
          if (scale < 1.0 && texture.image) {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!
            const img = texture.image as HTMLImageElement
            
            canvas.width = Math.floor(img.width * scale)
            canvas.height = Math.floor(img.height * scale)
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            
            const scaledTexture = new THREE.CanvasTexture(canvas)
            scaledTexture.flipY = false
            scaledTexture.generateMipmaps = true
            scaledTexture.minFilter = THREE.LinearMipmapLinearFilter
            scaledTexture.magFilter = THREE.LinearFilter
            
            resolve(scaledTexture)
          } else {
            resolve(texture)
          }
        },
        undefined,
        reject
      )
    })
  }

  /**
   * Queue a texture for upgrade to high resolution
   */
  private queueUpgrade(id: string, highResPath: string): void {
    if (this.upgradeQueue.includes(id)) {
      return // Already queued
    }

    this.upgradeQueue.push(id)

    // Start upgrade process if not already running
    if (!this.isUpgrading) {
      this.processUpgradeQueue(highResPath)
    }
  }

  /**
   * Process upgrade queue in background
   */
  private async processUpgradeQueue(highResPath: string): Promise<void> {
    if (this.isUpgrading || this.upgradeQueue.length === 0) {
      return
    }

    this.isUpgrading = true

    // Process upgrades with delay to avoid blocking
    while (this.upgradeQueue.length > 0) {
      const id = this.upgradeQueue.shift()!
      const stream = this.streams.get(id)

      if (!stream || stream.highResTexture) {
        continue // Already upgraded or stream removed
      }

      try {
        // Load high-res texture
        const highResTexture = await this.loadTextureInternal(highResPath, 1.0)
        stream.highResTexture = highResTexture

        // Notify upgrade
        if (stream.onUpgrade) {
          stream.onUpgrade(highResTexture)
        }

        // Dispose low-res texture
        if (stream.lowResTexture) {
          stream.lowResTexture.dispose()
          stream.lowResTexture = null
        }
      } catch (error) {
        console.warn(`Failed to upgrade texture ${id}:`, error)
      }

      // Small delay between upgrades to avoid blocking
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    this.isUpgrading = false
  }

  /**
   * Get current texture (low-res if high-res not ready)
   */
  getTexture(id: string): THREE.Texture | null {
    const stream = this.streams.get(id)
    if (!stream) return null

    return stream.highResTexture || stream.lowResTexture
  }

  /**
   * Check if texture is fully loaded
   */
  isFullyLoaded(id: string): boolean {
    const stream = this.streams.get(id)
    return stream?.highResTexture !== null
  }

  /**
   * Dispose of a texture stream
   */
  dispose(id: string): void {
    const stream = this.streams.get(id)
    if (stream) {
      if (stream.lowResTexture) {
        stream.lowResTexture.dispose()
      }
      if (stream.highResTexture) {
        stream.highResTexture.dispose()
      }
      this.streams.delete(id)
    }

    // Remove from upgrade queue
    const index = this.upgradeQueue.indexOf(id)
    if (index > -1) {
      this.upgradeQueue.splice(index, 1)
    }
  }

  /**
   * Dispose all streams
   */
  disposeAll(): void {
    this.streams.forEach((_stream, id) => {
      this.dispose(id)
    })
  }
}

// Singleton instance
export const textureStreaming = new TextureStreamingManager()

