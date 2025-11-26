/**
 * MonitoringService - Collects performance metrics, game metrics, and error metrics
 * Provides observability for production debugging and performance monitoring
 */

export type LogLevel = 'info' | 'warn' | 'error'
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

export interface Metric {
  name: string
  type: MetricType
  value: number
  tags: Record<string, string>
  timestamp: number
}

export interface LogEntry {
  level: LogLevel
  message: string
  context: Record<string, any>
  timestamp: number
  playerId?: string
  sessionId?: string
}

export interface TimeRange {
  start: number
  end: number
}

export interface AlertCondition {
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  tags?: Record<string, string>
}

export type AlertChannel = 'console' | 'webhook' | 'email' | 'slack' | 'discord'

export interface AlertChannelConfig {
  type: AlertChannel
  webhookUrl?: string
  email?: string
  enabled: boolean
}

export interface Alert {
  id: string
  condition: AlertCondition
  triggered: boolean
  triggeredAt?: number
  acknowledged: boolean
  acknowledgedAt?: number
  acknowledgedBy?: string
  escalationLevel: number
  lastTriggered?: number
  triggerCount: number
  channels: AlertChannelConfig[]
  callback: () => void
}

export interface AggregatedError {
  message: string
  count: number
  firstOccurrence: number
  lastOccurrence: number
  severity: LogLevel
  contexts: Record<string, any>[]
  playerIds: Set<string>
}

export interface MonitoringService {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void
  logEvent(level: LogLevel, message: string, context?: Record<string, any>): void
  getMetrics(timeRange: TimeRange, metricName?: string, tags?: Record<string, string>): Metric[]
  setAlert(condition: AlertCondition, callback: () => void, channels?: AlertChannelConfig[]): string
  removeAlert(alertId: string): void
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): void
  getLogs(timeRange?: TimeRange, level?: LogLevel, playerId?: string): LogEntry[]
  getAggregatedErrors(timeRange?: TimeRange): AggregatedError[]
  getErrorRate(timeRange?: TimeRange): number
  clearMetrics(): void
  clearLogs(): void
}

