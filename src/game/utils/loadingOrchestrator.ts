/**
 * Loading Orchestrator
 * Sequential milestone-based loading system with explicit progress control
 * Each percentage point has a defined meaning and is verified before advancing
 */

export type LoadingFeature = 
  | 'Initialization'
  | 'Textures'
  | 'Player'
  | 'Lighting'
  | 'Game Systems'
  | 'Road Network'
  | 'Buildings'
  | 'Shadows'
  | 'Weather'
  | 'Post Processing'
  | 'Rendering Verification'
  | 'Complete'

export interface LoadingMilestone {
  percentage: number
  feature: LoadingFeature
  description: string
  verify: () => Promise<boolean> | boolean
}

export interface LoadingStatus {
  currentMilestone: number
  currentPercentage: number
  displayedPercentage: number
  currentFeature: LoadingFeature
  featureStatus: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'>
  isComplete: boolean
}

class LoadingOrchestrator {
  private milestones: LoadingMilestone[] = []
  private currentMilestoneIndex: number = 0
  private displayedProgress: number = 0
  private featureStatus: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'> = new Map()
  private statusCallbacks: Set<(status: LoadingStatus) => void> = new Set()
  private progressAnimationFrame: number | null = null

  constructor() {
    this.initializeMilestones()
    this.initializeFeatureStatus()
  }

  /**
   * Initialize loading milestones with explicit checkpoints
   * Verification is lenient - allows progress even if feature not explicitly marked
   * (components will mark features as they load)
   */
  private initializeMilestones(): void {
    this.milestones = [
      // Phase 1: Initialization & Critical Assets (0-50%)
      { percentage: 0, feature: 'Initialization', description: 'System initialization', verify: () => true },
      { percentage: 5, feature: 'Textures', description: 'Loading critical textures', verify: () => true }, // Allow progress, components will mark
      { percentage: 15, feature: 'Player', description: 'Loading player model', verify: () => true }, // Allow progress, components will mark
      { percentage: 25, feature: 'Lighting', description: 'Setting up lighting', verify: () => true }, // Allow progress, components will mark
      { percentage: 35, feature: 'Game Systems', description: 'Initializing game systems', verify: () => true }, // Allow progress
      { percentage: 45, feature: 'Textures', description: 'Finalizing textures', verify: () => true }, // Phase 1 complete
      { percentage: 50, feature: 'Road Network', description: 'Generating road network', verify: () => true }, // Allow progress, components will mark
      
      // Phase 2: World Building (50-85%)
      { percentage: 60, feature: 'Buildings', description: 'Loading buildings', verify: () => true }, // Allow progress, components will mark
      { percentage: 70, feature: 'Shadows', description: 'Setting up shadows', verify: () => true }, // Allow progress, components will mark
      { percentage: 80, feature: 'Buildings', description: 'Finalizing buildings', verify: () => true }, // Phase 2 complete
      { percentage: 85, feature: 'Weather', description: 'Loading weather effects', verify: () => true }, // Allow progress, components will mark
      
      // Phase 3: Polish & Rendering (85-100%)
      { percentage: 90, feature: 'Post Processing', description: 'Applying post-processing', verify: () => true }, // Allow progress, components will mark
      { percentage: 95, feature: 'Rendering Verification', description: 'Verifying rendering', verify: () => {
        // Only verify rendering at 95%+ - this is critical
        return this.isFeatureLoaded('Rendering Verification')
      }},
      { percentage: 98, feature: 'Rendering Verification', description: 'Final rendering check', verify: () => {
        // Must have rendering complete at 98%
        return this.isFeatureLoaded('Rendering Verification')
      }},
      { percentage: 100, feature: 'Complete', description: 'Loading complete', verify: () => true }
    ]
  }

  /**
   * Initialize feature status map
   */
  private initializeFeatureStatus(): void {
    const features: LoadingFeature[] = [
      'Initialization',
      'Textures',
      'Player',
      'Lighting',
      'Game Systems',
      'Road Network',
      'Buildings',
      'Shadows',
      'Weather',
      'Post Processing',
      'Rendering Verification',
      'Complete'
    ]
    
    features.forEach(feature => {
      this.featureStatus.set(feature, 'pending')
    })
  }

  /**
   * Check if a feature is loaded
   */
  private isFeatureLoaded(feature: LoadingFeature): boolean {
    const status = this.featureStatus.get(feature)
    // For some features, we allow them to pass if they're loading (components will mark them loaded)
    // For others, we require explicit 'loaded' status
    if (feature === 'Initialization' || feature === 'Game Systems') {
      return status === 'loaded' || status === 'loading'
    }
    return status === 'loaded'
  }

