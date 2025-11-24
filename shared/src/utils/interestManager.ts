/**
 * InterestManager - Determines which entities are relevant to each player
 * Reduces network bandwidth by filtering updates based on distance and relevance
 */

import { Vector3, Entity } from '../types'
import { distance } from './vector3'
import { SpatialHashGrid, createSpatialHashGrid } from './spatialHashGrid'

export interface InterestManager {
  getRelevantEntities(playerId: string, position: Vector3, radius: number): Entity[]
  shouldSendUpdate(entity: Entity, playerId: string, position: Vector3, radius: number): boolean
  updateEntity(entity: Entity, position: Vector3): void
  removeEntity(entity: Entity): void
}

export interface InterestManagerOptions {
  cellSize?: number
  defaultRadius?: number
}

/**
 * Creates a new InterestManager instance
 */
export function createInterestManager<T extends Entity>(
  options: InterestManagerOptions = {}
): InterestManager {
  const { cellSize = 10, defaultRadius = 50 } = options
  const spatialGrid = createSpatialHashGrid<T>({ cellSize })

  return {
    getRelevantEntities(playerId: string, position: Vector3, radius: number = defaultRadius): Entity[] {
      return spatialGrid.query(position, radius)
    },

    shouldSendUpdate(entity: Entity, playerId: string, position: Vector3, radius: number = defaultRadius): boolean {
      const relevant = this.getRelevantEntities(playerId, position, radius)
      return relevant.some(e => e.id === entity.id)
    },

    updateEntity(entity: Entity, position: Vector3): void {
      spatialGrid.insert(entity as T, position)
    },

    removeEntity(entity: Entity): void {
      spatialGrid.remove(entity as T)
    }
  }
}

