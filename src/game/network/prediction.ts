/**
 * Client-side prediction for smooth movement
 */

interface Vector3 {
  x: number
  y: number
  z: number
}

interface PlayerState {
  id: string
  position: Vector3
  rotation: number
  timestamp: number
}

interface PlayerInput {
  position: Vector3
  rotation: number
  timestamp: number
}

class ClientPredictionSystem {
  private history: PlayerState[] = []
  private currentState: PlayerState | null = null
  private lastServerState: PlayerState | null = null
  private maxRollbackTime = 1000
  private reconciliationThreshold = 0.1

  constructor(initialState: PlayerState) {
    this.currentState = initialState
    this.history = [initialState]
  }

  predict(input: PlayerInput): PlayerState {
    if (!this.currentState) {
      this.currentState = {
        id: input.position.x.toString(), // Temporary
        position: input.position,
        rotation: input.rotation,
        timestamp: input.timestamp
      }
    }

    const predictedState: PlayerState = {
      id: this.currentState.id,
      position: input.position,
      rotation: input.rotation,
      timestamp: input.timestamp
    }

    this.history.push(predictedState)
    
    // Keep history within time limit
    const cutoffTime = input.timestamp - this.maxRollbackTime
    while (this.history.length > 0 && this.history[0].timestamp < cutoffTime) {
      this.history.shift()
    }

    this.currentState = predictedState
    return predictedState
  }

  reconcile(serverState: PlayerState): void {
    this.lastServerState = serverState

    if (!this.currentState) {
      this.currentState = serverState
      return
    }

    const posDiff = this.distance(this.currentState.position, serverState.position)
    
    if (posDiff > this.reconciliationThreshold) {
      // Prediction was off, rollback
      this.rollback()
      this.currentState = serverState
    } else {
      // Smooth correction
      this.currentState = {
        ...this.currentState,
        position: {
          x: this.currentState.position.x * 0.7 + serverState.position.x * 0.3,
          y: this.currentState.position.y * 0.7 + serverState.position.y * 0.3,
          z: this.currentState.position.z * 0.7 + serverState.position.z * 0.3
        },
        rotation: this.currentState.rotation * 0.7 + serverState.rotation * 0.3
      }
    }
  }

  rollback(): PlayerState | null {
    if (!this.lastServerState) return null

    let bestState: PlayerState | null = null
    let bestDiff = Infinity

    for (const state of this.history) {
      const diff = Math.abs(state.timestamp - this.lastServerState!.timestamp)
      if (diff < bestDiff) {
        bestDiff = diff
        bestState = state
      }
    }

    if (bestState) {
      this.currentState = bestState
      return bestState
    }

    return this.lastServerState
  }

  getCurrentState(): PlayerState | null {
    return this.currentState
  }

  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
}

let predictionSystem: ClientPredictionSystem | null = null

export function initializePrediction(initialState: PlayerState): void {
  predictionSystem = new ClientPredictionSystem(initialState)
}

export function predictMovement(position: Vector3, rotation: number): PlayerState | null {
  if (!predictionSystem) return null
  return predictionSystem.predict({
    position,
    rotation,
    timestamp: Date.now()
  })
}

export function reconcileWithServer(serverState: PlayerState): void {
  if (!predictionSystem) return
  predictionSystem.reconcile(serverState)
}

export function getPredictedState(): PlayerState | null {
  if (!predictionSystem) return null
  return predictionSystem.getCurrentState()
}

