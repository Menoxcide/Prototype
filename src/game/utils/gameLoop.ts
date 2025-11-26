/**
 * Variable Timestep Game Loop
 * Maintains consistent game logic regardless of frame rate
 */

export interface GameLoopOptions {
  fixedUpdateInterval?: number // Fixed update interval in ms (default: 16.67ms for 60Hz)
  maxDeltaTime?: number // Maximum delta time to prevent spiral of death (default: 100ms)
  onFixedUpdate: (deltaTime: number) => void
  onVariableUpdate?: (deltaTime: number, alpha: number) => void // Alpha is interpolation factor
}

export class VariableTimestepLoop {
  private accumulator = 0
  private lastTime = 0
  private fixedUpdateInterval: number
  private maxDeltaTime: number
  private onFixedUpdate: (deltaTime: number) => void
  private onVariableUpdate?: (deltaTime: number, alpha: number) => void
  private animationFrameId: number | null = null
  private isRunning = false

  constructor(options: GameLoopOptions) {
    this.fixedUpdateInterval = options.fixedUpdateInterval || 16.67 // 60Hz
    this.maxDeltaTime = options.maxDeltaTime || 100
    this.onFixedUpdate = options.onFixedUpdate
    this.onVariableUpdate = options.onVariableUpdate
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.accumulator = 0
    this.tick()
  }

  stop(): void {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private tick(): void {
    if (!this.isRunning) return

    const currentTime = performance.now()
    let deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Clamp delta time to prevent spiral of death
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime
    }

    // Add delta time to accumulator
    this.accumulator += deltaTime

    // Run fixed updates
    while (this.accumulator >= this.fixedUpdateInterval) {
      this.onFixedUpdate(this.fixedUpdateInterval)
      this.accumulator -= this.fixedUpdateInterval
    }

    // Calculate interpolation alpha for smooth rendering
    const alpha = this.accumulator / this.fixedUpdateInterval

    // Run variable update (for rendering interpolation)
    if (this.onVariableUpdate) {
      this.onVariableUpdate(deltaTime, alpha)
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.tick())
  }

  getAccumulator(): number {
    return this.accumulator
  }

  getFixedUpdateInterval(): number {
    return this.fixedUpdateInterval
  }
}

/**
 * Frame Budget Manager
 * Skips non-critical updates if frame time exceeds budget
 */
export interface FrameBudgetOptions {
  targetFrameTime?: number // Target frame time in ms (default: 16.67ms for 60 FPS)
  budgetThreshold?: number // Percentage of budget before skipping (default: 0.8 = 80%)
}

export class FrameBudgetManager {
  private targetFrameTime: number
  private budgetThreshold: number
  private frameStartTime = 0
  private frameTimeHistory: number[] = []
  private maxHistorySize = 60 // Keep last 60 frames

  constructor(options: FrameBudgetOptions = {}) {
    this.targetFrameTime = options.targetFrameTime || 16.67 // 60 FPS
    this.budgetThreshold = options.budgetThreshold || 0.8
  }

  startFrame(): void {
    this.frameStartTime = performance.now()
  }

  endFrame(): void {
    const frameTime = performance.now() - this.frameStartTime
    this.frameTimeHistory.push(frameTime)
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift()
    }
  }

  shouldSkipUpdate(updateCost: number): boolean {
    const elapsed = performance.now() - this.frameStartTime
    const remainingBudget = this.targetFrameTime * this.budgetThreshold - elapsed
    return remainingBudget < updateCost
  }

  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0)
    return sum / this.frameTimeHistory.length
  }

  getCurrentFPS(): number {
    const avgFrameTime = this.getAverageFrameTime()
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0
  }

  getRemainingBudget(): number {
    const elapsed = performance.now() - this.frameStartTime
    return Math.max(0, this.targetFrameTime - elapsed)
  }
}

