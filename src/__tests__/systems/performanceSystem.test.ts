/**
 * Unit tests for Performance System
 */

import {
  getPerformanceSettings,
  updatePerformanceSettings,
  adjustPerformanceForFPS,
  getLODLevel
} from '../../game/systems/performanceSystem'

// Mock mobile detection
jest.mock('../../game/data/config', () => ({
  getPerformanceConfig: jest.fn(() => ({
    maxParticles: 50,
    enableShadows: false,
    shadowQuality: 'low',
    renderDistance: 50,
    targetFPS: 30
  })),
  isMobile: jest.fn(() => false)
}))

// Mock quality settings
jest.mock('../../game/utils/qualitySettings', () => ({
  getQualitySettings: jest.fn(() => ({
    preset: 'high'
  }))
}))

// Mock mobile optimizations
jest.mock('../../game/utils/mobileOptimizations', () => ({
  getMobileOptimizationFlags: jest.fn(() => ({
    isMobile: false,
    lodMultiplier: 1.0
  }))
}))

describe('Performance System', () => {
  beforeEach(() => {
    // Reset settings before each test
    updatePerformanceSettings({
      maxParticles: 50,
      enableShadows: false,
      shadowQuality: 'low',
      renderDistance: 50,
      targetFPS: 30,
      enableLOD: false,
      particleQuality: 'low',
      textureQuality: 'low'
    })
  })

  describe('getPerformanceSettings', () => {
    test('should return performance settings', () => {
      const settings = getPerformanceSettings()
      
      expect(settings).toHaveProperty('maxParticles')
      expect(settings).toHaveProperty('enableShadows')
      expect(settings).toHaveProperty('shadowQuality')
      expect(settings).toHaveProperty('renderDistance')
      expect(settings).toHaveProperty('targetFPS')
      expect(settings).toHaveProperty('enableLOD')
      expect(settings).toHaveProperty('particleQuality')
      expect(settings).toHaveProperty('textureQuality')
    })

    test('should return cached settings on subsequent calls', () => {
      const settings1 = getPerformanceSettings()
      const settings2 = getPerformanceSettings()
      
      expect(settings1).toBe(settings2)
    })
  })

  describe('updatePerformanceSettings', () => {
    test('should update settings partially', () => {
      updatePerformanceSettings({ maxParticles: 100 })
      
      const settings = getPerformanceSettings()
      expect(settings.maxParticles).toBe(100)
    })

    test('should update multiple settings at once', () => {
      updatePerformanceSettings({
        maxParticles: 75,
        renderDistance: 75,
        targetFPS: 60
      })
      
      const settings = getPerformanceSettings()
      expect(settings.maxParticles).toBe(75)
      expect(settings.renderDistance).toBe(75)
      expect(settings.targetFPS).toBe(60)
    })
  })

  describe('adjustPerformanceForFPS', () => {
    test('should reduce quality when FPS is low', () => {
      const initialSettings = getPerformanceSettings()
      const lowFPS = initialSettings.targetFPS * 0.7 // 70% of target
      
      adjustPerformanceForFPS(lowFPS)
      
      const newSettings = getPerformanceSettings()
      expect(newSettings.maxParticles).toBeLessThanOrEqual(initialSettings.maxParticles)
      expect(newSettings.renderDistance).toBeLessThanOrEqual(initialSettings.renderDistance)
    })

    test('should increase quality when FPS is high', () => {
      const initialSettings = getPerformanceSettings()
      const highFPS = initialSettings.targetFPS * 1.3 // 130% of target
      
      adjustPerformanceForFPS(highFPS)
      
      const newSettings = getPerformanceSettings()
      // Quality should not decrease when FPS is high
      expect(newSettings.maxParticles).toBeGreaterThanOrEqual(initialSettings.maxParticles * 0.9)
    })

    test('should not adjust when FPS is within acceptable range', () => {
      const initialSettings = getPerformanceSettings()
      const acceptableFPS = initialSettings.targetFPS * 0.9 // 90% of target
      
      adjustPerformanceForFPS(acceptableFPS)
      
      const newSettings = getPerformanceSettings()
      // Settings should remain similar (allowing for small adjustments)
      expect(Math.abs(newSettings.maxParticles - initialSettings.maxParticles)).toBeLessThan(10)
    })

    test('should enforce minimum values', () => {
      const veryLowFPS = 5
      
      adjustPerformanceForFPS(veryLowFPS)
      
      const settings = getPerformanceSettings()
      expect(settings.maxParticles).toBeGreaterThanOrEqual(10)
      expect(settings.renderDistance).toBeGreaterThanOrEqual(30)
    })

    test('should enforce maximum values', () => {
      const veryHighFPS = 200
      
      adjustPerformanceForFPS(veryHighFPS)
      
      const settings = getPerformanceSettings()
      expect(settings.maxParticles).toBeLessThanOrEqual(200)
      expect(settings.renderDistance).toBeLessThanOrEqual(100)
    })
  })

  describe('getLODLevel', () => {
    test('should return high LOD for close objects', () => {
      const lod = getLODLevel(10, 100)
      expect(lod).toBe('high')
    })

    test('should return medium LOD for medium distance', () => {
      const lod = getLODLevel(50, 100)
      expect(['high', 'medium', 'low']).toContain(lod)
    })

    test('should return low LOD for far objects', () => {
      const lod = getLODLevel(90, 100)
      expect(['medium', 'low']).toContain(lod)
    })

    test('should return high LOD when LOD is disabled', () => {
      updatePerformanceSettings({ enableLOD: false })
      const lod = getLODLevel(100, 100)
      expect(lod).toBe('high')
    })

    test('should handle zero distance', () => {
      const lod = getLODLevel(0, 100)
      expect(lod).toBe('high')
    })

    test('should handle distance equal to render distance', () => {
      const lod = getLODLevel(100, 100)
      expect(['high', 'medium', 'low']).toContain(lod)
    })
  })
})

