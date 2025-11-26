/**
 * Unit tests for Housing System
 */

import { HousingSystemImpl } from '../../systems/HousingSystem'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'

describe('Housing System', () => {
  let housingSystem: HousingSystemImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const playerId = 'test_player_123'

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    housingSystem = new HousingSystemImpl(dbService, playerDataRepo)
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('loadHousing', () => {
    test('should return null for new player', async () => {
      const housing = await housingSystem.loadHousing(playerId)
      expect(housing).toBeNull()
    })

    test('should return housing after creation', async () => {
      await housingSystem.createHousing(playerId)
      const housing = await housingSystem.loadHousing(playerId)
      
      expect(housing).not.toBeNull()
      expect(housing?.playerId).toBe(playerId)
    })
  })

  describe('createHousing', () => {
    test('should create housing instance', async () => {
      const housing = await housingSystem.createHousing(playerId)
      
      expect(housing).toBeDefined()
      expect(housing.playerId).toBe(playerId)
      expect(housing.level).toBe(1)
      expect(housing.furniture).toEqual([])
      expect(housing.upgrades).toEqual([])
    })

    test('should return existing housing if already created', async () => {
      const housing1 = await housingSystem.createHousing(playerId)
      const housing2 = await housingSystem.createHousing(playerId)
      
      expect(housing1.id).toBe(housing2.id)
    })
  })

  describe('placeFurniture', () => {
    test('should place furniture in housing', async () => {
      await housingSystem.createHousing(playerId)
      const placed = await housingSystem.placeFurniture(
        playerId,
        'chair_1',
        { x: 5, y: 0, z: 5 },
        0
      )
      
      expect(placed).toBe(true)
      
      const housing = await housingSystem.loadHousing(playerId)
      expect(housing?.furniture.length).toBeGreaterThan(0)
    })

    test('should return false for invalid player', async () => {
      const placed = await housingSystem.placeFurniture(
        'invalid_player',
        'chair_1',
        { x: 5, y: 0, z: 5 },
        0
      )
      expect(placed).toBe(false)
    })
  })

  describe('removeFurniture', () => {
    test('should remove furniture from housing', async () => {
      await housingSystem.createHousing(playerId)
      await housingSystem.placeFurniture(playerId, 'chair_1', { x: 5, y: 0, z: 5 }, 0)
      
      const housing = await housingSystem.loadHousing(playerId)
      const furnitureId = housing?.furniture[0].id
      if (!furnitureId) return
      
      const removed = await housingSystem.removeFurniture(playerId, furnitureId)
      expect(removed).toBe(true)
      
      const updatedHousing = await housingSystem.loadHousing(playerId)
      expect(updatedHousing?.furniture.length).toBe(0)
    })
  })

  describe('upgradeHousing', () => {
    test('should upgrade housing', async () => {
      await housingSystem.createHousing(playerId)
      const upgraded = await housingSystem.upgradeHousing(playerId, 'size')
      
      expect(upgraded).toBe(true)
    })
  })

  describe('visitHousing', () => {
    test('should allow visiting other player housing', async () => {
      const ownerId = 'owner_player'
      await housingSystem.createHousing(ownerId)
      
      const housing = await housingSystem.visitHousing(playerId, ownerId)
      expect(housing).not.toBeNull()
      expect(housing?.playerId).toBe(ownerId)
    })

    test('should return null for non-existent housing', async () => {
      const housing = await housingSystem.visitHousing(playerId, 'non_existent_player')
      expect(housing).toBeNull()
    })
  })
})

