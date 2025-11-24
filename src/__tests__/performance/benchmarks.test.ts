/**
 * Performance Benchmarks
 */

import { createObjectPool } from '../../../shared/src/utils/objectPool'
import { createSpatialHashGrid } from '../../../shared/src/utils/spatialHashGrid'

describe('Performance Benchmarks', () => {
  test('ObjectPool performance', () => {
    const pool = createObjectPool({
      factory: () => ({ id: '', value: 0 }),
      reset: (obj) => { obj.id = ''; obj.value = 0; },
      initialSize: 100
    })

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      const obj = pool.get()
      pool.release(obj)
    }
    const end = performance.now()

    const duration = end - start
    console.log(`ObjectPool: 10000 get/release cycles in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(100) // Should be fast
  })

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

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      grid.query({ x: 0, y: 0, z: 0 }, 50)
    }
    const end = performance.now()

    const duration = end - start
    console.log(`SpatialHashGrid: 100 queries on ${entityCount} entities in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(50) // Should be very fast
  })
})

