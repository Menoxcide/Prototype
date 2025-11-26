/**
 * MessageBatcher - Batches network messages to reduce overhead
 * Enhanced with mobile-specific optimizations: shallow equality checks and adaptive intervals
 */

import { networkMonitor, isMobileDevice } from '../utils/mobileOptimizations'

interface NetworkMessage {
  type: string
  data: unknown
  timestamp: number
  priority: number
}

interface NetworkPacket {
  messages: NetworkMessage[]
  timestamp: number
}

/**
 * Shallow equality check for objects
 */
function shallowEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return false
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if ((obj1 as any)[key] !== (obj2 as any)[key]) return false
  }

  return true
}

class MessageBatcher {
  private messageQueue: NetworkMessage[] = []
  private maxBatchSize = 100
  private intervalTimer: number | null = null
  private batchInterval = 50 // Default 50ms
  private lastMessageCache: Map<string, NetworkMessage> = new Map() // Cache for shallow equality checks
  private isMobile = false

  constructor() {
    this.isMobile = isMobileDevice()
    this.updateBatchInterval()
    
    // Listen to network changes for adaptive batching
    if (this.isMobile) {
      networkMonitor.onConnectionChange(() => {
        this.updateBatchInterval()
      })
    }
  }

  /**
   * Update batch interval based on network conditions
   */
  private updateBatchInterval(): void {
    if (!this.isMobile) {
      this.batchInterval = 50 // Desktop: 50ms (20Hz)
      return
    }

    const connectionType = networkMonitor.getConnectionType()
    const effectiveType = networkMonitor.getEffectiveType()

    // Adaptive intervals based on network quality
    if (connectionType === 'cellular' || effectiveType === 'slow-2g' || effectiveType === '2g') {
      this.batchInterval = 200 // Slow network: 200ms (5Hz)
    } else if (effectiveType === '3g') {
      this.batchInterval = 100 // 3G: 100ms (10Hz)
    } else if (effectiveType === '4g' || connectionType === 'wifi') {
      this.batchInterval = 50 // Fast network: 50ms (20Hz)
    } else {
      this.batchInterval = 100 // Default mobile: 100ms (10Hz)
    }

    // Restart interval timer if active
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = window.setInterval(() => {
        // Auto-flush will be handled externally
      }, this.batchInterval)
    }
  }

  add(message: NetworkMessage, priority: number = 5): void {
    // Critical messages (priority >= 9) are sent immediately
    const clampedPriority = Math.max(0, Math.min(priority, 10))
    const isCritical = clampedPriority >= 9
    
    // Shallow equality check for mobile to reduce duplicate messages (skip for critical)
    if (this.isMobile && !isCritical) {
      const lastMessage = this.lastMessageCache.get(message.type)
      if (lastMessage && shallowEqual(lastMessage.data, message.data)) {
        // Skip duplicate message (within same batch window)
        return
      }
      this.lastMessageCache.set(message.type, message)
    }

    const messageWithPriority: NetworkMessage = {
      ...message,
      priority: clampedPriority
    }

    // Critical messages bypass queue and are sent immediately
    if (isCritical) {
      // Return immediately for caller to send
      return messageWithPriority as any
    }

    // Insert in priority order
    let insertIndex = this.messageQueue.length
    for (let i = 0; i < this.messageQueue.length; i++) {
      if (this.messageQueue[i].priority < clampedPriority) {
        insertIndex = i
        break
      }
    }

    this.messageQueue.splice(insertIndex, 0, messageWithPriority)

    if (this.messageQueue.length > this.maxBatchSize * 2) {
      this.messageQueue = this.messageQueue.slice(0, this.maxBatchSize)
    }
  }
  
  /**
   * Add message and return immediately if critical, otherwise queue it
   */
  addWithImmediateSend(message: NetworkMessage, priority: number = 5, sendFn?: (msg: NetworkMessage) => void): void {
    const clampedPriority = Math.max(0, Math.min(priority, 10))
    const isCritical = clampedPriority >= 9
    
    if (isCritical && sendFn) {
      // Send critical messages immediately
      sendFn({
        ...message,
        priority: clampedPriority
      })
      return
    }
    
    // Non-critical messages go to queue
    this.add(message, priority)
  }

  flush(): NetworkPacket | null {
    if (this.messageQueue.length === 0) return null

    const messages = this.messageQueue.splice(0, this.maxBatchSize)
    
    // Clear cache after flush
    this.lastMessageCache.clear()
    
    return {
      messages,
      timestamp: Date.now()
    }
  }

  setBatchInterval(ms: number): void {
    this.batchInterval = ms
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = window.setInterval(() => {
        // Auto-flush will be handled externally
      }, this.batchInterval)
    }
  }

  getPendingCount(): number {
    return this.messageQueue.length
  }

  getBatchInterval(): number {
    return this.batchInterval
  }
}

let messageBatcher: MessageBatcher | null = null

export function initializeMessageBatcher(): void {
  messageBatcher = new MessageBatcher()
}

export function addMessage(type: string, data: unknown, priority: number = 5, sendFn?: (msg: NetworkMessage) => void): void {
  if (!messageBatcher) {
    initializeMessageBatcher()
  }
  
  const message: NetworkMessage = {
    type,
    data,
    timestamp: Date.now(),
    priority
  }
  
  // If sendFn provided and message is critical, send immediately
  if (sendFn && priority >= 9) {
    messageBatcher!.addWithImmediateSend(message, priority, sendFn)
  } else {
    // Otherwise queue it
    messageBatcher!.add(message, priority)
  }
}

export function flushMessages(): NetworkPacket | null {
  if (!messageBatcher) return null
  return messageBatcher.flush()
}

export function getPendingCount(): number {
  if (!messageBatcher) return 0
  return messageBatcher.getPendingCount()
}

