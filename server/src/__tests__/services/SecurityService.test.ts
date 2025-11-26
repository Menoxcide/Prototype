/**
 * Unit tests for Security Service
 */

import { SecurityServiceImpl } from '../../services/SecurityService'
import { GAME_CONFIG } from '../../../shared/config'

describe('Security Service', () => {
  let securityService: SecurityServiceImpl

  beforeEach(() => {
    securityService = new SecurityServiceImpl()
  })

  describe('validateMovement', () => {
    test('should validate normal movement', () => {
      const from = { x: 0, y: 0, z: 0 }
      const to = { x: 1, y: 0, z: 1 }
      const timestamp = Date.now()
      
      const isValid = securityService.validateMovement('player1', from, to, timestamp)
      expect(isValid).toBe(true)
    })

    test('should reject teleportation', () => {
      const from = { x: 0, y: 0, z: 0 }
      const to = { x: 100, y: 0, z: 100 }
      const timestamp = Date.now()
      
      const isValid = securityService.validateMovement('player1', from, to, timestamp)
      expect(isValid).toBe(false)
    })

    test('should reject speed hacking', () => {
      const from = { x: 0, y: 0, z: 0 }
      const to = { x: 100, y: 0, z: 0 }
      const timestamp = Date.now()
      
      // Move very fast (should be rejected)
      const isValid = securityService.validateMovement('player1', from, to, timestamp)
      expect(isValid).toBe(false)
    })

    test('should track player position', () => {
      const from = { x: 0, y: 0, z: 0 }
      const to = { x: 1, y: 0, z: 1 }
      const timestamp = Date.now()
      
      securityService.validateMovement('player1', from, to, timestamp)
      
      // Second movement should use previous position
      const to2 = { x: 2, y: 0, z: 2 }
      const timestamp2 = timestamp + 1000
      const isValid = securityService.validateMovement('player1', to, to2, timestamp2)
      expect(isValid).toBe(true)
    })
  })

  describe('validateDamage', () => {
    test('should validate normal damage', () => {
      const isValid = securityService.validateDamage('player1', 50, 'enemy1', 'fireball')
      expect(isValid).toBe(true)
    })

    test('should reject negative damage', () => {
      const isValid = securityService.validateDamage('player1', -10, 'enemy1')
      expect(isValid).toBe(false)
    })

    test('should reject zero damage', () => {
      const isValid = securityService.validateDamage('player1', 0, 'enemy1')
      expect(isValid).toBe(false)
    })

    test('should reject excessive damage', () => {
      const isValid = securityService.validateDamage('player1', 50000, 'enemy1')
      expect(isValid).toBe(false)
    })
  })

  describe('validateSpellCast', () => {
    test('should validate spell cast with cooldown', () => {
      const isValid = securityService.validateSpellCast('player1', 'fireball', 20, Date.now())
      expect(isValid).toBe(true)
    })

    test('should reject spell cast during cooldown', () => {
      const now = Date.now()
      securityService.validateSpellCast('player1', 'fireball', 20, now)
      
      // Try to cast again immediately (should fail due to cooldown)
      const isValid = securityService.validateSpellCast('player1', 'fireball', 20, now + 100)
      expect(isValid).toBe(false)
    })
  })

  describe('detectCheating', () => {
    test('should detect action rate limit violation', () => {
      const action = {
        type: 'move' as const,
        playerId: 'player1',
        timestamp: Date.now(),
        data: {}
      }
      
      // Simulate many actions quickly
      for (let i = 0; i < 150; i++) {
        securityService.detectCheating('player1', { ...action, timestamp: Date.now() + i })
      }
      
      const suspicion = securityService.getPlayerSuspicionLevel('player1')
      expect(['high', 'critical']).toContain(suspicion)
    })

    test('should return none for normal activity', () => {
      const action = {
        type: 'move' as const,
        playerId: 'player1',
        timestamp: Date.now(),
        data: {}
      }
      
      const suspicion = securityService.detectCheating('player1', action)
      expect(suspicion).toBe('none')
    })
  })

  describe('logSuspiciousActivity', () => {
    test('should log suspicious activity', () => {
      securityService.logSuspiciousActivity('player1', 'Test reason', 'medium', {})
      
      const activities = securityService.getSuspiciousActivities('player1')
      expect(activities.length).toBeGreaterThan(0)
      expect(activities[0].playerId).toBe('player1')
      expect(activities[0].reason).toBe('Test reason')
      expect(activities[0].level).toBe('medium')
    })
  })

  describe('getSuspiciousActivities', () => {
    test('should return activities for player', () => {
      securityService.logSuspiciousActivity('player1', 'Reason 1', 'low', {})
      securityService.logSuspiciousActivity('player2', 'Reason 2', 'medium', {})
      
      const activities = securityService.getSuspiciousActivities('player1')
      expect(activities.length).toBe(1)
      expect(activities[0].playerId).toBe('player1')
    })

    test('should return all activities when no player specified', () => {
      securityService.logSuspiciousActivity('player1', 'Reason 1', 'low', {})
      securityService.logSuspiciousActivity('player2', 'Reason 2', 'medium', {})
      
      const activities = securityService.getSuspiciousActivities()
      expect(activities.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getPlayerSuspicionLevel', () => {
    test('should return suspicion level for player', () => {
      const level = securityService.getPlayerSuspicionLevel('player1')
      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(level)
    })

    test('should increase suspicion level with more activities', () => {
      securityService.logSuspiciousActivity('player1', 'Reason 1', 'low', {})
      securityService.logSuspiciousActivity('player1', 'Reason 2', 'low', {})
      securityService.logSuspiciousActivity('player1', 'Reason 3', 'low', {})
      
      const level = securityService.getPlayerSuspicionLevel('player1')
      expect(['low', 'medium', 'high']).toContain(level)
    })
  })
})

