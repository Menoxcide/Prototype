/**
 * Geometry Pool
 * Reuses geometries across entity instances to reduce memory allocation
 */

import * as THREE from 'three'

interface GeometryPoolEntry {
  geometry: THREE.BufferGeometry
  refCount: number
  lastUsed: number
}

class GeometryPool {
  private pool: Map<string, GeometryPoolEntry> = new Map()
  private readonly MAX_POOL_SIZE = 50
  private readonly UNUSED_TIMEOUT = 60000 // 60 seconds

  /**
   * Get a geometry from the pool (or create if not exists)
   */
  get(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let entry = this.pool.get(key)
    
    if (!entry) {
      entry = {
        geometry: factory(),
        refCount: 0,
        lastUsed: Date.now()
      }
      this.pool.set(key, entry)
    }
    
    entry.refCount++
    entry.lastUsed = Date.now()
    return entry.geometry
  }

  /**
   * Release a geometry (decrement reference count)
   */
  release(key: string): void {
    const entry = this.pool.get(key)
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1)
      entry.lastUsed = Date.now()
    }
  }

  /**
   * Cleanup unused geometries
   */
  cleanup(): void {
    const now = Date.now()
    const toRemove: string[] = []

    this.pool.forEach((entry, key) => {
      if (entry.refCount === 0 && (now - entry.lastUsed) > this.UNUSED_TIMEOUT) {
        toRemove.push(key)
      }
    })

    toRemove.forEach(key => {
      const entry = this.pool.get(key)
      if (entry) {
        entry.geometry.dispose()
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
        entry.geometry.dispose()
        this.pool.delete(key)
      }
    }
  }

  /**
   * Clear all geometries from pool
   */
  clear(): void {
    this.pool.forEach((entry) => {
      entry.geometry.dispose()
    })
    this.pool.clear()
  }

  /**
   * Get pool statistics
   */
  getStats() {
    let totalRefs = 0
    this.pool.forEach(entry => {
      totalRefs += entry.refCount
    })

    return {
      size: this.pool.size,
      totalReferences: totalRefs,
      unused: Array.from(this.pool.values()).filter(e => e.refCount === 0).length
    }
  }
}

// Singleton instance
export const geometryPool = new GeometryPool()

// Start periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    geometryPool.cleanup()
  }, 30000) // Cleanup every 30 seconds
}

/**
 * Get a pooled geometry
 */
export function getPooledGeometry(
  key: string,
  factory: () => THREE.BufferGeometry
): THREE.BufferGeometry {
  return geometryPool.get(key, factory)
}

/**
 * Release a pooled geometry
 */
export function releasePooledGeometry(key: string): void {
  geometryPool.release(key)
}

