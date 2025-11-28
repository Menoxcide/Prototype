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

interface Velocity {
  x: number
  y: number
  z: number
}

interface ExtendedPlayerState extends PlayerState {
  velocity?: Velocity
  tick?: number
}

class ClientPredictionSystem {
  private history: ExtendedPlayerState[] = []
  private currentState: ExtendedPlayerState | null = null
  private lastServerState: ExtendedPlayerState | null = null
  private maxRollbackTime = 500 // Reduced from 1000ms to 500ms for faster response
  private reconciliationThreshold = 3.0 // Increased to 3.0 to prevent frequent corrections and rubberbanding
  private maxHistoryTicks = 20 // 20-tick prediction buffer for rollback
  private currentTick = 0
  private predictionConfidence = 1.0 // Confidence score for prediction quality (0-1)

  constructor(initialState: PlayerState) {
    this.currentState = initialState
    this.history = [initialState]
  }

  // Calculate velocity from previous state
  private calculateVelocity(current: Vector3, previous: Vector3, deltaTime: number): Velocity {
    if (deltaTime <= 0) return { x: 0, y: 0, z: 0 }
    return {
      x: (current.x - previous.x) / deltaTime,
      y: (current.y - previous.y) / deltaTime,
      z: (current.z - previous.z) / deltaTime
    }
  }

  // Velocity-based extrapolation for smooth prediction
  private extrapolatePosition(position: Vector3, velocity: Velocity, deltaTime: number): Vector3 {
    return {
      x: position.x + velocity.x * deltaTime,
      y: position.y + velocity.y * deltaTime,
      z: position.z + velocity.z * deltaTime
    }
  }

  predict(input: PlayerInput): PlayerState {
    if (!this.currentState) {
      this.currentState = {
        id: input.position.x.toString(), // Temporary
        position: input.position,
        rotation: input.rotation,
        timestamp: input.timestamp,
        velocity: { x: 0, y: 0, z: 0 },
        tick: this.currentTick
      }
      this.currentTick++
      this.history.push(this.currentState)
      return this.currentState
    }

    // Calculate velocity from previous state
    const deltaTime = (input.timestamp - this.currentState.timestamp) / 1000 // Convert to seconds
    const velocity = this.calculateVelocity(
      input.position,
      this.currentState.position,
      deltaTime
    )

    // Use velocity-based extrapolation if we have valid velocity
    let predictedPosition = input.position
    if (velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
      // Small extrapolation forward based on velocity for smoother prediction
      const extrapolationTime = Math.min(deltaTime * 0.1, 0.016) // Up to 16ms ahead
      predictedPosition = this.extrapolatePosition(input.position, velocity, extrapolationTime)
    }

    const predictedState: ExtendedPlayerState = {
      id: this.currentState.id,
      position: predictedPosition,
      rotation: input.rotation,
      timestamp: input.timestamp,
      velocity,
      tick: this.currentTick
    }

    this.currentTick++
    this.history.push(predictedState)
    
    // Keep history within tick limit and time limit
    const cutoffTime = input.timestamp - this.maxRollbackTime
    while (this.history.length > this.maxHistoryTicks) {
      this.history.shift()
    }
    while (this.history.length > 0 && this.history[0].timestamp < cutoffTime) {
      this.history.shift()
    }

    // Update prediction confidence based on server reconciliation frequency
    // Confidence decreases if we frequently need reconciliation
    if (this.predictionConfidence > 0.5) {
      this.predictionConfidence = Math.max(0.5, this.predictionConfidence - 0.01) // Gradual decay
    }

    this.currentState = predictedState
    return predictedState
  }

  reconcile(serverState: PlayerState): void {
    const extendedServerState: ExtendedPlayerState = {
      ...serverState,
      tick: -1 // Server state has no tick number
    }
    this.lastServerState = extendedServerState

    if (!this.currentState) {
      this.currentState = extendedServerState
      return
    }

    const posDiff = this.distance(this.currentState.position, serverState.position)
    
    // Adaptive reconciliation threshold based on prediction confidence
    const adaptiveThreshold = this.reconciliationThreshold * (0.7 + this.predictionConfidence * 0.3)
    
    if (posDiff > adaptiveThreshold) {
      // Prediction was significantly off, rollback to closest matching tick
      const rolledBack = this.rollback()
      if (rolledBack) {
        this.currentState = rolledBack
      } else {
        this.currentState = extendedServerState
      }
      // Significant error reduces confidence
      this.predictionConfidence = Math.max(0.3, this.predictionConfidence - 0.2)
    } else if (posDiff > 1.0) {
      // Medium difference - smooth correction with adaptive blending based on confidence
      const blendFactor = 0.15 + (1 - this.predictionConfidence) * 0.1 // More aggressive correction if low confidence
      const inverseBlend = 1 - blendFactor
      
      // Prediction error compensation: calculate error and compensate smoothly
      const errorX = serverState.position.x - this.currentState.position.x
      const errorY = serverState.position.y - this.currentState.position.y
      const errorZ = serverState.position.z - this.currentState.position.z
      
      // Apply compensation with smoothing
      this.currentState = {
        ...this.currentState,
        position: {
          x: this.currentState.position.x * inverseBlend + serverState.position.x * blendFactor + errorX * 0.1,
          y: this.currentState.position.y * inverseBlend + serverState.position.y * blendFactor + errorY * 0.1,
          z: this.currentState.position.z * inverseBlend + serverState.position.z * blendFactor + errorZ * 0.1
        },
        rotation: this.currentState.rotation * (1 - blendFactor * 0.5) + serverState.rotation * (blendFactor * 0.5)
      }
      
      // Small error slightly reduces confidence
      this.predictionConfidence = Math.max(0.5, this.predictionConfidence - 0.05)
    } else {
      // Very small difference - high confidence, increase it
      this.predictionConfidence = Math.min(1.0, this.predictionConfidence + 0.02)
    }
  }

  rollback(): ExtendedPlayerState | null {
    if (!this.lastServerState) return null

    // Find the state in history closest to server timestamp for rollback
    let bestState: ExtendedPlayerState | null = null
    let bestDiff = Infinity

    for (const state of this.history) {
      const diff = Math.abs(state.timestamp - this.lastServerState!.timestamp)
      if (diff < bestDiff) {
        bestDiff = diff
        bestState = state
      }
    }

    if (bestState && bestDiff < 100) {
      // Found a close match, use it and replay from there
      this.currentState = bestState
      // Clear history after rollback point to prevent further divergence
      const rollbackIndex = this.history.indexOf(bestState)
      if (rollbackIndex >= 0) {
        this.history = this.history.slice(0, rollbackIndex + 1)
      }
      return bestState
    }

    // No good match found, use server state
    this.currentState = this.lastServerState
    return this.lastServerState
  }

  // Get prediction confidence score (0-1, where 1 is most confident)
  getConfidence(): number {
    return this.predictionConfidence
  }

  // Get adaptive reconciliation threshold based on confidence
  getAdaptiveThreshold(): number {
    return this.reconciliationThreshold * (0.7 + this.predictionConfidence * 0.3)
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

export function getPredictionConfidence(): number {
  if (!predictionSystem) return 0
  return predictionSystem.getConfidence()
}

export function getAdaptiveReconciliationThreshold(): number {
  if (!predictionSystem) return 3.0
  return predictionSystem.getAdaptiveThreshold()
}

