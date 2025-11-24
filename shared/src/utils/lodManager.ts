/**
 * LODManager - Manages level-of-detail for 3D objects based on distance
 * Optimizes rendering performance by switching between detail levels
 */

import { Vector3, LODConfig, LODLevel } from '../types'
import { distance } from './vector3'

export interface LODManager {
  update(cameraPosition: Vector3, entities: Array<{ position: Vector3; id: string }>): Map<string, number>
  getLODLevel(entityPosition: Vector3, cameraPosition: Vector3, config: LODConfig): number
  setLODLevel(entityId: string, level: number): void
}

export interface LODManagerOptions {
  defaultConfig?: LODConfig
}

/**
 * Creates a new LODManager instance
 */
export function createLODManager(options: LODManagerOptions = {}): LODManager {
  const entityLODs = new Map<string, number>()
  const { defaultConfig } = options

  return {
    update(cameraPosition: Vector3, entities: Array<{ position: Vector3; id: string }>, config?: LODConfig): Map<string, number> {
      const lodConfig = config || defaultConfig
      if (!lodConfig) {
        return entityLODs
      }

      for (const entity of entities) {
        const dist = distance(cameraPosition, entity.position)
        const lodLevel = this.getLODLevel(entity.position, cameraPosition, lodConfig)
        entityLODs.set(entity.id, lodLevel)
      }

      return entityLODs
    },

    getLODLevel(entityPosition: Vector3, cameraPosition: Vector3, config: LODConfig): number {
      const dist = distance(cameraPosition, entityPosition)
      
      // Find appropriate LOD level based on distance
      for (let i = config.levels.length - 1; i >= 0; i--) {
        const level = config.levels[i]
        if (dist >= level.distance) {
          return level.level
        }
      }

      // Return highest detail level if closer than all thresholds
      return config.levels[0]?.level || 0
    },

    setLODLevel(entityId: string, level: number): void {
      entityLODs.set(entityId, level)
    }
  }
}

