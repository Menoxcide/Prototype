/**
 * PlayerDataRepository - Handles player data persistence operations
 * Provides data integrity checks and validation
 */

import { DatabaseService, PlayerData } from './DatabaseService'
import { cacheService } from './CacheService'

export class PlayerDataRepository {
  constructor(private db: DatabaseService) {}
  
  // Cache TTLs
  private readonly PLAYER_DATA_TTL = 300 // 5 minutes
  private readonly QUEST_DATA_TTL = 600 // 10 minutes
  private readonly ACHIEVEMENT_DATA_TTL = 1800 // 30 minutes

  /**
   * Save player data with validation
   */
  async savePlayerData(playerId: string, data: Partial<PlayerData>): Promise<void> {
    // Validate required fields
    if (!playerId) {
      throw new Error('Player ID is required')
    }

    // Load existing data to merge
    const existing = await this.db.loadPlayerData(playerId)
    
    const playerData: PlayerData = {
      id: playerId,
      name: data.name || existing?.name || `Player_${playerId.substring(0, 6)}`,
      race: data.race || existing?.race || 'human',
      level: data.level ?? existing?.level ?? 1,
      xp: data.xp ?? existing?.xp ?? 0,
      xpToNext: data.xpToNext ?? existing?.xpToNext ?? 100,
      credits: data.credits ?? existing?.credits ?? 0,
      position: data.position || existing?.position || { x: 0, y: 0, z: 0 },
      rotation: data.rotation ?? existing?.rotation ?? 0,
      health: Math.max(0, Math.min(data.health ?? existing?.health ?? 100, data.maxHealth ?? existing?.maxHealth ?? 100)),
      maxHealth: data.maxHealth ?? existing?.maxHealth ?? 100,
      mana: Math.max(0, Math.min(data.mana ?? existing?.mana ?? 100, data.maxMana ?? existing?.maxMana ?? 100)),
      maxMana: data.maxMana ?? existing?.maxMana ?? 100,
      inventory: data.inventory || existing?.inventory || [],
      equippedSpells: data.equippedSpells || existing?.equippedSpells || [],
      guildId: data.guildId ?? existing?.guildId,
      guildTag: data.guildTag ?? existing?.guildTag,
      achievements: data.achievements || existing?.achievements || [],
      quests: data.quests || existing?.quests || [],
      battlePass: data.battlePass || existing?.battlePass || {
        season: 1,
        currentTier: 0,
        currentXP: 0,
        premiumUnlocked: false,
        claimedTiers: []
      },
      createdAt: existing?.createdAt || new Date(),
      lastLogin: new Date(),
      updatedAt: new Date()
    }

    // Data integrity checks
    this.validatePlayerData(playerData)

    // Save to database
    await this.db.savePlayerData(playerId, playerData)
    
    // Invalidate cache
    const cacheKey = `player:${playerId}`
    await cacheService.delete(cacheKey)
    
    // Update cache with new data
    await cacheService.set(cacheKey, playerData, {
      ttl: this.PLAYER_DATA_TTL,
      tags: ['player', `player:${playerId}`]
    })
  }

  /**
   * Load player data with validation and caching
   */
  async loadPlayerData(playerId: string): Promise<PlayerData | null> {
    if (!playerId) {
      throw new Error('Player ID is required')
    }

    // Check cache first
    const cacheKey = `player:${playerId}`
    const cached = await cacheService.get<PlayerData>(cacheKey)
    if (cached) {
      return cached
    }

    // Load from database
    const data = await this.db.loadPlayerData(playerId)
    
    if (data) {
      // Validate loaded data
      try {
        this.validatePlayerData(data)
        
        // Store in cache
        await cacheService.set(cacheKey, data, {
          ttl: this.PLAYER_DATA_TTL,
          tags: ['player', `player:${playerId}`]
        })
        
        return data
      } catch (error) {
        console.error(`Invalid player data for ${playerId}:`, error)
        // Return null to trigger data recovery or recreation
        return null
      }
    }

    return null
  }

  /**
   * Validate player data integrity
   */
  private validatePlayerData(data: PlayerData): void {
    if (!data.id) {
      throw new Error('Player ID is missing')
    }

    if (!data.name || data.name.length < 1 || data.name.length > 100) {
      throw new Error('Invalid player name')
    }

    if (data.level < 1 || data.level > 100) {
      throw new Error('Invalid player level')
    }

    if (data.xp < 0) {
      throw new Error('XP cannot be negative')
    }

    if (data.health < 0 || data.health > data.maxHealth) {
      throw new Error('Invalid health value')
    }

    if (data.mana < 0 || data.mana > data.maxMana) {
      throw new Error('Invalid mana value')
    }

    if (!Array.isArray(data.inventory)) {
      throw new Error('Inventory must be an array')
    }

    if (!Array.isArray(data.equippedSpells)) {
      throw new Error('Equipped spells must be an array')
    }

    if (!data.position || typeof data.position.x !== 'number') {
      throw new Error('Invalid position data')
    }
  }

