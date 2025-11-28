/**
 * Particle Pool - Object pooling for particle effects
 * Reduces garbage collection by reusing particle instances
 */

interface Particle {
  id: string
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  color: string
  size: number
  lifetime: number
  age: number
  opacity: number
}

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

function createParticle(): Particle {
  return {
    id: '',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: '#ffffff',
    size: 1,
    lifetime: 1,
    age: 0,
    opacity: 1
  }
}

function resetParticle(particle: Particle): void {
  particle.id = ''
  particle.position = { x: 0, y: 0, z: 0 }
  particle.velocity = { x: 0, y: 0, z: 0 }
  particle.color = '#ffffff'
  particle.size = 1
  particle.lifetime = 1
  particle.age = 0
  particle.opacity = 1
}

// Pre-allocate larger pools for optimal performance: 500 particles
export const particlePool: ObjectPool<Particle> = createObjectPool({
  factory: createParticle,
  reset: resetParticle,
  initialSize: 500, // Pre-allocate 500 particles at startup (increased from 50)
  maxSize: 1000 // Increased max size to 1000
})

