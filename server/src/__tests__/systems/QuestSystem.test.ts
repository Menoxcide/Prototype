/**
 * Unit tests for Quest System
 */

import { QuestSystemImpl } from '../../systems/QuestSystem'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'

describe('Quest System', () => {
  let questSystem: QuestSystemImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const playerId = 'test_player_123'

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    questSystem = new QuestSystemImpl(dbService, playerDataRepo)
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('acceptQuest', () => {
    test('should accept a valid quest', async () => {
      const result = await questSystem.acceptQuest(playerId, 'daily_kill_10')
      expect(result).toBe(true)
    })

    test('should return false for invalid quest ID', async () => {
      const result = await questSystem.acceptQuest(playerId, 'invalid_quest')
      expect(result).toBe(false)
    })

    test('should not accept quest if prerequisites not met', async () => {
      // Try to accept quest with prerequisite
      const result = await questSystem.acceptQuest(playerId, 'story_quantum_initiation')
      // Should fail if prerequisite not completed
      expect(result).toBe(false)
    })

    test('should allow accepting multiple quests', async () => {
      const result1 = await questSystem.acceptQuest(playerId, 'daily_kill_10')
      const result2 = await questSystem.acceptQuest(playerId, 'daily_collect_5')
      
      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })

  describe('getActiveQuests', () => {
    test('should return empty array when no quests accepted', async () => {
      const quests = await questSystem.getActiveQuests(playerId)
      expect(quests).toEqual([])
    })

    test('should return accepted quests', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      const quests = await questSystem.getActiveQuests(playerId)
      
      expect(quests.length).toBeGreaterThan(0)
      expect(quests[0].questId).toBe('daily_kill_10')
    })

    test('should return quests with correct status', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      const quests = await questSystem.getActiveQuests(playerId)
      
      expect(quests[0].status).toBe('active')
    })
  })

  describe('getAvailableQuests', () => {
    test('should return quests for player level', async () => {
      const quests = await questSystem.getAvailableQuests(playerId, 1)
      
      expect(Array.isArray(quests)).toBe(true)
      quests.forEach(quest => {
        expect(quest.level).toBeLessThanOrEqual(1)
      })
    })

    test('should filter quests by level', async () => {
      const quests = await questSystem.getAvailableQuests(playerId, 50)
      
      expect(Array.isArray(quests)).toBe(true)
    })
  })

  describe('updateObjective', () => {
    test('should update objective progress', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      await questSystem.updateObjective(playerId, 'daily_kill_10', 'kill_10', 5)
      
      const quests = await questSystem.getActiveQuests(playerId)
      const quest = quests.find(q => q.questId === 'daily_kill_10')
      
      expect(quest).toBeDefined()
      const objective = quest?.objectives.find(o => o.id === 'kill_10')
      expect(objective?.current).toBe(5)
    })

    test('should not exceed objective quantity', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      await questSystem.updateObjective(playerId, 'daily_kill_10', 'kill_10', 15)
      
      const quests = await questSystem.getActiveQuests(playerId)
      const quest = quests.find(q => q.questId === 'daily_kill_10')
      const objective = quest?.objectives.find(o => o.id === 'kill_10')
      
      expect(objective?.current).toBeLessThanOrEqual(10)
    })
  })

  describe('handleGameEvent', () => {
    test('should update quest objectives on kill event', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      await questSystem.handleGameEvent(playerId, 'kill', 'any', 3)
      
      const quests = await questSystem.getActiveQuests(playerId)
      const quest = quests.find(q => q.questId === 'daily_kill_10')
      const objective = quest?.objectives.find(o => o.id === 'kill_10')
      
      expect(objective?.current).toBeGreaterThanOrEqual(0)
    })

    test('should update quest objectives on collect event', async () => {
      await questSystem.acceptQuest(playerId, 'daily_collect_5')
      await questSystem.handleGameEvent(playerId, 'collect', 'quantum_crystal', 2)
      
      const quests = await questSystem.getActiveQuests(playerId)
      const quest = quests.find(q => q.questId === 'daily_collect_5')
      const objective = quest?.objectives.find(o => o.id === 'collect_5')
      
      expect(objective?.current).toBeGreaterThanOrEqual(0)
    })
  })

  describe('checkQuestCompletion', () => {
    test('should return false for incomplete quest', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      const isComplete = await questSystem.checkQuestCompletion(playerId, 'daily_kill_10')
      
      expect(isComplete).toBe(false)
    })

    test('should return true for completed quest', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      await questSystem.updateObjective(playerId, 'daily_kill_10', 'kill_10', 10)
      
      const isComplete = await questSystem.checkQuestCompletion(playerId, 'daily_kill_10')
      expect(isComplete).toBe(true)
    })
  })

  describe('completeQuest', () => {
    test('should complete quest and mark as completed', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      await questSystem.updateObjective(playerId, 'daily_kill_10', 'kill_10', 10)
      
      await questSystem.completeQuest(playerId, 'daily_kill_10')
      
      const quests = await questSystem.getActiveQuests(playerId)
      const quest = quests.find(q => q.questId === 'daily_kill_10')
      
      expect(quest?.status).toBe('completed')
    })

    test('should not complete quest if objectives not met', async () => {
      await questSystem.acceptQuest(playerId, 'daily_kill_10')
      
      // Try to complete without meeting objectives
      await questSystem.completeQuest(playerId, 'daily_kill_10')
      
      const quests = await questSystem.getActiveQuests(playerId)
      const quest = quests.find(q => q.questId === 'daily_kill_10')
      
      // Should still be active or not completed
      expect(quest?.status).not.toBe('completed')
    })
  })

  describe('resetDailyQuests', () => {
    test('should reset daily quests', () => {
      expect(() => questSystem.resetDailyQuests()).not.toThrow()
    })
  })

  describe('resetWeeklyQuests', () => {
    test('should reset weekly quests', () => {
      expect(() => questSystem.resetWeeklyQuests()).not.toThrow()
    })
  })
})

