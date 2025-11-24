/**
 * PlayerDataRepository - Handles player data persistence operations
 * Provides data integrity checks and validation
 */

import { DatabaseService, PlayerData } from './DatabaseService'

export class PlayerDataRepository {
  constructor(private db: DatabaseService) {}

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
  }

  /**
   * Load player data with validation
   */
  async loadPlayerData(playerId: string): Promise<PlayerData | null> {
    if (!playerId) {
      throw new Error('Player ID is required')
    }

    const data = await this.db.loadPlayerData(playerId)
    
    if (data) {
      // Validate loaded data
      try {
        this.validatePlayerData(data)
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
   */
  async playerNameExists(name: string, excludePlayerId?: string): Promise<boolean> {
    const results = await this.db.query<{ id: string }>(
      'SELECT id FROM players WHERE name = $1' + (excludePlayerId ? ' AND id != $2' : ''),
      excludePlayerId ? [name, excludePlayerId] : [name]
    )
    return results.length > 0
  }
}

