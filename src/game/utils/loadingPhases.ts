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
  private phaseCallbacks: Set<PhaseCallback> = new Set()
  private phaseCompleteCallbacks: Map<LoadingPhase, Set<() => void>> = new Map([
    ['phase1', new Set()],
    ['phase2', new Set()],
    ['phase3', new Set()]
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
    const phaseProgress = this.phaseProgress.get(this.currentPhase) || 0
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
   */
  private calculateOverallProgress(): number {
    const phase1Progress = this.phaseProgress.get('phase1') || 0
    const phase2Progress = this.phaseProgress.get('phase2') || 0
    const phase3Progress = this.phaseProgress.get('phase3') || 0

    // Weighted progress: Phase 1 = 50%, Phase 2 = 35%, Phase 3 = 15%
    return Math.min(100, 
      (phase1Progress * 0.5) + 
      (phase2Progress * 0.35) + 
      (phase3Progress * 0.15)
    )
  }

  /**
   * Update progress for a specific phase
   */
  updatePhaseProgress(phase: LoadingPhase, progress: number): void {
    if (phase === 'complete') return
    
    const clampedProgress = Math.max(0, Math.min(100, progress))
    this.phaseProgress.set(phase, clampedProgress)
    
    // If current phase reaches 100%, transition to next phase
    if (phase === this.currentPhase && clampedProgress >= 100) {
      this.transitionToNextPhase()
    }
    
    this.notifyCallbacks()
  }

  /**
   * Manually transition to next phase
   */
  transitionToNextPhase(): void {
    const oldPhase = this.currentPhase
    
    switch (this.currentPhase) {
      case 'phase1':
        this.currentPhase = 'phase2'
        this.phaseProgress.set('phase1', 100)
        break
      case 'phase2':
        this.currentPhase = 'phase3'
        this.phaseProgress.set('phase2', 100)
        break
      case 'phase3':
        this.currentPhase = 'complete'
        this.phaseProgress.set('phase3', 100)
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
    this.notifyCallbacks()
  }
}

// Singleton instance
export const loadingPhaseManager = new LoadingPhaseManager()

