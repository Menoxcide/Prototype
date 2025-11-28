/**
 * Frame Time Monitor
 * Detects and prevents extremely long frame times that cause WebGL context loss
 * Automatically throttles operations when frame times exceed thresholds
 */

class FrameTimeMonitor {
  private frameStartTime: number = 0
  private frameTimes: number[] = []
  private readonly MAX_FRAME_TIME = 16.67 // 60 FPS = 16.67ms per frame
  private readonly WARNING_THRESHOLD = 50 // Warn at 50ms
  private readonly CRITICAL_THRESHOLD = 100 // Critical at 100ms
  private readonly EMERGENCY_THRESHOLD = 500 // Emergency at 500ms - likely blocking
  private readonly MAX_FRAME_TIME_HISTORY = 60 // Track last 60 frames (~1 second at 60fps)
  private isMonitoring: boolean = false
  private monitoringInterval: number | null = null
  private lastBlockingOperation: string | null = null
  private blockingOperationStart: number = 0
  
  /**
   * Start monitoring frame times
   */
  startMonitoring(): void {
    if (this.isMonitoring) return
    this.isMonitoring = true
    
    // Monitor every frame via requestAnimationFrame
    const monitor = () => {
      if (!this.isMonitoring) return
      
      const now = performance.now()
      const frameTime = now - this.frameStartTime
      
      // Track frame times
      this.frameTimes.push(frameTime)
      if (this.frameTimes.length > this.MAX_FRAME_TIME_HISTORY) {
        this.frameTimes.shift()
      }
      
      // Check for blocking operations
      if (frameTime > this.EMERGENCY_THRESHOLD) {
        this.handleEmergencyFrameTime(frameTime)
      } else if (frameTime > this.CRITICAL_THRESHOLD) {
        this.handleCriticalFrameTime(frameTime)
      } else if (frameTime > this.WARNING_THRESHOLD) {
        this.handleWarningFrameTime(frameTime)
      }
      
      this.frameStartTime = now
      requestAnimationFrame(monitor)
    }
    
    this.frameStartTime = performance.now()
    requestAnimationFrame(monitor)
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
  
  /**
   * Mark the start of a potentially blocking operation
   */
  markOperationStart(operationName: string): void {
    this.lastBlockingOperation = operationName
    this.blockingOperationStart = performance.now()
  }
  
  /**
   * Mark the end of a potentially blocking operation
   */
  markOperationEnd(): void {
    const duration = performance.now() - this.blockingOperationStart
    if (duration > this.WARNING_THRESHOLD && this.lastBlockingOperation) {
      if (import.meta.env.DEV) {
        console.warn(`[FrameTimeMonitor] Long operation detected: ${this.lastBlockingOperation} took ${duration.toFixed(2)}ms`)
      }
    }
    this.lastBlockingOperation = null
    this.blockingOperationStart = 0
  }
  
  /**
   * Handle warning-level frame time
   */
  private handleWarningFrameTime(frameTime: number): void {
    if (import.meta.env.DEV) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) {
        console.warn(`[FrameTimeMonitor] Long frame detected: ${frameTime.toFixed(2)}ms (target: ${this.MAX_FRAME_TIME}ms)`)
      }
    }
  }
  
  /**
   * Handle critical-level frame time
   */
  private handleCriticalFrameTime(frameTime: number): void {
    console.warn(`[FrameTimeMonitor] CRITICAL: Frame took ${frameTime.toFixed(2)}ms (target: ${this.MAX_FRAME_TIME}ms)`)
    
    if (this.lastBlockingOperation) {
      console.warn(`[FrameTimeMonitor] Last operation: ${this.lastBlockingOperation}`)
    }
    
    // Trigger memory cleanup
    import('./memoryManager').then(({ memoryManager }) => {
      memoryManager.forceCleanup()
    }).catch(() => {
      // Ignore if memory manager not available
    })
  }
  
  /**
   * Handle emergency-level frame time (likely blocking operation)
   */
  private handleEmergencyFrameTime(frameTime: number): void {
    console.error(`[FrameTimeMonitor] EMERGENCY: Frame took ${frameTime.toFixed(2)}ms! This is blocking the main thread.`)
    
    if (this.lastBlockingOperation) {
      console.error(`[FrameTimeMonitor] Blocking operation: ${this.lastBlockingOperation}`)
    }
    
    // Log average frame time for context
    if (this.frameTimes.length > 0) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      console.error(`[FrameTimeMonitor] Average frame time: ${avgFrameTime.toFixed(2)}ms`)
    }
    
    // Trigger aggressive cleanup
    import('./memoryManager').then(({ memoryManager }) => {
      memoryManager.forceCleanup()
    }).catch(() => {
      // Ignore if memory manager not available
    })
    
    // Reduce quality settings if available
    import('./qualitySettings').then(({ getQualityManager }) => {
      const qualityManager = getQualityManager()
      const currentPreset = qualityManager.getSettings().preset
      if (currentPreset !== 'low') {
        qualityManager.setPreset('low')
        console.warn('[FrameTimeMonitor] Quality reduced to "low" due to blocking frame times')
      }
    }).catch(() => {
      // Ignore if quality settings not available
    })
  }
  
  /**
   * Get current average frame time
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
  }
  
  /**
   * Get current frame time statistics
   */
  getStats(): {
    average: number
    max: number
    min: number
    current: number
  } {
    if (this.frameTimes.length === 0) {
      return { average: 0, max: 0, min: 0, current: 0 }
    }
    
    return {
      average: this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length,
      max: Math.max(...this.frameTimes),
      min: Math.min(...this.frameTimes),
      current: this.frameTimes[this.frameTimes.length - 1] || 0
    }
  }
}

// Singleton instance
export const frameTimeMonitor = new FrameTimeMonitor()

// Auto-start monitoring in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Start after a short delay to allow game to initialize
  setTimeout(() => {
    frameTimeMonitor.startMonitoring()
  }, 2000)
}

