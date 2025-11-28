import { useGameStore } from '../store/useGameStore'
import { sendMovement, sendSpellCast } from './colyseus'
import { initializeMessageBatcher, addMessage, flushMessages } from './messageBatcher'
import { initializePrediction, predictMovement, reconcileWithServer, getPredictedState } from './prediction'
import { isMobileDevice, getMobileOptimizationFlags } from '../utils/mobileOptimizations'
import { connectionMonitor } from './connectionMonitor'
import { isFeatureEnabled } from '../utils/featureFlags'

// Client prediction state
let lastServerPosition: { x: number; y: number; z: number } | null = null
let movementUpdateInterval: number | null = null
let messageFlushInterval: number | null = null
let lastSpellCastTime = 0
const SPELL_CAST_DEBOUNCE = 100 // Debounce spell casts by 100ms for mobile
let pendingStateUpdates: Map<string, any> = new Map()
let stateUpdateDebounceTimer: number | null = null
const STATE_UPDATE_DEBOUNCE = 50 // Batch state updates every 50ms
let qualityUnsubscribe: (() => void) | null = null
let currentMovementInterval = 33 // Default interval (30Hz for desktop)
// Movement interpolation queue for smooth updates between server ticks
interface InterpolationFrame {
  position: { x: number; y: number; z: number }
  rotation: number
  timestamp: number
  velocity?: { x: number; y: number; z: number }
}
let interpolationQueue: InterpolationFrame[] = []
const MAX_INTERPOLATION_TIME = 200 // Maximum interpolation delay in ms

// Cubic spline interpolation for smooth dead reckoning
function cubicSplineInterpolate(p0: number, p1: number, v0: number, v1: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  return h00 * p0 + h10 * v0 + h01 * p1 + h11 * v1
}

export function startMovementSync() {
  if (movementUpdateInterval) return

  // Initialize message batcher
  initializeMessageBatcher()

  // Initialize prediction system
  const { player } = useGameStore.getState()
  if (player) {
    initializePrediction({
      id: player.id,
      position: player.position,
      rotation: player.rotation,
      timestamp: Date.now()
    })
  }

  const isMobile = isMobileDevice()
  const mobileFlags = getMobileOptimizationFlags()
  
  // Get connection quality and adjust interval dynamically
  const getAdaptiveInterval = (): number => {
    const quality = connectionMonitor.getQuality()
    // Ultra-low latency: Desktop 33ms (30Hz), Mobile 50ms (20Hz)
    const baseInterval = isMobile ? 50 : 33
    // Blend connection quality recommendation with device base, but prioritize low latency
    const recommended = quality.recommendedUpdateInterval
    // Only increase if connection quality is very poor
    if (recommended > baseInterval * 2) {
      return Math.max(baseInterval, Math.min(recommended, baseInterval * 1.5))
    }
    return baseInterval
  }
  
  // Adaptive movement update interval based on device, network, and connection quality
  currentMovementInterval = getAdaptiveInterval()
  
  // Calculate velocity for dead reckoning
  const calculateVelocity = (current: { x: number; y: number; z: number }, previous: { x: number; y: number; z: number }, deltaTime: number): { x: number; y: number; z: number } => {
    if (deltaTime <= 0) return { x: 0, y: 0, z: 0 }
    return {
      x: (current.x - previous.x) / deltaTime,
      y: (current.y - previous.y) / deltaTime,
      z: (current.z - previous.z) / deltaTime
    }
  }

  // Cubic spline interpolation for smooth dead reckoning
  // (Function moved outside to be accessible by getInterpolatedPosition)

  // Create movement update function with interpolation queue
  let lastUpdateTime = Date.now()
  const createMovementUpdateLoop = () => {
    return () => {
      const { player, isPlayerMoving } = useGameStore.getState()
      if (!player) return

      const now = Date.now()
      const deltaTime = (now - lastUpdateTime) / 1000 // Convert to seconds
      lastUpdateTime = now

      if (!isPlayerMoving) {
        lastServerPosition = { ...player.position }
        interpolationQueue = [] // Clear queue when not moving
        return
      }

      // Predict movement with velocity-based extrapolation
      predictMovement(player.position, player.rotation)

      // Calculate velocity for dead reckoning
      let velocity = { x: 0, y: 0, z: 0 }
      if (lastServerPosition) {
        velocity = calculateVelocity(player.position, lastServerPosition, deltaTime)
      }

      // Add to interpolation queue
      interpolationQueue.push({
        position: { ...player.position },
        rotation: player.rotation,
        timestamp: now,
        velocity
      })

      // Keep queue within time limit
      const cutoffTime = now - MAX_INTERPOLATION_TIME
      interpolationQueue = interpolationQueue.filter(frame => frame.timestamp >= cutoffTime)

      // Reduced threshold for more frequent updates (better responsiveness)
      const threshold = isMobile ? 0.1 : 0.08
      if (
        !lastServerPosition ||
        Math.abs(player.position.x - lastServerPosition.x) > threshold ||
        Math.abs(player.position.z - lastServerPosition.z) > threshold
      ) {
        // Priority 9 for movement (high priority, but not critical for immediate send)
        addMessage('move', {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          rotation: player.rotation,
          velocity // Include velocity for server-side prediction
        }, 9)
        
        lastServerPosition = { ...player.position }
      }
    }
  }
  
  // Monitor connection quality changes and adjust interval
  qualityUnsubscribe = connectionMonitor.onQualityChange((_quality) => {
    const newInterval = getAdaptiveInterval()
    if (Math.abs(newInterval - currentMovementInterval) > 10) { // Only restart if significant change
      currentMovementInterval = newInterval
      // Restart interval with new value
      if (movementUpdateInterval) {
        clearInterval(movementUpdateInterval)
        movementUpdateInterval = window.setInterval(createMovementUpdateLoop(), currentMovementInterval)
      }
    }
  })

  // Send movement updates to server (batched with adaptive intervals)
  movementUpdateInterval = window.setInterval(createMovementUpdateLoop(), currentMovementInterval)

  // Adaptive flush interval based on network conditions (handled by messageBatcher)
  // Get the current batch interval and use it for flushing
  const getFlushInterval = () => {
    if (isMobile) {
      // Mobile: reduced flush interval for faster updates
      return mobileFlags.networkOptimized ? 50 : 33
    }
    return 16 // Desktop: 16ms (~60Hz flush rate for ultra-responsive updates)
  }

  // Flush batched messages with adaptive intervals
  const flushInterval = getFlushInterval()
  messageFlushInterval = window.setInterval(() => {
    const packet = flushMessages()
    if (packet && packet.messages.length > 0) {
      // Batch multiple messages of the same type together
      const messagesByType = new Map<string, Array<{ type: string; data: unknown; timestamp: number; priority: number }>>()
      
      packet.messages.forEach((msg: any) => {
        if (!messagesByType.has(msg.type)) {
          messagesByType.set(msg.type, [])
        }
        messagesByType.get(msg.type)!.push(msg)
      })

      // Send batched messages
      messagesByType.forEach((messages, type) => {
        if (type === 'move' && messages.length > 0) {
          // Send only the latest movement (most recent position)
          const latest = messages[messages.length - 1]
          const data = latest.data as any
          sendMovement(data.x, data.y, data.z, data.rotation)
        } else if (type === 'castSpell' && messages.length > 0) {
          // Send only the latest spell cast (most recent)
          const latest = messages[messages.length - 1]
          const data = latest.data as any
          sendSpellCast(data.spellId, data.position, data.rotation)
        }
      })
    }
  }, flushInterval)
}

