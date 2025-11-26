/**
 * Connection Quality Monitor
 * Tracks latency, packet loss, jitter per client
 * Adjusts update frequency based on connection quality
 */

import { networkMonitor } from '../utils/mobileOptimizations'

export interface ConnectionQuality {
  latency: number // ms
  packetLoss: number // 0-1
  jitter: number // ms
  bandwidth: number // Mbps (estimated)
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  recommendedUpdateInterval: number // ms
}

class ConnectionMonitor {
  private latencyHistory: number[] = []
  private packetLossHistory: boolean[] = [] // true = packet received, false = lost
  private jitterHistory: number[] = []
  // lastPacketTime is set but not currently used in calculations (available for future use)
  // @ts-ignore - intentionally unused, reserved for future latency calculations
  private _lastPacketTime: number = 0
  private readonly MAX_HISTORY = 50
  private qualityCallbacks: Set<(quality: ConnectionQuality) => void> = new Set()

  /**
   * Record a packet received
   */
  recordPacket(latency: number): void {
    const now = Date.now()
    
    // Record latency
    this.latencyHistory.push(latency)
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift()
    }

    // Calculate jitter (variation in latency)
    if (this.latencyHistory.length >= 2) {
      const jitter = Math.abs(this.latencyHistory[this.latencyHistory.length - 1] - this.latencyHistory[this.latencyHistory.length - 2])
      this.jitterHistory.push(jitter)
      if (this.jitterHistory.length > this.MAX_HISTORY) {
        this.jitterHistory.shift()
      }
    }

    // Record packet received
    this.packetLossHistory.push(true)
    if (this.packetLossHistory.length > this.MAX_HISTORY) {
      this.packetLossHistory.shift()
    }

    // Track last packet time for latency calculations (available for future use)
    this._lastPacketTime = now
  }

  /**
   * Record a packet loss
   */
  recordPacketLoss(): void {
    this.packetLossHistory.push(false)
    if (this.packetLossHistory.length > this.MAX_HISTORY) {
      this.packetLossHistory.shift()
    }
  }

  /**
   * Get current connection quality
   */
  getQuality(): ConnectionQuality {
    const avgLatency = this.latencyHistory.length > 0
      ? this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
      : 50 // Default assumption

    const packetLoss = this.packetLossHistory.length > 0
      ? this.packetLossHistory.filter(p => !p).length / this.packetLossHistory.length
      : 0

    const avgJitter = this.jitterHistory.length > 0
      ? this.jitterHistory.reduce((a, b) => a + b, 0) / this.jitterHistory.length
      : 0

    // Estimate bandwidth based on network type
    const networkType = networkMonitor.getConnectionType()
    const effectiveType = networkMonitor.getEffectiveType()
    let estimatedBandwidth = 10 // Default 10 Mbps
    
    if (networkType === 'wifi' || networkType === 'ethernet') {
      estimatedBandwidth = 50 // Assume good WiFi/Ethernet
    } else if (effectiveType === '4g') {
      estimatedBandwidth = 10
    } else if (effectiveType === '3g') {
      estimatedBandwidth = 2
    } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      estimatedBandwidth = 0.5
    }

    // Determine quality level
    let quality: ConnectionQuality['quality'] = 'excellent'
    if (avgLatency > 200 || packetLoss > 0.1 || avgJitter > 100) {
      quality = 'poor'
    } else if (avgLatency > 100 || packetLoss > 0.05 || avgJitter > 50) {
      quality = 'fair'
    } else if (avgLatency > 50 || packetLoss > 0.02 || avgJitter > 20) {
      quality = 'good'
    }

    // Calculate recommended update interval based on quality
    let recommendedUpdateInterval = 50 // Default 50ms (20Hz)
    if (quality === 'poor') {
      recommendedUpdateInterval = 200 // 5Hz
    } else if (quality === 'fair') {
      recommendedUpdateInterval = 100 // 10Hz
    } else if (quality === 'good') {
      recommendedUpdateInterval = 66 // 15Hz
    } else {
      recommendedUpdateInterval = 50 // 20Hz
    }

    const connectionQuality: ConnectionQuality = {
      latency: avgLatency,
      packetLoss,
      jitter: avgJitter,
      bandwidth: estimatedBandwidth,
      quality,
      recommendedUpdateInterval
    }

    // Notify callbacks
    this.qualityCallbacks.forEach(callback => {
      try {
        callback(connectionQuality)
      } catch (error) {
        console.error('Error in connection quality callback:', error)
      }
    })

    return connectionQuality
  }

  /**
   * Subscribe to quality changes
   */
  onQualityChange(callback: (quality: ConnectionQuality) => void): () => void {
    this.qualityCallbacks.add(callback)
    return () => this.qualityCallbacks.delete(callback)
  }

  /**
   * Reset monitoring data
   */
  reset(): void {
    this.latencyHistory = []
    this.packetLossHistory = []
    this.jitterHistory = []
    this._lastPacketTime = 0
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor()

