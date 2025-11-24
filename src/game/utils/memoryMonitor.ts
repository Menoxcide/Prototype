/**
 * Memory Monitor - Tracks memory usage and provides warnings
 */

export interface MemoryStats {
  used: number
  total: number
  percentage: number
  heapUsed: number
  heapTotal: number
  heapLimit?: number
}

export interface MemoryMonitor {
  getMemoryStats(): MemoryStats
  checkMemoryThreshold(thresholdMB?: number): boolean
  getMemoryWarning(): string | null
  startMonitoring(intervalMs?: number): void
  stopMonitoring(): void
}

class MemoryMonitorImpl implements MemoryMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_THRESHOLD_MB = 1500 // 1.5GB
  private readonly WARNING_THRESHOLD_MB = 1800 // 1.8GB
  private readonly CRITICAL_THRESHOLD_MB = 2000 // 2GB

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    // @ts-ignore - performance.memory is Chrome-specific
    const memory = (performance as any).memory
    
    if (memory) {
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit
      }
    }
    
    // Fallback for browsers without performance.memory
    return {
      used: 0,
      total: 0,
      percentage: 0,
      heapUsed: 0,
      heapTotal: 0
    }
  }

  /**
   * Check if memory usage exceeds threshold
   */
  checkMemoryThreshold(thresholdMB: number = this.DEFAULT_THRESHOLD_MB): boolean {
    const stats = this.getMemoryStats()
    const usedMB = stats.heapUsed / (1024 * 1024)
    return usedMB > thresholdMB
  }

  /**
   * Get memory warning message if threshold exceeded
   */
  getMemoryWarning(): string | null {
    const stats = this.getMemoryStats()
    const usedMB = stats.heapUsed / (1024 * 1024)
    
    if (usedMB > this.CRITICAL_THRESHOLD_MB) {
      return `CRITICAL: Memory usage is ${usedMB.toFixed(1)}MB. Consider reducing quality settings.`
    } else if (usedMB > this.WARNING_THRESHOLD_MB) {
      return `WARNING: Memory usage is ${usedMB.toFixed(1)}MB. High memory usage detected.`
    } else if (usedMB > this.DEFAULT_THRESHOLD_MB) {
      return `Memory usage is ${usedMB.toFixed(1)}MB.`
    }
    
    return null
  }

  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 10000): void {
    if (this.monitoringInterval) return
    
    this.monitoringInterval = setInterval(() => {
      const warning = this.getMemoryWarning()
      if (warning) {
        console.warn('[Memory Monitor]', warning)
        
        // In production, could trigger quality reduction
        if (this.checkMemoryThreshold(this.CRITICAL_THRESHOLD_MB)) {
          // Dispatch event for quality system to handle
          window.dispatchEvent(new CustomEvent('memory-critical', {
            detail: this.getMemoryStats()
          }))
        }
      }
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
}

export const memoryMonitor = new MemoryMonitorImpl()

