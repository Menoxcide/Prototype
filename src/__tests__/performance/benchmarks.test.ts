/**
 * Performance Benchmarks
 * Tests performance of critical systems to prevent regressions
 */

import { createObjectPool } from '../../../shared/src/utils/objectPool'
import { createSpatialHashGrid } from '../../../shared/src/utils/spatialHashGrid'
import { useGameStore } from '../../game/store/gameStore'
import { calculateDamage } from '../../game/systems/combatSystem'
import { Spell } from '../../game/types'

describe('Performance Benchmarks', () => {
  describe('Object Pooling', () => {
    test('ObjectPool get/release performance', () => {
      const pool = createObjectPool({
        factory: () => ({ id: '', value: 0 }),
        reset: (obj) => { obj.id = ''; obj.value = 0; },
        initialSize: 100
      })

      const iterations = 10000
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        const obj = pool.get()
        pool.release(obj)
      }
      const end = performance.now()

      const duration = end - start
      const opsPerMs = iterations / duration
      console.log(`ObjectPool: ${iterations} get/release cycles in ${duration.toFixed(2)}ms (${opsPerMs.toFixed(2)} ops/ms)`)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    test('ObjectPool memory efficiency', () => {
      const pool = createObjectPool({
        factory: () => ({ id: '', value: 0 }),
        reset: (obj) => { obj.id = ''; obj.value = 0; },
        initialSize: 10,
        maxSize: 100
      })

      // Allocate many objects
      const objects: Array<{ id: string; value: number }> = []
      for (let i = 0; i < 1000; i++) {
        objects.push(pool.get())
      }

      // Release all
      objects.forEach(obj => pool.release(obj))

      // Verify pool stats
      const stats = pool.getStats()
      expect(stats.available).toBeLessThanOrEqual(100) // Should respect max size
      expect(stats.active).toBe(0) // All should be released
    })
  })

  describe('Spatial Hash Grid', () => {
    test('SpatialHashGrid query performance', () => {
      const grid = createSpatialHashGrid({ cellSize: 10 })
      const entityCount = 1000

      // Insert entities
      for (let i = 0; i < entityCount; i++) {
        grid.insert(
          { id: `entity_${i}`, position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 } },
          { x: Math.random() * 100, y: 0, z: Math.random() * 100 }
        )
      }

      const queryCount = 100
      const start = performance.now()
      for (let i = 0; i < queryCount; i++) {
        grid.query({ x: 0, y: 0, z: 0 }, 50)
      }
      const end = performance.now()

      const duration = end - start
      const queriesPerMs = queryCount / duration
      console.log(`SpatialHashGrid: ${queryCount} queries on ${entityCount} entities in ${duration.toFixed(2)}ms (${queriesPerMs.toFixed(2)} queries/ms)`)
      expect(duration).toBeLessThan(50) // Should be very fast
    })

    test('SpatialHashGrid insertion performance', () => {
      const grid = createSpatialHashGrid({ cellSize: 10 })
      const entityCount = 1000

      const start = performance.now()
      for (let i = 0; i < entityCount; i++) {
        grid.insert(
          { id: `entity_${i}`, position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 } },
          { x: Math.random() * 100, y: 0, z: Math.random() * 100 }
        )
      }
      const end = performance.now()

      const duration = end - start
      const insertsPerMs = entityCount / duration
      console.log(`SpatialHashGrid: ${entityCount} insertions in ${duration.toFixed(2)}ms (${insertsPerMs.toFixed(2)} inserts/ms)`)
      expect(duration).toBeLessThan(100) // Should be fast
    })
  })

  describe('State Management', () => {
    test('GameStore update performance', () => {
      const { setPlayer, updatePlayerPosition } = useGameStore.getState()
      
      // Setup player
      setPlayer({
        id: 'player-1',
        name: 'TestPlayer',
        race: 'human',
        level: 1,
        xp: 0,
        xpToNext: 100,
        credits: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        inventory: [],
        equippedSpells: []
      })

      const updateCount = 1000
      const start = performance.now()
      for (let i = 0; i < updateCount; i++) {
        updatePlayerPosition({ x: i, y: 0, z: i })
      }
      const end = performance.now()

      const duration = end - start
      const updatesPerMs = updateCount / duration
      console.log(`GameStore: ${updateCount} position updates in ${duration.toFixed(2)}ms (${updatesPerMs.toFixed(2)} updates/ms)`)
      expect(duration).toBeLessThan(200) // Should be fast
    })
  })

  describe('Combat System', () => {
    test('Damage calculation performance', () => {
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

      const calculationCount = 10000
      const start = performance.now()
      for (let i = 0; i < calculationCount; i++) {
        calculateDamage(mockSpell, 50, 1)
      }
      const end = performance.now()

      const duration = end - start
      const calcsPerMs = calculationCount / duration
      console.log(`Combat: ${calculationCount} damage calculations in ${duration.toFixed(2)}ms (${calcsPerMs.toFixed(2)} calcs/ms)`)
      expect(duration).toBeLessThan(100) // Should be very fast
    })
  })

  describe('Rendering Performance', () => {
    test('Entity map operations performance', () => {
      const { addEnemy, removeEnemy } = useGameStore.getState()
      
      const entityCount = 100
      const start = performance.now()
      
      // Add entities
      for (let i = 0; i < entityCount; i++) {
        addEnemy({
          id: `enemy-${i}`,
          type: 'cyber_drone',
          position: { x: i, y: 0, z: i },
          rotation: 0,
          health: 100,
          maxHealth: 100,
          level: 1
        })
      }
      
      // Remove entities
      for (let i = 0; i < entityCount; i++) {
        removeEnemy(`enemy-${i}`)
      }
      
      const end = performance.now()
      const duration = end - start
      const opsPerMs = (entityCount * 2) / duration
      console.log(`Entity Map: ${entityCount} add/remove operations in ${duration.toFixed(2)}ms (${opsPerMs.toFixed(2)} ops/ms)`)
      expect(duration).toBeLessThan(50) // Should be fast
    })
  })
})

