/**
 * Frame Budget Throttle
 * Prevents expensive operations from running every frame
 * Uses frame budget system to distribute work across frames
 */

interface ThrottledFunction {
  fn: () => void
  priority: number
  lastRun: number
  minInterval: number
  frameSkip: number
  frameCount: number
}

class FrameBudgetThrottle {
  private throttledFunctions: Map<string, ThrottledFunction> = new Map()
  private frameCount: number = 0
  private readonly MAX_BUDGET_MS = 8 // Max 8ms per frame for throttled operations
  
  /**
   * Register a function to be throttled
   */
  register(
    id: string,
    fn: () => void,
    options: {
      priority?: number // Higher priority runs more often
      minInterval?: number // Minimum milliseconds between runs
      frameSkip?: number // Skip N frames between runs
    } = {}
  ): void {
    this.throttledFunctions.set(id, {
      fn,
      priority: options.priority || 1,
      lastRun: 0,
      minInterval: options.minInterval || 0,
      frameSkip: options.frameSkip || 0,
      frameCount: 0
    })
  }
  
  /**
   * Unregister a throttled function
   */
  unregister(id: string): void {
    this.throttledFunctions.delete(id)
  }
  
  /**
   * Run all throttled functions within budget
   */
  update(): void {
    this.frameCount++
    
    const startTime = performance.now()
    const functions = Array.from(this.throttledFunctions.values())
    
    // Sort by priority (higher first)
    functions.sort((a, b) => b.priority - a.priority)
    
    // Run functions within budget
    for (const throttled of functions) {
      // Check frame budget
      if (performance.now() - startTime > this.MAX_BUDGET_MS) {
        break // Out of budget
      }
      
      // Check minimum interval
      const now = performance.now()
      if (now - throttled.lastRun < throttled.minInterval) {
        continue
      }
      
      // Check frame skip
      throttled.frameCount++
      if (throttled.frameSkip > 0 && throttled.frameCount % (throttled.frameSkip + 1) !== 0) {
        continue
      }
      
      // Run function
      try {
        throttled.fn()
        throttled.lastRun = now
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`[FrameBudget] Error running throttled function:`, error)
        }
      }
    }
  }
  
  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.frameCount
  }
  
  /**
   * Clear all throttled functions
   */
  clear(): void {
    this.throttledFunctions.clear()
  }
}

// Singleton instance
export const frameBudgetThrottle = new FrameBudgetThrottle()

/**
 * Hook to create a throttled useFrame callback
 */
export function useThrottledFrame(
  _callback: () => void,
  _options: {
    priority?: number
    minInterval?: number
    frameSkip?: number
  } = {}
): void {
  // This would need to be called from within a useFrame hook
  // For now, components can register directly
}

