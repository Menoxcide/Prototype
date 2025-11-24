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
   * Create a new alert
   */
  router.post('/alerts', (req: Request, res: Response) => {
    try {
      const { condition, callback } = req.body

      if (!condition || !condition.metric || !condition.threshold || !condition.operator) {
        return res.status(400).json({
          success: false,
          error: 'Invalid alert condition'
        })
      }

      // Note: In production, callback should be a webhook URL or similar
      const alertId = monitoringService.setAlert(condition, () => {
        console.warn(`Alert triggered: ${condition.metric}`)
      })

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

  return router
}

