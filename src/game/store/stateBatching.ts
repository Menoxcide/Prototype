/**
 * State Update Batching
 * Batches multiple state updates within the same frame to reduce re-renders
 */

type StateUpdate = () => void

class StateBatcher {
  private pendingUpdates: StateUpdate[] = []
  private batchTimer: number | null = null
  // BATCH_DELAY is 0 - execute in same frame using requestAnimationFrame

  /**
   * Schedule a state update to be batched
   */
  schedule(update: StateUpdate): void {
    this.pendingUpdates.push(update)
    
    if (this.batchTimer === null) {
      // Schedule batch execution in next frame
      this.batchTimer = requestAnimationFrame(() => {
        this.flush()
      })
    }
  }

  /**
   * Execute all pending updates
   */
  private flush(): void {
    const updates = [...this.pendingUpdates]
    this.pendingUpdates = []
    this.batchTimer = null

    // Execute all updates
    updates.forEach(update => {
      try {
        update()
      } catch (error) {
        console.error('Error in batched state update:', error)
      }
    })
  }

  /**
   * Manually flush pending updates (for immediate execution)
   */
  flushNow(): void {
    if (this.batchTimer !== null) {
      cancelAnimationFrame(this.batchTimer)
      this.batchTimer = null
    }
    this.flush()
  }

  /**
   * Clear all pending updates
   */
  clear(): void {
    if (this.batchTimer !== null) {
      cancelAnimationFrame(this.batchTimer)
      this.batchTimer = null
    }
    this.pendingUpdates = []
  }
}

// Singleton instance
export const stateBatcher = new StateBatcher()

/**
 * Batch multiple state updates
 * @param updates Array of state update functions
 */
export function batch(updates: StateUpdate[]): void {
  updates.forEach(update => stateBatcher.schedule(update))
}

/**
 * Batch a single state update
 */
export function batchUpdate(update: StateUpdate): void {
  stateBatcher.schedule(update)
}

