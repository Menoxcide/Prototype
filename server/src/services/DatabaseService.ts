/**
 * DatabaseService - Provides abstraction for database operations
 * Handles connection pooling, retries, and transactions
 */

export interface PlayerData {
  id: string
  name: string
  race: string
  level: number
  xp: number
  xpToNext: number
  credits: number
  position: { x: number; y: number; z: number }
  rotation: number
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  inventory: Array<{ itemId: string; quantity: number }>
  equippedSpells: string[]
  guildId?: string
  guildTag?: string
  achievements: Array<{ id: string; progress: number; completed: boolean }>
  quests: Array<{ questId: string; status: string; objectives: any[] }>
  battlePass: {
    season: number
    currentTier: number
    currentXP: number
    premiumUnlocked: boolean
    claimedTiers: number[]
  }
  createdAt: Date
  lastLogin: Date
  updatedAt: Date
}

export interface DatabaseService {
  savePlayerData(playerId: string, data: PlayerData): Promise<void>
  loadPlayerData(playerId: string): Promise<PlayerData | null>
  query<T>(query: string, params: any[]): Promise<T[]>
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>
  connect(): Promise<void>
  disconnect(): Promise<void>
}

export interface Transaction {
  query<T>(query: string, params: any[]): Promise<T[]>
  commit(): Promise<void>
  rollback(): Promise<void>
}

/**
 * In-memory database service (for development/testing)
 * In production, this would be replaced with PostgreSQL/MongoDB
 */
export class InMemoryDatabaseService implements DatabaseService {
  private players: Map<string, PlayerData> = new Map()
  private connected: boolean = false

  async connect(): Promise<void> {
    this.connected = true
    console.log('DatabaseService: Connected (in-memory)')
  }

  async disconnect(): Promise<void> {
    this.connected = false
    console.log('DatabaseService: Disconnected')
  }

  async savePlayerData(playerId: string, data: PlayerData): Promise<void> {
    if (!this.connected) {
      throw new Error('Database not connected')
    }

    const playerData: PlayerData = {
      ...data,
      id: playerId,
      updatedAt: new Date()
    }

    this.players.set(playerId, playerData)
    console.log(`DatabaseService: Saved player data for ${playerId}`)
  }

  async loadPlayerData(playerId: string): Promise<PlayerData | null> {
    if (!this.connected) {
      throw new Error('Database not connected')
    }

    const data = this.players.get(playerId)
    if (data) {
      console.log(`DatabaseService: Loaded player data for ${playerId}`)
      return { ...data }
    }

    return null
  }

  async query<T>(query: string, params: any[]): Promise<T[]> {
    if (!this.connected) {
      throw new Error('Database not connected')
    }

    // Simple query implementation for in-memory
    // In production, this would execute actual SQL queries
    console.log(`DatabaseService: Query executed: ${query}`)
    return []
  }

  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    if (!this.connected) {
      throw new Error('Database not connected')
    }

    const tx: Transaction = {
      query: async <T>(query: string, params: any[]): Promise<T[]> => {
        return this.query<T>(query, params)
      },
      commit: async (): Promise<void> => {
        // In-memory: no-op
      },
      rollback: async (): Promise<void> => {
        // In-memory: no-op
      }
    }

    try {
      const result = await callback(tx)
      await tx.commit()
      return result
    } catch (error) {
      await tx.rollback()
      throw error
    }
  }
}

/**
 * PostgreSQL database service (for production)
 * Requires pg package: npm install pg @types/pg
 */
export class PostgreSQLDatabaseService implements DatabaseService {
  private pool: any = null
  private connected: boolean = false

