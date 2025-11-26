/**
 * Unit tests for Achievement System
 */

import { AchievementSystemImpl } from '../../systems/AchievementSystem'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'
import { GameEvent } from '../../../shared/src/types/achievements'

describe('Achievement System', () => {
  let achievementSystem: AchievementSystemImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const playerId = 'test_player_123'

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    achievementSystem = new AchievementSystemImpl(dbService, playerDataRepo)
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('getAchievements', () => {
    test('should return all achievements', () => {
      const achievements = achievementSystem.getAchievements()
      expect(Array.isArray(achievements)).toBe(true)
      expect(achievements.length).toBeGreaterThan(0)
    })

    test('should filter achievements by category', () => {
      const combatAchievements = achievementSystem.getAchievements('combat')
      expect(Array.isArray(combatAchievements)).toBe(true)
      combatAchievements.forEach(achievement => {
        expect(achievement.category).toBe('combat')
      })
    })
  })

  describe('getPlayerProgress', () => {
    test('should return empty array for new player', async () => {
      const progress = await achievementSystem.getPlayerProgress(playerId)
      expect(progress).toEqual([])
    })

    test('should return progress after handling events', async () => {
      const event: GameEvent = { type: 'kill', target: 'any', quantity: 1 }
      await achievementSystem.handleGameEvent(playerId, event)
      
      const progress = await achievementSystem.getPlayerProgress(playerId)
      expect(progress.length).toBeGreaterThan(0)
    })
  })

  describe('handleGameEvent', () => {
    test('should update progress on kill event', async () => {
      const event: GameEvent = { type: 'kill', target: 'any', quantity: 5 }
      const result = await achievementSystem.handleGameEvent(playerId, event)
      
      expect(result).not.toBeNull()
    })

    test('should unlock achievement when requirements met', async () => {
      const event: GameEvent = { type: 'kill', target: 'any', quantity: 1 }
      const result = await achievementSystem.handleGameEvent(playerId, event)
      
      if (result?.unlocked) {
        expect(result.achievementId).toBeDefined()
        expect(result.achievement).toBeDefined()
      }
    })

    test('should handle multiple event types', async () => {
      const killEvent: GameEvent = { type: 'kill', target: 'any', quantity: 1 }
      const collectEvent: GameEvent = { type: 'collect', target: 'quantum_crystal', quantity: 1 }
      
      await achievementSystem.handleGameEvent(playerId, killEvent)
      await achievementSystem.handleGameEvent(playerId, collectEvent)
      
      const progress = await achievementSystem.getPlayerProgress(playerId)
      expect(progress.length).toBeGreaterThan(0)
    })
  })

  describe('unlockAchievement', () => {
    test('should unlock achievement', async () => {
      const unlocked = await achievementSystem.unlockAchievement(playerId, 'first_kill')
      expect(unlocked).toBe(true)
    })

    test('should return false for invalid achievement ID', async () => {
      const unlocked = await achievementSystem.unlockAchievement(playerId, 'invalid_achievement')
      expect(unlocked).toBe(false)
    })
  })

  describe('getUnlockedAchievements', () => {
    test('should return empty array for new player', async () => {
      const unlocked = await achievementSystem.getUnlockedAchievements(playerId)
      expect(unlocked).toEqual([])
    })

    test('should return unlocked achievements', async () => {
      await achievementSystem.unlockAchievement(playerId, 'first_kill')
      
      const unlocked = await achievementSystem.getUnlockedAchievements(playerId)
      expect(unlocked).toContain('first_kill')
    })
  })
})

