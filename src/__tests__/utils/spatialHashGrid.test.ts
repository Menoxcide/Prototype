/**
 * Unit tests for SpatialHashGrid utility
 */

import { createSpatialHashGrid, SpatialHashGrid } from '../../../shared/src/utils/spatialHashGrid'

describe('SpatialHashGrid', () => {
  interface TestEntity {
    id: string
    position: { x: number; y: number; z: number }
  }

  let grid: SpatialHashGrid<TestEntity>

  beforeEach(() => {
    grid = createSpatialHashGrid<TestEntity>({ cellSize: 10 })
  })

  test('should insert entity', () => {
    const entity: TestEntity = {
      id: '1',
      position: { x: 5, y: 0, z: 5 }
    }

    grid.insert(entity, entity.position)
    const results = grid.query({ x: 0, y: 0, z: 0 }, 10)

    expect(results).toContain(entity)
  })

  test('should remove entity', () => {
    const entity: TestEntity = {
      id: '1',
      position: { x: 5, y: 0, z: 5 }
    }

    grid.insert(entity, entity.position)
    grid.remove(entity)
    const results = grid.query({ x: 0, y: 0, z: 0 }, 10)

    expect(results).not.toContain(entity)
  })

  test('should query entities in range', () => {
    const entities: TestEntity[] = [
      { id: '1', position: { x: 5, y: 0, z: 5 } },
      { id: '2', position: { x: 15, y: 0, z: 15 } },
      { id: '3', position: { x: 7, y: 0, z: 7 } }
    ]

    entities.forEach(e => grid.insert(e, e.position))

    const results = grid.query({ x: 0, y: 0, z: 0 }, 10)

    expect(results).toContain(entities[0])
    expect(results).toContain(entities[2])
    expect(results).not.toContain(entities[1])
  })

  test('should update entity position', () => {
    const entity: TestEntity = {
      id: '1',
      position: { x: 5, y: 0, z: 5 }
    }

    grid.insert(entity, entity.position)
    entity.position = { x: 15, y: 0, z: 15 }
    grid.insert(entity, entity.position)

    const oldResults = grid.query({ x: 0, y: 0, z: 0 }, 10)
    const newResults = grid.query({ x: 15, y: 0, z: 15 }, 10)

    expect(oldResults).not.toContain(entity)
    expect(newResults).toContain(entity)
  })

  test('should clear grid', () => {
    const entity: TestEntity = {
      id: '1',
      position: { x: 5, y: 0, z: 5 }
    }

    grid.insert(entity, entity.position)
    grid.clear()

    const results = grid.query({ x: 0, y: 0, z: 0 }, 10)
    expect(results).toHaveLength(0)
  })
})

