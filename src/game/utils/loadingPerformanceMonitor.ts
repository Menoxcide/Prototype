/**
 * Loading Performance Monitor
 * Monitors FPS, memory usage, and loading bottlenecks during load
 * Logs warnings if performance degrades significantly
 */

import { loadingPhaseManager } from './loadingPhases'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage?: number
  memoryLimit?: number
  loadingBottlenecks: string[]
  timestamp: number
}

class LoadingPerformanceMonitor {
  private isMonitoring: boolean = false
  private frameCount: number = 0
  private lastFrameTime: number = 0
  private frameTimeHistory: number[] = []
  private maxHistorySize: number = 60 // Keep last 60 frames
  private metricsCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set()
  private monitoringInterval: number | null = null
  private lastWarningTime: number = 0
  private warningCooldown: number = 5000 // Only warn every 5 seconds
  private bottlenecks: Set<string> = new Set()

  /**
   * Start monitoring performance during loading
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.lastFrameTime = performance.now()
    this.frameCount = 0
    this.frameTimeHistory = []
    this.bottlenecks.clear()

    // Monitor every frame
    const monitor = () => {
      if (!this.isMonitoring) return

      const now = performance.now()
      const frameTime = now - this.lastFrameTime
      this.lastFrameTime = now
      this.frameCount++

      // Track frame time history
      this.frameTimeHistory.push(frameTime)
      if (this.frameTimeHistory.length > this.maxHistorySize) {
        this.frameTimeHistory.shift()
      }

      // Calculate FPS
      const fps = this.calculateFPS()

      // Check for performance issues
      this.checkPerformanceIssues(frameTime, fps)

      // Get memory usage if available
      const memoryUsage = this.getMemoryUsage()

      // Collect metrics
      const metrics: PerformanceMetrics = {
        fps,
        frameTime,
        memoryUsage: memoryUsage?.usedJSHeapSize,
        memoryLimit: memoryUsage?.jsHeapSizeLimit,
        loadingBottlenecks: Array.from(this.bottlenecks),
        timestamp: now
      }

      // Notify callbacks
      this.notifyCallbacks(metrics)

      // Continue monitoring
      this.monitoringInterval = requestAnimationFrame(monitor)
    }

    this.monitoringInterval = requestAnimationFrame(monitor)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false
    if (this.monitoringInterval !== null) {
      cancelAnimationFrame(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.bottlenecks.clear()
  }

  /**
   * Calculate current FPS from frame time history
   */
  private calculateFPS(): number {
    if (this.frameTimeHistory.length === 0) return 0

    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
    return avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0
  }

  /**
   * Check for performance issues and log warnings
   */
  private checkPerformanceIssues(frameTime: number, fps: number): void {
    const now = Date.now()
    const timeSinceLastWarning = now - this.lastWarningTime

    // Check for long frame times (stuttering)
    if (frameTime > 100 && timeSinceLastWarning > this.warningCooldown) {
      this.bottlenecks.add('long-frame-times')
      if (import.meta.env.DEV) {
        console.warn(`[Loading Performance] Long frame time detected: ${frameTime.toFixed(2)}ms (target: <16.67ms for 60fps)`)
      }
      this.lastWarningTime = now
    }

    // Check for low FPS
    if (fps > 0 && fps < 20 && timeSinceLastWarning > this.warningCooldown) {
      this.bottlenecks.add('low-fps')
      if (import.meta.env.DEV) {
        console.warn(`[Loading Performance] Low FPS detected: ${fps} fps (target: >30fps during loading)`)
      }
      this.lastWarningTime = now
    }

    // Check for memory issues
    const memoryUsage = this.getMemoryUsage()
    if (memoryUsage) {
      const memoryPercent = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100
      
      if (memoryPercent > 80 && timeSinceLastWarning > this.warningCooldown) {
        this.bottlenecks.add('high-memory-usage')
        if (import.meta.env.DEV) {
          console.warn(`[Loading Performance] High memory usage: ${memoryPercent.toFixed(1)}% (${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB)`)
        }
        this.lastWarningTime = now
      }
    }

    // Check loading phase progress
    const phaseStatus = loadingPhaseManager.getStatus()
    if (phaseStatus.phase !== 'complete') {
      // Check if progress is stuck
      const progressHistory = this.getProgressHistory()
      if (progressHistory.length >= 10) {
        const recentProgress = progressHistory.slice(-10)
        const isStuck = recentProgress.every((p, i) => i === 0 || Math.abs(p - recentProgress[0]) < 1)
        
        if (isStuck && timeSinceLastWarning > this.warningCooldown * 2) {
          this.bottlenecks.add('stuck-progress')
          if (import.meta.env.DEV) {
            console.warn(`[Loading Performance] Loading progress appears stuck at ${phaseStatus.overallProgress.toFixed(1)}%`)
          }
          this.lastWarningTime = now
        }
      }
    }
  }

  /**
   * Get memory usage if available (Chrome/Edge only)
   */
  private getMemoryUsage(): { usedJSHeapSize: number; jsHeapSizeLimit: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
    return null
  }

  /**
   * Get progress history for stuck detection
   */
  private progressHistory: number[] = []
  private lastProgressCheck: number = 0

  private getProgressHistory(): number[] {
    const now = Date.now()
    // Update progress history every 500ms
    if (now - this.lastProgressCheck > 500) {
      const status = loadingPhaseManager.getStatus()
      this.progressHistory.push(status.overallProgress)
      if (this.progressHistory.length > 20) {
        this.progressHistory.shift()
      }
      this.lastProgressCheck = now
    }
    return this.progressHistory
  }

  /**
   * Subscribe to performance metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.metricsCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.metricsCallbacks.delete(callback)
    }
  }

  /**
   * Notify callbacks of metrics update
   */
  private notifyCallbacks(metrics: PerformanceMetrics): void {
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(metrics)
      } catch (error) {
        console.error('Error in performance metrics callback:', error)
      }
    })
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const fps = this.calculateFPS()
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0
    const memoryUsage = this.getMemoryUsage()

    return {
      fps,
      frameTime: avgFrameTime,
      memoryUsage: memoryUsage?.usedJSHeapSize,
      memoryLimit: memoryUsage?.jsHeapSizeLimit,
      loadingBottlenecks: Array.from(this.bottlenecks),
      timestamp: performance.now()
    }
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.stopMonitoring()
    this.frameCount = 0
    this.frameTimeHistory = []
    this.bottlenecks.clear()
    this.progressHistory = []
    this.lastProgressCheck = 0
    this.lastWarningTime = 0
  }
}

// Singleton instance
export const loadingPerformanceMonitor = new LoadingPerformanceMonitor()