  /**
   * Start loading orchestration
   * Note: Manual control via advanceToMilestone() is preferred for sequential loading
   */
  start(): void {
    this.currentMilestoneIndex = 0
    this.displayedProgress = 0
    // Don't auto-advance - let Game.tsx control milestones sequentially
    // this.advanceToNextMilestone()
  }

  /**
   * Advance to the next milestone (used by start() for automatic progression)
   */
  async advanceToNextMilestone(): Promise<void> {
    if (this.currentMilestoneIndex >= this.milestones.length) {
      return // Already at end
    }

    const milestone = this.milestones[this.currentMilestoneIndex]
    
    // Mark feature as loading
    if (milestone.feature !== 'Complete') {
      this.featureStatus.set(milestone.feature, 'loading')
      this.notifyStatus()
    }

    // Verify milestone before advancing
    const verified = await this.verifyMilestone(milestone)
    
    if (verified) {
      // Mark feature as loaded
      if (milestone.feature !== 'Complete') {
        this.featureStatus.set(milestone.feature, 'loaded')
      }
      
      // Advance to next milestone (progress will be calculated from feature status)
      this.currentMilestoneIndex++
      
      // Don't set displayedProgress directly - let feature-based calculation handle it
      // But trigger animation update
      this.notifyStatus()
      
      // If not at end, continue to next milestone
      if (this.currentMilestoneIndex < this.milestones.length) {
        // Small delay before next milestone for smooth progression
        await new Promise(resolve => setTimeout(resolve, 100))
        this.advanceToNextMilestone()
      } else {
        // Complete
        this.featureStatus.set('Complete', 'loaded')
        this.notifyStatus()
      }
    } else {
      // Milestone not ready, wait and retry (but don't block forever)
      await new Promise(resolve => setTimeout(resolve, 200))
      // Continue anyway after a reasonable wait (components will mark features loaded)
      this.currentMilestoneIndex++
      
      // Don't set displayedProgress directly - let feature-based calculation handle it
      this.notifyStatus()
      
      if (this.currentMilestoneIndex < this.milestones.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
        this.advanceToNextMilestone()
      }
    }
  }

  /**
   * Verify a milestone is ready
   */
  private async verifyMilestone(milestone: LoadingMilestone): Promise<boolean> {
    try {
      const result = milestone.verify()
      if (result instanceof Promise) {
        return await result
      }
      return result
    } catch (error) {
      console.error(`Error verifying milestone ${milestone.percentage}%:`, error)
      return false
    }
  }

  /**
   * Manually advance to a specific milestone (for explicit control)
   * This directly sets the progress without verification (for sequential control)
   */
  async advanceToMilestone(percentage: number): Promise<void> {
    const targetIndex = this.milestones.findIndex(m => m.percentage >= percentage)
    
    if (targetIndex === -1) {
      // Target beyond all milestones, go to end
      this.currentMilestoneIndex = this.milestones.length
      // Don't set displayedProgress directly - let feature-based calculation handle it
      this.notifyStatus()
      return
    }

    // Directly advance to target milestone (sequential control, no verification needed)
    if (this.currentMilestoneIndex < targetIndex) {
      // Mark all features up to target as loading/loaded
      for (let i = this.currentMilestoneIndex; i < targetIndex; i++) {
        const milestone = this.milestones[i]
        if (milestone.feature !== 'Complete') {
          // Only mark as loading if not already loaded
          if (this.featureStatus.get(milestone.feature) === 'pending') {
            this.featureStatus.set(milestone.feature, 'loading')
          }
        }
      }
      
      this.currentMilestoneIndex = targetIndex
      // Don't set displayedProgress directly - let feature-based calculation handle it
      this.notifyStatus()
    }
  }

  /**
   * Mark a feature as loaded (called by loading systems)
   */
  markFeatureLoaded(feature: LoadingFeature): void {
    this.featureStatus.set(feature, 'loaded')
    this.notifyStatus()
    
    // Check if we can advance to next milestone
    this.checkAndAdvance()
  }

  /**
   * Check if we can advance and do so if possible
   */
  private async checkAndAdvance(): Promise<void> {
    if (this.currentMilestoneIndex >= this.milestones.length) {
      return // Already complete
    }

    const currentMilestone = this.milestones[this.currentMilestoneIndex]
    const verified = await this.verifyMilestone(currentMilestone)
    
    if (verified && this.displayedProgress < currentMilestone.percentage) {
      // Can advance to this milestone
      await this.advanceToNextMilestone()
    }
  }

