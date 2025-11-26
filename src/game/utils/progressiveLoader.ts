/**
 * Progressive Loader
 * Manages progressive loading of assets with priorities
 * Critical assets loaded first, others in background
 * Integrates with loading phases for progressive world loading
 */

import * as THREE from 'three'
import { loadingPhaseManager, type LoadingPhase } from './loadingPhases'

export interface AssetLoadTask {
  id: string
  type: 'texture' | 'model' | 'sound' | 'icon'
  path?: string
  priority: number
  critical: boolean
  phase?: LoadingPhase // Which loading phase this asset belongs to
  onProgress?: (progress: number) => void
}

export interface LoadingProgress {
  total: number
  loaded: number
  percentage: number
  currentAsset?: string
  criticalLoaded: boolean
  phase?: LoadingPhase
  phaseProgress?: number
}

class ProgressiveLoader {
  private criticalAssets: Set<string> = new Set()
  private loadingTasks: AssetLoadTask[] = []
  private loadedAssets: Set<string> = new Set()
  private progressCallbacks: Set<(progress: LoadingProgress) => void> = new Set()
  private isCriticalPhase: boolean = true
  private phaseTasks: Map<LoadingPhase, AssetLoadTask[]> = new Map([
    ['phase1', []],
    ['phase2', []],
    ['phase3', []]
  ])
  private phaseLoadedCounts: Map<LoadingPhase, number> = new Map([
    ['phase1', 0],
    ['phase2', 0],
    ['phase3', 0]
  ])

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
    
    // Assign default phase if not specified
    const phase = task.phase || (task.critical ? 'phase1' : 'phase2')
    task.phase = phase
    
    // Track by phase
    const phaseTasks = this.phaseTasks.get(phase) || []
    phaseTasks.push(task)
    this.phaseTasks.set(phase, phaseTasks)
    