  /**
   * Create new player data
   */
  async createPlayerData(playerId: string, name: string, race: string): Promise<PlayerData> {
    const playerData: PlayerData = {
      id: playerId,
      name,
      race,
      level: 1,
      xp: 0,
      xpToNext: 100,
      credits: 0,
      position: { x: 0, y: 1, z: 0 }, // Y=1 to stand on ground (ground is at Y=0)
      rotation: 0,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      inventory: [],
      equippedSpells: [],
      achievements: [],
      quests: [],
      battlePass: {
        season: 1,
        currentTier: 0,
        currentXP: 0,
        premiumUnlocked: false,
        claimedTiers: []
      },
      createdAt: new Date(),
      lastLogin: new Date(),
      updatedAt: new Date()
    }

    await this.db.savePlayerData(playerId, playerData)
    return playerData
  }

  /**
   * Update player position
   */
  async updatePlayerPosition(playerId: string, position: { x: number; y: number; z: number }, rotation: number): Promise<void> {
    await this.savePlayerData(playerId, { position, rotation })
  }

  /**
   * Update player stats (health, mana, etc.)
   */
  async updatePlayerStats(playerId: string, stats: Partial<Pick<PlayerData, 'health' | 'mana' | 'xp' | 'credits' | 'level'>>): Promise<void> {
    await this.savePlayerData(playerId, stats)
  }

  /**
   * Check if a player name already exists (for validation)
   * Now checks within the same user's characters
   */
  async playerNameExists(name: string, excludePlayerId?: string, userId?: string): Promise<boolean> {
    if (userId) {
      // Check if name exists for this user (names should be unique per user)
      const query = userId 
        ? 'SELECT id FROM players WHERE name = $1 AND user_id = $2' + (excludePlayerId ? ' AND COALESCE(character_id, id) != $3' : '')
        : 'SELECT id FROM players WHERE name = $1' + (excludePlayerId ? ' AND COALESCE(character_id, id) != $2' : '')
      
      const params = userId 
        ? excludePlayerId ? [name, userId, excludePlayerId] : [name, userId]
        : excludePlayerId ? [name, excludePlayerId] : [name]
      
      const results = await this.db.query<{ id: string }>(query, params)
      return results.length > 0
    }
    
    // Fallback to old behavior (check globally) if no userId provided
    const results = await this.db.query<{ id: string }>(
      'SELECT id FROM players WHERE name = $1' + (excludePlayerId ? ' AND COALESCE(character_id, id) != $2' : ''),
      excludePlayerId ? [name, excludePlayerId] : [name]
    )
    return results.length > 0
  }

  /**
   * List all characters for a user
   */
  async listCharactersByUser(userId: string): Promise<import('./DatabaseService').CharacterSummary[]> {
    return await this.db.listCharactersByUser(userId)
  }

  /**
   * Count characters for a user
   */
  async countCharactersByUser(userId: string): Promise<number> {
    return await this.db.countCharactersByUser(userId)
  }

  /**
   * Save dungeon progress
   */
  async saveDungeonProgress(playerId: string, progress: import('../../../shared/src/types/dungeons').DungeonProgress): Promise<void> {
    const progressId = `progress_${playerId}_${progress.dungeonId}`
    
    await this.db.query(
      `INSERT INTO dungeon_progress (id, player_id, dungeon_id, current_floor, rooms_cleared, entities_defeated, started_at, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id) DO UPDATE SET
         current_floor = EXCLUDED.current_floor,
         rooms_cleared = EXCLUDED.rooms_cleared,
         entities_defeated = EXCLUDED.entities_defeated,
         completed_at = EXCLUDED.completed_at,
         updated_at = NOW()`,
      [
        progressId,
        playerId,
        progress.dungeonId,
        progress.currentFloor,
        JSON.stringify(progress.roomsCleared),
        JSON.stringify(progress.entitiesDefeated),
        progress.startedAt,
        progress.completedAt || null
      ]
    )
  }

  /**
   * Load dungeon progress
   */
  async loadDungeonProgress(playerId: string, dungeonId: string): Promise<import('../../../shared/src/types/dungeons').DungeonProgress | null> {
    const progressId = `progress_${playerId}_${dungeonId}`
    
    const results = await this.db.query<{
      id: string
      player_id: string
      dungeon_id: string
      current_floor: number
      rooms_cleared: string
      entities_defeated: string
      started_at: number
      completed_at: number | null
    }>(
      'SELECT * FROM dungeon_progress WHERE id = $1',
      [progressId]
    )
    
    if (results.length === 0) {
      return null
    }
    
    const row = results[0]
    return {
      dungeonId: row.dungeon_id,
      currentFloor: row.current_floor,
      roomsCleared: JSON.parse(row.rooms_cleared),
      entitiesDefeated: JSON.parse(row.entities_defeated),
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined
    }
  }
}

