/**
 * Reconnection System - Handles client reconnection with exponential backoff
 * Queues actions during disconnection and restores state on reconnect
 */

import { Room } from 'colyseus.js'

export interface QueuedAction {
  type: string
  data: any
  timestamp: number
}

export interface ReconnectionState {
  isReconnecting: boolean
  reconnectAttempts: number
  lastReconnectAttempt: number
  queuedActions: QueuedAction[]
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  latency: number
}

class ReconnectionManager {
  private state: ReconnectionState = {
    isReconnecting: false,
    reconnectAttempts: 0,
    lastReconnectAttempt: 0,
    queuedActions: [],
    connectionQuality: 'excellent',
    latency: 0
  }
  
  private reconnectTimer: NodeJS.Timeout | null = null
  private latencyCheckInterval: NodeJS.Timeout | null = null
  private readonly MAX_RECONNECT_ATTEMPTS = 10
  private readonly MAX_QUEUE_SIZE = 100
  private readonly MAX_QUEUE_AGE = 30000 // 30 seconds
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
  private getBackoffDelay(attempt: number): number {
    const delay = Math.min(1000 * Math.pow(2, attempt), 60000)
    return delay
  }

  /**
   * Start reconnection attempts
   */
  startReconnection(
    reconnectFn: () => Promise<Room | null>,
    onReconnected?: (room: Room) => void,
    onFailed?: () => void
  ): void {
    if (this.state.isReconnecting) return
    
    this.state.isReconnecting = true
    this.state.reconnectAttempts = 0
    
    const attemptReconnect = async () => {
      if (this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        this.state.isReconnecting = false
        if (onFailed) onFailed()
        return
      }
      
      this.state.reconnectAttempts++
      this.state.lastReconnectAttempt = Date.now()
      
      try {
        const room = await reconnectFn()
        if (room) {
          this.state.isReconnecting = false
          this.state.reconnectAttempts = 0
          
          // Restore queued actions
          this.processQueuedActions(room)
          
          if (onReconnected) onReconnected(room)
        } else {
          // Retry with exponential backoff
          const delay = this.getBackoffDelay(this.state.reconnectAttempts)
          this.reconnectTimer = setTimeout(attemptReconnect, delay)
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error)
        const delay = this.getBackoffDelay(this.state.reconnectAttempts)
        this.reconnectTimer = setTimeout(attemptReconnect, delay)
      }
    }
    
    // Start first attempt immediately
    attemptReconnect()
  }

  /**
   * Stop reconnection attempts
   */
  stopReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.state.isReconnecting = false
    this.state.reconnectAttempts = 0
  }

  /**
   * Queue an action to be sent when reconnected
   */
  queueAction(type: string, data: any): void {
    if (this.state.queuedActions.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest action
      this.state.queuedActions.shift()
    }
    
    this.state.queuedActions.push({
      type,
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Process queued actions after reconnection
   */
  private processQueuedActions(room: Room): void {
    const now = Date.now()
    const validActions = this.state.queuedActions.filter(
      action => now - action.timestamp < this.MAX_QUEUE_AGE
    )
    
    // Send queued actions
    validActions.forEach(action => {
      try {
        room.send(action.type as any, action.data)
      } catch (error) {
        console.error('Failed to send queued action:', error)
      }
    })
    
    // Clear queue
    this.state.queuedActions = []
  }

  /**
   * Start latency monitoring
   */
  startLatencyMonitoring(room: Room): void {
    if (this.latencyCheckInterval) return
    
    this.latencyCheckInterval = setInterval(() => {
      if (!room || !room.connection.isOpen) {
        this.state.latency = -1
        this.state.connectionQuality = 'poor'
        return
      }
      
      // Measure round-trip time
      const startTime = Date.now()
      room.send('ping' as any, { timestamp: startTime })
      
      // Note: In a real implementation, you'd listen for pong response
      // For now, estimate based on connection state
      const estimatedLatency = 50 // Placeholder
      this.state.latency = estimatedLatency
      
      // Update connection quality
      if (estimatedLatency < 50) {
        this.state.connectionQuality = 'excellent'
      } else if (estimatedLatency < 100) {
        this.state.connectionQuality = 'good'
      } else if (estimatedLatency < 200) {
        this.state.connectionQuality = 'fair'
      } else {
        this.state.connectionQuality = 'poor'
      }
    }, 5000) // Check every 5 seconds
  }

  /**
   * Stop latency monitoring
   */
  stopLatencyMonitoring(): void {
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval)
      this.latencyCheckInterval = null
    }
  }

  /**
   * Get current reconnection state
   */
  getState(): ReconnectionState {
    return { ...this.state }
  }

  /**
   * Clear queued actions
   */
  clearQueue(): void {
    this.state.queuedActions = []
  }
}

export const reconnectionManager = new ReconnectionManager()