export function stopMovementSync() {
  if (movementUpdateInterval) {
    clearInterval(movementUpdateInterval)
    movementUpdateInterval = null
  }
  if (messageFlushInterval) {
    clearInterval(messageFlushInterval)
    messageFlushInterval = null
  }
  if (qualityUnsubscribe) {
    qualityUnsubscribe()
    qualityUnsubscribe = null
  }
}

// Helper function to get interpolated position from queue
function getInterpolatedPosition(targetTime: number): { x: number; y: number; z: number; rotation: number } | null {
  if (interpolationQueue.length < 2) return null

  // Find frames to interpolate between
  let frame1: InterpolationFrame | null = null
  let frame2: InterpolationFrame | null = null

  for (let i = 0; i < interpolationQueue.length - 1; i++) {
    if (interpolationQueue[i].timestamp <= targetTime && interpolationQueue[i + 1].timestamp >= targetTime) {
      frame1 = interpolationQueue[i]
      frame2 = interpolationQueue[i + 1]
      break
    }
  }

  if (!frame1 || !frame2) {
    // Use latest frame if target time is beyond queue
    const latest = interpolationQueue[interpolationQueue.length - 1]
    return {
      x: latest.position.x,
      y: latest.position.y,
      z: latest.position.z,
      rotation: latest.rotation
    }
  }

  // Cubic spline interpolation
  const t = (targetTime - frame1.timestamp) / (frame2.timestamp - frame1.timestamp)
  const clampedT = Math.max(0, Math.min(1, t))

  const v0 = frame1.velocity || { x: 0, y: 0, z: 0 }
  const v1 = frame2.velocity || { x: 0, y: 0, z: 0 }

  return {
    x: cubicSplineInterpolate(frame1.position.x, frame2.position.x, v0.x * 1000, v1.x * 1000, clampedT),
    y: cubicSplineInterpolate(frame1.position.y, frame2.position.y, v0.y * 1000, v1.y * 1000, clampedT),
    z: cubicSplineInterpolate(frame1.position.z, frame2.position.z, v0.z * 1000, v1.z * 1000, clampedT),
    rotation: frame1.rotation + (frame2.rotation - frame1.rotation) * clampedT
  }
}

