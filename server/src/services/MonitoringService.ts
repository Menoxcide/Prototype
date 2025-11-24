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

export interface Alert {
  id: string
  condition: AlertCondition
  triggered: boolean
  triggeredAt?: number
  callback: () => void
}

export interface MonitoringService {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void
  logEvent(level: LogLevel, message: string, context?: Record<string, any>): void
  getMetrics(timeRange: TimeRange, metricName?: string, tags?: Record<string, string>): Metric[]
  setAlert(condition: AlertCondition, callback: () => void): string
  removeAlert(alertId: string): void
  getLogs(timeRange?: TimeRange, level?: LogLevel, playerId?: string): LogEntry[]
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
   * Set an alert
   */
  setAlert(condition: AlertCondition, callback: () => void): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const alert: Alert = {
      id: alertId,
      condition,
      triggered: false,
      callback
    }

    this.alerts.set(alertId, alert)
    return alertId
  }

  /**
   * Remove an alert
   */
  removeAlert(alertId: string): void {
    this.alerts.delete(alertId)
  }

  /**
   * Check all alerts
   */
  private checkAlerts(): void {
    const now = Date.now()
    const timeRange: TimeRange = {
      start: now - 60000, // Last minute
      end: now
    }

    this.alerts.forEach((alert, alertId) => {
      if (alert.triggered) return

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
        alert.triggered = true
        alert.triggeredAt = now
        alert.callback()
        this.logEvent('warn', `Alert triggered: ${alert.condition.metric}`, {
          alertId,
          condition: alert.condition,
          value: avgValue
        })
      }
    })
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

