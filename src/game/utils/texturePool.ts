/**
 * Texture Pool
 * Reuses textures to reduce memory allocation and improve performance
 */

import * as THREE from 'three'

interface TexturePoolEntry {
  texture: THREE.Texture
  refCount: number
  lastUsed: number
  size: number // Estimated size in bytes
}

class TexturePool {
  private pool: Map<string, TexturePoolEntry> = new Map()
  private readonly MAX_POOL_SIZE = 100
  private readonly MAX_MEMORY_MB = 200 // 200MB max texture memory
  private readonly UNUSED_TIMEOUT = 120000 // 2 minutes

  /**
   * Estimate texture size in bytes
   */
  private estimateTextureSize(texture: THREE.Texture): number {
    if (!texture.image) return 0
    
    const image = texture.image as { width?: number; height?: number } | null
    if (!image) return 0
    
    const width = image.width || 512
    const height = image.height || 512
    const channels = 4 // RGBA
    return width * height * channels
  }

  /**
   * Get a texture from the pool (or create if not exists)
   */
  get(key: string, factory: () => THREE.Texture): THREE.Texture {
    let entry = this.pool.get(key)
    
    if (!entry) {
      const texture = factory()
      const size = this.estimateTextureSize(texture)
      
      entry = {
        texture,
        refCount: 0,
        lastUsed: Date.now(),
        size
      }
      this.pool.set(key, entry)
      
      // Cleanup if pool is too large
      this.cleanup()
    }
    
    entry.refCount++
    entry.lastUsed = Date.now()
    return entry.texture
  }

  /**
   * Release a texture (decrement reference count)
   */
  release(key: string): void {
    const entry = this.pool.get(key)
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1)
      entry.lastUsed = Date.now()
    }
  }

  /**
   * Get total memory usage
   */
  private getTotalMemory(): number {
    let total = 0
    this.pool.forEach(entry => {
      total += entry.size
    })
    return total / (1024 * 1024) // Convert to MB
  }

  /**
   * Cleanup unused textures
   */
  cleanup(): void {
    const now = Date.now()
    const toRemove: string[] = []
    const totalMemory = this.getTotalMemory()

    // Remove unused textures that are old
    this.pool.forEach((entry, key) => {
      if (entry.refCount === 0 && (now - entry.lastUsed) > this.UNUSED_TIMEOUT) {
        toRemove.push(key)
      }
    })

    // If memory is still too high, remove oldest unused entries
    if (totalMemory > this.MAX_MEMORY_MB) {
      const sorted = Array.from(this.pool.entries())
        .filter(([_, entry]) => entry.refCount === 0)
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
      
      let memoryFreed = 0
      for (const [key, entry] of sorted) {
        if (totalMemory - memoryFreed <= this.MAX_MEMORY_MB) break
        if (!toRemove.includes(key)) {
          toRemove.push(key)
          memoryFreed += entry.size / (1024 * 1024)
        }
      }
    }

    // Remove textures
    toRemove.forEach(key => {
      const entry = this.pool.get(key)
      if (entry) {
        entry.texture.dispose()
        this.pool.delete(key)
      }
    })

    // If pool is still too large, remove oldest unused entries
    if (this.pool.size > this.MAX_POOL_SIZE) {
      const sorted = Array.from(this.pool.entries())
        .filter(([_, entry]) => entry.refCount === 0)
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
      
      const toRemoveCount = this.pool.size - this.MAX_POOL_SIZE
      for (let i = 0; i < toRemoveCount && i < sorted.length; i++) {
        const [key, entry] = sorted[i]
        entry.texture.dispose()
        this.pool.delete(key)
      }
    }
  }

  /**
   * Clear all textures from pool
   */
  clear(): void {
    this.pool.forEach((entry) => {
      entry.texture.dispose()
    })
    this.pool.clear()
  }

  /**
   * Get pool statistics
   */
  getStats() {
    let totalRefs = 0
    let totalMemory = 0
    this.pool.forEach(entry => {
      totalRefs += entry.refCount
      totalMemory += entry.size
    })

    return {
      size: this.pool.size,
      totalReferences: totalRefs,
      unused: Array.from(this.pool.values()).filter(e => e.refCount === 0).length,
      memoryMB: (totalMemory / (1024 * 1024)).toFixed(2)
    }
  }
}

// Singleton instance
export const texturePool = new TexturePool()

// Start periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    texturePool.cleanup()
  }, 60000) // Cleanup every minute
}

/**
 * Get a pooled texture
 */
export function getPooledTexture(
  key: string,
  factory: () => THREE.Texture
): THREE.Texture {
  return texturePool.get(key, factory)
}

/**
 * Release a pooled texture
 */
export function releasePooledTexture(key: string): void {
  texturePool.release(key)
}

