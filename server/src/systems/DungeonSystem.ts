/**
 * DungeonSystem - Manages dungeon instances, player entry/exit, and completion
 */

import { Dungeon, DungeonProgress, DungeonEntity } from '../../../shared/src/types/dungeons'
import { DungeonGeneratorImpl, DungeonGenerator } from './DungeonGenerator'
import { DatabaseService } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'

export interface DungeonSystem {
  createDungeon(seed: number, difficulty: number, level: number): Dungeon
  enterDungeon(playerId: string, dungeonId: string): Promise<boolean>
  exitDungeon(playerId: string, dungeonId: string): Promise<void>
  getDungeon(dungeonId: string): Dungeon | null
  getPlayerDungeon(playerId: string): Dungeon | null
  clearRoom(dungeonId: string, roomId: string): void
  defeatEntity(dungeonId: string, entityId: string): void
  completeDungeon(dungeonId: string, playerId: string): Promise<void>
  getDungeonProgress(playerId: string, dungeonId: string): Promise<DungeonProgress | null>
}

export class DungeonSystemImpl implements DungeonSystem {
  private dungeons: Map<string, Dungeon> = new Map()
  private playerDungeons: Map<string, string> = new Map() // playerId -> dungeonId
  private dungeonProgress: Map<string, Map<string, DungeonProgress>> = new Map() // dungeonId -> playerId -> progress

  constructor(
    private generator: DungeonGenerator,
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null
  ) {}

  /**
   * Create a new dungeon
   */
  createDungeon(seed: number, difficulty: number, level: number): Dungeon {
    const dungeon = this.generator.generate(seed, difficulty, level)
    this.dungeons.set(dungeon.id, dungeon)
    return dungeon
  }

  /**
   * Enter a dungeon
   */
  async enterDungeon(playerId: string, dungeonId: string): Promise<boolean> {
    const dungeon = this.dungeons.get(dungeonId)
    if (!dungeon) return false

    // Check if player is already in a dungeon
    if (this.playerDungeons.has(playerId)) {
      const currentDungeonId = this.playerDungeons.get(playerId)!
      if (currentDungeonId !== dungeonId) {
        return false // Player is in a different dungeon
      }
      return true // Already in this dungeon
    }

    // Add player to dungeon
    if (!dungeon.playerIds.includes(playerId)) {
      dungeon.playerIds.push(playerId)
    }
    this.playerDungeons.set(playerId, dungeonId)

    // Initialize progress
    if (!this.dungeonProgress.has(dungeonId)) {
      this.dungeonProgress.set(dungeonId, new Map())
    }

    const progress: DungeonProgress = {
      dungeonId,
      currentFloor: 0,
      roomsCleared: [],
      entitiesDefeated: [],
      startedAt: Date.now()
    }

    this.dungeonProgress.get(dungeonId)!.set(playerId, progress)

    return true
  }

  /**
   * Exit a dungeon
   */
  async exitDungeon(playerId: string, dungeonId: string): Promise<void> {
    const dungeon = this.dungeons.get(dungeonId)
    if (!dungeon) return

    // Remove player from dungeon
    dungeon.playerIds = dungeon.playerIds.filter(id => id !== playerId)
    this.playerDungeons.delete(playerId)

    // If no players left, cleanup dungeon after delay
    if (dungeon.playerIds.length === 0) {
      setTimeout(() => {
        if (this.dungeons.get(dungeonId)?.playerIds.length === 0) {
          this.dungeons.delete(dungeonId)
          this.dungeonProgress.delete(dungeonId)
        }
      }, 60000) // Cleanup after 1 minute
    }
  }

  /**
   * Get dungeon by ID
   */
  getDungeon(dungeonId: string): Dungeon | null {
    return this.dungeons.get(dungeonId) || null
  }

  /**
   * Get dungeon player is currently in
   */
  getPlayerDungeon(playerId: string): Dungeon | null {
    const dungeonId = this.playerDungeons.get(playerId)
    if (!dungeonId) return null
    return this.dungeons.get(dungeonId) || null
  }

