/**
 * React hook for managing loading phase state
 * Provides current phase and transition functions
 * Integrates with loading phase manager
 */

import { useState, useEffect } from 'react'
import { loadingPhaseManager, type LoadingPhase, type PhaseStatus } from '../utils/loadingPhases'

/**
 * Hook to get current loading phase and status
 */
export function useLoadingPhase() {
  const [status, setStatus] = useState<PhaseStatus>(() => loadingPhaseManager.getStatus())

  useEffect(() => {
    // Subscribe to phase updates
    const unsubscribe = loadingPhaseManager.subscribe((newStatus) => {
      setStatus(newStatus)
    })

    return unsubscribe
  }, [])

  return {
    phase: status.phase,
    progress: status.progress,
    overallProgress: status.overallProgress,
    isComplete: status.isComplete,
    canEnterWorld: loadingPhaseManager.canEnterWorld(),
    transitionToNextPhase: () => loadingPhaseManager.transitionToNextPhase(),
    isPhaseComplete: (phase: LoadingPhase) => loadingPhaseManager.isPhaseComplete(phase),
    onPhaseComplete: (phase: LoadingPhase, callback: () => void) => 
      loadingPhaseManager.onPhaseComplete(phase, callback)
  }
}

/**
 * Hook to check if a specific phase is complete
 */
export function usePhaseComplete(phase: LoadingPhase): boolean {
  const [isComplete, setIsComplete] = useState(() => loadingPhaseManager.isPhaseComplete(phase))

  useEffect(() => {
    if (isComplete) return // Already complete

    const unsubscribe = loadingPhaseManager.onPhaseComplete(phase, () => {
      setIsComplete(true)
    })

    // Check again in case it completed between render and effect
    setIsComplete(loadingPhaseManager.isPhaseComplete(phase))

    return unsubscribe
  }, [phase, isComplete])

  return isComplete
}

