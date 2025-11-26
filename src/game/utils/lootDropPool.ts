/**
 * Loot Drop Pool - Object pooling for loot drops
 * Reduces garbage collection by reusing loot drop instances
 */

import { LootDrop } from '../types'
import { getItem } from '../data/items'

interface ObjectPool<T> {
  get(): T
  release(obj: T): void
  clear(): void
  getStats(): { total: number; active: number; available: number }
}

function createObjectPool<T>(options: {
  factory: () => T
  reset?: (obj: T) => void
  initialSize?: number
  maxSize?: number
}): ObjectPool<T> {
  const { factory, reset, initialSize = 10, maxSize = 100 } = options
  const pool: T[] = []
  const active = new Set<T>()

  for (let i = 0; i < initialSize; i++) {
    pool.push(factory())
  }

  return {
    get(): T {
      let obj: T
      if (pool.length > 0) {
        obj = pool.pop()!
      } else {
        obj = factory()
      }
      active.add(obj)
      return obj
    },
    release(obj: T): void {
      if (!active.has(obj)) return
      active.delete(obj)
      if (reset) reset(obj)
      if (pool.length < maxSize) pool.push(obj)
    },
    clear(): void {
      pool.length = 0
      active.clear()
    },
    getStats(): { total: number; active: number; available: number } {
      return {
        total: pool.length + active.size,
        active: active.size,
        available: pool.length
      }
    }
  }
}

function createLootDrop(): LootDrop {
  const defaultItem = getItem('cyber_scrap')
  return {
    id: '',
    item: defaultItem || {
      id: 'cyber_scrap',
      name: 'Cyber Scrap',
      description: 'Basic crafting material',
      type: 'material',
      rarity: 'common',
      stackable: true,
      maxStack: 999,
      icon: '',
      value: 1
    },
    position: { x: 0, y: 0, z: 0 },
    expiresAt: 0,
    ownerId: undefined
  }
}

function resetLootDrop(loot: LootDrop): void {
  const defaultItem = getItem('cyber_scrap')
  loot.id = ''
  loot.item = defaultItem || {
    id: 'cyber_scrap',
    name: 'Cyber Scrap',
    description: 'Basic crafting material',
    type: 'material',
    rarity: 'common',
    stackable: true,
    maxStack: 999,
    icon: '',
    value: 1
  }
  loot.position = { x: 0, y: 0, z: 0 }
  loot.expiresAt = 0
  loot.ownerId = undefined
}

export const lootDropPool: ObjectPool<LootDrop> = createObjectPool({
  factory: createLootDrop,
  reset: resetLootDrop,
  initialSize: 20,
  maxSize: 100
})

