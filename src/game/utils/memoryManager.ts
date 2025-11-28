/**
 * Memory Manager - Aggressive memory management to prevent browser crashes
 * Monitors memory usage and triggers cleanup when memory pressure is detected
 */

import * as THREE from 'three'
import { assetManager } from '../assets/assetManager'
// import { progressiveLoader } from './progressiveLoader' // Not currently used
import { texturePool } from './texturePool'
import { geometryPool } from './geometryPool'
import { getQualityManager } from './qualitySettings'

interface MemoryMetrics {
  used: number // MB
  total: number // MB
  limit: number // MB
  percentage: number // 0-100
}

class MemoryManager {
  private monitoringInterval: number | null = null
  private cleanupInterval: number | null = null
  private isMonitoring: boolean = false
  
  // Optimized thresholds: Lower thresholds for earlier cleanup to prevent WebGL context loss
  // WebGL context loss typically occurs around 80-90% memory, so we need to be more aggressive
  private readonly HIGH_MEMORY_THRESHOLD = 50 // 50% of heap - start cleanup early
  private readonly CRITICAL_MEMORY_THRESHOLD = 65 // 65% of heap - aggressive cleanup and quality reduction
  private readonly CONTEXT_LOSS_PREVENTION_THRESHOLD = 70 // 70% of heap - emergency measures
  private readonly CLEANUP_INTERVAL = 2000 // Cleanup every 2 seconds (increased frequency from 5s)
  private readonly MONITOR_INTERVAL = 1000 // Check memory every second
  
  // Track last cleanup time to prevent too frequent cleanups
  private lastAggressiveCleanup: number = 0
  private readonly AGGRESSIVE_CLEANUP_COOLDOWN = 3000 // 3 seconds
  
  // Track memory pressure level
  private memoryPressureLevel: 'normal' | 'high' | 'critical' = 'normal'
  
  /**
   * Start monitoring memory usage
   */
  startMonitoring(): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    // Monitor memory usage
    this.monitoringInterval = window.setInterval(() => {
      this.checkMemoryPressure()
    }, this.MONITOR_INTERVAL)
    
    // Regular cleanup interval
    this.cleanupInterval = window.setInterval(() => {
      this.performRegularCleanup()
    }, this.CLEANUP_INTERVAL)
    