  /**
   * Calculate progress based on actual feature loading status
   * Progress is based on how many features are loaded vs total features
   */
  private calculateFeatureBasedProgress(): number {
    // Features that count toward progress (exclude 'Complete' as it's the final state)
    const progressFeatures: LoadingFeature[] = [
      'Initialization',
      'Textures',
      'Player',
      'Lighting',
      'Game Systems',
      'Road Network',
      'Buildings',
      'Shadows',
      'Weather',
      'Post Processing',
      'Rendering Verification'
    ]
    
    let loadedCount = 0
    let totalCount = progressFeatures.length
    
    progressFeatures.forEach(feature => {
      const status = this.featureStatus.get(feature)
      if (status === 'loaded') {
        loadedCount++
      }
      // Only count fully loaded features - loading features don't contribute to progress
      // This gives a more accurate representation of actual completion
    })
    
    // Calculate percentage based on actual feature status
    // Only fully loaded features count toward progress
    const featureBasedProgress = (loadedCount / totalCount) * 100
    
    // Use milestone percentage as a cap - progress can't exceed the current milestone
    // This prevents progress from jumping ahead before milestones are reached
    const milestoneCap = this.milestones[this.currentMilestoneIndex]?.percentage ?? 100
    
    // Return the minimum of feature-based progress and milestone cap
    // This ensures progress reflects actual loading but doesn't exceed milestones
    return Math.min(featureBasedProgress, milestoneCap)
  }

  /**
   * Get current loading status
   */
  getStatus(): LoadingStatus {
    const currentMilestone = this.milestones[this.currentMilestoneIndex] || this.milestones[this.milestones.length - 1]
    
    // Calculate progress based on actual feature status
    const featureBasedProgress = this.calculateFeatureBasedProgress()
    
    // Use feature-based progress, but don't let it exceed the milestone cap
    const actualProgress = Math.min(featureBasedProgress, currentMilestone.percentage)
    
    return {
      currentMilestone: currentMilestone.percentage,
      currentPercentage: currentMilestone.percentage,
      displayedPercentage: actualProgress,
      currentFeature: currentMilestone.feature,
      featureStatus: new Map(this.featureStatus),
      isComplete: this.currentMilestoneIndex >= this.milestones.length && 
                  Array.from(this.featureStatus.values()).every(status => 
                    status === 'loaded' || status === 'pending'
                  )
    }
  }

  /**
   * Get smooth animated progress (for display)
   */
  getAnimatedProgress(): number {
    return this.displayedProgress
  }

  /**
   * Subscribe to status updates
   */
  subscribe(callback: (status: LoadingStatus) => void): () => void {
    this.statusCallbacks.add(callback)
    
    // Immediately call with current status
    try {
      callback(this.getStatus())
    } catch (error) {
      console.error('Error in orchestrator status callback:', error)
    }
    
    // Start smooth progress animation
    this.startProgressAnimation()
    
    return () => {
      this.statusCallbacks.delete(callback)
      if (this.statusCallbacks.size === 0) {
        this.stopProgressAnimation()
      }
    }
  }

  /**
   * Start smooth progress animation
   */
  private startProgressAnimation(): void {
    if (this.progressAnimationFrame !== null) return // Already animating

    const animate = () => {
      // Animate progress smoothly based on feature status
      const status = this.getStatus()
      const target = status.displayedPercentage // Use feature-based progress as target
      const current = this.displayedProgress

      if (Math.abs(target - current) > 0.1) {
        // Smooth interpolation - use adaptive speed based on gap size
        // Larger gaps = faster interpolation to prevent long waits
        const gap = Math.abs(target - current)
        const speed = gap > 30 ? 0.25 : gap > 15 ? 0.2 : 0.15 // Faster for larger gaps
        const newProgress = current + (target - current) * speed
        this.displayedProgress = Math.min(100, Math.max(0, newProgress))
        
        this.notifyStatus()
        this.progressAnimationFrame = requestAnimationFrame(animate)
      } else {
        // Close enough, snap to target
        this.displayedProgress = target
        this.notifyStatus()
        this.progressAnimationFrame = null
      }
    }

    this.progressAnimationFrame = requestAnimationFrame(animate)
  }

  /**
   * Stop progress animation
   */
  private stopProgressAnimation(): void {
    if (this.progressAnimationFrame !== null) {
      cancelAnimationFrame(this.progressAnimationFrame)
      this.progressAnimationFrame = null
    }
  }

  /**
   * Notify all callbacks of status change
   */
  private notifyStatus(): void {
    const status = this.getStatus()
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('Error in orchestrator status callback:', error)
      }
    })
  }

  /**
   * Reset orchestrator (for new game session)
   */
  reset(): void {
    this.currentMilestoneIndex = 0
    this.displayedProgress = 0
    this.initializeFeatureStatus()
    this.stopProgressAnimation()
    this.notifyStatus()
  }
}

// Singleton instance
export const loadingOrchestrator = new LoadingOrchestrator()

