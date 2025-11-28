/**
 * Progressive Loader
 * Manages progressive loading of assets with priorities
 * Critical assets loaded first, others in background
 * Integrates with loading phases for progressive world loading
 * Supports predictive prefetching based on player movement
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
  position?: { x: number; y: number; z: number } // World position for spatial prefetching
  radius?: number // Load radius for this asset
}

export interface PrefetchZone {
  center: { x: number; y: number; z: number }
  radius: number
  priority: number
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
  private prefetchZones: Map<string, PrefetchZone> = new Map()
  private playerPosition: { x: number; y: number; z: number } | null = null
  private playerVelocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
  private prefetchQueue: AssetLoadTask[] = []
  private isPrefetching: boolean = false
  private prefetchRadius: number = 50 // Default prefetch radius in world units
  // Optimized concurrent loads: Desktop 12, Mobile 6 (adaptive based on device)
  private maxConcurrentLoads: number = this.getOptimalConcurrentLoads()
  
  private getOptimalConcurrentLoads(): number {
    // Detect device capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
    const hasFastConnection = (navigator as any).connection?.effectiveType === '4g' || (navigator as any).connection?.effectiveType === '5g'
    
    if (isMobile) {
      // Mobile: 6 concurrent loads (up from 4) with bandwidth-aware throttling
      return 6
    } else {
      // Desktop: 12 concurrent loads (up from 4) for faster loading
      return hasFastConnection ? 12 : 8
    }
  }
  private activeLoads: number = 0 // Current number of active loads
  private loadQueue: AssetLoadTask[] = [] // Queue for throttled loading

  /**
   * Define critical assets that must load before gameplay starts
   */
  defineCriticalAssets(assetIds: string[]): void {
    assetIds.forEach(id => this.criticalAssets.add(id))
  }

  /**
   * Add an asset to the loading queue
   * Prevents duplicate registration by checking if asset ID already exists
   */
  addAsset(task: AssetLoadTask): void {
    // Check if asset with this ID already exists in any phase
    const existingTask = this.loadingTasks.find(t => t.id === task.id)
    if (existingTask) {
      // Asset already registered, skip duplicate registration (common in React StrictMode)
      // Silently skip - this is expected behavior, no need to log
      return
    }
    
    // Also check if already loaded
    if (this.loadedAssets.has(task.id)) {
      // Already loaded, skip registration (expected behavior)
      return
    }
    
    this.loadingTasks.push(task)
    
    // Assign default phase if not specified
    const phase = task.phase || (task.critical ? 'phase1' : 'phase2')
    task.phase = phase
    
    // Track by phase - check if already in phase tasks to prevent duplicates
    const phaseTasks = this.phaseTasks.get(phase) || []
    const existsInPhase = phaseTasks.some(t => t.id === task.id)
    if (!existsInPhase) {
      phaseTasks.push(task)
      this.phaseTasks.set(phase, phaseTasks)
    }
    
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

    // Use requestAnimationFrame for minimal delay (event-driven instead of fixed timeout)
    if (phase === 'phase1') {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }

    let phaseTasks = this.phaseTasks.get(phase) || []
    
    // If no tasks yet, check again after a brief delay (reduced from 1000ms)
    if (phaseTasks.length === 0) {
      console.log(`ProgressiveLoader: No assets registered for ${phase} yet, waiting...`)
      loadingPhaseManager.updatePhaseProgress(phase, 5)
      // Use requestAnimationFrame for minimal delay
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      phaseTasks = this.phaseTasks.get(phase) || []
    }
    
    if (phaseTasks.length === 0) {
      // Still no tasks - components may be loading assets themselves
      loadingPhaseManager.updatePhaseProgress(phase, 10)
      console.log(`ProgressiveLoader: No assets for ${phase}, components may load them directly`)
      
      // Use event-driven approach: wait for components to register assets
      // Check periodically but with shorter intervals
      let waitProgress = 10
      let checkCount = 0
      const maxChecks = 10 // Maximum 10 checks (2 seconds total)
      
      // Store resolve function in closure variable accessible to interval
      let resolveFunction: (() => void) | null = null
      
      const checkInterval = setInterval(() => {
        checkCount++
        phaseTasks = this.phaseTasks.get(phase) || []
        
        if (phaseTasks.length > 0) {
          clearInterval(checkInterval)
          // Assets registered, resolve promise to continue loading
          if (resolveFunction) {
            resolveFunction()
          }
          return
        }
        
        // Gradually increase progress
        waitProgress = Math.min(waitProgress + 5, 90)
        loadingPhaseManager.updatePhaseProgress(phase, waitProgress)
        
        // Stop checking after max attempts
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval)
          // Mark as complete - components loaded assets directly
          loadingPhaseManager.updatePhaseProgress(phase, 100)
          
          if (onProgress) {
            this.progressCallbacks.delete(onProgress)
          }
          // Resolve promise when max checks reached
          if (resolveFunction) {
            resolveFunction()
          }
        }
      }, 200) // Check every 200ms
      
      // Wait for interval to complete or assets to register
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          clearInterval(checkInterval)
          resolve(undefined)
        }, maxChecks * 200)
        
        // Store resolve function for interval to call
        resolveFunction = () => {
          clearTimeout(timeout)
          resolve(undefined)
        }
      })
      
      // Final check
      phaseTasks = this.phaseTasks.get(phase) || []
      if (phaseTasks.length === 0) {
        loadingPhaseManager.updatePhaseProgress(phase, 100)
        if (onProgress) {
          this.progressCallbacks.delete(onProgress)
        }
        return
      }
    }

    // Filter out already-loaded assets
    const unloadedTasks = phaseTasks.filter(task => !this.loadedAssets.has(task.id))
    
    // Recalculate phaseLoadedCount based on actual loaded state to avoid race conditions
    const actualLoadedCount = phaseTasks.filter(task => this.loadedAssets.has(task.id)).length
    this.phaseLoadedCounts.set(phase, actualLoadedCount)
    
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
   * Load all assets progressively
   * Note: Consider using loadPhase() for more granular control over loading phases
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
   * Load a batch of assets with concurrency control and throttling
   */
  private async loadBatch(tasks: AssetLoadTask[], _waitForCompletion: boolean, phase?: LoadingPhase): Promise<void> {
    const batchTotal = tasks.length
    let loaded = 0
    const currentPhase = phase || (this.isCriticalPhase ? 'phase1' : 'phase2')
    
    // Get the total number of tasks for this phase (not just the batch)
    const phaseTasks = this.phaseTasks.get(currentPhase) || []
    const phaseTotal = phaseTasks.length
    
    // Recalculate phaseLoadedCount dynamically by counting actual loaded assets
    // This prevents race conditions with markAssetLoaded
    const getActualLoadedCount = (): number => {
      return phaseTasks.filter(task => this.loadedAssets.has(task.id)).length
    }
    
    let phaseLoadedCount = getActualLoadedCount()

    // Filter out already loaded tasks
    const unloadedTasks = tasks.filter(task => !this.loadedAssets.has(task.id))
    
    if (unloadedTasks.length === 0) {
      // All tasks already loaded
      const finalPhaseProgress = Math.min(100, phaseTotal > 0 ? (phaseLoadedCount / phaseTotal) * 100 : 100)
      loadingPhaseManager.updatePhaseProgress(currentPhase, finalPhaseProgress)
      return
    }

    // Load assets in parallel batches with concurrency limit
    const loadAsset = async (task: AssetLoadTask): Promise<void> => {
      if (this.loadedAssets.has(task.id)) {
        return // Already loaded
      }

      try {
        // Update progress before loading
        phaseLoadedCount = getActualLoadedCount()
        const currentPhaseLoaded = phaseLoadedCount + loaded
        const phaseProgress = Math.min(100, phaseTotal > 0 ? (currentPhaseLoaded / phaseTotal) * 100 : 0)
        const clampedPhaseProgress = Math.max(0, Math.min(100, phaseProgress))
        
        this.notifyProgress({
          total: phaseTotal,
          loaded: currentPhaseLoaded,
          percentage: clampedPhaseProgress,
          currentAsset: task.id,
          criticalLoaded: this.areCriticalAssetsLoaded(),
          phase: currentPhase,
          phaseProgress: clampedPhaseProgress
        })

        loadingPhaseManager.updatePhaseProgress(currentPhase, clampedPhaseProgress)

        // Load asset based on type with throttling
        await this.loadAssetWithThrottle(task)

        // Mark as loaded
        this.loadedAssets.add(task.id)
        loaded++
        
        // Update phase loaded count
        this.phaseLoadedCounts.set(currentPhase, phaseLoadedCount + loaded)

        // Recalculate and update progress after loading
        phaseLoadedCount = getActualLoadedCount()
        const newPhaseLoaded = phaseLoadedCount
        const newPhaseProgress = Math.min(100, phaseTotal > 0 ? (newPhaseLoaded / phaseTotal) * 100 : 100)
        const clampedNewProgress = Math.max(0, Math.min(100, newPhaseProgress))
        
        this.notifyProgress({
          total: phaseTotal,
          loaded: newPhaseLoaded,
          percentage: clampedNewProgress,
          currentAsset: task.id,
          criticalLoaded: this.areCriticalAssetsLoaded(),
          phase: currentPhase,
          phaseProgress: clampedNewProgress
        })

        loadingPhaseManager.updatePhaseProgress(currentPhase, clampedNewProgress)

        if (task.onProgress) {
          task.onProgress(batchTotal > 0 ? (loaded / batchTotal) * 100 : 100)
        }
      } catch (error) {
        console.error(`Failed to load asset ${task.id}:`, error)
        // Still count as loaded to prevent blocking
        if (!this.loadedAssets.has(task.id)) {
          this.loadedAssets.add(task.id)
          loaded++
          this.phaseLoadedCounts.set(currentPhase, phaseLoadedCount + loaded)
        }
        
        // Update progress even on error
        phaseLoadedCount = getActualLoadedCount()
        const errorPhaseProgress = Math.min(100, phaseTotal > 0 ? (phaseLoadedCount / phaseTotal) * 100 : 100)
        const clampedErrorProgress = Math.max(0, Math.min(100, errorPhaseProgress))
        loadingPhaseManager.updatePhaseProgress(currentPhase, clampedErrorProgress)
      } finally {
        this.activeLoads--
        // Process next item in queue if available
        this.processLoadQueue(currentPhase, phaseTotal, getActualLoadedCount)
      }
    }

    // Process tasks with concurrency limit
    const processBatch = async () => {
      const promises: Promise<void>[] = []
      
      for (const task of unloadedTasks) {
        // Wait if we've reached concurrency limit
        while (this.activeLoads >= this.maxConcurrentLoads) {
          await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
        }
        
        this.activeLoads++
        promises.push(loadAsset(task))
      }
      
      // Wait for all loads to complete
      await Promise.all(promises)
    }

    await processBatch()
    
    // Final validation: ensure progress never exceeds 100%
    phaseLoadedCount = getActualLoadedCount()
    const finalPhaseProgress = Math.min(100, phaseTotal > 0 ? (phaseLoadedCount / phaseTotal) * 100 : 100)
    
    // Mark phase as complete if all phase tasks are loaded
    if (phaseLoadedCount >= phaseTotal && phaseTotal > 0) {
      loadingPhaseManager.updatePhaseProgress(currentPhase, 100)
    } else if (finalPhaseProgress < 100) {
      // Update to actual progress if not complete
      loadingPhaseManager.updatePhaseProgress(currentPhase, finalPhaseProgress)
    }
  }

  /**
   * Load a single asset with throttling
   */
  private async loadAssetWithThrottle(task: AssetLoadTask): Promise<void> {
    // Use requestIdleCallback for non-critical assets to avoid blocking
    if (!task.critical && typeof requestIdleCallback !== 'undefined') {
      await new Promise<void>((resolve) => {
        requestIdleCallback(() => {
          this.loadAssetInternal(task).then(resolve).catch(resolve)
        }, { timeout: 1000 })
      })
    } else {
      await this.loadAssetInternal(task)
    }
  }

  /**
   * Internal asset loading logic
   */
  private async loadAssetInternal(task: AssetLoadTask): Promise<void> {
    // Mark operation start for frame time monitoring
    if (typeof window !== 'undefined') {
      import('./frameTimeMonitor').then(({ frameTimeMonitor }) => {
        frameTimeMonitor.markOperationStart(`Loading asset: ${task.id}`)
      }).catch(() => {
        // Ignore if frame time monitor not available
      })
    }
    
    try {
    switch (task.type) {
      case 'texture':
        if (task.path) {
          await new Promise<void>((resolve) => {
            const loader = new THREE.TextureLoader()
            loader.load(
              task.path!,
              () => resolve(),
              undefined,
              (error) => {
                console.warn(`Texture load failed for ${task.id}:`, error)
                resolve() // Resolve anyway to prevent blocking
              }
            )
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
    } finally {
      // Mark operation end for frame time monitoring
      if (typeof window !== 'undefined') {
        import('./frameTimeMonitor').then(({ frameTimeMonitor }) => {
          frameTimeMonitor.markOperationEnd()
        }).catch(() => {
          // Ignore if frame time monitor not available
        })
      }
    }
  }

  /**
   * Process load queue (for throttled loading)
   */
  private async processLoadQueue(
    phase: LoadingPhase,
    phaseTotal: number,
    getActualLoadedCount: () => number
  ): Promise<void> {
    if (this.loadQueue.length === 0 || this.activeLoads >= this.maxConcurrentLoads) {
      return
    }

    const task = this.loadQueue.shift()
    if (!task) return

    this.activeLoads++
    try {
      await this.loadAssetWithThrottle(task)
      this.loadedAssets.add(task.id)
      
      // Update progress
      const phaseLoadedCount = getActualLoadedCount()
      const phaseProgress = Math.min(100, phaseTotal > 0 ? (phaseLoadedCount / phaseTotal) * 100 : 100)
      loadingPhaseManager.updatePhaseProgress(phase, phaseProgress)
    } catch (error) {
      console.error(`Failed to load queued asset ${task.id}:`, error)
      this.loadedAssets.add(task.id) // Mark as attempted
    } finally {
      this.activeLoads--
      // Continue processing queue
      if (this.loadQueue.length > 0) {
        this.processLoadQueue(phase, phaseTotal, getActualLoadedCount)
      }
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
   * Get phase-specific progress counts
   */
  getPhaseProgress(phase: LoadingPhase): { loaded: number; total: number } {
    const phaseTasks = this.phaseTasks.get(phase) || []
    const loaded = phaseTasks.filter(task => this.loadedAssets.has(task.id)).length
    return {
      loaded,
      total: phaseTasks.length
    }
  }

  /**
   * Mark an asset as loaded (for components that load assets directly)
   */
  markAssetLoaded(assetId: string, phase?: LoadingPhase): void {
    // Check if already loaded to prevent double-counting
    const wasAlreadyLoaded = this.loadedAssets.has(assetId)
    this.loadedAssets.add(assetId)
    
    // Update phase progress if phase is specified
    if (phase && !wasAlreadyLoaded) {
      const phaseTasks = this.phaseTasks.get(phase) || []
      
      // Recalculate actual loaded count to avoid race conditions
      const actualLoadedCount = phaseTasks.filter(task => this.loadedAssets.has(task.id)).length
      this.phaseLoadedCounts.set(phase, actualLoadedCount)
      
      // Calculate and update phase progress (clamped to 100%)
      const phaseProgress = phaseTasks.length > 0 
        ? (actualLoadedCount / phaseTasks.length) * 100 
        : 100
      const clampedProgress = Math.max(0, Math.min(100, phaseProgress))
      loadingPhaseManager.updatePhaseProgress(phase, clampedProgress)
    }
    
    // Notify progress
    this.notifyProgress(this.getProgress())
  }

  /**
   * Update player position for predictive prefetching
   */
  updatePlayerPosition(position: { x: number; y: number; z: number }, velocity?: { x: number; y: number; z: number }): void {
    const previousPosition = this.playerPosition
    this.playerPosition = position
    if (velocity) {
      this.playerVelocity = velocity
    }
    
    // Trigger prefetch check if position changed significantly
    if (previousPosition) {
      const distance = Math.sqrt(
        Math.pow(position.x - previousPosition.x, 2) +
        Math.pow(position.y - previousPosition.y, 2) +
        Math.pow(position.z - previousPosition.z, 2)
      )
      
      // Only prefetch if moved more than 5 units
      if (distance > 5) {
        this.checkAndPrefetch()
      }
    } else {
      // First position update - prefetch immediately
      this.checkAndPrefetch()
    }
  }

  /**
   * Set prefetch radius
   */
  setPrefetchRadius(radius: number): void {
    this.prefetchRadius = radius
  }

  /**
   * Register a prefetch zone (area where assets should be loaded)
   */
  registerPrefetchZone(id: string, zone: PrefetchZone): void {
    this.prefetchZones.set(id, zone)
    this.checkAndPrefetch()
  }

  /**
   * Unregister a prefetch zone
   */
  unregisterPrefetchZone(id: string): void {
    this.prefetchZones.delete(id)
  }

  /**
   * Check which assets should be prefetched based on player position
   */
  private checkAndPrefetch(): void {
    if (!this.playerPosition || this.isPrefetching) return
    
    // Calculate predicted position based on velocity
    const predictionTime = 2 // Predict 2 seconds ahead
    const predictedPosition = {
      x: this.playerPosition.x + this.playerVelocity.x * predictionTime,
      y: this.playerPosition.y + this.playerVelocity.y * predictionTime,
      z: this.playerPosition.z + this.playerVelocity.z * predictionTime
    }
    
    // Find assets within prefetch radius
    const assetsToPrefetch: AssetLoadTask[] = []
    
    for (const task of this.loadingTasks) {
      // Skip if already loaded
      if (this.loadedAssets.has(task.id)) continue
      
      // Skip if already in prefetch queue
      if (this.prefetchQueue.some(t => t.id === task.id)) continue
      
      // Check if asset has position and is within range
      if (task.position) {
        const distance = Math.sqrt(
          Math.pow(predictedPosition.x - task.position.x, 2) +
          Math.pow(predictedPosition.y - task.position.y, 2) +
          Math.pow(predictedPosition.z - task.position.z, 2)
        )
        
        const loadRadius = task.radius || this.prefetchRadius
        if (distance <= loadRadius) {
          assetsToPrefetch.push(task)
        }
      }
    }
    
    // Check prefetch zones
    for (const [_zoneId, zone] of this.prefetchZones) {
      const distance = Math.sqrt(
        Math.pow(predictedPosition.x - zone.center.x, 2) +
        Math.pow(predictedPosition.y - zone.center.y, 2) +
        Math.pow(predictedPosition.z - zone.center.z, 2)
      )
      
      if (distance <= zone.radius) {
        // Find assets in this zone
        for (const task of this.loadingTasks) {
          if (this.loadedAssets.has(task.id)) continue
          if (this.prefetchQueue.some(t => t.id === task.id)) continue
          
          if (task.position) {
            const assetDistance = Math.sqrt(
              Math.pow(zone.center.x - task.position.x, 2) +
              Math.pow(zone.center.y - task.position.y, 2) +
              Math.pow(zone.center.z - task.position.z, 2)
            )
            
            if (assetDistance <= zone.radius) {
              // Boost priority based on zone priority
              const boostedTask = { ...task, priority: task.priority + zone.priority }
              assetsToPrefetch.push(boostedTask)
            }
          }
        }
      }
    }
    
    // Sort by priority and add to prefetch queue
    assetsToPrefetch.sort((a, b) => b.priority - a.priority)
    this.prefetchQueue.push(...assetsToPrefetch)
    
    // Start prefetching if not already
    if (this.prefetchQueue.length > 0 && !this.isPrefetching) {
      this.startPrefetching()
    }
  }

  /**
   * Start prefetching assets in the queue
   */
  private async startPrefetching(): Promise<void> {
    if (this.isPrefetching) return
    
    this.isPrefetching = true
    
    // Process prefetch queue in batches to avoid overwhelming the system
    const BATCH_SIZE = 3
    const PREFETCH_DELAY = 100 // 100ms between batches
    
    while (this.prefetchQueue.length > 0) {
      const batch = this.prefetchQueue.splice(0, BATCH_SIZE)
      
      // Load batch in parallel
      await Promise.all(
        batch.map(task => this.loadAsset(task))
      )
      
      // Small delay between batches
      if (this.prefetchQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, PREFETCH_DELAY))
      }
    }
    
    this.isPrefetching = false
  }

  /**
   * Load a single asset
   */
  private async loadAsset(task: AssetLoadTask): Promise<void> {
    if (this.loadedAssets.has(task.id)) return
    
    try {
      switch (task.type) {
        case 'texture':
          if (task.path) {
            await new Promise<void>((resolve) => {
              const loader = new THREE.TextureLoader()
              loader.load(task.path!, () => resolve(), undefined, () => resolve())
            })
          }
          break
        case 'model':
          // Model loading handled by modelLoader
          await Promise.resolve()
          break
        case 'sound':
          // Sound loading handled by assetManager
          await Promise.resolve()
          break
        case 'icon':
          // Icons loaded differently
          break
      }
      
      this.loadedAssets.add(task.id)
      this.notifyProgress(this.getProgress())
    } catch (error) {
      console.error(`Failed to prefetch asset ${task.id}:`, error)
      // Still mark as attempted to avoid retrying immediately
      this.loadedAssets.add(task.id)
    }
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
    this.prefetchZones.clear()
    this.playerPosition = null
    this.playerVelocity = { x: 0, y: 0, z: 0 }
    this.prefetchQueue = []
    this.isPrefetching = false
    this.activeLoads = 0
    this.loadQueue = []
  }
}

// Singleton instance
export const progressiveLoader = new ProgressiveLoader()

