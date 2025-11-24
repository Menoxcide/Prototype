import { useGameStore } from '../store/useGameStore'
import { sendMovement, sendSpellCast } from './colyseus'
import { initializeMessageBatcher, addMessage, flushMessages } from './messageBatcher'
import { initializePrediction, predictMovement, reconcileWithServer, getPredictedState } from './prediction'

// Client prediction state
let lastServerPosition: { x: number; y: number; z: number } | null = null
let movementUpdateInterval: number | null = null
let messageFlushInterval: number | null = null

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

  // Send movement updates to server every 100ms (batched)
  movementUpdateInterval = window.setInterval(() => {
    const { player } = useGameStore.getState()
    if (!player) return

    // Predict movement locally
    predictMovement(player.position, player.rotation)

    // Only send if position changed
    if (
      !lastServerPosition ||
      Math.abs(player.position.x - lastServerPosition.x) > 0.1 ||
      Math.abs(player.position.z - lastServerPosition.z) > 0.1
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
  }, 100)

  // Flush batched messages every 50ms
  messageFlushInterval = window.setInterval(() => {
    const packet = flushMessages()
    if (packet && packet.messages.length > 0) {
      // Send batched messages
      packet.messages.forEach(msg => {
        if (msg.type === 'move') {
          sendMovement(msg.data.x, msg.data.y, msg.data.z, msg.data.rotation)
        }
      })
    }
  }, 50)
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

  // Client-side prediction: create projectile immediately
  // Server will validate and broadcast to others
  sendSpellCast(spellId, player.position, player.rotation)
}

