/**
 * Draw Call Monitor
 * Tracks and reports draw call statistics for optimization
 */

export interface DrawCallStats {
  totalDrawCalls: number
  instancedDrawCalls: number
  regularDrawCalls: number
  materialCount: number
  geometryCount: number
}

class DrawCallMonitor {
  private stats: DrawCallStats = {
    totalDrawCalls: 0,
    instancedDrawCalls: 0,
    regularDrawCalls: 0,
    materialCount: 0,
    geometryCount: 0
  }
  
  private listeners: Set<(stats: DrawCallStats) => void> = new Set()
  private updateInterval: number | null = null

  /**
   * Update draw call statistics
   */
  updateStats(stats: Partial<DrawCallStats>): void {
    this.stats = { ...this.stats, ...stats }
    this.notifyListeners()
  }

  /**
   * Get current statistics
   */
  getStats(): DrawCallStats {
    return { ...this.stats }
  }

  /**
   * Subscribe to draw call updates
   */
  subscribe(callback: (stats: DrawCallStats) => void): () => void {
    this.listeners.add(callback)
    callback(this.stats)
    return () => this.listeners.delete(callback)
  }

  /**
   * Start monitoring (updates every second)
   */
  start(): void {
    if (this.updateInterval !== null) return
    
    this.updateInterval = window.setInterval(() => {
      this.notifyListeners()
    }, 1000)
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.stats)
      } catch (error) {
        console.error('Error in draw call monitor callback:', error)
      }
    })
  }
}

export const drawCallMonitor = new DrawCallMonitor()

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  drawCallMonitor.start()
}