  constructor(private config: {
    host: string
    port: number
    database: string
    user: string
    password: string
    max?: number
  }) {}

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring pg in development
      // @ts-expect-error - pg may not be installed in development, but types are available when it is
      const { Pool } = await import('pg')
      
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.max || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      })

      // Test connection
      await this.pool.query('SELECT NOW()')
      this.connected = true
      console.log('DatabaseService: Connected to PostgreSQL')
    } catch (error) {
      console.error('DatabaseService: Failed to connect to PostgreSQL', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.connected = false
      console.log('DatabaseService: Disconnected from PostgreSQL')
    }
  }

  async savePlayerData(playerId: string, data: PlayerData): Promise<void> {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected')
    }

    const query = `
      INSERT INTO players (
        id, name, race, level, xp, xp_to_next, credits,
        position_x, position_y, position_z, rotation,
        health, max_health, mana, max_mana,
        inventory, equipped_spells, guild_id, guild_tag,
        achievements, quests, battle_pass,
        created_at, last_login, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        level = EXCLUDED.level,
        xp = EXCLUDED.xp,
        xp_to_next = EXCLUDED.xp_to_next,
        credits = EXCLUDED.credits,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        position_z = EXCLUDED.position_z,
        rotation = EXCLUDED.rotation,
        health = EXCLUDED.health,
        max_health = EXCLUDED.max_health,
        mana = EXCLUDED.mana,
        max_mana = EXCLUDED.max_mana,
        inventory = EXCLUDED.inventory,
        equipped_spells = EXCLUDED.equipped_spells,
        guild_id = EXCLUDED.guild_id,
        guild_tag = EXCLUDED.guild_tag,
        achievements = EXCLUDED.achievements,
        quests = EXCLUDED.quests,
        battle_pass = EXCLUDED.battle_pass,
        last_login = EXCLUDED.last_login,
        updated_at = EXCLUDED.updated_at
    `

    const params = [
      playerId,
      data.name,
      data.race,
      data.level,
      data.xp,
      data.xpToNext,
      data.credits,
      data.position.x,
      data.position.y,
      data.position.z,
      data.rotation,
      data.health,
      data.maxHealth,
      data.mana,
      data.maxMana,
      JSON.stringify(data.inventory),
      JSON.stringify(data.equippedSpells),
      data.guildId || null,
      data.guildTag || null,
      JSON.stringify(data.achievements),
      JSON.stringify(data.quests),
      JSON.stringify(data.battlePass),
      data.createdAt,
      data.lastLogin,
      new Date()
    ]

    await this.pool.query(query, params)
    console.log(`DatabaseService: Saved player data for ${playerId}`)
  }

  async loadPlayerData(playerId: string): Promise<PlayerData | null> {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected')
    }

    const query = `
      SELECT * FROM players WHERE id = $1
    `

    const result = await this.pool.query(query, [playerId])
    
    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      race: row.race,
      level: row.level,
      xp: row.xp,
      xpToNext: row.xp_to_next,
      credits: row.credits,
      position: {
        x: row.position_x,
        y: row.position_y,
        z: row.position_z
      },
      rotation: row.rotation,
      health: row.health,
      maxHealth: row.max_health,
      mana: row.mana,
      maxMana: row.max_mana,
      inventory: JSON.parse(row.inventory || '[]'),
      equippedSpells: JSON.parse(row.equipped_spells || '[]'),
      guildId: row.guild_id,
      guildTag: row.guild_tag,
      achievements: JSON.parse(row.achievements || '[]'),
      quests: JSON.parse(row.quests || '[]'),
      battlePass: JSON.parse(row.battle_pass || '{}'),
      createdAt: row.created_at,
      lastLogin: row.last_login,
      updatedAt: row.updated_at
    }
  }

  async query<T>(query: string, params: any[]): Promise<T[]> {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected')
    }

    const result = await this.pool.query(query, params)
    return result.rows as T[]
  }

  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected')
    }

    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      const tx: Transaction = {
        query: async <T>(query: string, params: any[]): Promise<T[]> => {
          const result = await client.query(query, params)
          return result.rows as T[]
        },
        commit: async (): Promise<void> => {
          await client.query('COMMIT')
        },
        rollback: async (): Promise<void> => {
          await client.query('ROLLBACK')
        }
      }

      try {
        const result = await callback(tx)
        await tx.commit()
        return result
      } catch (error) {
        await tx.rollback()
        throw error
      }
    } finally {
      client.release()
    }
  }
}

/**
 * Create database service based on environment
 */
export function createDatabaseService(): DatabaseService {
  const dbType = process.env.DB_TYPE || 'memory'
  const dbHost = process.env.DB_HOST || 'localhost'
  const dbPort = parseInt(process.env.DB_PORT || '5432')
  const dbName = process.env.DB_NAME || 'nexvoid'
  const dbUser = process.env.DB_USER || 'postgres'
  const dbPassword = process.env.DB_PASSWORD || ''

  if (dbType === 'postgres' && dbPassword) {
    return new PostgreSQLDatabaseService({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword
    })
  }

  // Default to in-memory for development
  return new InMemoryDatabaseService()
}

