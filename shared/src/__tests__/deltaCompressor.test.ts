/**
 * Unit tests for Delta Compressor
 */

import { createDeltaCompressor } from '../utils/deltaCompressor'

describe('Delta Compressor', () => {
  let compressor: ReturnType<typeof createDeltaCompressor>

  beforeEach(() => {
    compressor = createDeltaCompressor()
  })

  describe('compress', () => {
    test('should return empty array for identical objects', () => {
      const obj = { x: 1, y: 2, z: 3 }
      const deltas = compressor.compress(obj, obj)
      
      expect(deltas.length).toBe(0)
    })

    test('should detect changed values', () => {
      const previous = { x: 1, y: 2, z: 3 }
      const current = { x: 1, y: 5, z: 3 }
      const deltas = compressor.compress(current, previous)
      
      expect(deltas.length).toBeGreaterThan(0)
      expect(deltas.some(d => d.path === 'y' && d.value === 5)).toBe(true)
    })

    test('should detect added properties', () => {
      const previous = { x: 1 }
      const current = { x: 1, y: 2 }
      const deltas = compressor.compress(current, previous)
      
      expect(deltas.some(d => d.path === 'y' && d.value === 2)).toBe(true)
    })

    test('should detect removed properties', () => {
      const previous = { x: 1, y: 2 }
      const current = { x: 1 }
      const deltas = compressor.compress(current, previous)
      
      expect(deltas.some(d => d.path === 'y' && d.operation === 'delete')).toBe(true)
    })

    test('should handle nested objects', () => {
      const previous = { player: { x: 1, y: 2 } }
      const current = { player: { x: 1, y: 5 } }
      const deltas = compressor.compress(current, previous)
      
      expect(deltas.some(d => d.path === 'player.y' && d.value === 5)).toBe(true)
    })

    test('should handle arrays', () => {
      const previous = { items: [1, 2, 3] }
      const current = { items: [1, 2, 4] }
      const deltas = compressor.compress(current, previous)
      
      expect(deltas.length).toBeGreaterThan(0)
    })
  })

  describe('decompress', () => {
    test('should apply deltas to base object', () => {
      const base = { x: 1, y: 2, z: 3 }
      const deltas = [
        { path: 'y', value: 5, operation: 'set' as const }
      ]
      
      const result = compressor.decompress(base, deltas)
      
      expect(result.y).toBe(5)
      expect(result.x).toBe(1)
      expect(result.z).toBe(3)
    })

    test('should handle nested deltas', () => {
      const base = { player: { x: 1, y: 2 } }
      const deltas = [
        { path: 'player.y', value: 5, operation: 'set' as const }
      ]
      
      const result = compressor.decompress(base, deltas)
      
      expect(result.player.y).toBe(5)
      expect(result.player.x).toBe(1)
    })

    test('should handle delete operations', () => {
      const base = { x: 1, y: 2, z: 3 }
      const deltas = [
        { path: 'y', value: null, operation: 'delete' as const }
      ]
      
      const result = compressor.decompress(base, deltas)
      
      expect(result.y).toBeUndefined()
      expect(result.x).toBe(1)
    })

    test('should create new object if base is null', () => {
      const deltas = [
        { path: 'x', value: 1, operation: 'set' as const }
      ]
      
      const result = compressor.decompress(null, deltas)
      
      expect(result.x).toBe(1)
    })
  })

  describe('round-trip', () => {
    test('should compress and decompress correctly', () => {
      const previous = { x: 1, y: 2, z: 3 }
      const current = { x: 1, y: 5, z: 3, w: 4 }
      
      const deltas = compressor.compress(current, previous)
      const result = compressor.decompress(previous, deltas)
      
      expect(result.x).toBe(current.x)
      expect(result.y).toBe(current.y)
      expect(result.z).toBe(current.z)
      expect(result.w).toBe(current.w)
    })
  })
})

