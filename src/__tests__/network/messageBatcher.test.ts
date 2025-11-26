/**
 * Unit tests for Message Batcher
 */

import { createMessageBatcher } from '../../../shared/src/utils/messageBatcher'

describe('Message Batcher', () => {
  describe('createMessageBatcher', () => {
    test('should create message batcher', () => {
      const batcher = createMessageBatcher()
      expect(batcher).toBeDefined()
    })

    test('should add messages to queue', () => {
      const batcher = createMessageBatcher()
      
      batcher.add({ type: 'move', data: { x: 1, y: 0, z: 1 } })
      batcher.add({ type: 'spellCast', data: { spellId: 'fireball' } })
      
      expect(batcher.getPendingCount()).toBe(2)
    })

    test('should flush messages', () => {
      const batcher = createMessageBatcher()
      
      batcher.add({ type: 'move', data: { x: 1, y: 0, z: 1 } })
      batcher.add({ type: 'spellCast', data: { spellId: 'fireball' } })
      
      const packet = batcher.flush()
      
      expect(packet).not.toBeNull()
      expect(packet?.messages.length).toBe(2)
      expect(batcher.getPendingCount()).toBe(0)
    })

    test('should return null when flushing empty queue', () => {
      const batcher = createMessageBatcher()
      const packet = batcher.flush()
      
      expect(packet).toBeNull()
    })

    test('should prioritize messages', () => {
      const batcher = createMessageBatcher()
      
      batcher.add({ type: 'move', data: {} }, 1) // Low priority
      batcher.add({ type: 'spellCast', data: {} }, 10) // High priority
      batcher.add({ type: 'damage', data: {} }, 5) // Medium priority
      
      const packet = batcher.flush()
      
      expect(packet?.messages[0].type).toBe('spellCast') // Highest priority first
      expect(packet?.messages[1].type).toBe('damage')
      expect(packet?.messages[2].type).toBe('move')
    })

    test('should limit batch size', () => {
      const batcher = createMessageBatcher({ maxBatchSize: 5 })
      
      for (let i = 0; i < 10; i++) {
        batcher.add({ type: 'move', data: { index: i } })
      }
      
      const packet = batcher.flush()
      expect(packet?.messages.length).toBe(5)
      expect(batcher.getPendingCount()).toBe(5)
    })

    test('should set batch interval', () => {
      const batcher = createMessageBatcher()
      
      expect(() => batcher.setBatchInterval(100)).not.toThrow()
    })
  })
})

