/**
 * SpatialHashGrid<T> - 3D spatial partitioning for efficient spatial queries
 * Optimizes collision detection and interest management
 */

import { Vector3, Entity } from '../types'
import { distanceSquared } from './vector3'

export interface SpatialHashGrid<T extends Entity> {
  insert(entity: T, position: Vector3): void
  remove(entity: T): void
  query(position: Vector3, radius: number): T[]
  clear(): void
  getStats(): { cellCount: number; entityCount: number }
}

export interface SpatialHashGridOptions {
  cellSize: number
  worldSize?: { min: Vector3; max: Vector3 }
}

/**
 * Creates a new SpatialHashGrid instance
 */
export function createSpatialHashGrid<T extends Entity>(
  options: SpatialHashGridOptions
): SpatialHashGrid<T> {
  const { cellSize } = options
  const cells = new Map<string, Set<T>>()
  const entityToCells = new Map<T, Set<string>>()

  function getCellKey(position: Vector3): string {
    const x = Math.floor(position.x / cellSize)
    const y = Math.floor(position.y / cellSize)
    const z = Math.floor(position.z / cellSize)
    return `${x},${y},${z}`
  }

  function getCellsInRadius(position: Vector3, radius: number): string[] {
    const keys: string[] = []
    const minX = Math.floor((position.x - radius) / cellSize)
    const maxX = Math.floor((position.x + radius) / cellSize)
    const minY = Math.floor((position.y - radius) / cellSize)
    const maxY = Math.floor((position.y + radius) / cellSize)
    const minZ = Math.floor((position.z - radius) / cellSize)
    const maxZ = Math.floor((position.z + radius) / cellSize)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          keys.push(`${x},${y},${z}`)
        }
      }
    }
    return keys
  }

  return {
    insert(entity: T, position: Vector3): void {
      // Remove from old cells first
      this.remove(entity)

      const key = getCellKey(position)
      if (!cells.has(key)) {
        cells.set(key, new Set())
      }
      cells.get(key)!.add(entity)

      if (!entityToCells.has(entity)) {
        entityToCells.set(entity, new Set())
      }
      entityToCells.get(entity)!.add(key)
    },

    remove(entity: T): void {
      const cellKeys = entityToCells.get(entity)
      if (!cellKeys) return

      for (const key of cellKeys) {
        const cell = cells.get(key)
        if (cell) {
          cell.delete(entity)
          if (cell.size === 0) {
            cells.delete(key)
          }
        }
      }
      entityToCells.delete(entity)
    },

    query(position: Vector3, radius: number): T[] {
      const results: T[] = []
      const radiusSquared = radius * radius
      const cellKeys = getCellsInRadius(position, radius)
      const seen = new Set<T>()

      for (const key of cellKeys) {
        const cell = cells.get(key)
        if (!cell) continue

        for (const entity of cell) {
          if (seen.has(entity)) continue
          seen.add(entity)

          const distSq = distanceSquared(position, entity.position)
          if (distSq <= radiusSquared) {
            results.push(entity)
          }
        }
      }

      return results
    },

    clear(): void {
      cells.clear()
      entityToCells.clear()
    },

    getStats(): { cellCount: number; entityCount: number } {
      return {
        cellCount: cells.size,
        entityCount: entityToCells.size
      }
    }
  }
}

