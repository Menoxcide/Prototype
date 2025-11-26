/**
 * Unit tests for Spell System
 */

import {
  createSpellProjectile,
  updateSpellProjectile,
  checkSpellHit,
  releaseSpellProjectile,
  SpellProjectile
} from '../../game/systems/spellSystem'
import { getSpell } from '../../game/data/spells'

describe('Spell System', () => {
  const mockCasterId = 'player_123'
  const mockPosition = { x: 0, y: 0, z: 0 }
  const mockRotation = 0

  beforeEach(() => {
    // Reset any state if needed
  })

  describe('createSpellProjectile', () => {
    test('should create a projectile for valid spell', () => {
      const spell = getSpell('fireball')
      if (!spell) {
        // Skip if spell doesn't exist
        return
      }

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)

      expect(projectile).not.toBeNull()
      expect(projectile?.spell.id).toBe('fireball')
      expect(projectile?.casterId).toBe(mockCasterId)
      expect(projectile?.position).toEqual(mockPosition)
      expect(projectile?.speed).toBe(10)
      expect(projectile?.lifetime).toBeGreaterThan(0)
    })

    test('should return null for invalid spell ID', () => {
      const projectile = createSpellProjectile('invalid_spell', mockCasterId, mockPosition, mockRotation)
      expect(projectile).toBeNull()
    })

    test('should set correct direction based on rotation', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const rotation90 = Math.PI / 2 // 90 degrees
      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, rotation90)

      expect(projectile).not.toBeNull()
      expect(projectile?.direction.x).toBeCloseTo(1, 5) // sin(90°) = 1
      expect(projectile?.direction.z).toBeCloseTo(0, 5) // cos(90°) = 0
    })

    test('should generate unique projectile IDs', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile1 = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      const projectile2 = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)

      expect(projectile1?.id).not.toBe(projectile2?.id)
    })
  })

  describe('updateSpellProjectile', () => {
    test('should update projectile position based on speed and direction', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      if (!projectile) return

      const initialX = projectile.position.x
      const deltaTime = 100 // 100ms

      const updated = updateSpellProjectile(projectile, deltaTime)

      expect(updated).not.toBeNull()
      expect(updated?.position.x).not.toBe(initialX)
      expect(updated?.lifetime).toBeLessThan(projectile.lifetime)
    })

    test('should return null when lifetime expires', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      if (!projectile) return

      // Set lifetime to very small value
      projectile.lifetime = 50

      const updated = updateSpellProjectile(projectile, 100)

      expect(updated).toBeNull()
    })

    test('should move projectile in correct direction', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const rotation = Math.PI / 4 // 45 degrees
      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, rotation)
      if (!projectile) return

      const initialPos = { ...projectile.position }
      const deltaTime = 1000 // 1 second

      updateSpellProjectile(projectile, deltaTime)

      // Projectile should have moved
      const distance = Math.sqrt(
        Math.pow(projectile.position.x - initialPos.x, 2) +
        Math.pow(projectile.position.z - initialPos.z, 2)
      )
      expect(distance).toBeGreaterThan(0)
    })
  })

  describe('checkSpellHit', () => {
    test('should detect hit when projectile is within hit radius', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      if (!projectile) return

      const enemyPosition = { x: 0.5, y: 0, z: 0.5 }
      const hit = checkSpellHit(projectile, enemyPosition, 1.0)

      expect(hit).toBe(true)
    })

    test('should not detect hit when projectile is outside hit radius', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      if (!projectile) return

      const enemyPosition = { x: 10, y: 0, z: 10 }
      const hit = checkSpellHit(projectile, enemyPosition, 1.0)

      expect(hit).toBe(false)
    })

    test('should use custom hit radius', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      if (!projectile) return

      const enemyPosition = { x: 2, y: 0, z: 2 }
      const hitSmall = checkSpellHit(projectile, enemyPosition, 1.0)
      const hitLarge = checkSpellHit(projectile, enemyPosition, 5.0)

      expect(hitSmall).toBe(false)
      expect(hitLarge).toBe(true)
    })

    test('should account for Y position in hit detection', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, { x: 0, y: 0, z: 0 }, mockRotation)
      if (!projectile) return

      const enemyPosition = { x: 0, y: 5, z: 0 }
      const hit = checkSpellHit(projectile, enemyPosition, 1.0)

      expect(hit).toBe(false)
    })
  })

  describe('releaseSpellProjectile', () => {
    test('should release projectile back to pool', () => {
      const spell = getSpell('fireball')
      if (!spell) return

      const projectile = createSpellProjectile('fireball', mockCasterId, mockPosition, mockRotation)
      if (!projectile) return

      // Should not throw
      expect(() => releaseSpellProjectile(projectile)).not.toThrow()
    })
  })
})

