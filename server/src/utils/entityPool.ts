/**
 * Entity Pool for Server-Side Object Pooling
 * Reduces GC pressure by reusing entity instances
 */

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

// Enemy pool
interface EnemyEntity {
  id: string
  type: string
  level: number
  health: number
  maxHealth: number
  position: { x: number; y: number; z: number }
  rotation: number
  speed: number
  damage: number
  xpReward: number
  creditsReward: number
}

function createEnemyEntity(): EnemyEntity {
  return {
    id: '',
    type: 'basic',
    level: 1,
    health: 100,
    maxHealth: 100,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    speed: 1,
    damage: 10,
    xpReward: 10,
    creditsReward: 5
  }
}

function resetEnemyEntity(enemy: EnemyEntity): void {
  enemy.id = ''
  enemy.type = 'basic'
  enemy.level = 1
  enemy.health = 100
  enemy.maxHealth = 100
  enemy.position = { x: 0, y: 0, z: 0 }
  enemy.rotation = 0
  enemy.speed = 1
  enemy.damage = 10
  enemy.xpReward = 10
  enemy.creditsReward = 5
}

export const enemyPool: ObjectPool<EnemyEntity> = createObjectPool({
  factory: createEnemyEntity,
  reset: resetEnemyEntity,
  initialSize: 30,
  maxSize: 150
})

// Projectile pool
interface ProjectileEntity {
  id: string
  spellId: string
  casterId: string
  x: number
  y: number
  z: number
  directionX: number
  directionY: number
  directionZ: number
  speed: number
  lifetime: number
  damage: number
}

function createProjectileEntity(): ProjectileEntity {
  return {
    id: '',
    spellId: '',
    casterId: '',
    x: 0,
    y: 0,
    z: 0,
    directionX: 0,
    directionY: 0,
    directionZ: 0,
    speed: 0,
    lifetime: 0,
    damage: 0
  }
}

function resetProjectileEntity(proj: ProjectileEntity): void {
  proj.id = ''
  proj.spellId = ''
  proj.casterId = ''
  proj.x = 0
  proj.y = 0
  proj.z = 0
  proj.directionX = 0
  proj.directionY = 0
  proj.directionZ = 0
  proj.speed = 0
  proj.lifetime = 0
  proj.damage = 0
}

export const projectilePool: ObjectPool<ProjectileEntity> = createObjectPool({
  factory: createProjectileEntity,
  reset: resetProjectileEntity,
  initialSize: 50,
  maxSize: 200
})

// Loot drop pool
interface LootDropEntity {
  id: string
  itemId: string
  x: number
  y: number
  z: number
  ownerId?: string
  expiresAt: number
}

function createLootDropEntity(): LootDropEntity {
  return {
    id: '',
    itemId: '',
    x: 0,
    y: 0,
    z: 0,
    ownerId: undefined,
    expiresAt: 0
  }
}

function resetLootDropEntity(loot: LootDropEntity): void {
  loot.id = ''
  loot.itemId = ''
  loot.x = 0
  loot.y = 0
  loot.z = 0
  loot.ownerId = undefined
  loot.expiresAt = 0
}

export const lootDropPool: ObjectPool<LootDropEntity> = createObjectPool({
  factory: createLootDropEntity,
  reset: resetLootDropEntity,
  initialSize: 20,
  maxSize: 100
})

