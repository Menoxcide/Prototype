/**
 * Geometry Disposal Tracker
 * Tracks and verifies geometry disposal to prevent memory leaks
 */

import * as THREE from 'three'

interface TrackedGeometry {
  geometry: THREE.BufferGeometry
  id: string
  createdAt: number
  disposed: boolean
  disposedAt?: number
  componentName?: string
}

class GeometryDisposalTracker {
  private trackedGeometries: Map<string, TrackedGeometry> = new Map()
  private disposedGeometries: Set<string> = new Set()
  private checkInterval: NodeJS.Timeout | null = null

  /**
   * Track a geometry for disposal monitoring
   */
  track(geometry: THREE.BufferGeometry, id: string, componentName?: string): void {
    if (this.trackedGeometries.has(id)) {
      console.warn(`Geometry ${id} is already being tracked`)
      return
    }

    this.trackedGeometries.set(id, {
      geometry,
      id,
      createdAt: Date.now(),
      disposed: false,
      componentName
    })

    // Override dispose method to track disposal
    const originalDispose = geometry.dispose.bind(geometry)
    geometry.dispose = () => {
      originalDispose()
      this.markDisposed(id)
    }
  }

  /**
   * Mark a geometry as disposed
   */
  markDisposed(id: string): void {
    const tracked = this.trackedGeometries.get(id)
    if (tracked) {
      tracked.disposed = true
      tracked.disposedAt = Date.now()
      this.disposedGeometries.add(id)
    }
  }

  /**
   * Verify all tracked geometries are disposed
   */
  verifyDisposal(): { total: number; disposed: number; leaked: TrackedGeometry[] } {
    const leaked: TrackedGeometry[] = []
    
    this.trackedGeometries.forEach((tracked) => {
      if (!tracked.disposed) {
        leaked.push(tracked)
      }
    })

    return {
      total: this.trackedGeometries.size,
      disposed: this.disposedGeometries.size,
      leaked
    }
  }

  /**
   * Get leaked geometries (not disposed)
   */
  getLeakedGeometries(): TrackedGeometry[] {
    return Array.from(this.trackedGeometries.values()).filter(t => !t.disposed)
  }

  /**
   * Clean up old disposed geometries from tracking
   */
  cleanup(maxAge: number = 60000): void {
    const now = Date.now()
    const toRemove: string[] = []

    this.trackedGeometries.forEach((tracked, id) => {
      if (tracked.disposed && tracked.disposedAt && (now - tracked.disposedAt) > maxAge) {
        toRemove.push(id)
      }
    })

    toRemove.forEach(id => {
      this.trackedGeometries.delete(id)
      this.disposedGeometries.delete(id)
    })
  }

  /**
   * Start periodic verification
   */
  startVerification(interval: number = 30000): void {
    if (this.checkInterval) {
      this.stopVerification()
    }

    this.checkInterval = setInterval(() => {
      const verification = this.verifyDisposal()
      if (verification.leaked.length > 0 && import.meta.env.DEV) {
        console.warn(`⚠️ Geometry leak detected: ${verification.leaked.length} geometries not disposed`, verification.leaked)
      }
      this.cleanup()
    }, interval)
  }

  /**
   * Stop periodic verification
   */
  stopVerification(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Dispose all tracked geometries (emergency cleanup)
   */
  disposeAll(): void {
    this.trackedGeometries.forEach((tracked) => {
      if (!tracked.disposed) {
        try {
          tracked.geometry.dispose()
        } catch (error) {
          console.error(`Error disposing geometry ${tracked.id}:`, error)
        }
      }
    })
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.stopVerification()
    this.trackedGeometries.clear()
    this.disposedGeometries.clear()
  }
}

// Singleton instance
let tracker: GeometryDisposalTracker | null = null

export function getGeometryDisposalTracker(): GeometryDisposalTracker {
  if (!tracker) {
    tracker = new GeometryDisposalTracker()
    // Start verification in dev mode
    if (import.meta.env.DEV) {
      tracker.startVerification(30000) // Check every 30 seconds
    }
  }
  return tracker
}

/**
 * Track a geometry for disposal monitoring
 */
export function trackGeometry(geometry: THREE.BufferGeometry, id: string, componentName?: string): void {
  getGeometryDisposalTracker().track(geometry, id, componentName)
}

/**
 * Verify all geometries are disposed
 */
export function verifyGeometryDisposal(): { total: number; disposed: number; leaked: TrackedGeometry[] } {
  return getGeometryDisposalTracker().verifyDisposal()
}

