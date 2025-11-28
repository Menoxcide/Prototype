/**
 * Performance Profiling Tools
 * React DevTools and Three.js Inspector integration
 * FPS tracking and performance metrics
 */

import * as THREE from 'three'
import { assetManager } from '../assets/assetManager'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  memoryUsage: number
  // Frame time breakdown
  renderingTime: number
  physicsTime: number
  networkTime: number
  scriptTime: number
  // GPU memory (if available)
  gpuMemory?: number
  // Asset cache size
  assetCacheSize?: number
}

class PerformanceProfiler {
  private fpsHistory: number[] = []
  private frameTimeHistory: number[] = []
  private lastFrameTime = performance.now()
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memoryUsage: 0,
    renderingTime: 0,
    physicsTime: 0,
    networkTime: 0,
    scriptTime: 0,
    gpuMemory: undefined,
    assetCacheSize: undefined
  }
  
  private isEnabled = false
  private updateInterval: number | null = null

  enable(): void {
    if (this.isEnabled) return
    this.isEnabled = true
    this.startTracking()
  }

  disable(): void {
    if (!this.isEnabled) return
    this.isEnabled = false
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private startTracking(): void {
    const updateMetrics = () => {
      if (!this.isEnabled) return

      const now = performance.now()
      const frameTime = now - this.lastFrameTime
      this.lastFrameTime = now

      const fps = 1000 / frameTime
      this.fpsHistory.push(fps)
      this.frameTimeHistory.push(frameTime)

      // Keep only last 60 frames
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift()
        this.frameTimeHistory.shift()
      }

      // Calculate average
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length

      this.metrics.fps = Math.round(avgFps)
      this.metrics.frameTime = Math.round(avgFrameTime * 100) / 100

      // Get Three.js renderer info if available
      if ((window as any).threeRenderer) {
        const info = ((window as any).threeRenderer as any).info
        if (info) {
          this.metrics.drawCalls = info.render.calls
          this.metrics.triangles = info.render.triangles
          this.metrics.geometries = info.memory.geometries
          this.metrics.textures = info.memory.textures
          
          // GPU memory (if available in renderer info)
          if (info.memory.programs) {
            // Estimate GPU memory usage
            this.metrics.gpuMemory = Math.round(
              (info.memory.textures * 1024 * 1024 + // Estimate texture memory
               info.memory.geometries * 64 * 1024) / 1024 / 1024 // Estimate geometry memory
            )
          }
        }
      }

      // Memory usage (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory
        this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1048576) // MB
      }
      
      // Asset cache size (if assetManager is available)
      try {
        if (assetManager && typeof assetManager.getAssetStats === 'function') {
          const stats = assetManager.getAssetStats()
          // Calculate approximate cache size from asset stats (total number of cached assets)
          this.metrics.assetCacheSize = stats.textures.total + stats.materials.total + (stats.models?.total || 0)
        }
      } catch {
        // AssetManager not available, ignore
      }
      
      // Frame time breakdown using Performance API marks
      try {
        const marks = performance.getEntriesByType('mark') as PerformanceMark[]
        const measures = performance.getEntriesByType('measure') as PerformanceMeasure[]
        
        // Calculate frame time breakdown from measures
        const renderingMeasure = measures.find(m => m.name === 'rendering')
        const physicsMeasure = measures.find(m => m.name === 'physics')
        const networkMeasure = measures.find(m => m.name === 'network')
        const scriptMeasure = measures.find(m => m.name === 'scripts')
        
        this.metrics.renderingTime = renderingMeasure ? Math.round(renderingMeasure.duration * 100) / 100 : 0
        this.metrics.physicsTime = physicsMeasure ? Math.round(physicsMeasure.duration * 100) / 100 : 0
        this.metrics.networkTime = networkMeasure ? Math.round(networkMeasure.duration * 100) / 100 : 0
        this.metrics.scriptTime = scriptMeasure ? Math.round(scriptMeasure.duration * 100) / 100 : 0
        
        // Clear old marks/measures to prevent memory buildup
        if (marks.length > 100) {
          marks.slice(0, marks.length - 50).forEach(m => performance.clearMarks(m.name))
        }
        if (measures.length > 100) {
          measures.slice(0, measures.length - 50).forEach(m => performance.clearMeasures(m.name))
        }
      } catch {
        // Performance API not fully supported, ignore
      }
    }

    // Update every frame
    const frame = () => {
      updateMetrics()
      if (this.isEnabled) {
        requestAnimationFrame(frame)
      }
    }
    requestAnimationFrame(frame)
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getFPSHistory(): number[] {
    return [...this.fpsHistory]
  }

  getFrameTimeHistory(): number[] {
    return [...this.frameTimeHistory]
  }

  /**
   * Enable Three.js Inspector
   */
  enableThreeInspector(renderer: THREE.WebGLRenderer): void {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.THREE) {
      // @ts-ignore
      window.threeRenderer = renderer
      console.log('Three.js Inspector: Renderer attached to window.threeRenderer')
      console.log('Access renderer info via: window.threeRenderer.info')
    }
  }
}

export const performanceProfiler = new PerformanceProfiler()

/**
 * React DevTools Profiling Helper
 */
export function startReactProfiling(): void {
  if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools: Profiling available')
    console.log('Use React DevTools Profiler tab to record performance')
  } else {
    console.warn('React DevTools not detected')
  }
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics(): void {
  const metrics = performanceProfiler.getMetrics()
  console.log('Performance Metrics:', {
    FPS: metrics.fps,
    'Frame Time (ms)': metrics.frameTime,
    'Draw Calls': metrics.drawCalls,
    'Triangles': metrics.triangles,
    'Geometries': metrics.geometries,
    'Textures': metrics.textures,
    'Memory (MB)': metrics.memoryUsage
  })
}

