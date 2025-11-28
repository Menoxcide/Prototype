/**
 * Spell Projectile Pool - Object pooling for spell projectiles
 * Reduces garbage collection by reusing projectile instances
 */

// Import from shared package - will be available after build
// For now, using inline implementation
import { SpellProjectile } from '../systems/spellSystem'

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

function createProjectile(): SpellProjectile {
  return {
    id: '',
    spell: {
      id: '',
      name: '',
      description: '',
      manaCost: 0,
      cooldown: 0,
      damage: 0,
      range: 0,
      castTime: 0,
      icon: '',
      color: '#ffffff'
    },
    position: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: 0 },
    speed: 0,
    lifetime: 0,
    casterId: ''
  }
}

function resetProjectile(projectile: SpellProjectile): void {
  projectile.id = ''
  projectile.spell = {
    id: '',
    name: '',
    description: '',
    manaCost: 0,
    cooldown: 0,
    damage: 0,
    range: 0,
    castTime: 0,
    icon: '',
    color: '#ffffff'
  }
  projectile.position = { x: 0, y: 0, z: 0 }
  projectile.direction = { x: 0, y: 0, z: 0 }
  projectile.speed = 0
  projectile.lifetime = 0
  projectile.casterId = ''
}

// Pre-allocate larger pools for optimal performance: 100 projectiles
export const projectilePool: ObjectPool<SpellProjectile> = createObjectPool({
  factory: createProjectile,
  reset: resetProjectile,
  initialSize: 100, // Pre-allocate 100 projectiles at startup (increased from 20)
  maxSize: 200 // Increased max size to 200
})

