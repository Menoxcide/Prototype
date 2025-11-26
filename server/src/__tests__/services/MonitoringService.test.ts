/**
 * Unit tests for Monitoring Service
 */

import { MonitoringServiceImpl } from '../../services/MonitoringService'

describe('Monitoring Service', () => {
  let monitoringService: MonitoringServiceImpl

  beforeEach(() => {
    monitoringService = new MonitoringServiceImpl()
    monitoringService.clearMetrics()
    monitoringService.clearLogs()
  })

  afterEach(() => {
    // Cleanup if needed
  })

  describe('recordMetric', () => {
    test('should record metric', () => {
      monitoringService.recordMetric('test_metric', 100)
      
      const timeRange = {
        start: Date.now() - 60000,
        end: Date.now()
      }
      const metrics = monitoringService.getMetrics(timeRange, 'test_metric')
      
      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics[0].name).toBe('test_metric')
      expect(metrics[0].value).toBe(100)
    })

    test('should record metric with tags', () => {
      monitoringService.recordMetric('test_metric', 100, { playerId: 'player1' })
      
      const timeRange = {
        start: Date.now() - 60000,
        end: Date.now()
      }
      const metrics = monitoringService.getMetrics(timeRange, 'test_metric', { playerId: 'player1' })
      
      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics[0].tags.playerId).toBe('player1')
    })
  })

  describe('logEvent', () => {
    test('should log event', () => {
      monitoringService.logEvent('info', 'Test message', { key: 'value' })
      
      const logs = monitoringService.getLogs()
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].level).toBe('info')
      expect(logs[0].message).toBe('Test message')
    })

    test('should log different log levels', () => {
      monitoringService.logEvent('info', 'Info message')
      monitoringService.logEvent('warn', 'Warning message')
      monitoringService.logEvent('error', 'Error message')
      
      const logs = monitoringService.getLogs()
      expect(logs.length).toBe(3)
      expect(logs.some(l => l.level === 'info')).toBe(true)
      expect(logs.some(l => l.level === 'warn')).toBe(true)
      expect(logs.some(l => l.level === 'error')).toBe(true)
    })
  })

  describe('getMetrics', () => {
    test('should filter metrics by time range', () => {
      const now = Date.now()
      monitoringService.recordMetric('test_metric', 100)
      
      const timeRange = {
        start: now - 1000,
        end: now + 1000
      }
      const metrics = monitoringService.getMetrics(timeRange)
      
      expect(metrics.length).toBeGreaterThan(0)
    })

    test('should filter metrics by name', () => {
      monitoringService.recordMetric('metric1', 100)
      monitoringService.recordMetric('metric2', 200)
      
      const timeRange = {
        start: Date.now() - 60000,
        end: Date.now()
      }
      const metrics = monitoringService.getMetrics(timeRange, 'metric1')
      
      expect(metrics.every(m => m.name === 'metric1')).toBe(true)
    })

    test('should filter metrics by tags', () => {
      monitoringService.recordMetric('test_metric', 100, { playerId: 'player1' })
      monitoringService.recordMetric('test_metric', 200, { playerId: 'player2' })
      
      const timeRange = {
        start: Date.now() - 60000,
        end: Date.now()
      }
      const metrics = monitoringService.getMetrics(timeRange, 'test_metric', { playerId: 'player1' })
      
      expect(metrics.every(m => m.tags.playerId === 'player1')).toBe(true)
    })
  })

  describe('setAlert', () => {
    test('should set alert', () => {
      const callback = jest.fn()
      const alertId = monitoringService.setAlert(
        { metric: 'test_metric', threshold: 100, operator: 'gt' },
        callback
      )
      
      expect(alertId).toBeDefined()
    })
  })

  describe('removeAlert', () => {
    test('should remove alert', () => {
      const callback = jest.fn()
      const alertId = monitoringService.setAlert(
        { metric: 'test_metric', threshold: 100, operator: 'gt' },
        callback
      )
      
      expect(() => monitoringService.removeAlert(alertId)).not.toThrow()
    })
  })

  describe('getLogs', () => {
    test('should return logs', () => {
      monitoringService.logEvent('info', 'Test message')
      
      const logs = monitoringService.getLogs()
      expect(logs.length).toBeGreaterThan(0)
    })

    test('should filter logs by level', () => {
      monitoringService.logEvent('info', 'Info message')
      monitoringService.logEvent('error', 'Error message')
      
      const errorLogs = monitoringService.getLogs(undefined, 'error')
      expect(errorLogs.every(l => l.level === 'error')).toBe(true)
    })

    test('should filter logs by player ID', () => {
      monitoringService.logEvent('info', 'Message 1', { playerId: 'player1' })
      monitoringService.logEvent('info', 'Message 2', { playerId: 'player2' })
      
      const logs = monitoringService.getLogs(undefined, undefined, 'player1')
      expect(logs.every(l => l.playerId === 'player1')).toBe(true)
    })
  })

  describe('getAggregatedErrors', () => {
    test('should aggregate errors', () => {
      monitoringService.logEvent('error', 'Error message 1')
      monitoringService.logEvent('error', 'Error message 1')
      monitoringService.logEvent('error', 'Error message 2')
      
      const aggregated = monitoringService.getAggregatedErrors()
      expect(aggregated.length).toBeGreaterThan(0)
    })
  })

  describe('getErrorRate', () => {
    test('should calculate error rate', () => {
      monitoringService.logEvent('error', 'Error message')
      monitoringService.logEvent('info', 'Info message')
      
      const errorRate = monitoringService.getErrorRate()
      expect(errorRate).toBeGreaterThanOrEqual(0)
      expect(errorRate).toBeLessThanOrEqual(1)
    })
  })
})

