/**
 * Frustum Culling - Determines which objects are visible in camera frustum
 * Reduces rendering overhead by skipping off-screen objects
 * Enhanced with mesh pooling and LOD integration
 */

import * as THREE from 'three'

export interface FrustumCuller {
  isInFrustum(position: { x: number; y: number; z: number }, radius: number, camera: THREE.Camera): boolean
  updateFrustum(camera: THREE.Camera): void
  isInFrustumWithLOD(position: { x: number; y: number; z: number }, radius: number, camera: THREE.Camera, distance: number, renderDistance: number): { visible: boolean; lodLevel: 'high' | 'medium' | 'low' }
  batchCheck(positions: Array<{ position: { x: number; y: number; z: number }; radius: number }>, camera: THREE.Camera): boolean[]
}

// Reusable objects to reduce GC pressure
const tempSphere = new THREE.Sphere()
const tempVector = new THREE.Vector3()
const tempMatrix = new THREE.Matrix4()

export function createFrustumCuller(): FrustumCuller {
  const frustum = new THREE.Frustum()
  let lastUpdateFrame = -1
  let currentFrame = 0

  return {
    updateFrustum(camera: THREE.Camera): void {
      // Only update if camera changed (optimization)
      currentFrame++
      if (currentFrame === lastUpdateFrame) return
      lastUpdateFrame = currentFrame

      tempMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(tempMatrix)
    },

    isInFrustum(position: { x: number; y: number; z: number }, radius: number, camera: THREE.Camera): boolean {
      this.updateFrustum(camera)
      
      // Reuse sphere object to reduce GC
      tempSphere.set(tempVector.set(position.x, position.y, position.z), radius)

      return frustum.intersectsSphere(tempSphere)
    },

    /**
     * Check if entity is in frustum and determine LOD level
     * Integrates frustum culling with LOD system
     */
    isInFrustumWithLOD(
      position: { x: number; y: number; z: number },
      radius: number,
      camera: THREE.Camera,
      distance: number,
      renderDistance: number
    ): { visible: boolean; lodLevel: 'high' | 'medium' | 'low' } {
      // First check if within render distance
      if (distance > renderDistance) {
        return { visible: false, lodLevel: 'low' }
      }

      // Then check frustum
      const visible = this.isInFrustum(position, radius, camera)
      if (!visible) {
        return { visible: false, lodLevel: 'low' }
      }

      // Determine LOD level based on distance
      const ratio = distance / renderDistance
      let lodLevel: 'high' | 'medium' | 'low'
      
      if (ratio < 0.3) {
        lodLevel = 'high'
      } else if (ratio < 0.7) {
        lodLevel = 'medium'
      } else {
        lodLevel = 'low'
      }

      return { visible: true, lodLevel }
    },

    /**
     * Batch check multiple positions for better performance
     * Reduces function call overhead
     */
    batchCheck(
      positions: Array<{ position: { x: number; y: number; z: number }; radius: number }>,
      camera: THREE.Camera
    ): boolean[] {
      this.updateFrustum(camera)
      
      const results: boolean[] = new Array(positions.length)
      
      for (let i = 0; i < positions.length; i++) {
        const { position, radius } = positions[i]
        tempSphere.set(tempVector.set(position.x, position.y, position.z), radius)
        results[i] = frustum.intersectsSphere(tempSphere)
      }

      return results
    }
  }
}

/**
 * Mesh pool for LOD meshes to reduce GC pauses
 * 
 * NOTE: This pool is currently unused but available for future optimization.
 * Use with LODMesh component to reduce memory allocation overhead.
 */
class LODMeshPool {
  private pools: Map<string, THREE.Mesh[]> = new Map()
  private maxPoolSize = 50

  get(type: string, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    if (!this.pools.has(type)) {
      this.pools.set(type, [])
    }

    const pool = this.pools.get(type)!
    
    if (pool.length > 0) {
      const mesh = pool.pop()!
      mesh.geometry = geometry
      mesh.material = material
      mesh.visible = true
      return mesh
    }

    // Create new mesh if pool is empty
    return new THREE.Mesh(geometry, material)
  }

  release(type: string, mesh: THREE.Mesh): void {
    if (!this.pools.has(type)) {
      this.pools.set(type, [])
    }

    const pool = this.pools.get(type)!
    
    if (pool.length < this.maxPoolSize) {
      mesh.visible = false
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
      pool.push(mesh)
    } else {
      // Pool is full, dispose completely
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  }

  clear(): void {
    this.pools.forEach(pool => {
      pool.forEach(mesh => {
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose())
        } else {
          mesh.material.dispose()
        }
      })
      pool.length = 0
    })
    this.pools.clear()
  }
}

export const lodMeshPool = new LODMeshPool()

