/**
 * Unit tests for Status Effect System
 */

import { statusEffectManager } from '../../game/systems/statusEffectSystem'
import { StatusEffect } from '../../../shared/src/types/statusEffects'

describe('Status Effect System', () => {
  beforeEach(() => {
    statusEffectManager.clearEffects('entity1')
  })

  test('should apply status effect', () => {
    const effect: StatusEffect = {
      id: 'effect1',
      type: 'poison',
      duration: 5000,
      startTime: Date.now()
    }

    statusEffectManager.applyEffect('entity1', effect)
    const effects = statusEffectManager.getEffects('entity1')

    expect(effects).toHaveLength(1)
    expect(effects[0].type).toBe('poison')
  })

  test('should stack stackable effects', () => {
    const effect1: StatusEffect = {
      id: 'effect1',
      type: 'poison',
      duration: 5000,
      startTime: Date.now(),
      stacks: 1
    }

    const effect2: StatusEffect = {
      id: 'effect2',
      type: 'poison',
      duration: 5000,
      startTime: Date.now(),
      stacks: 1
    }

    statusEffectManager.applyEffect('entity1', effect1)
    statusEffectManager.applyEffect('entity1', effect2)

    const effects = statusEffectManager.getEffects('entity1')
    const poisonEffect = effects.find(e => e.type === 'poison')
    expect(poisonEffect?.stacks).toBe(2)
  })

  test('should replace non-stackable effects', () => {
    const effect1: StatusEffect = {
      id: 'effect1',
      type: 'freeze',
      duration: 5000,
      startTime: Date.now()
    }

    const effect2: StatusEffect = {
      id: 'effect2',
      type: 'freeze',
      duration: 5000,
      startTime: Date.now()
    }

    statusEffectManager.applyEffect('entity1', effect1)
    statusEffectManager.applyEffect('entity1', effect2)

    const effects = statusEffectManager.getEffects('entity1')
    expect(effects).toHaveLength(1)
    expect(effects[0].id).toBe('effect2')
  })

  test('should remove expired effects', () => {
    const effect: StatusEffect = {
      id: 'effect1',
      type: 'poison',
      duration: 100, // Very short duration
      startTime: Date.now() - 200 // Already expired
    }

    statusEffectManager.applyEffect('entity1', effect)
    const result = statusEffectManager.updateEffects('entity1', 100)

    expect(result.expired).toContain('effect1')
    expect(statusEffectManager.getEffects('entity1')).toHaveLength(0)
  })

  test('should apply damage over time', () => {
    const effect: StatusEffect = {
      id: 'effect1',
      type: 'poison',
      duration: 5000,
      startTime: Date.now(),
      stacks: 2
    }

    statusEffectManager.applyEffect('entity1', effect)
    const result = statusEffectManager.updateEffects('entity1', 1000)

    expect(result.damage).toBeGreaterThan(0)
  })

  test('should apply healing over time', () => {
    const effect: StatusEffect = {
      id: 'effect1',
      type: 'regeneration',
      duration: 5000,
      startTime: Date.now(),
      stacks: 1
    }

    statusEffectManager.applyEffect('entity1', effect)
    const result = statusEffectManager.updateEffects('entity1', 1000)

    expect(result.healing).toBeGreaterThan(0)
  })

  test('should check if entity is immobilized', () => {
    expect(statusEffectManager.isImmobilized('entity1')).toBe(false)

    const freezeEffect: StatusEffect = {
      id: 'effect1',
      type: 'freeze',
      duration: 5000,
      startTime: Date.now()
    }

    statusEffectManager.applyEffect('entity1', freezeEffect)
    expect(statusEffectManager.isImmobilized('entity1')).toBe(true)
  })

  test('should calculate speed multiplier', () => {
    expect(statusEffectManager.getSpeedMultiplier('entity1')).toBe(1)

    const slowEffect: StatusEffect = {
      id: 'effect1',
      type: 'slow',
      duration: 5000,
      startTime: Date.now(),
      stacks: 1
    }

    statusEffectManager.applyEffect('entity1', slowEffect)
    const multiplier = statusEffectManager.getSpeedMultiplier('entity1')
    expect(multiplier).toBeLessThan(1)
  })

  test('should calculate damage multiplier', () => {
    expect(statusEffectManager.getDamageMultiplier('entity1')).toBe(1)

    const vulnerabilityEffect: StatusEffect = {
      id: 'effect1',
      type: 'vulnerability',
      duration: 5000,
      startTime: Date.now(),
      stacks: 2
    }

    statusEffectManager.applyEffect('entity1', vulnerabilityEffect)
    const multiplier = statusEffectManager.getDamageMultiplier('entity1')
    expect(multiplier).toBeGreaterThan(1)
  })
})

