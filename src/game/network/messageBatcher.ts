/**
 * MessageBatcher - Batches network messages to reduce overhead
 */

interface NetworkMessage {
  type: string
  data: any
  timestamp: number
  priority: number
}

interface NetworkPacket {
  messages: NetworkMessage[]
  timestamp: number
}

class MessageBatcher {
  private messageQueue: NetworkMessage[] = []
  private maxBatchSize = 100
  private intervalTimer: number | null = null

  add(message: NetworkMessage, priority: number = 5): void {
    const clampedPriority = Math.max(0, Math.min(priority, 10))
    const messageWithPriority: NetworkMessage = {
      ...message,
      priority: clampedPriority
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

  flush(): NetworkPacket | null {
    if (this.messageQueue.length === 0) return null

    const messages = this.messageQueue.splice(0, this.maxBatchSize)
    return {
      messages,
      timestamp: Date.now()
    }
  }

  setBatchInterval(_ms: number): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = null
    }
  }

  getPendingCount(): number {
    return this.messageQueue.length
  }
}

let messageBatcher: MessageBatcher | null = null

export function initializeMessageBatcher(): void {
  messageBatcher = new MessageBatcher()
}

export function addMessage(type: string, data: any, priority: number = 5): void {
  if (!messageBatcher) {
    initializeMessageBatcher()
  }
  messageBatcher!.add({
    type,
    data,
    timestamp: Date.now(),
    priority
  }, priority)
}

export function flushMessages(): NetworkPacket | null {
  if (!messageBatcher) return null
  return messageBatcher.flush()
}

export function getPendingCount(): number {
  if (!messageBatcher) return 0
  return messageBatcher.getPendingCount()
}

