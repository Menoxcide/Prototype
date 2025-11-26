/**
 * Unit tests for Interest Manager
 */

import { createInterestManager } from '../utils/interestManager'
import { Entity } from '../types'

describe('Interest Manager', () => {
  let interestManager: ReturnType<typeof createInterestManager>
  const mockEntity: Entity = {
    id: 'entity1',
    position: { x: 10, y: 0, z: 10 },
    type: 'enemy'
  }

  beforeEach(() => {
    interestManager = createInterestManager()
  })

  describe('getRelevantEntities', () => {
    test('should return entities within radius', () => {
      interestManager.updateEntity(mockEntity, mockEntity.position)
      
      const relevant = interestManager.getRelevantEntities(
        'player1',
        { x: 12, y: 0, z: 12 },
        50
      )
      
      expect(relevant.length).toBeGreaterThan(0)
      expect(relevant.some(e => e.id === 'entity1')).toBe(true)
    })

    test('should not return entities outside radius', () => {
      interestManager.updateEntity(mockEntity, mockEntity.position)
      
      const relevant = interestManager.getRelevantEntities(
        'player1',
        { x: 100, y: 0, z: 100 },
        10
      )
      
      expect(relevant.some(e => e.id === 'entity1')).toBe(false)
    })
  })

  describe('shouldSendUpdate', () => {
    test('should return true for relevant entities', () => {
      interestManager.updateEntity(mockEntity, mockEntity.position)
      
      const shouldSend = interestManager.shouldSendUpdate(
        mockEntity,
        'player1',
        { x: 12, y: 0, z: 12 },
        50
      )
      
      expect(shouldSend).toBe(true)
    })

    test('should return false for irrelevant entities', () => {
      interestManager.updateEntity(mockEntity, mockEntity.position)
      
      const shouldSend = interestManager.shouldSendUpdate(
        mockEntity,
        'player1',
        { x: 100, y: 0, z: 100 },
        10
      )
      
      expect(shouldSend).toBe(false)
    })
  })

  describe('updateEntity', () => {
    test('should update entity position', () => {
      interestManager.updateEntity(mockEntity, { x: 5, y: 0, z: 5 })
      
      const relevant = interestManager.getRelevantEntities(
        'player1',
        { x: 6, y: 0, z: 6 },
        10
      )
      
      expect(relevant.some(e => e.id === 'entity1')).toBe(true)
    })
  })

  describe('removeEntity', () => {
    test('should remove entity from interest manager', () => {
      interestManager.updateEntity(mockEntity, mockEntity.position)
      interestManager.removeEntity(mockEntity)
      
      const relevant = interestManager.getRelevantEntities(
        'player1',
        { x: 12, y: 0, z: 12 },
        50
      )
      
      expect(relevant.some(e => e.id === 'entity1')).toBe(false)
    })
  })
})

