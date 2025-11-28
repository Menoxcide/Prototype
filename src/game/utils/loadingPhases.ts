/**
 * Loading Phase Manager
 * Manages progressive loading phases for game assets
 * Phase 1 (Critical): Player + basic terrain - required to enter world
 * Phase 2 (Important): Full city + lighting - loads after entering world
 * Phase 3 (Background): Weather, post-processing, distant details - loads incrementally
 */

export type LoadingPhase = 'phase1' | 'phase2' | 'phase3' | 'complete'

export interface PhaseStatus {
  phase: LoadingPhase
  progress: number // 0-100 for current phase
  overallProgress: number // 0-100 overall
  isComplete: boolean
}

export type PhaseCallback = (status: PhaseStatus) => void

class LoadingPhaseManager {
  private currentPhase: LoadingPhase = 'phase1'
  private phaseProgress: Map<LoadingPhase, number> = new Map([
    ['phase1', 0],
    ['phase2', 0],
    ['phase3', 0]
  ])
  private displayedProgress: Map<LoadingPhase, number> = new Map([
    ['phase1', 0],
    ['phase2', 0],
    ['phase3', 0]
  ])
  private phaseCallbacks: Set<PhaseCallback> = new Set()
  private phaseCompleteCallbacks: Map<LoadingPhase, Set<() => void>> = new Map([
    ['phase1', new Set()],
    ['phase2', new Set()],
    ['phase3', new Set()]
  ])
  private progressAnimationFrame: number | null = null
  private lastProgressUpdate: number = 0
  private phaseStartTimes: Map<LoadingPhase, number> = new Map()
  private minPhaseTimes: Map<LoadingPhase, number> = new Map([
    ['phase1', 3000], // Minimum 3 seconds for Phase 1
    ['phase2', 5000], // Minimum 5 seconds for Phase 2
    ['phase3', 2000]  // Minimum 2 seconds for Phase 3
  ])

  /**
   * Get current loading phase
   */
  getCurrentPhase(): LoadingPhase {
    return this.currentPhase
  }

  /**
   * Get current phase status
   */
  getStatus(): PhaseStatus {
    const phaseProgress = this.displayedProgress.get(this.currentPhase) || 0
    const overallProgress = this.calculateOverallProgress()
    
    return {
      phase: this.currentPhase,
      progress: phaseProgress,
      overallProgress,
      isComplete: this.currentPhase === 'complete'
    }
  }

  /**
   * Calculate overall progress across all phases
   * Phase 1: 0-50%, Phase 2: 50-85%, Phase 3: 85-100%
   * Uses displayed progress for smooth animation
   */
  private calculateOverallProgress(): number {
    const phase1Progress = this.displayedProgress.get('phase1') || 0
    const phase2Progress = this.displayedProgress.get('phase2') || 0
    const phase3Progress = this.displayedProgress.get('phase3') || 0

    // Weighted progress: Phase 1 = 50%, Phase 2 = 35%, Phase 3 = 15%
    return Math.min(100, 
      (phase1Progress * 0.5) + 
      (phase2Progress * 0.35) + 
      (phase3Progress * 0.15)
    )
  }

  /**
   * Update progress for a specific phase
   * Progress is smoothly interpolated to prevent jumps
   */
  updatePhaseProgress(phase: LoadingPhase, progress: number): void {
    if (phase === 'complete') return
    
    // Track phase start time if not already tracked
    if (!this.phaseStartTimes.has(phase)) {
      this.phaseStartTimes.set(phase, Date.now())
    }
    
    const clampedProgress = Math.max(0, Math.min(100, progress))
    this.phaseProgress.set(phase, clampedProgress)
    
    // Start smooth progress animation if not already running
    if (this.progressAnimationFrame === null) {
      this.animateProgress()
    }
    
    // If current phase reaches 100%, check minimum time before transitioning
    if (phase === this.currentPhase && clampedProgress >= 100) {
      const phaseStartTime = this.phaseStartTimes.get(phase) || Date.now()
      const minTime = this.minPhaseTimes.get(phase) || 0
      const elapsed = Date.now() - phaseStartTime
      
      // Only transition if minimum time has elapsed
      if (elapsed >= minTime) {
        this.transitionToNextPhase()
      } else {
        // Schedule transition after minimum time
        const remainingTime = minTime - elapsed
        setTimeout(() => {
          // Double-check phase is still at 100% before transitioning
          const currentProgress = this.phaseProgress.get(phase) || 0
          if (currentProgress >= 100 && phase === this.currentPhase) {
            this.transitionToNextPhase()
          }
        }, remainingTime)
      }
    }
  }
  
