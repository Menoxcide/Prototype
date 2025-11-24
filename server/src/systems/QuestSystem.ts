/**
 * QuestSystem - Manages quest definitions and player quest states
 * Handles quest progression, completion, and rewards
 */

import { Quest, QuestProgress, QuestObjective, QuestStatus, QuestObjectiveType } from '../../../shared/src/types/quests'
import { DatabaseService, PlayerData } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'

export interface QuestSystem {
  acceptQuest(playerId: string, questId: string): Promise<boolean>
  updateObjective(playerId: string, questId: string, objectiveId: string, progress: number): Promise<void>
  completeQuest(playerId: string, questId: string): Promise<void>
  getActiveQuests(playerId: string): Promise<QuestProgress[]>
  getAvailableQuests(playerId: string, level: number): Promise<Quest[]>
  checkQuestCompletion(playerId: string, questId: string): Promise<boolean>
  handleGameEvent(playerId: string, eventType: QuestObjectiveType, target: string, quantity?: number): Promise<void>
  resetDailyQuests(): void
  resetWeeklyQuests(): void
}

export class QuestSystemImpl implements QuestSystem {
  private questDefinitions: Map<string, Quest> = new Map()
  private playerQuests: Map<string, Map<string, QuestProgress>> = new Map() // playerId -> questId -> progress

  constructor(
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null
  ) {
    this.initializeQuests()
  }