export class MonitoringServiceImpl implements MonitoringService {
  private metrics: Metric[] = []
  private logs: LogEntry[] = []
  private alerts: Map<string, Alert> = new Map()
  private maxMetrics = 10000
  private maxLogs = 5000
  private alertCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    // Check alerts every 5 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts()
    }, 5000)
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      type: 'gauge', // Default type
      value,
      tags,
      timestamp: Date.now()
    }

    this.metrics.push(metric)

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * Log an event
   */
  logEvent(level: LogLevel, message: string, context: Record<string, any> = {}): void {
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
      playerId: context.playerId,
      sessionId: context.sessionId
    }

    this.logs.push(logEntry)

    // Keep only last maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
      logMethod(`[${level.toUpperCase()}] ${message}`, context)
    }
  }

  /**
   * Get metrics within time range
   */
  getMetrics(timeRange: TimeRange, metricName?: string, tags?: Record<string, string>): Metric[] {
    let filtered = this.metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    )

    if (metricName) {
      filtered = filtered.filter(m => m.name === metricName)
    }

    if (tags) {
      filtered = filtered.filter(m => {
        return Object.entries(tags).every(([key, value]) => m.tags[key] === value)
      })
    }

    return filtered
  }

  /**
   * Set an alert with multiple channels
   */
  setAlert(condition: AlertCondition, callback: () => void, channels: AlertChannelConfig[] = [{ type: 'console', enabled: true }]): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const alert: Alert = {
      id: alertId,
      condition,
      triggered: false,
      acknowledged: false,
      escalationLevel: 0,
      triggerCount: 0,
      channels,
      callback
    }

    this.alerts.set(alertId, alert)
    return alertId
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): void {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.acknowledged = true
      alert.acknowledgedAt = Date.now()
      alert.acknowledgedBy = acknowledgedBy
      alert.escalationLevel = 0 // Reset escalation when acknowledged
    }
  }

  /**
   * Remove an alert
   */
  removeAlert(alertId: string): void {
    this.alerts.delete(alertId)
  }

  /**
   * Check all alerts with escalation
   */
  private checkAlerts(): void {
    const now = Date.now()
    const timeRange: TimeRange = {
      start: now - 60000, // Last minute
      end: now
    }

    this.alerts.forEach((alert, alertId) => {
      // Skip acknowledged alerts unless they've been re-triggered
      if (alert.acknowledged && !alert.triggered) return

      const metrics = this.getMetrics(timeRange, alert.condition.metric, alert.condition.tags)
      if (metrics.length === 0) return

      // Calculate average value for the time range
      const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length

      let shouldTrigger = false
      switch (alert.condition.operator) {
        case 'gt':
          shouldTrigger = avgValue > alert.condition.threshold
          break
        case 'lt':
          shouldTrigger = avgValue < alert.condition.threshold
          break
        case 'eq':
          shouldTrigger = Math.abs(avgValue - alert.condition.threshold) < 0.01
          break
      }

      if (shouldTrigger) {
        const wasTriggered = alert.triggered
        alert.triggered = true
        alert.triggeredAt = now
        alert.lastTriggered = now
        alert.triggerCount++

        // Escalate if alert persists
        if (wasTriggered && alert.lastTriggered && now - alert.lastTriggered > 300000) { // 5 minutes
          alert.escalationLevel++
        }

        // Send to all enabled channels
        this.sendAlertToChannels(alert, avgValue)

        // Call callback
        alert.callback()

        // Log alert
        this.logEvent('warn', `Alert triggered: ${alert.condition.metric} (Level ${alert.escalationLevel})`, {
          alertId,
          condition: alert.condition,
          value: avgValue,
          escalationLevel: alert.escalationLevel,
          triggerCount: alert.triggerCount
        })
      } else if (alert.triggered) {
        // Reset if condition no longer met
        alert.triggered = false
        alert.escalationLevel = 0
      }
    })
  }

  /**
   * Send alert to configured channels
   */
  private sendAlertToChannels(alert: Alert, value: number): void {
    alert.channels.forEach(channel => {
      if (!channel.enabled) return

      const message = `Alert: ${alert.condition.metric} ${alert.condition.operator} ${alert.condition.threshold} (Current: ${value.toFixed(2)}, Escalation: ${alert.escalationLevel})`

      switch (channel.type) {
        case 'console':
          console.warn(`[ALERT] ${message}`)
          break
        case 'webhook':
          if (channel.webhookUrl) {
            this.sendWebhook(channel.webhookUrl, {
              alertId: alert.id,
              condition: alert.condition,
              value,
              escalationLevel: alert.escalationLevel,
              triggerCount: alert.triggerCount,
              timestamp: Date.now()
            }).catch(err => {
              console.error(`Failed to send webhook alert:`, err)
            })
          }
          break
        case 'email':
          // Email sending would be implemented here
          console.warn(`[EMAIL ALERT] ${message} to ${channel.email}`)
          break
        case 'slack':
        case 'discord':
          if (channel.webhookUrl) {
            this.sendWebhook(channel.webhookUrl, {
              content: message,
              embeds: [{
                title: 'Alert Triggered',
                description: message,
                color: alert.escalationLevel > 2 ? 0xff0000 : alert.escalationLevel > 0 ? 0xffaa00 : 0xffff00,
                fields: [
                  { name: 'Metric', value: alert.condition.metric, inline: true },
                  { name: 'Value', value: value.toFixed(2), inline: true },
                  { name: 'Escalation', value: alert.escalationLevel.toString(), inline: true }
                ],
                timestamp: new Date().toISOString()
              }]
            }).catch(err => {
              console.error(`Failed to send ${channel.type} alert:`, err)
            })
          }
          break
      }
    })
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      // Use Node.js built-in fetch (available in Node 18+) or fallback to http module
      if (typeof fetch !== 'undefined') {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.statusText}`)
        }
      } else {
        // Fallback for older Node.js versions
        const http = await import('http')
        const https = await import('https')
        const urlObj = new URL(url)
        const isHttps = urlObj.protocol === 'https:'
        const client = isHttps ? https : http
        
        return new Promise((resolve, reject) => {
          const postData = JSON.stringify(data)
          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          }
          
          const req = client.request(options, (res) => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve()
            } else {
              reject(new Error(`Webhook failed: ${res.statusCode} ${res.statusMessage}`))
            }
          })
          
          req.on('error', reject)
          req.write(postData)
          req.end()
        })
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get aggregated errors
   */
  getAggregatedErrors(timeRange?: TimeRange): AggregatedError[] {
    const errorLogs = this.getLogs(timeRange, 'error')
    const aggregated: Map<string, AggregatedError> = new Map()

    errorLogs.forEach(log => {
      const key = log.message
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          message: log.message,
          count: 0,
          firstOccurrence: log.timestamp,
          lastOccurrence: log.timestamp,
          severity: log.level,
          contexts: [],
          playerIds: new Set()
        })
      }

      const agg = aggregated.get(key)!
      agg.count++
      agg.firstOccurrence = Math.min(agg.firstOccurrence, log.timestamp)
      agg.lastOccurrence = Math.max(agg.lastOccurrence, log.timestamp)
      
      if (log.context) {
        agg.contexts.push(log.context)
      }
      
      if (log.playerId) {
        agg.playerIds.add(log.playerId)
      }
    })

    return Array.from(aggregated.values()).sort((a, b) => b.count - a.count)
  }

  /**
   * Get error rate (errors per minute)
   */
  getErrorRate(timeRange?: TimeRange): number {
    const range = timeRange || {
      start: Date.now() - 60000, // Last minute
      end: Date.now()
    }
    
    const errorLogs = this.getLogs(range, 'error')
    const durationMinutes = (range.end - range.start) / 60000
    
    return durationMinutes > 0 ? errorLogs.length / durationMinutes : 0
  }

  /**
   * Get logs
   */
  getLogs(timeRange?: TimeRange, level?: LogLevel, playerId?: string): LogEntry[] {
    let filtered = this.logs

    if (timeRange) {
      filtered = filtered.filter(l => 
        l.timestamp >= timeRange.start && l.timestamp <= timeRange.end
      )
    }

    if (level) {
      filtered = filtered.filter(l => l.level === level)
    }

    if (playerId) {
      filtered = filtered.filter(l => l.playerId === playerId)
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval)
      this.alertCheckInterval = null
    }
  }
}

