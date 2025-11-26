/**
 * Object pools for movement system to reduce GC pressure
 * Reuses Vector3, Vector2, and other frequently allocated objects
 */

import * as THREE from 'three'

class Vector3Pool {
  private pool: THREE.Vector3[] = []
  private maxSize = 50

  get(x = 0, y = 0, z = 0): THREE.Vector3 {
    const vec = this.pool.pop() || new THREE.Vector3()
    vec.set(x, y, z)
    return vec
  }

  release(vec: THREE.Vector3): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(vec)
    }
  }

  clear(): void {
    this.pool.length = 0
  }
}

class EulerPool {
  private pool: THREE.Euler[] = []
  private maxSize = 20

  get(x = 0, y = 0, z = 0, order: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY' = 'YXZ'): THREE.Euler {
    const euler = this.pool.pop() || new THREE.Euler()
    euler.set(x, y, z, order)
    return euler
  }

  release(euler: THREE.Euler): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(euler)
    }
  }

  clear(): void {
    this.pool.length = 0
  }
}

// Singleton instances
export const vector3Pool = new Vector3Pool()
export const eulerPool = new EulerPool()

// Helper functions for common operations
export function getVector3(x = 0, y = 0, z = 0): THREE.Vector3 {
  return vector3Pool.get(x, y, z)
}

export function releaseVector3(vec: THREE.Vector3): void {
  vector3Pool.release(vec)
}

export function getEuler(x = 0, y = 0, z = 0, order: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY' = 'YXZ'): THREE.Euler {
  return eulerPool.get(x, y, z, order)
}

export function releaseEuler(euler: THREE.Euler): void {
  eulerPool.release(euler)
}

