/**
 * Performance Marks Utility
 * Tracks custom performance marks for key operations
 */

import { analytics, trackPerformanceMark } from './analytics'

/**
 * Performance mark names
 */
export const PERFORMANCE_MARKS = {
  GAME_LOAD: 'game_load',
  ASSET_LOAD: 'asset_load',
  NETWORK_CONNECT: 'network_connect',
  FIRST_FRAME: 'first_frame',
  SCENE_RENDER: 'scene_render',
  ASSET_DOWNLOAD: 'asset_download',
  ZONE_LOAD: 'zone_load',
  CHARACTER_LOAD: 'character_load'
} as const

/**
 * Performance budgets (in milliseconds)
 */
export const PERFORMANCE_BUDGETS = {
  GAME_LOAD: 3000, // 3 seconds
  ASSET_LOAD: 5000, // 5 seconds
  NETWORK_CONNECT: 2000, // 2 seconds
  FIRST_FRAME: 1000, // 1 second
  SCENE_RENDER: 16.67, // 60 FPS
  ASSET_DOWNLOAD: 2000, // 2 seconds per asset
  ZONE_LOAD: 3000, // 3 seconds
  CHARACTER_LOAD: 1000 // 1 second
} as const

class PerformanceMarks {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number> = new Map()

  /**
   * Mark the start of an operation
   */
  markStart(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}_start`)
      this.marks.set(name, performance.now())
    }
  }

  /**
   * Mark the end of an operation and measure duration
   */
  markEnd(name: string): number | null {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}_end`)
      
      try {
        performance.measure(name, `${name}_start`, `${name}_end`)
        const measure = performance.getEntriesByName(name)[0]
        const duration = measure.duration
        
        this.measures.set(name, duration)
        
        // Check against budget
        const budget = PERFORMANCE_BUDGETS[name as keyof typeof PERFORMANCE_BUDGETS]
        if (budget && duration > budget) {
          analytics.track('performance_budget_exceeded', {
            name,
            duration,
            budget,
            exceededBy: duration - budget
          })
        }
        
        // Track to analytics
        trackPerformanceMark(name, duration)
        
        return duration
      } catch (error) {
        // Performance API not available or mark not found
        const startTime = this.marks.get(name)
        if (startTime) {
          const duration = performance.now() - startTime
          this.measures.set(name, duration)
          trackPerformanceMark(name, duration)
          return duration
        }
      }
    }
    
    return null
  }

  /**
   * Get measure for a mark
   */
  getMeasure(name: string): number | null {
    return this.measures.get(name) || null
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear()
    this.measures.clear()
    
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }
}

export const performanceMarks = new PerformanceMarks()

