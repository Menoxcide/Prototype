/**
 * Background Loader
 * Utility to load assets during idle time using requestIdleCallback
 * Used for Phase 3 (background) assets that can load incrementally
 */

import { progressiveLoader, type AssetLoadTask } from './progressiveLoader'

class BackgroundLoader {
  private queue: AssetLoadTask[] = []
  private isProcessing = false
  private idleCallbackId: number | null = null
  private timeoutId: NodeJS.Timeout | null = null

  /**
   * Add assets to background loading queue
   */
  queueAssets(tasks: AssetLoadTask[]): void {
    this.queue.push(...tasks)
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing()
    }
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.isProcessing || this.queue.length === 0) return
    
    this.isProcessing = true
    
    // Use requestIdleCallback if available, otherwise use setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      this.idleCallbackId = requestIdleCallback(
        (deadline) => this.processQueue(deadline),
        { timeout: 1000 } // Force execution after 1 second even if not idle
      )
    } else {
      // Fallback for browsers without requestIdleCallback
      this.timeoutId = setTimeout(() => {
        this.processQueue({ timeRemaining: () => 5 } as IdleDeadline)
      }, 16) // ~60fps
    }
  }

  /**
   * Process queue during idle time
   */
  private processQueue(deadline: IdleDeadline): void {
    const maxTimePerFrame = 5 // Default 5ms per frame
    const batchSize = 1 // Load one asset at a time to avoid blocking
    
    let processed = 0
    
    while (
      this.queue.length > 0 && 
      processed < batchSize &&
      deadline.timeRemaining() > maxTimePerFrame
    ) {
      const task = this.queue.shift()
      if (!task) break
      
      // Load the asset (non-blocking)
      this.loadAsset(task).catch(error => {
        console.error(`Background loader failed to load ${task.id}:`, error)
      })
      
      processed++
    }
    
    // Continue processing if queue is not empty
    if (this.queue.length > 0) {
      this.startProcessing()
    } else {
      this.isProcessing = false
    }
  }

  /**
   * Load a single asset
   */
  private async loadAsset(task: AssetLoadTask): Promise<void> {
    try {
      // Register with progressive loader
      progressiveLoader.addAsset(task)
      
      // Load the asset based on type
      switch (task.type) {
        case 'texture':
          if (task.path) {
            const { TextureLoader } = await import('three')
            const loader = new TextureLoader()
            await new Promise<void>((resolve, reject) => {
              loader.load(
                task.path!,
                () => resolve(),
                undefined,
                (error) => reject(error)
              )
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
      
      // Update phase progress if this is a phase3 asset
      // Note: Phase 3 assets are loaded in background, progress is tracked by progressiveLoader
      // The phase manager will be updated by progressiveLoader when assets complete
    } catch (error) {
      console.error(`Failed to load background asset ${task.id}:`, error)
      throw error
    }
  }

  /**
   * Clear the queue and stop processing
   */
  clear(): void {
    this.queue = []
    this.isProcessing = false
    
    if (this.idleCallbackId !== null && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(this.idleCallbackId)
      this.idleCallbackId = null
    }
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number; processing: boolean } {
    return {
      queued: this.queue.length,
      processing: this.isProcessing
    }
  }
}

// Singleton instance
export const backgroundLoader = new BackgroundLoader()

/**
 * Helper function to queue Phase 3 assets for background loading
 */
export function queueBackgroundAssets(tasks: AssetLoadTask[]): void {
  // Ensure all tasks are marked as phase3
  tasks.forEach(task => {
    task.phase = 'phase3'
    task.priority = task.priority || 0
  })
  
  backgroundLoader.queueAssets(tasks)
}