export function reconcilePosition(serverPosition: { x: number; y: number; z: number }, rotation: number) {
  // Check if network reconciliation is enabled via feature flag
  if (!isFeatureEnabled('networkReconciliationEnabled')) {
    // Skip reconciliation - rely on client-side prediction only
    return
  }
  
  const { player, isPlayerMoving } = useGameStore.getState()
  if (!player) return

  // Calculate distance between local and server position
  const dx = player.position.x - serverPosition.x
  const dz = player.position.z - serverPosition.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  // CRITICAL: Don't reconcile position if player is actively moving AND difference is small
  // This prevents server from overwriting client-side prediction during active movement
  // Only reconcile if there's a significant discrepancy (anti-cheat correction)
  // Reduced threshold for better responsiveness
  if (isPlayerMoving && distance < 3.0) {
    // Still update lastServerPosition for reference, but don't apply the correction
    lastServerPosition = { ...serverPosition }
    return
  }

  // Only reconcile if difference is significant (anti-cheat or major lag)
  if (distance < 1.5 && isPlayerMoving) {
    // Very small difference while moving - ignore to prevent micro-corrections
    lastServerPosition = { ...serverPosition }
    return
  }

  // Reconcile with server state using prediction system
  reconcileWithServer({
    id: player.id,
    position: serverPosition,
    rotation,
    timestamp: Date.now()
  })

  // Get reconciled state and update store
  const reconciled = getPredictedState()
  
  if (reconciled) {
    // Use interpolation queue for smooth correction if available
    const interpolated = getInterpolatedPosition(Date.now() - 50) // 50ms interpolation delay
    if (interpolated && distance < 2.0) {
      // Blend interpolated position with reconciled state for smooth correction
      useGameStore.getState().updatePlayerPosition({
        x: interpolated.x * 0.5 + reconciled.position.x * 0.5,
        y: interpolated.y * 0.5 + reconciled.position.y * 0.5,
        z: interpolated.z * 0.5 + reconciled.position.z * 0.5
      })
      useGameStore.getState().updatePlayerRotation(interpolated.rotation * 0.5 + reconciled.rotation * 0.5)
    } else {
      useGameStore.getState().updatePlayerPosition(reconciled.position)
      useGameStore.getState().updatePlayerRotation(reconciled.rotation)
    }
  } else {
    // Fallback to server position only if difference is large
    if (distance > 1.0) {
      useGameStore.getState().updatePlayerPosition(serverPosition)
      useGameStore.getState().updatePlayerRotation(rotation)
    }
  }

  lastServerPosition = { ...serverPosition }
}

// Export interpolation function for potential external use
export function getCurrentInterpolatedPosition(): { x: number; y: number; z: number; rotation: number } | null {
  return getInterpolatedPosition(Date.now() - 50)
}

export function handleSpellCast(spellId: string) {
  const { player } = useGameStore.getState()
  if (!player) return

  const isMobile = isMobileDevice()
  
  // Debounce spell casts on mobile to reduce bandwidth
  if (isMobile) {
    const now = Date.now()
    if (now - lastSpellCastTime < SPELL_CAST_DEBOUNCE) {
      return // Skip if too soon
    }
    lastSpellCastTime = now
  }

  // Add to message batch - spell casts are high priority but not critical enough for immediate send
  // They'll be sent in next batch flush (very fast)
  addMessage('castSpell', {
    spellId,
    position: player.position,
    rotation: player.rotation
  }, 9) // Very high priority for spell casts
}

/**
 * Batch state updates to reduce bandwidth
 * Groups multiple state changes into single updates
 */
export function batchStateUpdate(key: string, value: unknown): void {
  pendingStateUpdates.set(key, value)
  
  // Clear existing debounce timer
  if (stateUpdateDebounceTimer) {
    clearTimeout(stateUpdateDebounceTimer)
  }
  
  // Debounce state updates
  stateUpdateDebounceTimer = window.setTimeout(() => {
    // Apply all pending state updates at once
    const updates = Array.from(pendingStateUpdates.entries())
    pendingStateUpdates.clear()
    
    // Apply updates to store (shallow equality check already done in messageBatcher)
    updates.forEach(([_key, _value]) => {
      // This would be called by the store update functions
      // The actual implementation depends on what state needs updating
    })
    
    stateUpdateDebounceTimer = null
  }, STATE_UPDATE_DEBOUNCE)
}

