/**
 * Progressive Loader
 * Manages progressive loading of assets with priorities
 * Critical assets loaded first, others in background
 */

import * as THREE from 'three'

export interface AssetLoadTask {
  id: string
  type: 'texture' | 'model' | 'sound' | 'icon'
  path?: string
  priority: number
  critical: boolean
  onProgress?: (progress: number) => void
}

export interface LoadingProgress {
  total: number
  loaded: number
  percentage: number
  currentAsset?: string
  criticalLoaded: boolean
}

class ProgressiveLoader {
  private criticalAssets: Set<string> = new Set()
  private loadingTasks: AssetLoadTask[] = []
  private loadedAssets: Set<string> = new Set()
  private progressCallbacks: Set<(progress: LoadingProgress) => void> = new Set()
  private isCriticalPhase: boolean = true

  /**
   * Define critical assets that must load before gameplay starts
   */
  defineCriticalAssets(assetIds: string[]): void {
    assetIds.forEach(id => this.criticalAssets.add(id))
  }

  /**
   * Add an asset to the loading queue
   */
  addAsset(task: AssetLoadTask): void {
    this.loadingTasks.push(task)
    // Sort by priority (higher priority first)
    this.loadingTasks.sort((a, b) => {
      if (a.critical !== b.critical) {
        return a.critical ? -1 : 1
      }
      return b.priority - a.priority
    })
  }

  /**
   * Load assets progressively
   */
  async loadAll(onProgress?: (progress: LoadingProgress) => void): Promise<void> {
    if (onProgress) {
      this.progressCallbacks.add(onProgress)
    }

    // Phase 1: Load critical assets
    const criticalTasks = this.loadingTasks.filter(t => t.critical || this.criticalAssets.has(t.id))
    const nonCriticalTasks = this.loadingTasks.filter(t => !t.critical && !this.criticalAssets.has(t.id))

    // Load critical assets first
    await this.loadBatch(criticalTasks, true)

    // Phase 2: Load non-critical assets in background
    this.isCriticalPhase = false
    this.loadBatch(nonCriticalTasks, false) // Don't await - load in background

    // Cleanup
    if (onProgress) {
      this.progressCallbacks.delete(onProgress)
    }
  }

  /**
   * Load a batch of assets
   */
  private async loadBatch(tasks: AssetLoadTask[], _waitForCompletion: boolean): Promise<void> {
    const total = tasks.length
    let loaded = 0

    for (const task of tasks) {
      try {
        this.notifyProgress({
          total: this.loadingTasks.length,
          loaded: this.loadedAssets.size,
          percentage: (this.loadedAssets.size / this.loadingTasks.length) * 100,
          currentAsset: task.id,
          criticalLoaded: !this.isCriticalPhase
        })

        // Load asset based on type
        switch (task.type) {
          case 'texture':
            if (task.path) {
              // Use getTexture or load method if available
              await new Promise<void>((resolve) => {
                const loader = new THREE.TextureLoader()
                loader.load(task.path!, () => resolve(), undefined, () => resolve())
              })
            }
            break
          case 'model':
            if (task.path) {
              // Model loading would be handled by modelLoader
              await Promise.resolve()
            }
            break
          case 'sound':
            if (task.path) {
              // Sound loading would be handled by assetManager
              await Promise.resolve()
            }
            break
          case 'icon':
            // Icons are typically loaded differently
            break
        }

        this.loadedAssets.add(task.id)
        loaded++

        if (task.onProgress) {
          task.onProgress((loaded / total) * 100)
        }
      } catch (error) {
        console.error(`Failed to load asset ${task.id}:`, error)
        // Continue loading other assets even if one fails
      }
    }
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(progress: LoadingProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress)
      } catch (error) {
        console.error('Error in progress callback:', error)
      }
    })
  }

  /**
   * Check if critical assets are loaded
   */
  areCriticalAssetsLoaded(): boolean {
    for (const assetId of this.criticalAssets) {
      if (!this.loadedAssets.has(assetId)) {
        return false
      }
    }
    return true
  }

  /**
   * Get loading progress
   */
  getProgress(): LoadingProgress {
    return {
      total: this.loadingTasks.length,
      loaded: this.loadedAssets.size,
      percentage: this.loadingTasks.length > 0 
        ? (this.loadedAssets.size / this.loadingTasks.length) * 100 
        : 100,
      criticalLoaded: this.areCriticalAssetsLoaded()
    }
  }

  /**
   * Reset loader state
   */
  reset(): void {
    this.loadingTasks = []
    this.loadedAssets.clear()
    this.isCriticalPhase = true
  }
}

// Singleton instance
export const progressiveLoader = new ProgressiveLoader()

