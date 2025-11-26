/**
 * DatabaseService - Provides abstraction for database operations
 * Handles connection pooling, retries, and transactions
 */

export interface PlayerData {
  id: string // Character ID (unique identifier for the character)
  userId?: string // Firebase UID (owner of the character)
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

/**
 * Simplified character info for selection screens
 */
export interface CharacterSummary {
  id: string // Character ID
  name: string
  race: string
  level: number
  lastLogin: Date
  createdAt: Date
}

/**
 * Database Service Interface
 * 
 * Provides abstraction for database operations with support for:
 * - Player data persistence
 * - Connection pooling
 * - Transactions
 * - Query execution
 * 
 * Implementations:
 * - `InMemoryDatabaseService` - For development/testing
 * - `PostgreSQLDatabaseService` - For production
 * 
 * @example
 * ```ts
 * const db = new PostgreSQLDatabaseService()
 * await db.connect()
 * await db.savePlayerData('player-1', playerData)
 * const data = await db.loadPlayerData('player-1')
 * ```
 */
export interface DatabaseService {
  /**
   * Save player data to database
   * @param playerId - Unique player identifier (character ID)
   * @param data - Complete player data object
   */
  savePlayerData(playerId: string, data: PlayerData): Promise<void>
  
  /**
   * Load player data from database
   * @param playerId - Unique player identifier (character ID)
   * @returns Player data or null if not found
   */
  loadPlayerData(playerId: string): Promise<PlayerData | null>
  
  /**
   * List all characters for a user
   * @param userId - Firebase UID (user account)
   * @returns Array of character summaries
   */
  listCharactersByUser(userId: string): Promise<CharacterSummary[]>
  
  /**
   * Count characters for a user
   * @param userId - Firebase UID (user account)
   * @returns Number of characters owned by the user
   */
  countCharactersByUser(userId: string): Promise<number>
  
  /**
   * Execute a SQL query
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Array of results
   */
  query<T>(query: string, params: unknown[]): Promise<T[]>
  
  /**
   * Execute operations within a transaction
   * @param callback - Transaction callback
   * @returns Result of callback
   */
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>
  
  /**
   * Connect to database
   */
  connect(): Promise<void>
  
  /**
   * Disconnect from database
   */
  disconnect(): Promise<void>
}

export interface Transaction {
  query<T>(query: string, params: unknown[]): Promise<T[]>
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

  async listCharactersByUser(userId: string): Promise<CharacterSummary[]> {
    if (!this.connected) {
      throw new Error('Database not connected')
    }

    const characters: CharacterSummary[] = []
    for (const [id, data] of this.players.entries()) {
      if (data.userId === userId || (!data.userId && id === userId)) {
        characters.push({
          id: data.id,
          name: data.name,
          race: data.race,
          level: data.level,
          lastLogin: data.lastLogin,
          createdAt: data.createdAt
        })
      }
    }

    // Sort by last login (most recent first)
    return characters.sort((a, b) => b.lastLogin.getTime() - a.lastLogin.getTime())
  }

  async countCharactersByUser(userId: string): Promise<number> {
    if (!this.connected) {
      throw new Error('Database not connected')
    }

    let count = 0
    for (const [id, data] of this.players.entries()) {
      if (data.userId === userId || (!data.userId && id === userId)) {
        count++
      }
    }
    return count
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
      query: async <T>(query: string, params: unknown[]): Promise<T[]> => {
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
  private pool: unknown = null
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

    // Use character_id if available, otherwise use id
    const characterId = playerId
    const userId = data.userId || null

    const query = `
      INSERT INTO players (
        id, character_id, user_id, name, race, level, xp, xp_to_next, credits,
        position_x, position_y, position_z, rotation,
        health, max_health, mana, max_mana,
        inventory, equipped_spells, guild_id, guild_tag,
        achievements, quests, battle_pass,
        created_at, last_login, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      ON CONFLICT (id) DO UPDATE SET
        character_id = COALESCE(EXCLUDED.character_id, players.character_id),
        user_id = COALESCE(EXCLUDED.user_id, players.user_id),
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
      playerId, // id (keep for backwards compatibility)
      characterId, // character_id
      userId, // user_id
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

    // Try to load by character_id first, then fall back to id for backwards compatibility
    const query = `
      SELECT * FROM players 
      WHERE character_id = $1 OR (character_id IS NULL AND id = $1)
      LIMIT 1
    `

    const result = await this.pool.query(query, [playerId])
    
    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    const characterId = row.character_id || row.id
    return {
      id: characterId,
      userId: row.user_id,
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

  async listCharactersByUser(userId: string): Promise<CharacterSummary[]> {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected')
    }

    const query = `
      SELECT 
        COALESCE(character_id, id) as id,
        name,
        race,
        level,
        last_login,
        created_at
      FROM players
      WHERE user_id = $1
      ORDER BY last_login DESC
    `

    const result = await this.pool.query(query, [userId])
    
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      race: row.race,
      level: row.level,
      lastLogin: row.last_login,
      createdAt: row.created_at
    }))
  }

  async countCharactersByUser(userId: string): Promise<number> {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected')
    }

    const query = `
      SELECT COUNT(*) as count
      FROM players
      WHERE user_id = $1
    `

    const result = await this.pool.query(query, [userId])
    return parseInt(result.rows[0].count, 10)
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
        query: async <T>(query: string, params: unknown[]): Promise<T[]> => {
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

