/**
 * AchievementSystem - Manages player achievements, progress tracking, and unlocks
 */

import { Achievement, AchievementProgress, AchievementRequirement, GameEvent, GameEventType } from '../../../shared/src/types/achievements'
import { DatabaseService } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'

export interface AchievementSystem {
  getAchievements(category?: string): Achievement[]
  getPlayerProgress(playerId: string): Promise<AchievementProgress[]>
  handleGameEvent(playerId: string, event: GameEvent): Promise<{ unlocked: boolean; achievementId?: string; achievement?: Achievement } | null>
  unlockAchievement(playerId: string, achievementId: string): Promise<boolean>
  getUnlockedAchievements(playerId: string): Promise<string[]>
}

export class AchievementSystemImpl implements AchievementSystem {
  private achievements: Map<string, Achievement> = new Map()
  private playerProgress: Map<string, Map<string, AchievementProgress>> = new Map() // playerId -> achievementId -> progress

  constructor(
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null
  ) {
    this.initializeAchievements()
  }

  /**
   * Initialize achievement definitions
   */
  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      // Combat achievements
      {
        id: 'first_kill',
        name: 'First Blood',
        description: 'Defeat your first enemy',
        category: 'combat',
        rarity: 'common',
        hidden: false,
        requirements: [
          { type: 'kill', quantity: 1, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', amount: 100 }],
        points: 10
      },
      {
        id: 'killer_100',
        name: 'Centurion',
        description: 'Defeat 100 enemies',
        category: 'combat',
        rarity: 'rare',
        hidden: false,
        requirements: [
          { type: 'kill', quantity: 100, current: 0, completed: false }
        ],
        rewards: [{ type: 'credits', amount: 1000 }, { type: 'title', titleId: 'centurion' }],
        points: 50
      },
      {
        id: 'boss_slayer',
        name: 'Boss Slayer',
        description: 'Defeat a dungeon boss',
        category: 'combat',
        rarity: 'epic',
        hidden: false,
        requirements: [
          { type: 'kill', target: 'dungeon_boss', quantity: 1, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', amount: 500 }, { type: 'item', itemId: 'boss_trophy', quantity: 1 }],
        points: 100
      },
      // Exploration achievements
      {
        id: 'explorer',
        name: 'Explorer',
        description: 'Complete 10 dungeons',
        category: 'exploration',
        rarity: 'rare',
        hidden: false,
        requirements: [
          { type: 'dungeon_complete', quantity: 10, current: 0, completed: false }
        ],
        rewards: [{ type: 'credits', amount: 2000 }, { type: 'title', titleId: 'explorer' }],
        points: 75
      },
      // Social achievements
      {
        id: 'guild_member',
        name: 'Guild Member',
        description: 'Join a guild',
        category: 'social',
        rarity: 'common',
        hidden: false,
        requirements: [
          { type: 'join_guild', quantity: 1, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', amount: 200 }],
        points: 15
      },
      {
        id: 'trader',
        name: 'Trader',
        description: 'Complete 10 trades',
        category: 'social',
        rarity: 'rare',
        hidden: false,
        requirements: [
          { type: 'trade', quantity: 10, current: 0, completed: false }
        ],
        rewards: [{ type: 'credits', amount: 1500 }, { type: 'title', titleId: 'trader' }],
        points: 60
      },
      // Crafting achievements
      {
        id: 'craft_master',
        name: 'Craft Master',
        description: 'Craft 50 items',
        category: 'crafting',
        rarity: 'epic',
        hidden: false,
        requirements: [
          { type: 'craft', quantity: 50, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', amount: 1000 }, { type: 'title', titleId: 'craft_master' }],
        points: 150
      },
      // Progression achievements
      {
        id: 'level_10',
        name: 'Rising Star',
        description: 'Reach level 10',
        category: 'progression',
        rarity: 'common',
        hidden: false,
        requirements: [
          { type: 'reach_level', quantity: 10, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', amount: 500 }, { type: 'credits', amount: 500 }],
        points: 25
      },
      {
        id: 'level_50',
        name: 'Veteran',
        description: 'Reach level 50',
        category: 'progression',
        rarity: 'epic',
        hidden: false,
        requirements: [
          { type: 'reach_level', quantity: 50, current: 0, completed: false }
        ],
        rewards: [{ type: 'xp', amount: 5000 }, { type: 'title', titleId: 'veteran' }],
        points: 200
      },
      // Collection achievements
      {
        id: 'collector',
        name: 'Collector',
        description: 'Collect 100 items',
        category: 'collection',
        rarity: 'rare',
        hidden: false,
        requirements: [
          { type: 'collect', quantity: 100, current: 0, completed: false }
        ],
        rewards: [{ type: 'credits', amount: 2000 }, { type: 'title', titleId: 'collector' }],
        points: 80
      }
    ]

    for (const achievement of achievements) {
      this.achievements.set(achievement.id, achievement)
    }
  }

  /**
   * Get all achievements, optionally filtered by category
   */
  getAchievements(category?: string): Achievement[] {
    const achievements = Array.from(this.achievements.values())
    if (category) {
      return achievements.filter(a => a.category === category)
    }
    return achievements
  }

  /**
   * Get or initialize player achievement progress
   */
  private async getOrInitProgress(playerId: string): Promise<Map<string, AchievementProgress>> {
    let progressMap = this.playerProgress.get(playerId)

    if (!progressMap) {
      progressMap = new Map()

      // Try to load from database
      if (this.playerDataRepo) {
        const playerData = await this.playerDataRepo.loadPlayerData(playerId)
        if (playerData?.achievements) {
          for (const ach of playerData.achievements) {
            const achievement = this.achievements.get(ach.id)
            if (achievement) {
              const requirements = Array.isArray(ach.progress) 
                ? ach.progress as AchievementRequirement[]
                : achievement.requirements.map(r => ({ ...r }))
              progressMap.set(ach.id, {
                achievementId: ach.id,
                unlocked: ach.completed,
                unlockedAt: ach.completed ? Date.now() : undefined,
                requirements,
                progress: this.calculateProgress(achievement, requirements)
              })
            }
          }
        }
      }

      // Initialize progress for all achievements not yet loaded
      for (const achievement of this.achievements.values()) {
        if (!progressMap.has(achievement.id)) {
          progressMap.set(achievement.id, {
            achievementId: achievement.id,
            unlocked: false,
            requirements: achievement.requirements.map(r => ({ ...r })),
            progress: 0
          })
        }
      }

      this.playerProgress.set(playerId, progressMap)
    }

    return progressMap
  }

  /**
   * Get player's achievement progress
   */
  async getPlayerProgress(playerId: string): Promise<AchievementProgress[]> {
    const progressMap = await this.getOrInitProgress(playerId)
    return Array.from(progressMap.values())
  }

  /**
   * Handle game event and update achievement progress
   * Returns unlocked achievement if any
   */
  async handleGameEvent(playerId: string, event: GameEvent): Promise<{ unlocked: boolean; achievementId?: string; achievement?: Achievement } | null> {
    const progressMap = await this.getOrInitProgress(playerId)
    
    for (const [achievementId, progress] of progressMap.entries()) {
      if (progress.unlocked) continue

      const achievement = this.achievements.get(achievementId)
      if (!achievement) continue

      let updated = false

      for (const requirement of progress.requirements) {
        if (requirement.completed) continue

        // Check if event matches requirement
        if (this.matchesRequirement(requirement, event)) {
          requirement.current = Math.min(requirement.current + (event.quantity || 1), requirement.quantity)
          
          if (requirement.current >= requirement.quantity) {
            requirement.completed = true
          }
          
          updated = true
        }
      }

      if (updated) {
        // Recalculate progress
        progress.progress = this.calculateProgress(achievement, progress.requirements)
        
        // Check if all requirements are completed
        if (progress.requirements.every(r => r.completed)) {
          const unlocked = await this.unlockAchievement(playerId, achievementId)
          if (unlocked) {
            // Return achievement for notification
            return { unlocked: true, achievementId, achievement }
          }
        } else {
          // Save progress
          await this.saveProgress(playerId, progress)
        }
      }
    }
    
    return null
  }

  /**
   * Check if event matches requirement
   */
  private matchesRequirement(requirement: AchievementRequirement, event: GameEvent): boolean {
    if (requirement.type !== event.type) return false

    // Check target if specified
    if (requirement.target && event.targetId !== requirement.target) {
      return false
    }

    return true
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(achievement: Achievement, requirements: AchievementRequirement[]): number {
    if (requirements.length === 0) return 0

    let totalProgress = 0
    for (const req of requirements) {
      totalProgress += req.quantity > 0 ? req.current / req.quantity : 0
    }

    return Math.min(totalProgress / requirements.length, 1)
  }

  /**
   * Unlock achievement
   */
  async unlockAchievement(playerId: string, achievementId: string): Promise<boolean> {
    const progressMap = await this.getOrInitProgress(playerId)
    const progress = progressMap.get(achievementId)
    
    if (!progress || progress.unlocked) return false

    const achievement = this.achievements.get(achievementId)
    if (!achievement) return false

    // Check if all requirements are met
    if (!progress.requirements.every(r => r.completed)) {
      return false
    }

    // Unlock achievement
    progress.unlocked = true
    progress.unlockedAt = Date.now()
    progress.progress = 1

    // Distribute rewards
    console.log(`Achievement unlocked: ${achievement.name} for player ${playerId}`, achievement.rewards)

    // Save progress
    await this.saveProgress(playerId, progress)

    return true
  }

  /**
   * Get unlocked achievements for player
   */
  async getUnlockedAchievements(playerId: string): Promise<string[]> {
    const progressMap = await this.getOrInitProgress(playerId)
    const unlocked: string[] = []
    
    for (const [achievementId, progress] of progressMap.entries()) {
      if (progress.unlocked) {
        unlocked.push(achievementId)
      }
    }
    
    return unlocked
  }

  /**
   * Save progress to database
   */
  private async saveProgress(playerId: string, progress: AchievementProgress): Promise<void> {
    if (!this.playerDataRepo) return

    try {
      const playerData = await this.playerDataRepo.loadPlayerData(playerId)
      if (!playerData) return

      // Update achievements array
      // Note: DatabaseService stores progress as number, but we use AchievementRequirement[]
      // Convert requirements to a simple progress number (0-1)
      const existingIndex = playerData.achievements.findIndex(a => a.id === progress.achievementId)
      const achievementData = {
        id: progress.achievementId,
        progress: progress.progress, // Use the calculated progress (0-1) instead of requirements array
        completed: progress.unlocked
      }

      if (existingIndex >= 0) {
        playerData.achievements[existingIndex] = achievementData
      } else {
        playerData.achievements.push(achievementData)
      }

      await this.playerDataRepo.savePlayerData(playerId, {
        achievements: playerData.achievements
      })
    } catch (error) {
      console.error(`Failed to save achievement progress for ${playerId}:`, error)
    }
  }
}

// Export GameEvent types for use in other systems
export type { GameEvent, GameEventType }

