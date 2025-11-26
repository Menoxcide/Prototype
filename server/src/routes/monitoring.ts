/**
 * Monitoring API Routes
 * Provides endpoints for metrics and logs
 */

import { Router, Request, Response } from 'express'
import { MonitoringService } from '../services/MonitoringService'

export function createMonitoringRouter(monitoringService: MonitoringService): Router {
  const router = Router()

  /**
   * GET /metrics
   * Get metrics within a time range
   */
  router.get('/metrics', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000 // Last hour
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const metricName = req.query.metric as string | undefined
      const tags = req.query.tags ? JSON.parse(req.query.tags as string) : undefined

      const timeRange = { start, end }
      const metrics = monitoringService.getMetrics(timeRange, metricName, tags)

      res.json({
        success: true,
        metrics,
        count: metrics.length,
        timeRange
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /logs
   * Get logs within a time range
   */
  router.get('/logs', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000 // Last hour
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const level = req.query.level as 'info' | 'warn' | 'error' | undefined
      const playerId = req.query.playerId as string | undefined

      const timeRange = { start, end }
      const logs = monitoringService.getLogs(timeRange, level, playerId)

      res.json({
        success: true,
        logs,
        count: logs.length,
        timeRange
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /stats
   * Get aggregated statistics
   */
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000 // Last hour
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const timeRange = { start, end }

      // Get all metrics
      const allMetrics = monitoringService.getMetrics(timeRange)
      
      // Aggregate by metric name
      const stats: Record<string, {
        count: number
        sum: number
        avg: number
        min: number
        max: number
      }> = {}

      allMetrics.forEach(metric => {
        if (!stats[metric.name]) {
          stats[metric.name] = {
            count: 0,
            sum: 0,
            avg: 0,
            min: Infinity,
            max: -Infinity
          }
        }

        const stat = stats[metric.name]
        stat.count++
        stat.sum += metric.value
        stat.min = Math.min(stat.min, metric.value)
        stat.max = Math.max(stat.max, metric.value)
      })

      // Calculate averages
      Object.keys(stats).forEach(name => {
        stats[name].avg = stats[name].sum / stats[name].count
      })

      // Get error count
      const errorLogs = monitoringService.getLogs(timeRange, 'error')
      const warnLogs = monitoringService.getLogs(timeRange, 'warn')

      res.json({
        success: true,
        stats,
        errors: errorLogs.length,
        warnings: warnLogs.length,
        timeRange
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * POST /alerts
   * Create a new alert with multiple channels
   */
  router.post('/alerts', (req: Request, res: Response) => {
    try {
      const { condition, channels } = req.body

      if (!condition || !condition.metric || !condition.threshold || !condition.operator) {
        return res.status(400).json({
          success: false,
          error: 'Invalid alert condition'
        })
      }

      // Default to console if no channels specified
      const alertChannels = channels || [{ type: 'console', enabled: true }]

      // Note: In production, callback should be a webhook URL or similar
      const alertId = monitoringService.setAlert(condition, () => {
        console.warn(`Alert triggered: ${condition.metric}`)
      }, alertChannels)

      res.json({
        success: true,
        alertId
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })
  
  /**
   * POST /alerts/:alertId/acknowledge
   * Acknowledge an alert
   */
  router.post('/alerts/:alertId/acknowledge', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params
      const { acknowledgedBy } = req.body

      monitoringService.acknowledgeAlert(alertId, acknowledgedBy)

      res.json({
        success: true
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * DELETE /alerts/:alertId
   * Remove an alert
   */
  router.delete('/alerts/:alertId', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params
      monitoringService.removeAlert(alertId)

      res.json({
        success: true
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * POST /metrics/clear
   * Clear all metrics
   */
  router.post('/metrics/clear', (req: Request, res: Response) => {
    try {
      monitoringService.clearMetrics()
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * POST /logs/clear
   * Clear all logs
   */
  router.post('/logs/clear', (req: Request, res: Response) => {
    try {
      monitoringService.clearLogs()
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /metrics/aggregate
   * Get aggregated metrics with time buckets and percentiles
   */
  router.get('/metrics/aggregate', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const metricName = req.query.metric as string | undefined
      const bucketSize = req.query.bucketSize ? parseInt(req.query.bucketSize as string) : 60000 // 1 minute default
      const tags = req.query.tags ? JSON.parse(req.query.tags as string) : undefined

      const timeRange = { start, end }
      const metrics = monitoringService.getMetrics(timeRange, metricName, tags)

      // Group metrics by time buckets
      const buckets: Record<number, number[]> = {}
      metrics.forEach(metric => {
        const bucket = Math.floor(metric.timestamp / bucketSize) * bucketSize
        if (!buckets[bucket]) {
          buckets[bucket] = []
        }
        buckets[bucket].push(metric.value)
      })

      // Calculate statistics for each bucket
      const aggregated = Object.keys(buckets).map(bucketKey => {
        const values = buckets[parseInt(bucketKey)]
        const sorted = [...values].sort((a, b) => a - b)
        const count = values.length
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = sum / count
        const min = sorted[0]
        const max = sorted[sorted.length - 1]
        const p50 = sorted[Math.floor(sorted.length * 0.5)]
        const p95 = sorted[Math.floor(sorted.length * 0.95)]
        const p99 = sorted[Math.floor(sorted.length * 0.99)]

        return {
          timestamp: parseInt(bucketKey),
          count,
          sum,
          avg,
          min,
          max,
          p50,
          p95,
          p99
        }
      }).sort((a, b) => a.timestamp - b.timestamp)

      res.json({
        success: true,
        aggregated,
        bucketSize,
        timeRange
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /metrics/summary
   * Get summary of all metrics
   */
  router.get('/metrics/summary', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const timeRange = { start, end }

      const allMetrics = monitoringService.getMetrics(timeRange)
      
      // Group by metric name
      const byName: Record<string, number[]> = {}
      allMetrics.forEach(metric => {
        if (!byName[metric.name]) {
          byName[metric.name] = []
        }
        byName[metric.name].push(metric.value)
      })

      // Calculate summary for each metric
      const summary = Object.keys(byName).map(name => {
        const values = byName[name]
        const sorted = [...values].sort((a, b) => a - b)
        const count = values.length
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = sum / count
        const min = sorted[0]
        const max = sorted[sorted.length - 1]
        const p50 = sorted[Math.floor(sorted.length * 0.5)]
        const p95 = sorted[Math.floor(sorted.length * 0.95)]
        const p99 = sorted[Math.floor(sorted.length * 0.99)]

        return {
          name,
          count,
          sum,
          avg,
          min,
          max,
          p50,
          p95,
          p99
        }
      })

      res.json({
        success: true,
        summary,
        timeRange
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    try {
      const now = Date.now()
      const recentTimeRange = { start: now - 60000, end: now } // Last minute
      const recentErrors = monitoringService.getLogs(recentTimeRange, 'error')
      const recentWarnings = monitoringService.getLogs(recentTimeRange, 'warn')
      const errorRate = monitoringService.getErrorRate(recentTimeRange)

      const health = {
        status: recentErrors.length > 10 ? 'unhealthy' : recentErrors.length > 5 ? 'degraded' : 'healthy',
        timestamp: now,
        metrics: {
          recentErrors: recentErrors.length,
          recentWarnings: recentWarnings.length,
          errorRate
        }
      }

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
      res.status(statusCode).json({
        success: true,
        health
      })
    } catch (error) {
      res.status(503).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /alerts
   * List all alerts
   */
  router.get('/alerts', (req: Request, res: Response) => {
    try {
      // Access private alerts map through service
      const alerts = (monitoringService as any).alerts
      const alertList = Array.from(alerts.values()).map((alert: any) => ({
        id: alert.id,
        condition: alert.condition,
        triggered: alert.triggered,
        triggeredAt: alert.triggeredAt,
        acknowledged: alert.acknowledged || false,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        escalationLevel: alert.escalationLevel || 0,
        triggerCount: alert.triggerCount || 0,
        lastTriggered: alert.lastTriggered,
        channels: alert.channels || []
      }))

      res.json({
        success: true,
        alerts: alertList,
        count: alertList.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /alerts/:alertId
   * Get specific alert
   */
  router.get('/alerts/:alertId', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params
      const alerts = (monitoringService as any).alerts
      const alert = alerts.get(alertId)

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }

      res.json({
        success: true,
        alert: {
          id: alert.id,
          condition: alert.condition,
          triggered: alert.triggered,
          triggeredAt: alert.triggeredAt
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * POST /metrics/batch
   * Batch record multiple metrics
   */
  router.post('/metrics/batch', (req: Request, res: Response) => {
    try {
      const { metrics } = req.body

      if (!Array.isArray(metrics)) {
        return res.status(400).json({
          success: false,
          error: 'Metrics must be an array'
        })
      }

      metrics.forEach((metric: { name: string; value: number; tags?: Record<string, string> }) => {
        if (metric.name && typeof metric.value === 'number') {
          monitoringService.recordMetric(metric.name, metric.value, metric.tags || {})
        }
      })

      res.json({
        success: true,
        recorded: metrics.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /metrics/histogram
   * Get histogram data for a metric
   */
  router.get('/metrics/histogram', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const metricName = req.query.metric as string | undefined
      const buckets = req.query.buckets ? parseInt(req.query.buckets as string) : 10
      const tags = req.query.tags ? JSON.parse(req.query.tags as string) : undefined

      if (!metricName) {
        return res.status(400).json({
          success: false,
          error: 'Metric name is required'
        })
      }

      const timeRange = { start, end }
      const metrics = monitoringService.getMetrics(timeRange, metricName, tags)

      if (metrics.length === 0) {
        return res.json({
          success: true,
          histogram: [],
          buckets: []
        })
      }

      const values = metrics.map(m => m.value)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const bucketSize = (max - min) / buckets

      const histogram: Array<{ bucket: string; count: number; min: number; max: number }> = []
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize
        const bucketMax = i === buckets - 1 ? max : min + (i + 1) * bucketSize
        const count = values.filter(v => v >= bucketMin && (i === buckets - 1 ? v <= bucketMax : v < bucketMax)).length

        histogram.push({
          bucket: `${bucketMin.toFixed(2)}-${bucketMax.toFixed(2)}`,
          count,
          min: bucketMin,
          max: bucketMax
        })
      }

      res.json({
        success: true,
        histogram,
        metricName,
        timeRange,
        totalCount: metrics.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /errors/aggregated
   * Get aggregated error information
   */
  router.get('/errors/aggregated', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const timeRange = { start, end }

      const aggregatedErrors = monitoringService.getAggregatedErrors(timeRange)

      res.json({
        success: true,
        errors: aggregatedErrors.map(err => ({
          message: err.message,
          count: err.count,
          firstOccurrence: err.firstOccurrence,
          lastOccurrence: err.lastOccurrence,
          severity: err.severity,
          playerIds: Array.from(err.playerIds),
          sampleContexts: err.contexts.slice(0, 5) // First 5 contexts
        })),
        count: aggregatedErrors.length,
        timeRange
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  /**
   * GET /dashboard
   * Get comprehensive metrics dashboard data
   */
  router.get('/dashboard', (req: Request, res: Response) => {
    try {
      const start = req.query.start ? parseInt(req.query.start as string) : Date.now() - 3600000
      const end = req.query.end ? parseInt(req.query.end as string) : Date.now()
      const timeRange = { start, end }

      // Get all metrics
      const allMetrics = monitoringService.getMetrics(timeRange)
      
      // Group by category
      const gameMetrics = allMetrics.filter(m => m.name.startsWith('game.'))
      const serverMetrics = allMetrics.filter(m => m.name.startsWith('server.'))

      // Calculate game-specific statistics
      const gameStats: Record<string, {
        total: number
        perMinute: number
        uniquePlayers: Set<string>
      }> = {}

      gameMetrics.forEach(metric => {
        const baseName = metric.name.split('.')[1] || metric.name
        if (!gameStats[baseName]) {
          gameStats[baseName] = {
            total: 0,
            perMinute: 0,
            uniquePlayers: new Set()
          }
        }
        gameStats[baseName].total++
        if (metric.tags.playerId) {
          gameStats[baseName].uniquePlayers.add(metric.tags.playerId)
        }
      })

      // Calculate per-minute rates
      const durationMinutes = (timeRange.end - timeRange.start) / 60000
      Object.keys(gameStats).forEach(key => {
        gameStats[key].perMinute = durationMinutes > 0 ? gameStats[key].total / durationMinutes : 0
      })

      // Get server performance metrics
      const tickTimeMetrics = serverMetrics.filter(m => m.name === 'server.tick_time')
      const playerCountMetrics = serverMetrics.filter(m => m.name === 'server.player_count')
      const enemyCountMetrics = serverMetrics.filter(m => m.name === 'server.enemy_count')

      const avgTickTime = tickTimeMetrics.length > 0
        ? tickTimeMetrics.reduce((sum, m) => sum + m.value, 0) / tickTimeMetrics.length
        : 0

      const avgPlayerCount = playerCountMetrics.length > 0
        ? playerCountMetrics.reduce((sum, m) => sum + m.value, 0) / playerCountMetrics.length
        : 0

      const avgEnemyCount = enemyCountMetrics.length > 0
        ? enemyCountMetrics.reduce((sum, m) => sum + m.value, 0) / enemyCountMetrics.length
        : 0

      // Get error statistics
      const errorLogs = monitoringService.getLogs(timeRange, 'error')
      const warnLogs = monitoringService.getLogs(timeRange, 'warn')
      const errorRate = monitoringService.getErrorRate(timeRange)

      // Get aggregated errors
      const aggregatedErrors = monitoringService.getAggregatedErrors(timeRange)

      // Get alerts
      const alerts = (monitoringService as any).alerts
      const alertList = Array.from(alerts.values())
      const activeAlerts = alertList.filter((a: any) => a.triggered && !a.acknowledged).length
      const triggeredAlerts = alertList.filter((a: any) => a.triggered).length

      res.json({
        success: true,
        timeRange,
        gameMetrics: Object.keys(gameStats).map(key => ({
          name: key,
          total: gameStats[key].total,
          perMinute: Math.round(gameStats[key].perMinute * 100) / 100,
          uniquePlayers: gameStats[key].uniquePlayers.size
        })),
        serverPerformance: {
          avgTickTime: Math.round(avgTickTime * 100) / 100,
          avgPlayerCount: Math.round(avgPlayerCount),
          avgEnemyCount: Math.round(avgEnemyCount)
        },
        errors: {
          total: errorLogs.length,
          warnings: warnLogs.length,
          errorRate: Math.round(errorRate * 100) / 100,
          topErrors: aggregatedErrors.slice(0, 10).map(err => ({
            message: err.message,
            count: err.count,
            severity: err.severity
          }))
        },
        alerts: {
          active: activeAlerts,
          triggered: triggeredAlerts,
          total: alertList.length
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  return router
}

