/**
 * Unit tests for ObjectPool utility
 */

import { createObjectPool, ObjectPool } from '../../../shared/src/utils/objectPool'

describe('ObjectPool', () => {
  interface TestObject {
    id: string
    value: number
  }

  let pool: ObjectPool<TestObject>

  beforeEach(() => {
    pool = createObjectPool<TestObject>({
      factory: () => ({ id: '', value: 0 }),
      reset: (obj) => {
        obj.id = ''
        obj.value = 0
      },
      initialSize: 5,
      maxSize: 10
    })
  })

  test('should create pool with initial size', () => {
    const stats = pool.getStats()
    expect(stats.total).toBe(5)
    expect(stats.available).toBe(5)
    expect(stats.active).toBe(0)
  })

  test('should get object from pool', () => {
    const obj = pool.get()
    expect(obj).toBeDefined()
    expect(obj.id).toBe('')
    expect(obj.value).toBe(0)

    const stats = pool.getStats()
    expect(stats.active).toBe(1)
    expect(stats.available).toBe(4)
  })

  test('should release object back to pool', () => {
    const obj = pool.get()
    pool.release(obj)

    const stats = pool.getStats()
    expect(stats.active).toBe(0)
    expect(stats.available).toBe(5)
  })

  test('should reset object on release', () => {
    const obj = pool.get()
    obj.id = 'test'
    obj.value = 100

    pool.release(obj)
    const newObj = pool.get()

    expect(newObj.id).toBe('')
    expect(newObj.value).toBe(0)
  })

  test('should create new object when pool is empty', () => {
    // Exhaust pool
    const objects: TestObject[] = []
    for (let i = 0; i < 10; i++) {
      objects.push(pool.get())
    }

    const stats = pool.getStats()
    expect(stats.total).toBeGreaterThanOrEqual(10)
    expect(stats.active).toBe(10)
  })

  test('should not exceed max size', () => {
    const objects: TestObject[] = []
    for (let i = 0; i < 15; i++) {
      objects.push(pool.get())
    }

    // Release all
    objects.forEach(obj => pool.release(obj))

    const stats = pool.getStats()
    expect(stats.available).toBeLessThanOrEqual(10) // maxSize
  })

  test('should clear pool', () => {
    pool.get()
    pool.clear()

    const stats = pool.getStats()
    expect(stats.total).toBe(0)
    expect(stats.active).toBe(0)
    expect(stats.available).toBe(0)
  })
})

