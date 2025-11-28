/**
 * Input Lag Profiler
 * Measures input-to-movement latency using Performance API
 */

class InputLagProfiler {
  private inputTimestamps: Map<string, number> = new Map()
  private latencyHistory: number[] = []
  private readonly MAX_HISTORY = 100

  /**
   * Record when input was received
   */
  recordInput(key: string): void {
    const timestamp = performance.now()
    this.inputTimestamps.set(key, timestamp)
  }

  /**
   * Record when movement was applied (after input)
   */
  recordMovement(key: string): void {
    const inputTime = this.inputTimestamps.get(key)
    if (!inputTime) return

    const movementTime = performance.now()
    const latency = movementTime - inputTime
    this.latencyHistory.push(latency)
    
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift()
    }

    this.inputTimestamps.delete(key)
  }

  /**
   * Get average input lag in milliseconds
   */
  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0)
    return sum / this.latencyHistory.length
  }

  /**
   * Get current input lag (most recent measurement)
   */
  getCurrentLatency(): number {
    if (this.latencyHistory.length === 0) return 0
    return this.latencyHistory[this.latencyHistory.length - 1]
  }

  /**
   * Get max input lag in history
   */
  getMaxLatency(): number {
    if (this.latencyHistory.length === 0) return 0
    return Math.max(...this.latencyHistory)
  }

  /**
   * Clear history
   */
  clear(): void {
    this.latencyHistory = []
    this.inputTimestamps.clear()
  }
}

export const inputLagProfiler = new InputLagProfiler()

