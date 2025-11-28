/**
 * Material Batching Utility
 * Groups entities by material type for efficient instanced rendering
 */

import * as THREE from 'three'

export interface MaterialGroup {
  material: THREE.Material
  indices: number[]
}

/**
 * Group entities by material type
 */
export function groupByMaterial<T extends { material?: THREE.Material | string }>(
  entities: T[],
  materialMap: Map<string, THREE.Material>
): Map<THREE.Material, T[]> {
  const groups = new Map<THREE.Material, T[]>()
  
  for (const entity of entities) {
    let material: THREE.Material
    
    if (entity.material instanceof THREE.Material) {
      material = entity.material
    } else if (typeof entity.material === 'string') {
      const mappedMaterial = materialMap.get(entity.material)
      material = mappedMaterial || materialMap.values().next().value || new THREE.MeshStandardMaterial()
    } else {
      // Default material
      material = materialMap.values().next().value || new THREE.MeshStandardMaterial()
    }
    
    if (!groups.has(material)) {
      groups.set(material, [])
    }
    groups.get(material)!.push(entity)
  }
  
  return groups
}

/**
 * Create material pool for frequently used materials
 */
class MaterialPool {
  private materials: Map<string, THREE.Material> = new Map()
  private refCounts: Map<string, number> = new Map()
  
  /**
   * Get or create a material
   */
  getMaterial(key: string, factory: () => THREE.Material): THREE.Material {
    if (!this.materials.has(key)) {
      const material = factory()
      this.materials.set(key, material)
      this.refCounts.set(key, 0)
    }
    
    const count = this.refCounts.get(key) || 0
    this.refCounts.set(key, count + 1)
    
    return this.materials.get(key)!
  }
  
  /**
   * Release a material reference
   */
  releaseMaterial(key: string): void {
    const count = this.refCounts.get(key) || 0
    if (count > 0) {
      this.refCounts.set(key, count - 1)
    }
  }
  
  /**
   * Dispose of unused materials
   */
  cleanup(): void {
    for (const [key, count] of this.refCounts.entries()) {
      if (count === 0) {
        const material = this.materials.get(key)
        if (material) {
          material.dispose()
          this.materials.delete(key)
          this.refCounts.delete(key)
        }
      }
    }
  }
  
  /**
   * Get all materials
   */
  getAllMaterials(): Map<string, THREE.Material> {
    return new Map(this.materials)
  }
}

export const materialPool = new MaterialPool()

/**
 * Create batched instanced meshes for entities with different materials
 */
export function createBatchedInstancedMeshes<T extends { position: { x: number; y: number; z: number }; rotation?: number }>(
  _entities: T[],
  geometry: THREE.BufferGeometry,
  materialGroups: Map<THREE.Material, T[]>,
  getMatrix: (entity: T) => THREE.Matrix4,
  getColor?: (entity: T) => THREE.Color
): THREE.InstancedMesh[] {
  const meshes: THREE.InstancedMesh[] = []
  
  for (const [material, group] of materialGroups.entries()) {
    if (group.length === 0) continue
    
    const mesh = new THREE.InstancedMesh(geometry, material, group.length)
    
    group.forEach((entity, index) => {
      const matrix = getMatrix(entity)
      mesh.setMatrixAt(index, matrix)
      
      if (getColor && mesh.instanceColor) {
        const color = getColor(entity)
        mesh.setColorAt(index, color)
      }
    })
    
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
    
    meshes.push(mesh)
  }
  
  return meshes
}

