/**
 * MessageBatcher - Batches multiple messages into single network packets
 * Optimizes network overhead by reducing packet count
 */

import { NetworkMessage, NetworkPacket } from '../types'

export interface MessageBatcher {
  add(message: NetworkMessage, priority?: number): void
  flush(): NetworkPacket | null
  setBatchInterval(ms: number): void
  getPendingCount(): number
}

export interface MessageBatcherOptions {
  batchInterval?: number
  maxBatchSize?: number
  maxPriority?: number
}

/**
 * Creates a new MessageBatcher instance
 */
export function createMessageBatcher(options: MessageBatcherOptions = {}): MessageBatcher {
  const {
    batchInterval = 50, // 50ms default
    maxBatchSize = 100,
    maxPriority = 10
  } = options

  let messageQueue: NetworkMessage[] = []
  let currentInterval = batchInterval
  let intervalTimer: NodeJS.Timeout | null = null

  function startTimer() {
    if (intervalTimer) return
    intervalTimer = setInterval(() => {
      // Auto-flush will be handled by external calls
    }, currentInterval)
  }

  return {
    add(message: NetworkMessage, priority: number = 5): void {
      // Clamp priority
      const clampedPriority = Math.max(0, Math.min(priority, maxPriority))
      
      const messageWithPriority: NetworkMessage = {
        ...message,
        priority: clampedPriority
      }

      // Insert in priority order (higher priority first)
      let insertIndex = messageQueue.length
      for (let i = 0; i < messageQueue.length; i++) {
        if (messageQueue[i].priority < clampedPriority) {
          insertIndex = i
          break
        }
      }

      messageQueue.splice(insertIndex, 0, messageWithPriority)

      // Limit queue size
      if (messageQueue.length > maxBatchSize * 2) {
        messageQueue = messageQueue.slice(0, maxBatchSize)
      }

      startTimer()
    },

    flush(): NetworkPacket | null {
      if (messageQueue.length === 0) {
        return null
      }

      // Take up to maxBatchSize messages
      const messages = messageQueue.splice(0, maxBatchSize)
      
      const packet: NetworkPacket = {
        messages,
        timestamp: Date.now()
      }

      return packet
    },

    setBatchInterval(ms: number): void {
      currentInterval = ms
      if (intervalTimer) {
        clearInterval(intervalTimer)
        intervalTimer = null
        startTimer()
      }
    },

    getPendingCount(): number {
      return messageQueue.length
    }
  }
}

