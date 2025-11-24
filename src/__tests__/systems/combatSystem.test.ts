/**
 * Unit tests for Combat System
 */

import { calculateDamage, updateCombo, getComboMultiplier, calculateCriticalChance } from '../../game/systems/combatSystem'
import { Spell } from '../../game/types'

describe('Combat System', () => {
  const mockSpell: Spell = {
    id: 'test_spell',
    name: 'Test Spell',
    description: 'A test spell',
    manaCost: 10,
    cooldown: 5,
    damage: 50,
    range: 10,
    castTime: 1,
    icon: '⚡',
    color: '#ffffff'
  }

  describe('calculateDamage', () => {
    test('should calculate base damage', () => {
      const result = calculateDamage(mockSpell, 50, 1)
      expect(result.damage).toBe(50)
      expect(result.finalDamage).toBeGreaterThanOrEqual(50)
    })

    test('should apply combo multiplier', () => {
      const result = calculateDamage(mockSpell, 50, 2.0)
      expect(result.finalDamage).toBeGreaterThanOrEqual(100)
    })

    test('should have chance for critical hit', () => {
      let critCount = 0
      for (let i = 0; i < 100; i++) {
        const result = calculateDamage(mockSpell, 50, 1, 0.5) // 50% crit chance
        if (result.isCrit) {
          critCount++
        }
      }
      // Should have some crits with 50% chance
      expect(critCount).toBeGreaterThan(20)
      expect(critCount).toBeLessThan(80)
    })

    test('should apply critical multiplier', () => {
      // Mock random to always crit
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.05) // Always crit

      const result = calculateDamage(mockSpell, 50, 1, 0.1, 2.0)
      expect(result.isCrit).toBe(true)
      expect(result.finalDamage).toBe(100) // 50 * 2.0

      Math.random = originalRandom
    })
  })

  describe('updateCombo', () => {
    test('should create new combo', () => {
      const combo = updateCombo(null, Date.now())
      expect(combo.kills).toBe(1)
      expect(combo.multiplier).toBe(1)
    })

    test('should increment combo within window', () => {
      const now = Date.now()
      const combo1 = updateCombo(null, now)
      const combo2 = updateCombo(combo1, now + 1000) // 1 second later

      expect(combo2.kills).toBe(2)
    })

    test('should reset combo after window expires', () => {
      const now = Date.now()
      const combo1 = updateCombo(null, now)
      const combo2 = updateCombo(combo1, now + 10000) // 10 seconds later (outside 8s window)

      expect(combo2.kills).toBe(1)
      expect(combo2.startTime).toBeGreaterThan(combo1.startTime)
    })

    test('should apply multiplier for 3+ kills', () => {
      const now = Date.now()
      let combo = updateCombo(null, now)
      combo = updateCombo(combo, now + 1000)
      combo = updateCombo(combo, now + 2000) // 3 kills

      expect(combo.kills).toBe(3)
      expect(combo.multiplier).toBeGreaterThan(1)
    })
  })

  describe('getComboMultiplier', () => {
    test('should return 1 for null combo', () => {
      expect(getComboMultiplier(null)).toBe(1)
    })

    test('should return 1 for less than 3 kills', () => {
      const combo = { kills: 2, startTime: Date.now(), multiplier: 1 }
      expect(getComboMultiplier(combo)).toBe(1)
    })

    test('should return multiplier for 3+ kills', () => {
      const combo = { kills: 5, startTime: Date.now(), multiplier: 1.3 }
      expect(getComboMultiplier(combo)).toBe(1.3)
    })
  })

  describe('calculateCriticalChance', () => {
    test('should return base chance with no bonuses', () => {
      const chance = calculateCriticalChance(0.1)
      expect(chance).toBe(0.1)
    })

    test('should add crit chance bonus', () => {
      const chance = calculateCriticalChance(0.1, { critChance: 0.2 })
      expect(chance).toBe(0.3)
    })

    test('should convert crit rating to chance', () => {
      const chance = calculateCriticalChance(0.1, { critRating: 500 }) // 500 rating = 5%
      expect(chance).toBe(0.15)
    })

    test('should cap at 95%', () => {
      const chance = calculateCriticalChance(0.9, { critChance: 0.2 })
      expect(chance).toBe(0.95)
    })

    test('should not go below 0%', () => {
      const chance = calculateCriticalChance(-0.1)
      expect(chance).toBe(0)
    })
  })
})