    // Listen for memory pressure events (if supported)
    if ('memory' in performance && (performance as any).memory) {
      // Browser supports memory API
      console.log('[MemoryManager] Started memory monitoring')
    }
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
    
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
  
  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): MemoryMetrics | null {
    if (!('memory' in performance)) {
      return null
    }
    
    const memory = (performance as any).memory
    if (!memory) {
      return null
    }
    
    const used = memory.usedJSHeapSize / (1024 * 1024) // MB
    const total = memory.totalJSHeapSize / (1024 * 1024) // MB
    const limit = memory.jsHeapSizeLimit / (1024 * 1024) // MB
    const percentage = (used / limit) * 100
    
    return { used, total, limit, percentage }
  }
  
  /**
   * Check memory pressure and trigger cleanup if needed
   */
  private checkMemoryPressure(): void {
    const metrics = this.getMemoryMetrics()
    if (!metrics) return
    
    const previousLevel = this.memoryPressureLevel
    
    // Determine pressure level
    if (metrics.percentage >= this.CONTEXT_LOSS_PREVENTION_THRESHOLD) {
      // Emergency: Context loss is imminent - take drastic measures
      this.memoryPressureLevel = 'critical'
      this.performEmergencyCleanup()
      this.reduceQualityForMemory()
      // Force quality to low if not already
      const qualityManager = getQualityManager()
      if (qualityManager.getSettings().preset !== 'low') {
        qualityManager.setPreset('low')
        if (import.meta.env.DEV) {
          console.warn(`[MemoryManager] EMERGENCY: Quality forced to "low" to prevent context loss (${metrics.percentage.toFixed(1)}% memory)`)
        }
      }
    } else if (metrics.percentage >= this.CRITICAL_MEMORY_THRESHOLD) {
      this.memoryPressureLevel = 'critical'
    } else if (metrics.percentage >= this.HIGH_MEMORY_THRESHOLD) {
      this.memoryPressureLevel = 'high'
    } else {
      this.memoryPressureLevel = 'normal'
    }
    
    // If pressure increased, trigger aggressive cleanup
    if (this.memoryPressureLevel !== previousLevel && this.memoryPressureLevel !== 'normal') {
      if (import.meta.env.DEV) {
        console.warn(`[MemoryManager] Memory pressure: ${this.memoryPressureLevel} (${metrics.percentage.toFixed(1)}% used)`)
      }
      
      // Trigger immediate cleanup
      this.performAggressiveCleanup()
      
      // Reduce quality if critical
      if (this.memoryPressureLevel === 'critical') {
        this.reduceQualityForMemory()
      }
    }
  }
  
  /**
   * Perform regular cleanup of unused resources
   */
  performRegularCleanup(): void {
    try {
      // Cleanup texture pool
      texturePool.cleanup()
      
      // Cleanup geometry pool
      geometryPool.cleanup()
      
      // Trigger asset manager cleanup
      assetManager.cleanupUnusedAssets(false)
      
      // Force garbage collection hint (if available)
      this.hintGarbageCollection()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[MemoryManager] Error during regular cleanup:', error)
      }
    }
  }
  
  /**
   * Perform aggressive cleanup when memory pressure is detected
   */
  performAggressiveCleanup(): void {
    const now = Date.now()
    if (now - this.lastAggressiveCleanup < this.AGGRESSIVE_CLEANUP_COOLDOWN) {
      return // Too soon since last cleanup
    }
    
    this.lastAggressiveCleanup = now
    
    if (import.meta.env.DEV) {
      console.log('[MemoryManager] Performing aggressive cleanup...')
    }
    
    try {
      // Aggressive texture cleanup
      texturePool.cleanup()
      
      // Aggressive geometry cleanup
      geometryPool.cleanup()
      
      // Aggressive asset cleanup with shorter timeout
      assetManager.cleanupUnusedAssets(true)
      
      // Clear Three.js renderer caches if possible
      this.clearThreeJSCaches()
      
      // Force garbage collection hint
      this.hintGarbageCollection()
      
      if (import.meta.env.DEV) {
        const after = this.getMemoryMetrics()
        if (after) {
          console.log(`[MemoryManager] Cleanup complete. Memory: ${after.percentage.toFixed(1)}%`)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[MemoryManager] Error during aggressive cleanup:', error)
      }
    }
  }
  
  /**
   * Clear Three.js renderer caches
   * Note: This requires access to the renderer, which we'll get from the scene
   */
  private clearThreeJSCaches(): void {
    // Clear texture cache
    THREE.Cache.clear()
    
    // Note: Renderer disposal would need to be done at a higher level
    // We'll trigger cleanup through other means
  }
  
  /**
   * Reduce quality settings when memory is critical
   */
  private reduceQualityForMemory(): void {
    const qualityManager = getQualityManager()
    const currentPreset = qualityManager.getSettings().preset
    
    // Only reduce if we're not already at lowest
    if (currentPreset !== 'low') {
      if (import.meta.env.DEV) {
        console.warn('[MemoryManager] Reducing quality settings due to memory pressure')
      }
      
      // Step down one level
      if (currentPreset === 'ultra') {
        qualityManager.setPreset('high')
      } else if (currentPreset === 'high') {
        qualityManager.setPreset('medium')
      } else if (currentPreset === 'medium') {
        qualityManager.setPreset('low')
      }
    }
  }
  
  /**
   * Hint to the browser to run garbage collection
   * Note: This only works if Chrome DevTools are open or if gc() is exposed
   */
  private hintGarbageCollection(): void {
    // Check if gc() is available (only when DevTools are open)
    if (typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
      } catch (error) {
        // Ignore errors
      }
    }
  }
  
  /**
   * Perform emergency cleanup when context loss is imminent
   */
  private performEmergencyCleanup(): void {
    if (import.meta.env.DEV) {
      console.warn('[MemoryManager] EMERGENCY: Performing emergency cleanup to prevent WebGL context loss')
    }
    
    try {
      // Clear all caches immediately
      THREE.Cache.clear()
      
      // Aggressive texture cleanup
      texturePool.cleanup()
      texturePool.clear() // Clear all unused textures
      
      // Aggressive geometry cleanup
      geometryPool.cleanup()
      geometryPool.clear() // Clear all unused geometries
      
      // Force asset manager to unload unused assets
      assetManager.cleanupUnusedAssets(true)
      
      // Force garbage collection hint (multiple times)
      this.hintGarbageCollection()
      setTimeout(() => this.hintGarbageCollection(), 100)
      setTimeout(() => this.hintGarbageCollection(), 500)
      
      if (import.meta.env.DEV) {
        const after = this.getMemoryMetrics()
        if (after) {
          console.log(`[MemoryManager] Emergency cleanup complete. Memory: ${after.percentage.toFixed(1)}%`)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[MemoryManager] Error during emergency cleanup:', error)
      }
    }
  }
  
  /**
   * Force immediate cleanup (can be called manually)
   */
  forceCleanup(): void {
    this.performAggressiveCleanup()
  }
  
  /**
   * Get current memory pressure level
   */
  getMemoryPressureLevel(): 'normal' | 'high' | 'critical' {
    return this.memoryPressureLevel
  }
  
  /**
   * Dispose all resources (for cleanup on game exit)
   */
  dispose(): void {
    this.stopMonitoring()
    
    // Final cleanup
    texturePool.clear()
    geometryPool.clear()
    
    // Clear Three.js cache
    THREE.Cache.clear()
  }
}

// Singleton instance
export const memoryManager = new MemoryManager()

// Auto-start monitoring when module loads
if (typeof window !== 'undefined') {
  // Start monitoring after a short delay to allow game to initialize
  setTimeout(() => {
    memoryManager.startMonitoring()
  }, 2000)
}

