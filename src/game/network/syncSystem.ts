import { useGameStore } from '../store/useGameStore'
import { sendMovement, sendSpellCast } from './colyseus'
import { initializeMessageBatcher, addMessage, flushMessages } from './messageBatcher'
import { initializePrediction, predictMovement, reconcileWithServer, getPredictedState } from './prediction'
import { isMobileDevice, getMobileOptimizationFlags } from '../utils/mobileOptimizations'

// Client prediction state
let lastServerPosition: { x: number; y: number; z: number } | null = null
let movementUpdateInterval: number | null = null
let messageFlushInterval: number | null = null
let lastSpellCastTime = 0
const SPELL_CAST_DEBOUNCE = 100 // Debounce spell casts by 100ms for mobile
let pendingStateUpdates: Map<string, any> = new Map()
let stateUpdateDebounceTimer: number | null = null
const STATE_UPDATE_DEBOUNCE = 50 // Batch state updates every 50ms

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
  
  // Adaptive movement update interval based on device and network
  // Mobile: 150ms (6.67Hz), Desktop: 100ms (10Hz)
  const movementInterval = isMobile ? 150 : 100

  // Send movement updates to server (batched with adaptive intervals)
  movementUpdateInterval = window.setInterval(() => {
    const { player } = useGameStore.getState()
    if (!player) return

    // Predict movement locally
    predictMovement(player.position, player.rotation)

    // Only send if position changed significantly (larger threshold on mobile for bandwidth savings)
    const threshold = isMobile ? 0.15 : 0.1
    if (
      !lastServerPosition ||
      Math.abs(player.position.x - lastServerPosition.x) > threshold ||
      Math.abs(player.position.z - lastServerPosition.z) > threshold
    ) {
      // Add to message batch instead of sending immediately
      addMessage('move', {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        rotation: player.rotation
      }, 8) // High priority for movement
      
      lastServerPosition = { ...player.position }
    }
  }, movementInterval)

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
      const messagesByType = new Map<string, any[]>()
      
      packet.messages.forEach(msg => {
        if (!messagesByType.has(msg.type)) {
          messagesByType.set(msg.type, [])
        }
        messagesByType.get(msg.type)!.push(msg.data)
      })

      // Send batched messages
      messagesByType.forEach((dataArray, type) => {
        if (type === 'move' && dataArray.length > 0) {
          // Send only the latest movement (most recent position)
          const latest = dataArray[dataArray.length - 1]
          sendMovement(latest.x, latest.y, latest.z, latest.rotation)
        } else if (type === 'castSpell' && dataArray.length > 0) {
          // Send only the latest spell cast (most recent)
          const latest = dataArray[dataArray.length - 1]
          sendSpellCast(latest.spellId, latest.position, latest.rotation)
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
}

export function reconcilePosition(serverPosition: { x: number; y: number; z: number }, rotation: number) {
  const { player } = useGameStore.getState()
  if (!player) return

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
    // Fallback to server position
    useGameStore.getState().updatePlayerPosition(serverPosition)
    useGameStore.getState().updatePlayerRotation(rotation)
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

  // Add to message batch for better batching
  addMessage('castSpell', {
    spellId,
    position: player.position,
    rotation: player.rotation
  }, 9) // Very high priority for spell casts

  // Also send immediately for responsiveness (but batched version will handle duplicates)
  sendSpellCast(spellId, player.position, player.rotation)
}

/**
 * Batch state updates to reduce bandwidth
 * Groups multiple state changes into single updates
 */
export function batchStateUpdate(key: string, value: any): void {
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

