/**
 * ClientPredictionSystem - Client-side prediction for smooth movement
 * Predicts player movement locally and reconciles with server state
 */

import { PlayerState, Vector3 } from '../types'
import { distance } from './vector3'

export interface ClientPredictionSystem {
  predict(input: PlayerInput): PlayerState
  reconcile(serverState: PlayerState): void
  rollback(): PlayerState | null
  getCurrentState(): PlayerState | null
}

export interface PlayerInput {
  position: Vector3
  rotation: number
  velocity?: Vector3
  timestamp: number
}

export interface ClientPredictionOptions {
  maxRollbackTime?: number
  reconciliationThreshold?: number
}

/**
 * Creates a new ClientPredictionSystem instance
 */
export function createClientPredictionSystem(
  initialState: PlayerState,
  options: ClientPredictionOptions = {}
): ClientPredictionSystem {
  const { maxRollbackTime = 1000, reconciliationThreshold = 0.1 } = options
  const history: PlayerState[] = [initialState]
  let currentState: PlayerState = initialState
  let lastServerState: PlayerState | null = null

  return {
    predict(input: PlayerInput): PlayerState {
      const predictedState: PlayerState = {
        id: currentState.id,
        position: input.position,
        rotation: input.rotation,
        velocity: input.velocity,
        timestamp: input.timestamp
      }

      // Add to history
      history.push(predictedState)
      
      // Keep history within time limit
      const cutoffTime = input.timestamp - maxRollbackTime
      while (history.length > 0 && history[0].timestamp < cutoffTime) {
        history.shift()
      }

      currentState = predictedState
      return predictedState
    },

    reconcile(serverState: PlayerState): void {
      lastServerState = serverState

      // Check if prediction was close enough
      if (currentState) {
        const posDiff = distance(currentState.position, serverState.position)
        
        if (posDiff > reconciliationThreshold) {
          // Prediction was off, need to rollback
          this.rollback()
          currentState = serverState
        } else {
          // Prediction was close, smooth correction
          currentState = {
            ...currentState,
            position: {
              x: currentState.position.x * 0.7 + serverState.position.x * 0.3,
              y: currentState.position.y * 0.7 + serverState.position.y * 0.3,
              z: currentState.position.z * 0.7 + serverState.position.z * 0.3
            },
            rotation: currentState.rotation * 0.7 + serverState.rotation * 0.3
          }
        }
      } else {
        currentState = serverState
      }
    },

    rollback(): PlayerState | null {
      if (!lastServerState) {
        return null
      }

      // Find state in history closest to server timestamp
      let bestState: PlayerState | null = null
      let bestDiff = Infinity

      for (const state of history) {
        const diff = Math.abs(state.timestamp - lastServerState!.timestamp)
        if (diff < bestDiff) {
          bestDiff = diff
          bestState = state
        }
      }

      if (bestState) {
        currentState = bestState
        return bestState
      }

      return lastServerState
    },

    getCurrentState(): PlayerState | null {
      return currentState
    }
  }
}