  /**
   * Animate progress smoothly to prevent jumps
   */
  private animateProgress(): void {
    const now = Date.now()
    Math.min(now - this.lastProgressUpdate, 50) // Cap delta at 50ms
    this.lastProgressUpdate = now
    
    let hasChanges = false
    
    // Smoothly interpolate each phase's displayed progress toward target progress
    for (const phase of ['phase1', 'phase2', 'phase3'] as LoadingPhase[]) {
      const target = this.phaseProgress.get(phase) || 0
      const current = this.displayedProgress.get(phase) || 0
      
      if (Math.abs(target - current) > 0.1) {
        // Interpolate toward target (smooth animation)
        // Use faster speed for larger gaps to prevent getting stuck
        const gap = Math.abs(target - current)
        const speed = gap > 50 ? 0.3 : gap > 20 ? 0.25 : 0.2 // Faster for larger gaps
        const newProgress = current + (target - current) * speed
        this.displayedProgress.set(phase, newProgress)
        hasChanges = true
      } else if (current !== target) {
        // Close enough, snap to target
        this.displayedProgress.set(phase, target)
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      this.notifyCallbacks()
    }
    
    // Continue animation if there are pending changes
    const stillAnimating = Array.from(this.displayedProgress.entries()).some(([phase, displayed]) => {
      const target = this.phaseProgress.get(phase) || 0
      return Math.abs(target - displayed) > 0.1
    })
    
    if (stillAnimating) {
      this.progressAnimationFrame = requestAnimationFrame(() => this.animateProgress())
    } else {
      this.progressAnimationFrame = null
    }
  }

  /**
   * Manually transition to next phase
   */
  transitionToNextPhase(): void {
    const oldPhase = this.currentPhase
    
    // Check minimum time requirement before transitioning
    const phaseStartTime = this.phaseStartTimes.get(oldPhase) || Date.now()
    const minTime = this.minPhaseTimes.get(oldPhase) || 0
    const elapsed = Date.now() - phaseStartTime
    
    if (elapsed < minTime && oldPhase !== 'phase1') {
      // Don't transition yet, wait for minimum time
      const remainingTime = minTime - elapsed
      setTimeout(() => {
        // Re-check if we should transition
        if (this.currentPhase === oldPhase) {
          this.transitionToNextPhase()
        }
      }, remainingTime)
      return
    }
    
    switch (this.currentPhase) {
      case 'phase1':
        this.currentPhase = 'phase2'
        this.phaseProgress.set('phase1', 100)
        this.displayedProgress.set('phase1', 100)
        // Track start time for next phase
        this.phaseStartTimes.set('phase2', Date.now())
        break
      case 'phase2':
        this.currentPhase = 'phase3'
        this.phaseProgress.set('phase2', 100)
        this.displayedProgress.set('phase2', 100)
        // Track start time for next phase
        this.phaseStartTimes.set('phase3', Date.now())
        break
      case 'phase3':
        this.currentPhase = 'complete'
        this.phaseProgress.set('phase3', 100)
        this.displayedProgress.set('phase3', 100)
        break
      case 'complete':
        return // Already complete
    }

    // Notify phase completion callbacks
    const callbacks = this.phaseCompleteCallbacks.get(oldPhase)
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb()
        } catch (error) {
          console.error('Error in phase completion callback:', error)
        }
      })
    }

    this.notifyCallbacks()
  }

  /**
   * Check if a specific phase is complete
   */
  isPhaseComplete(phase: LoadingPhase): boolean {
    if (phase === 'complete') return this.currentPhase === 'complete'
    
    const progress = this.phaseProgress.get(phase) || 0
    return progress >= 100
  }

  /**
   * Check if we can enter the game world (Phase 1 complete)
   */
  canEnterWorld(): boolean {
    return this.isPhaseComplete('phase1')
  }

  /**
   * Subscribe to phase status updates
   */
  subscribe(callback: PhaseCallback): () => void {
    this.phaseCallbacks.add(callback)
    
    // Immediately call with current status
    try {
      callback(this.getStatus())
    } catch (error) {
      console.error('Error in phase status callback:', error)
    }
    
    // Return unsubscribe function
    return () => {
      this.phaseCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to phase completion events
   */
  onPhaseComplete(phase: LoadingPhase, callback: () => void): () => void {
    if (phase === 'complete') {
      // For complete phase, check if already complete
      if (this.currentPhase === 'complete') {
        callback()
        return () => {} // No-op unsubscribe
      }
      // Otherwise, wait for phase3 to complete
      phase = 'phase3'
    }
    
    const callbacks = this.phaseCompleteCallbacks.get(phase)
    if (callbacks) {
      callbacks.add(callback)
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.phaseCompleteCallbacks.get(phase)
      if (callbacks) {
        callbacks.delete(callback)
      }
    }
  }

  /**
   * Notify all callbacks of status change
   */
  private notifyCallbacks(): void {
    const status = this.getStatus()
    this.phaseCallbacks.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('Error in phase status callback:', error)
      }
    })
  }

  /**
   * Reset loading phases (for new game session)
   */
  reset(): void {
    this.currentPhase = 'phase1'
    this.phaseProgress.set('phase1', 0)
    this.phaseProgress.set('phase2', 0)
    this.phaseProgress.set('phase3', 0)
    this.displayedProgress.set('phase1', 0)
    this.displayedProgress.set('phase2', 0)
    this.displayedProgress.set('phase3', 0)
    this.phaseStartTimes.clear()
    this.phaseStartTimes.set('phase1', Date.now()) // Track start of Phase 1
    this.notifyCallbacks()
  }
}

// Singleton instance
export const loadingPhaseManager = new LoadingPhaseManager()