  /**
   * Initialize quest definitions
   */
  private initializeQuests(): void {
    // Daily quests
    this.addQuest({
      id: 'daily_kill_10',
      name: 'Daily Slayer',
      description: 'Defeat 10 enemies',
      category: 'daily',
      level: 1,
      prerequisites: [],
      objectives: [
        {
          id: 'kill_10',
          type: 'kill',
          target: 'any',
          quantity: 10,
          current: 0,
          description: 'Defeat 10 enemies'
        }
      ],
      rewards: [
        { type: 'xp', amount: 500 },
        { type: 'credits', amount: 200 }
      ],
      repeatable: true,
      timeLimit: 24 * 60 * 60 * 1000 // 24 hours
    })

    this.addQuest({
      id: 'daily_collect_5',
      name: 'Resource Gatherer',
      description: 'Collect 5 quantum crystals',
      category: 'daily',
      level: 1,
      prerequisites: [],
      objectives: [
        {
          id: 'collect_5',
          type: 'collect',
          target: 'quantum_crystal',
          quantity: 5,
          current: 0,
          description: 'Collect 5 quantum crystals'
        }
      ],
      rewards: [
        { type: 'xp', amount: 300 },
        { type: 'credits', amount: 150 },
        { type: 'item', itemId: 'mana_cell', quantity: 2 }
      ],
      repeatable: true,
      timeLimit: 24 * 60 * 60 * 1000
    })

    // Weekly quests
    this.addQuest({
      id: 'weekly_kill_100',
      name: 'Weekly Warrior',
      description: 'Defeat 100 enemies this week',
      category: 'weekly',
      level: 1,
      prerequisites: [],
      objectives: [
        {
          id: 'kill_100',
          type: 'kill',
          target: 'any',
          quantity: 100,
          current: 0,
          description: 'Defeat 100 enemies'
        }
      ],
      rewards: [
        { type: 'xp', amount: 5000 },
        { type: 'credits', amount: 1000 },
        { type: 'item', itemId: 'quantum_blade', quantity: 1 }
      ],
      repeatable: true,
      timeLimit: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    // Story quests
    this.addQuest({
      id: 'story_first_kill',
      name: 'First Blood',
      description: 'Defeat your first enemy',
      category: 'main',
      level: 1,
      prerequisites: [],
      objectives: [
        {
          id: 'kill_1',
          type: 'kill',
          target: 'any',
          quantity: 1,
          current: 0,
          description: 'Defeat 1 enemy'
        }
      ],
      rewards: [
        { type: 'xp', amount: 100 },
        { type: 'credits', amount: 50 }
      ],
      repeatable: false
    })

    this.addQuest({
      id: 'story_quantum_initiation',
      name: 'Quantum Initiation',
      description: 'Collect 10 quantum crystals to begin your journey',
      category: 'main',
      level: 1,
      prerequisites: ['story_first_kill'],
      objectives: [
        {
          id: 'collect_quantum',
          type: 'collect',
          target: 'quantum_crystal',
          quantity: 10,
          current: 0,
          description: 'Collect 10 quantum crystals'
        }
      ],
      rewards: [
        { type: 'xp', amount: 500 },
        { type: 'credits', amount: 200 },
        { type: 'item', itemId: 'health_pack', quantity: 5 }
      ],
      repeatable: false
    })

    this.addQuest({
      id: 'story_weapon_master',
      name: 'Weapon Master',
      description: 'Craft your first weapon to become a true warrior',
      category: 'main',
      level: 2,
      prerequisites: ['story_quantum_initiation'],
      objectives: [
        {
          id: 'craft_weapon',
          type: 'craft',
          target: 'quantum_blade',
          quantity: 1,
          current: 0,
          description: 'Craft a Quantum Blade'
        }
      ],
      rewards: [
        { type: 'xp', amount: 1000 },
        { type: 'credits', amount: 500 }
      ],
      repeatable: false
    })

    this.addQuest({
      id: 'story_elite_hunter',
      name: 'Elite Hunter',
      description: 'Defeat 25 enemies to prove your combat prowess',
      category: 'main',
      level: 3,
      prerequisites: ['story_weapon_master'],
      objectives: [
        {
          id: 'kill_25',
          type: 'kill',
          target: 'any',
          quantity: 25,
          current: 0,
          description: 'Defeat 25 enemies'
        }
      ],
      rewards: [
        { type: 'xp', amount: 2000 },
        { type: 'credits', amount: 1000 },
        { type: 'item', itemId: 'plasma_rifle', quantity: 1 }
      ],
      repeatable: false
    })

    // Side quests
    this.addQuest({
      id: 'side_resource_harvest',
      name: 'Resource Harvest',
      description: 'Collect 20 quantum crystals for the traders',
      category: 'side',
      level: 2,
      prerequisites: [],
      objectives: [
        {
          id: 'collect_20',
          type: 'collect',
          target: 'quantum_crystal',
          quantity: 20,
          current: 0,
          description: 'Collect 20 quantum crystals'
        }
      ],
      rewards: [
        { type: 'xp', amount: 800 },
        { type: 'credits', amount: 400 }
      ],
      repeatable: true
    })

    this.addQuest({
      id: 'side_crafting_apprentice',
      name: 'Crafting Apprentice',
      description: 'Craft 5 different items to master the art of crafting',
      category: 'side',
      level: 2,
      prerequisites: [],
      objectives: [
        {
          id: 'craft_5',
          type: 'craft',
          target: 'any',
          quantity: 5,
          current: 0,
          description: 'Craft 5 items'
        }
      ],
      rewards: [
        { type: 'xp', amount: 1200 },
        { type: 'credits', amount: 600 },
        { type: 'item', itemId: 'quantum_crystal', quantity: 10 }
      ],
      repeatable: true
    })

    this.addQuest({
      id: 'side_slayer',
      name: 'Slayer',
      description: 'Defeat 50 enemies to earn the Slayer title',
      category: 'side',
      level: 3,
      prerequisites: [],
      objectives: [
        {
          id: 'kill_50',
          type: 'kill',
          target: 'any',
          quantity: 50,
          current: 0,
          description: 'Defeat 50 enemies'
        }
      ],
      rewards: [
        { type: 'xp', amount: 3000 },
        { type: 'credits', amount: 1500 }
      ],
      repeatable: true
    })

    this.addQuest({
      id: 'side_treasure_hunter',
      name: 'Treasure Hunter',
      description: 'Collect rare materials from defeated enemies',
      category: 'side',
      level: 4,
      prerequisites: [],
      objectives: [
        {
          id: 'collect_rare',
          type: 'collect',
          target: 'void_core',
          quantity: 5,
          current: 0,
          description: 'Collect 5 Void Cores'
        }
      ],
      rewards: [
        { type: 'xp', amount: 2500 },
        { type: 'credits', amount: 1200 },
        { type: 'item', itemId: 'quantum_armor', quantity: 1 }
      ],
      repeatable: true
    })

    // Additional daily quests
    this.addQuest({
      id: 'daily_craft_3',
      name: 'Daily Crafter',
      description: 'Craft 3 items today',
      category: 'daily',
      level: 2,
      prerequisites: [],
      objectives: [
        {
          id: 'craft_3',
          type: 'craft',
          target: 'any',
          quantity: 3,
          current: 0,
          description: 'Craft 3 items'
        }
      ],
      rewards: [
        { type: 'xp', amount: 400 },
        { type: 'credits', amount: 200 }
      ],
      repeatable: true,
      timeLimit: 24 * 60 * 60 * 1000
    })

    this.addQuest({
      id: 'daily_kill_20',
      name: 'Daily Warrior',
      description: 'Defeat 20 enemies today',
      category: 'daily',
      level: 2,
      prerequisites: [],
      objectives: [
        {
          id: 'kill_20',
          type: 'kill',
          target: 'any',
          quantity: 20,
          current: 0,
          description: 'Defeat 20 enemies'
        }
      ],
      rewards: [
        { type: 'xp', amount: 800 },
        { type: 'credits', amount: 300 },
        { type: 'item', itemId: 'health_pack', quantity: 3 }
      ],
      repeatable: true,
      timeLimit: 24 * 60 * 60 * 1000
    })
  }

  private addQuest(quest: Quest): void {
    this.questDefinitions.set(quest.id, quest)
  }

  /**
   * Accept a quest for a player
   */
  async acceptQuest(playerId: string, questId: string): Promise<boolean> {
    const quest = this.questDefinitions.get(questId)
    if (!quest) {
      console.error(`Quest ${questId} not found`)
      return false
    }

    // Check if player already has this quest
    const playerQuestMap = this.playerQuests.get(playerId) || new Map()
    const existingProgress = playerQuestMap.get(questId)
    
    if (existingProgress && existingProgress.status === 'active') {
      console.log(`Player ${playerId} already has quest ${questId}`)
      return false
    }

    // Check prerequisites
    const completedQuests = Array.from(playerQuestMap.values())
      .filter(p => p.status === 'completed')
      .map(p => p.questId)
    
    for (const prereqId of quest.prerequisites) {
      if (!completedQuests.includes(prereqId)) {
        console.log(`Player ${playerId} has not completed prerequisite ${prereqId}`)
        return false
      }
    }

    // Create quest progress
    const progress: QuestProgress = {
      questId,
      status: 'active',
      objectives: quest.objectives.map(obj => ({ ...obj, current: 0 })),
      startedAt: Date.now(),
      expiresAt: quest.timeLimit ? Date.now() + quest.timeLimit : undefined
    }

    // Store progress
    if (!this.playerQuests.has(playerId)) {
      this.playerQuests.set(playerId, new Map())
    }
    this.playerQuests.get(playerId)!.set(questId, progress)

    // Persist to database
    if (this.playerDataRepo) {
      await this.saveQuestProgress(playerId, progress)
    }

    console.log(`Player ${playerId} accepted quest ${questId}`)
    return true
  }

  /**
   * Update quest objective progress
   */
  async updateObjective(
    playerId: string,
    questId: string,
    objectiveId: string,
    progress: number
  ): Promise<void> {
    const playerQuestMap = this.playerQuests.get(playerId)
    if (!playerQuestMap) return

    const questProgress = playerQuestMap.get(questId)
    if (!questProgress || questProgress.status !== 'active') return

    // Update objective
    const objective = questProgress.objectives.find(obj => obj.id === objectiveId)
    if (!objective) return

    objective.current = Math.min(progress, objective.quantity)

    // Check if quest is complete
    const isComplete = await this.checkQuestCompletion(playerId, questId)
    if (isComplete) {
      await this.completeQuest(playerId, questId)
    } else {
      // Save progress
      if (this.playerDataRepo) {
        await this.saveQuestProgress(playerId, questProgress)
      }
    }
  }

  /**
   * Complete a quest and distribute rewards
   */
  async completeQuest(playerId: string, questId: string): Promise<void> {
    const quest = this.questDefinitions.get(questId)
    if (!quest) return

    const playerQuestMap = this.playerQuests.get(playerId)
    if (!playerQuestMap) return

    const questProgress = playerQuestMap.get(questId)
    if (!questProgress || questProgress.status !== 'active') return

    // Mark as completed
    questProgress.status = 'completed'
    questProgress.completedAt = Date.now()

    // Distribute rewards (this would be handled by a reward system)
    // For now, we'll just log it
    console.log(`Player ${playerId} completed quest ${questId}`)
    console.log('Rewards:', quest.rewards)

    // Save progress
    if (this.playerDataRepo) {
      await this.saveQuestProgress(playerId, questProgress)
    }

    // If repeatable, reset for next time
    if (quest.repeatable) {
      // Quest will be available again after expiration
    }
  }

  /**
   * Get active quests for a player
   */
  async getActiveQuests(playerId: string): Promise<QuestProgress[]> {
    const playerQuestMap = this.playerQuests.get(playerId)
    if (!playerQuestMap) {
      // Try to load from database
      if (this.playerDataRepo) {
        await this.loadPlayerQuests(playerId)
        return this.getActiveQuests(playerId)
      }
      return []
    }

    return Array.from(playerQuestMap.values())
      .filter(p => p.status === 'active')
      .filter(p => {
        // Filter expired quests
        if (p.expiresAt && Date.now() > p.expiresAt) {
          p.status = 'failed'
          return false
        }
        return true
      })
  }

  /**
   * Get available quests for a player based on level and prerequisites
   */
  async getAvailableQuests(playerId: string, level: number): Promise<Quest[]> {
    const playerQuestMap = this.playerQuests.get(playerId) || new Map()
    const completedQuests = Array.from(playerQuestMap.values())
      .filter(p => p.status === 'completed')
      .map(p => p.questId)

    const available: Quest[] = []

    for (const quest of this.questDefinitions.values()) {
      // Check level requirement
      if (quest.level > level) continue

      // Check if already active
      const existing = playerQuestMap.get(quest.id)
      if (existing && existing.status === 'active') continue

      // Check if already completed (and not repeatable)
      if (!quest.repeatable && completedQuests.includes(quest.id)) continue

      // Check prerequisites
      const hasPrerequisites = quest.prerequisites.every(prereqId =>
        completedQuests.includes(prereqId)
      )

      if (hasPrerequisites) {
        available.push(quest)
      }
    }

    return available
  }

  /**
   * Check if a quest is complete
   */
  async checkQuestCompletion(playerId: string, questId: string): Promise<boolean> {
    const playerQuestMap = this.playerQuests.get(playerId)
    if (!playerQuestMap) return false

    const questProgress = playerQuestMap.get(questId)
    if (!questProgress || questProgress.status !== 'active') return false

    // Check if all objectives are complete
    return questProgress.objectives.every(obj => obj.current >= obj.quantity)
  }

  /**
   * Handle game event (enemy killed, item collected, etc.)
   */
  async handleGameEvent(
    playerId: string,
    eventType: QuestObjectiveType,
    target: string,
    quantity: number = 1
  ): Promise<void> {
    const activeQuests = await this.getActiveQuests(playerId)

    for (const questProgress of activeQuests) {
      const quest = this.questDefinitions.get(questProgress.questId)
      if (!quest) continue

      for (const objective of questProgress.objectives) {
        if (objective.type === eventType) {
          // Check if target matches
          if (objective.target === 'any' || objective.target === target) {
            const newProgress = Math.min(objective.current + quantity, objective.quantity)
            await this.updateObjective(
              playerId,
              questProgress.questId,
              objective.id,
              newProgress
            )
          }
        }
      }
    }
  }

  /**
   * Save quest progress to database
   */
  private async saveQuestProgress(playerId: string, progress: QuestProgress): Promise<void> {
    if (!this.playerDataRepo) return

    try {
      const playerData = await this.playerDataRepo.loadPlayerData(playerId)
      if (!playerData) return

      const quests = playerData.quests || []
      const index = quests.findIndex(q => q.questId === progress.questId)
      
      if (index >= 0) {
        quests[index] = {
          questId: progress.questId,
          status: progress.status,
          objectives: progress.objectives
        }
      } else {
        quests.push({
          questId: progress.questId,
          status: progress.status,
          objectives: progress.objectives
        })
      }

      await this.playerDataRepo.savePlayerData(playerId, { quests })
    } catch (error) {
      console.error(`Failed to save quest progress for ${playerId}:`, error)
    }
  }

  /**
   * Load player quests from database
   */
  private async loadPlayerQuests(playerId: string): Promise<void> {
    if (!this.playerDataRepo) return

    try {
      const playerData = await this.playerDataRepo.loadPlayerData(playerId)
      if (!playerData || !playerData.quests) return

      const questMap = new Map<string, QuestProgress>()
      
      for (const questData of playerData.quests) {
        const quest = this.questDefinitions.get(questData.questId)
        if (!quest) continue

        // Check if daily/weekly quest expired
        if (quest.category === 'daily' || quest.category === 'weekly') {
          const progress = questData as any
          if (progress.expiresAt && Date.now() > progress.expiresAt) {
            // Quest expired, remove it
            continue
          }
        }

        questMap.set(questData.questId, {
          questId: questData.questId,
          status: questData.status as QuestStatus,
          objectives: questData.objectives,
          startedAt: Date.now(), // Would be loaded from DB
          completedAt: questData.status === 'completed' ? Date.now() : undefined,
          expiresAt: (questData as any).expiresAt
        })
      }

      this.playerQuests.set(playerId, questMap)
    } catch (error) {
      console.error(`Failed to load quests for ${playerId}:`, error)
    }
  }

  /**
   * Reset daily quests (called at midnight)
   */
  resetDailyQuests(): void {
    // Remove all daily quest progress
    for (const [playerId, questMap] of this.playerQuests.entries()) {
      const dailyQuests = Array.from(questMap.keys()).filter(questId => {
        const quest = this.questDefinitions.get(questId)
        return quest?.category === 'daily'
      })
      
      dailyQuests.forEach(questId => questMap.delete(questId))
    }
    
    console.log('Daily quests reset')
  }

  /**
   * Reset weekly quests (called weekly)
   */
  resetWeeklyQuests(): void {
    // Remove all weekly quest progress
    for (const [playerId, questMap] of this.playerQuests.entries()) {
      const weeklyQuests = Array.from(questMap.keys()).filter(questId => {
        const quest = this.questDefinitions.get(questId)
        return quest?.category === 'weekly'
      })
      
      weeklyQuests.forEach(questId => questMap.delete(questId))
    }
    
    console.log('Weekly quests reset')
  }
}

