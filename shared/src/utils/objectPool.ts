/**
 * ObjectPool<T> - Generic object pool for performance optimization
 * 
 * Reduces garbage collection by reusing object instances instead of creating
 * and destroying them repeatedly. This is especially important for frequently
 * created/destroyed objects like projectiles, particles, and damage numbers.
 * 
 * @template T - The type of objects to pool
 * 
 * @example
 * ```typescript
 * const pool = createObjectPool({
 *   factory: () => ({ x: 0, y: 0 }),
 *   reset: (obj) => { obj.x = 0; obj.y = 0; },
 *   initialSize: 10,
 *   maxSize: 100
 * })
 * 
 * const obj = pool.get()
 * // Use obj...
 * pool.release(obj)
 * ```
 */

export interface ObjectPool<T> {
  get(): T
  release(obj: T): void
  clear(): void
  getStats(): { total: number; active: number; available: number }
}

export interface ObjectPoolOptions<T> {
  factory: () => T
  reset?: (obj: T) => void
  initialSize?: number
  maxSize?: number
}

/**
 * Creates a new ObjectPool instance
 */
export function createObjectPool<T>(options: ObjectPoolOptions<T>): ObjectPool<T> {
  const { factory, reset, initialSize = 10, maxSize = 100 } = options
  const pool: T[] = []
  const active = new Set<T>()

  // Pre-populate pool
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
      if (!active.has(obj)) {
        return // Already released or not from this pool
      }
      active.delete(obj)
      
      if (reset) {
        reset(obj)
      }
      
      if (pool.length < maxSize) {
        pool.push(obj)
      }
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

