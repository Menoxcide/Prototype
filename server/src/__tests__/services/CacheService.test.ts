/**
 * Unit tests for Cache Service
 */

import { cacheService } from '../../services/CacheService'

// Mock Redis service
jest.mock('../../services/RedisService', () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }
}))

describe('Cache Service', () => {
  beforeEach(async () => {
    await cacheService.clear()
  })

  describe('get', () => {
    test('should return null for non-existent key', async () => {
      const value = await cacheService.get('non_existent_key')
      expect(value).toBeNull()
    })

    test('should return cached value', async () => {
      await cacheService.set('test_key', { data: 'test' })
      const value = await cacheService.get('test_key')
      
      expect(value).toEqual({ data: 'test' })
    })

    test('should return null for expired entry', async () => {
      await cacheService.set('test_key', { data: 'test' }, { ttl: 1 })
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const value = await cacheService.get('test_key')
      expect(value).toBeNull()
    })
  })

  describe('set', () => {
    test('should store value in cache', async () => {
      await cacheService.set('test_key', { data: 'test' })
      const value = await cacheService.get('test_key')
      
      expect(value).toEqual({ data: 'test' })
    })

    test('should use custom TTL', async () => {
      await cacheService.set('test_key', { data: 'test' }, { ttl: 10 })
      const value = await cacheService.get('test_key')
      
      expect(value).toEqual({ data: 'test' })
    })

    test('should overwrite existing value', async () => {
      await cacheService.set('test_key', { data: 'old' })
      await cacheService.set('test_key', { data: 'new' })
      
      const value = await cacheService.get('test_key')
      expect(value).toEqual({ data: 'new' })
    })
  })

  describe('delete', () => {
    test('should delete cached value', async () => {
      await cacheService.set('test_key', { data: 'test' })
      await cacheService.delete('test_key')
      
      const value = await cacheService.get('test_key')
      expect(value).toBeNull()
    })

    test('should not throw when deleting non-existent key', async () => {
      await expect(cacheService.delete('non_existent_key')).resolves.not.toThrow()
    })
  })

  describe('invalidateByTags', () => {
    test('should invalidate entries with matching tags', async () => {
      await cacheService.set('key1', { data: 'test1' }, { tags: ['tag1'] })
      await cacheService.set('key2', { data: 'test2' }, { tags: ['tag2'] })
      await cacheService.set('key3', { data: 'test3' }, { tags: ['tag1', 'tag2'] })
      
      await cacheService.invalidateByTags(['tag1'])
      
      expect(await cacheService.get('key1')).toBeNull()
      expect(await cacheService.get('key2')).not.toBeNull()
      expect(await cacheService.get('key3')).toBeNull()
    })
  })

  describe('getStats', () => {
    test('should return cache statistics', () => {
      const stats = cacheService.getStats()
      
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('memoryHits')
      expect(stats).toHaveProperty('redisHits')
      expect(stats).toHaveProperty('hitRate')
      expect(stats).toHaveProperty('memorySize')
    })

    test('should track hits and misses', async () => {
      await cacheService.set('test_key', { data: 'test' })
      await cacheService.get('test_key')
      await cacheService.get('non_existent')
      
      const stats = cacheService.getStats()
      expect(stats.hits).toBeGreaterThan(0)
      expect(stats.misses).toBeGreaterThan(0)
    })
  })
})

