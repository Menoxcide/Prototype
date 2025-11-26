/**
 * Unit tests for LOD Manager
 */

import { createLODManager } from '../utils/lodManager'
import { LODConfig } from '../types'

describe('LOD Manager', () => {
  let lodManager: ReturnType<typeof createLODManager>
  const defaultConfig: LODConfig = {
    levels: [
      { level: 0, distance: 0 },      // High detail
      { level: 1, distance: 20 },     // Medium detail
      { level: 2, distance: 50 }     // Low detail
    ]
  }

  beforeEach(() => {
    lodManager = createLODManager({ defaultConfig })
  })

  describe('getLODLevel', () => {
    test('should return high detail for close entities', () => {
      const cameraPos = { x: 0, y: 0, z: 0 }
      const entityPos = { x: 5, y: 0, z: 5 }
      
      const lodLevel = lodManager.getLODLevel(entityPos, cameraPos, defaultConfig)
      expect(lodLevel).toBe(0) // High detail
    })

    test('should return medium detail for medium distance', () => {
      const cameraPos = { x: 0, y: 0, z: 0 }
      const entityPos = { x: 30, y: 0, z: 30 }
      
      const lodLevel = lodManager.getLODLevel(entityPos, cameraPos, defaultConfig)
      expect(lodLevel).toBe(1) // Medium detail
    })

    test('should return low detail for far entities', () => {
      const cameraPos = { x: 0, y: 0, z: 0 }
      const entityPos = { x: 60, y: 0, z: 60 }
      
      const lodLevel = lodManager.getLODLevel(entityPos, cameraPos, defaultConfig)
      expect(lodLevel).toBe(2) // Low detail
    })
  })

  describe('update', () => {
    test('should update LOD levels for entities', () => {
      const cameraPos = { x: 0, y: 0, z: 0 }
      const entities = [
        { id: 'entity1', position: { x: 5, y: 0, z: 5 } },
        { id: 'entity2', position: { x: 30, y: 0, z: 30 } },
        { id: 'entity3', position: { x: 60, y: 0, z: 60 } }
      ]
      
      const lods = lodManager.update(cameraPos, entities, defaultConfig)
      
      expect(lods.get('entity1')).toBe(0) // High detail
      expect(lods.get('entity2')).toBe(1) // Medium detail
      expect(lods.get('entity3')).toBe(2) // Low detail
    })
  })

  describe('setLODLevel', () => {
    test('should set LOD level for entity', () => {
      lodManager.setLODLevel('entity1', 2)
      
      const cameraPos = { x: 0, y: 0, z: 0 }
      const entities = [{ id: 'entity1', position: { x: 5, y: 0, z: 5 } }]
      const lods = lodManager.update(cameraPos, entities, defaultConfig)
      
      // Should use set level if already set, or calculate if not
      expect(lods.has('entity1')).toBe(true)
    })
  })
})

