/**
 * Unit tests for Battle Pass System
 */

import { BattlePassSystemImpl } from '../../systems/BattlePassSystem'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'

describe('Battle Pass System', () => {
  let battlePassSystem: BattlePassSystemImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const playerId = 'test_player_123'

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    battlePassSystem = new BattlePassSystemImpl(dbService, playerDataRepo)
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('getCurrentSeason', () => {
    test('should return current season', () => {
      const season = battlePassSystem.getCurrentSeason()
      
      expect(season).not.toBeNull()
      expect(season?.id).toBeDefined()
      expect(season?.name).toBeDefined()
      expect(season?.season).toBeGreaterThan(0)
    })
  })

  describe('addExperience', () => {
    test('should add experience to player progress', async () => {
      await battlePassSystem.addExperience(playerId, 100)
      
      const progress = await battlePassSystem.getProgress(playerId)
      expect(progress).not.toBeNull()
      expect(progress?.currentXP).toBeGreaterThanOrEqual(100)
    })

    test('should accumulate experience', async () => {
      await battlePassSystem.addExperience(playerId, 50)
      await battlePassSystem.addExperience(playerId, 75)
      
      const progress = await battlePassSystem.getProgress(playerId)
      expect(progress?.currentXP).toBeGreaterThanOrEqual(125)
    })

    test('should unlock tiers when XP threshold reached', async () => {
      // Add enough XP to unlock tier 1
      await battlePassSystem.addExperience(playerId, 200)
      
      const progress = await battlePassSystem.getProgress(playerId)
      expect(progress?.currentTier).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getProgress', () => {
    test('should return null for new player', async () => {
      const progress = await battlePassSystem.getProgress('new_player')
      expect(progress).toBeNull()
    })

    test('should return progress after adding XP', async () => {
      await battlePassSystem.addExperience(playerId, 100)
      
      const progress = await battlePassSystem.getProgress(playerId)
      expect(progress).not.toBeNull()
      expect(progress?.season).toBeGreaterThan(0)
      expect(progress?.currentTier).toBeGreaterThanOrEqual(0)
      expect(progress?.currentXP).toBeGreaterThanOrEqual(0)
    })
  })

  describe('unlockTier', () => {
    test('should unlock tier when called', async () => {
      await battlePassSystem.addExperience(playerId, 200)
      await battlePassSystem.unlockTier(playerId, 1)
      
      const progress = await battlePassSystem.getProgress(playerId)
      expect(progress?.currentTier).toBeGreaterThanOrEqual(1)
    })
  })

  describe('unlockPremium', () => {
    test('should unlock premium track', async () => {
      await battlePassSystem.unlockPremium(playerId)
      
      const progress = await battlePassSystem.getProgress(playerId)
      expect(progress?.premiumUnlocked).toBe(true)
    })
  })

  describe('claimReward', () => {
    test('should claim free reward', async () => {
      await battlePassSystem.addExperience(playerId, 200)
      await battlePassSystem.unlockTier(playerId, 1)
      
      const claimed = await battlePassSystem.claimReward(playerId, 1, 'free')
      expect(claimed).toBe(true)
    })

    test('should claim premium reward when unlocked', async () => {
      await battlePassSystem.addExperience(playerId, 200)
      await battlePassSystem.unlockTier(playerId, 1)
      await battlePassSystem.unlockPremium(playerId)
      
      const claimed = await battlePassSystem.claimReward(playerId, 1, 'premium')
      expect(claimed).toBe(true)
    })

    test('should not claim premium reward when not unlocked', async () => {
      await battlePassSystem.addExperience(playerId, 200)
      await battlePassSystem.unlockTier(playerId, 1)
      
      const claimed = await battlePassSystem.claimReward(playerId, 1, 'premium')
      expect(claimed).toBe(false)
    })

    test('should not claim reward for ununlocked tier', async () => {
      const claimed = await battlePassSystem.claimReward(playerId, 10, 'free')
      expect(claimed).toBe(false)
    })

    test('should not claim same reward twice', async () => {
      await battlePassSystem.addExperience(playerId, 200)
      await battlePassSystem.unlockTier(playerId, 1)
      
      const claimed1 = await battlePassSystem.claimReward(playerId, 1, 'free')
      const claimed2 = await battlePassSystem.claimReward(playerId, 1, 'free')
      
      expect(claimed1).toBe(true)
      expect(claimed2).toBe(false) // Already claimed
    })
  })
})