    // Sort by priority (higher priority first)
    this.loadingTasks.sort((a, b) => {
      if (a.critical !== b.critical) {
        return a.critical ? -1 : 1
      }
      return b.priority - a.priority
    })
  }

  /**
   * Load assets progressively by phase
   */
  async loadPhase(phase: LoadingPhase, onProgress?: (progress: LoadingProgress) => void): Promise<void> {
    if (onProgress) {
      this.progressCallbacks.add(onProgress)
    }

    // Wait a bit for components to register assets (especially for Phase 1)
    if (phase === 'phase1') {
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    let phaseTasks = this.phaseTasks.get(phase) || []
    
    // If no tasks yet, wait a bit more and check again
    if (phaseTasks.length === 0) {
      console.log(`ProgressiveLoader: No assets registered for ${phase} yet, waiting...`)
      await new Promise(resolve => setTimeout(resolve, 500))
      phaseTasks = this.phaseTasks.get(phase) || []
    }
    
    if (phaseTasks.length === 0) {
      // Still no tasks - components may be loading assets themselves
      // Set a small progress to indicate we're waiting
      loadingPhaseManager.updatePhaseProgress(phase, 10)
      console.log(`ProgressiveLoader: No assets for ${phase}, components may load them directly`)
      
      // Wait a bit more to see if components finish loading
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check if assets were loaded by components
      const loadedCount = phaseTasks.filter(task => this.loadedAssets.has(task.id)).length
      if (loadedCount > 0 || phaseTasks.length === 0) {
        // Either some were loaded or still none registered - mark as complete
        loadingPhaseManager.updatePhaseProgress(phase, 100)
      }
      
      if (onProgress) {
        this.progressCallbacks.delete(onProgress)
      }
      return
    }

    // Filter out already-loaded assets
    const unloadedTasks = phaseTasks.filter(task => !this.loadedAssets.has(task.id))
    
    if (unloadedTasks.length === 0) {
      // All assets already loaded by components
      console.log(`ProgressiveLoader: All ${phase} assets already loaded by components`)
      loadingPhaseManager.updatePhaseProgress(phase, 100)
      if (onProgress) {
        this.progressCallbacks.delete(onProgress)
      }
      return
    }

    console.log(`ProgressiveLoader: Loading ${unloadedTasks.length}/${phaseTasks.length} assets for ${phase}`)
    
    // Load assets for this phase
    await this.loadBatch(unloadedTasks, true, phase)

    // Cleanup
    if (onProgress) {
      this.progressCallbacks.delete(onProgress)
    }
  }

  /**
   * Load all assets progressively (legacy method, now uses phases)
   */
  async loadAll(onProgress?: (progress: LoadingProgress) => void): Promise<void> {
    if (onProgress) {
      this.progressCallbacks.add(onProgress)
    }

    // Phase 1: Load critical assets
    const criticalTasks = this.loadingTasks.filter(t => t.critical || this.criticalAssets.has(t.id))
    const nonCriticalTasks = this.loadingTasks.filter(t => !t.critical && !this.criticalAssets.has(t.id))

    // Load critical assets first
    await this.loadBatch(criticalTasks, true, 'phase1')

    // Phase 2: Load non-critical assets in background
    this.isCriticalPhase = false
    this.loadBatch(nonCriticalTasks, false, 'phase2') // Don't await - load in background

    // Cleanup
    if (onProgress) {
      this.progressCallbacks.delete(onProgress)
    }
  }

  /**
   * Load a batch of assets
   */
  private async loadBatch(tasks: AssetLoadTask[], _waitForCompletion: boolean, phase?: LoadingPhase): Promise<void> {
    const total = tasks.length
    let loaded = 0
    const currentPhase = phase || (this.isCriticalPhase ? 'phase1' : 'phase2')

    for (const task of tasks) {
      try {
        // Notify progress before loading (for UI feedback)
        const phaseProgress = total > 0 ? (loaded / total) * 100 : 0
        this.notifyProgress({
          total: this.loadingTasks.length,
          loaded: this.loadedAssets.size,
          percentage: (this.loadedAssets.size / this.loadingTasks.length) * 100,
          currentAsset: task.id,
          criticalLoaded: this.areCriticalAssetsLoaded(),
          phase: currentPhase,
          phaseProgress
        })

        // Update phase progress
        loadingPhaseManager.updatePhaseProgress(currentPhase, phaseProgress)

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
        
        // Update phase loaded count
        const phaseCount = this.phaseLoadedCounts.get(currentPhase) || 0
        this.phaseLoadedCounts.set(currentPhase, phaseCount + 1)

        // Notify progress after loading (with updated criticalLoaded status)
        const newPhaseProgress = total > 0 ? (loaded / total) * 100 : 100
        this.notifyProgress({
          total: this.loadingTasks.length,
          loaded: this.loadedAssets.size,
          percentage: (this.loadedAssets.size / this.loadingTasks.length) * 100,
          currentAsset: task.id,
          criticalLoaded: this.areCriticalAssetsLoaded(),
          phase: currentPhase,
          phaseProgress: newPhaseProgress
        })

        // Update phase progress
        loadingPhaseManager.updatePhaseProgress(currentPhase, newPhaseProgress)

        if (task.onProgress) {
          task.onProgress((loaded / total) * 100)
        }
      } catch (error) {
        console.error(`Failed to load asset ${task.id}:`, error)
        // Continue loading other assets even if one fails
        // Still count as loaded to prevent blocking
        this.loadedAssets.add(task.id)
        loaded++
        const phaseCount = this.phaseLoadedCounts.get(currentPhase) || 0
        this.phaseLoadedCounts.set(currentPhase, phaseCount + 1)
      }
    }
    
    // Mark phase as complete
    if (loaded >= total) {
      loadingPhaseManager.updatePhaseProgress(currentPhase, 100)
    }
  }

  /**
   * Subscribe to loading progress updates
   */
  subscribe(callback: (progress: LoadingProgress) => void): () => void {
    this.progressCallbacks.add(callback)
    
    // Immediately call with current progress
    try {
      callback(this.getProgress())
    } catch (error) {
      console.error('Error in progress callback:', error)
    }
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback)
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
    // If no critical assets are defined, return false (don't complete early)
    if (this.criticalAssets.size === 0) {
      return false
    }
    
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
    const currentPhase = loadingPhaseManager.getCurrentPhase()
    const phaseStatus = loadingPhaseManager.getStatus()
    
    return {
      total: this.loadingTasks.length,
      loaded: this.loadedAssets.size,
      percentage: this.loadingTasks.length > 0 
        ? (this.loadedAssets.size / this.loadingTasks.length) * 100 
        : 100,
      criticalLoaded: this.areCriticalAssetsLoaded(),
      phase: currentPhase,
      phaseProgress: phaseStatus.progress
    }
  }

  /**
   * Mark an asset as loaded (for components that load assets directly)
   */
  markAssetLoaded(assetId: string, phase?: LoadingPhase): void {
    this.loadedAssets.add(assetId)
    
    // Update phase progress if phase is specified
    if (phase) {
      const phaseTasks = this.phaseTasks.get(phase) || []
      const currentCount = this.phaseLoadedCounts.get(phase) || 0
      this.phaseLoadedCounts.set(phase, currentCount + 1)
      
      // Calculate and update phase progress
      const phaseProgress = phaseTasks.length > 0 
        ? ((currentCount + 1) / phaseTasks.length) * 100 
        : 100
      loadingPhaseManager.updatePhaseProgress(phase, Math.min(100, phaseProgress))
    }
    
    // Notify progress
    this.notifyProgress(this.getProgress())
  }

  /**
   * Reset loader state
   */
  reset(): void {
    this.loadingTasks = []
    this.loadedAssets.clear()
    this.isCriticalPhase = true
    this.phaseTasks.set('phase1', [])
    this.phaseTasks.set('phase2', [])
    this.phaseTasks.set('phase3', [])
    this.phaseLoadedCounts.set('phase1', 0)
    this.phaseLoadedCounts.set('phase2', 0)
    this.phaseLoadedCounts.set('phase3', 0)
  }
}

// Singleton instance
export const progressiveLoader = new ProgressiveLoader()

