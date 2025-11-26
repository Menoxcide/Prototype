import { useGameStore } from '../store/useGameStore'
import { sendMovement, sendSpellCast } from './colyseus'
import { initializeMessageBatcher, addMessage, flushMessages } from './messageBatcher'
import { initializePrediction, predictMovement, reconcileWithServer, getPredictedState } from './prediction'
import { isMobileDevice, getMobileOptimizationFlags } from '../utils/mobileOptimizations'
import { connectionMonitor } from './connectionMonitor'

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
let currentMovementInterval = 150 // Default interval

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
    // Use recommended interval from connection monitor, but respect device limits
    const baseInterval = isMobile ? 200 : 150
    // Blend connection quality recommendation with device base
    return Math.max(baseInterval, quality.recommendedUpdateInterval)
  }
  
  // Adaptive movement update interval based on device, network, and connection quality
  currentMovementInterval = getAdaptiveInterval()
  
  // Create movement update function
  const createMovementUpdateLoop = () => {
    return () => {
      const { player, isPlayerMoving } = useGameStore.getState()
      if (!player) return

      if (!isPlayerMoving) {
        lastServerPosition = { ...player.position }
        return
      }

      predictMovement(player.position, player.rotation)

      const threshold = isMobile ? 0.2 : 0.15
      if (
        !lastServerPosition ||
        Math.abs(player.position.x - lastServerPosition.x) > threshold ||
        Math.abs(player.position.z - lastServerPosition.z) > threshold
      ) {
        addMessage('move', {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          rotation: player.rotation
        }, 8)
        
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
      // Mobile: use adaptive interval from messageBatcher (50-200ms based on network)
      // We'll check this dynamically
      return mobileFlags.networkOptimized ? 200 : 100
    }
    return 50 // Desktop: 50ms
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

export function reconcilePosition(serverPosition: { x: number; y: number; z: number }, rotation: number) {
  const { player, isPlayerMoving } = useGameStore.getState()
  if (!player) return

  // Calculate distance between local and server position
  const dx = player.position.x - serverPosition.x
  const dz = player.position.z - serverPosition.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  // CRITICAL: Don't reconcile position if player is actively moving AND difference is small
  // This prevents server from overwriting client-side prediction during active movement
  // Only reconcile if there's a significant discrepancy (anti-cheat correction)
  if (isPlayerMoving && distance < 5.0) {
    // Still update lastServerPosition for reference, but don't apply the correction
    lastServerPosition = { ...serverPosition }
    return
  }

  // Only reconcile if difference is significant (anti-cheat or major lag)
  if (distance < 2.0 && isPlayerMoving) {
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
    useGameStore.getState().updatePlayerPosition(reconciled.position)
    useGameStore.getState().updatePlayerRotation(reconciled.rotation)
  } else {
    // Fallback to server position only if difference is large
    if (distance > 1.0) {
      useGameStore.getState().updatePlayerPosition(serverPosition)
      useGameStore.getState().updatePlayerRotation(rotation)
    }
  }

  lastServerPosition = { ...serverPosition }
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

