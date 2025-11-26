/**
 * Enemy Pool - Object pooling for enemies
 * Reduces garbage collection by reusing enemy instances
 */

import { Enemy } from '../types'

interface ObjectPool<T> {
  get(): T
  release(obj: T): void
  clear(): void
  getStats(): { total: number; active: number; available: number }
}

function createObjectPool<T>(options: {
  factory: () => T
  reset?: (obj: T) => void
  initialSize?: number
  maxSize?: number
}): ObjectPool<T> {
  const { factory, reset, initialSize = 10, maxSize = 100 } = options
  const pool: T[] = []
  const active = new Set<T>()

  for (let i = 0; i < initialSize; i++) {
    pool.push(factory())
  }

  return {
    get(): T {
      let obj: T
      if (pool.length > 0) {
        obj = pool.pop()!
      } else {
        obj = factory()
      }
      active.add(obj)
      return obj
    },
    release(obj: T): void {
      if (!active.has(obj)) return
      active.delete(obj)
      if (reset) reset(obj)
      if (pool.length < maxSize) pool.push(obj)
    },
    clear(): void {
      pool.length = 0
      active.clear()
    },
    getStats(): { total: number; active: number; available: number } {
      return {
        total: pool.length + active.size,
        active: active.size,
        available: pool.length
      }
    }
  }
}

function createEnemy(): Enemy {
  return {
    id: '',
    type: 'basic',
    level: 1,
    health: 100,
    maxHealth: 100,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    // Note: speed, damage, xpReward, creditsReward are not part of Enemy type
    // These would be looked up from enemy data based on type
  }
}

function resetEnemy(enemy: Enemy): void {
  enemy.id = ''
  enemy.type = 'basic'
  enemy.level = 1
  enemy.health = 100
  enemy.maxHealth = 100
  enemy.position = { x: 0, y: 0, z: 0 }
  enemy.rotation = 0
  // Note: speed, damage, xpReward, creditsReward are not part of Enemy type
  // These would be looked up from enemy data based on type
}

export const enemyPool: ObjectPool<Enemy> = createObjectPool({
  factory: createEnemy,
  reset: resetEnemy,
  initialSize: 30,
  maxSize: 150
})