  /**
   * Mark a room as cleared
   */
  clearRoom(dungeonId: string, roomId: string): void {
    const dungeon = this.dungeons.get(dungeonId)
    if (!dungeon) return

    const room = dungeon.rooms.find(r => r.id === roomId)
    if (room) {
      room.cleared = true
    }

    // Update progress for all players in dungeon
    const progressMap = this.dungeonProgress.get(dungeonId)
    if (progressMap) {
      for (const progress of progressMap.values()) {
        if (!progress.roomsCleared.includes(roomId)) {
          progress.roomsCleared.push(roomId)
        }
      }
    }
  }

  /**
   * Mark an entity as defeated
   */
  defeatEntity(dungeonId: string, entityId: string): void {
    const dungeon = this.dungeons.get(dungeonId)
    if (!dungeon) return

    const entity = dungeon.entities.find(e => e.id === entityId)
    if (entity) {
      entity.defeated = true
    }

    // Update progress for all players in dungeon
    const progressMap = this.dungeonProgress.get(dungeonId)
    if (progressMap) {
      for (const progress of progressMap.values()) {
        if (!progress.entitiesDefeated.includes(entityId)) {
          progress.entitiesDefeated.push(entityId)
        }
      }
    }

    // Check if all entities in room are defeated
    if (entity) {
      const room = dungeon.rooms.find(r => r.id === entity.roomId)
      if (room) {
        const roomEntities = dungeon.entities.filter(e => e.roomId === room.id && !e.defeated)
        if (roomEntities.length === 0) {
          this.clearRoom(dungeonId, room.id)
        }
      }
    }
  }

  /**
   * Complete a dungeon
   */
  async completeDungeon(dungeonId: string, playerId: string): Promise<void> {
    const dungeon = this.dungeons.get(dungeonId)
    if (!dungeon) return

    // Check if all rooms are cleared
    const allCleared = dungeon.rooms.every(room => room.cleared || room.type === 'start')
    if (!allCleared) return

    dungeon.completed = true
    dungeon.completedAt = Date.now()

    // Update progress
    const progressMap = this.dungeonProgress.get(dungeonId)
    const progress = progressMap?.get(playerId)
    if (progress) {
      progress.completedAt = Date.now()
    }

    // Distribute rewards (would integrate with reward system)
    const rewards = this.calculateRewards(dungeon)
    console.log(`Dungeon ${dungeonId} completed by ${playerId}. Rewards:`, rewards)
    
    // Notify achievement system (would be passed as callback or event)
    // achievementSystem.handleGameEvent(playerId, { type: 'dungeon_complete', playerId, quantity: 1 })

    // Save progress to database
    if (this.playerDataRepo && progress) {
      try {
        await this.playerDataRepo.saveDungeonProgress(playerId, progress)
      } catch (error) {
        console.error(`Failed to save dungeon progress for ${playerId}:`, error)
      }
    }

    // Save completion record
    if (this.db && progress) {
      try {
        await this.db.query(
          `INSERT INTO dungeon_completions (id, player_id, dungeon_id, seed, difficulty, level, completed_at, rewards)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `completion_${playerId}_${dungeonId}_${Date.now()}`,
            playerId,
            dungeonId,
            dungeon.seed,
            dungeon.difficulty,
            dungeon.level,
            Date.now(),
            JSON.stringify(rewards)
          ]
        )
      } catch (error) {
        console.error(`Failed to save dungeon completion for ${playerId}:`, error)
      }
    }
  }

  /**
   * Calculate rewards for dungeon completion
   */
  private calculateRewards(dungeon: Dungeon): {
    xp: number
    credits: number
    items: Array<{ itemId: string; quantity: number }>
  } {
    const baseXP = dungeon.level * 100
    const baseCredits = dungeon.level * 50
    const difficultyMultiplier = 1 + (dungeon.difficulty * 0.2)

    return {
      xp: Math.floor(baseXP * difficultyMultiplier),
      credits: Math.floor(baseCredits * difficultyMultiplier),
      items: [
        { itemId: 'quantum_crystal', quantity: Math.floor(dungeon.difficulty) }
      ]
    }
  }

  /**
   * Get player's progress in a dungeon
   */
  async getDungeonProgress(playerId: string, dungeonId: string): Promise<DungeonProgress | null> {
    const progressMap = this.dungeonProgress.get(dungeonId)
    return progressMap?.get(playerId) || null
  }
}

