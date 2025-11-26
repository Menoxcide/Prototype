/**
 * Unit tests for Dungeon System
 */

import { DungeonSystemImpl } from '../../systems/DungeonSystem'
import { DungeonGeneratorImpl } from '../../systems/DungeonGenerator'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'

describe('Dungeon System', () => {
  let dungeonSystem: DungeonSystemImpl
  let generator: DungeonGeneratorImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const playerId = 'test_player_123'

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    generator = new DungeonGeneratorImpl()
    dungeonSystem = new DungeonSystemImpl(generator, dbService, playerDataRepo)
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('createDungeon', () => {
    test('should create dungeon with given parameters', () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      
      expect(dungeon).toBeDefined()
      expect(dungeon.seed).toBe(12345)
      expect(dungeon.difficulty).toBe(1)
      expect(dungeon.level).toBe(10)
      expect(dungeon.rooms.length).toBeGreaterThan(0)
    })

    test('should generate different dungeons with different seeds', () => {
      const dungeon1 = dungeonSystem.createDungeon(11111, 1, 10)
      const dungeon2 = dungeonSystem.createDungeon(22222, 1, 10)
      
      expect(dungeon1.id).not.toBe(dungeon2.id)
    })
  })

  describe('enterDungeon', () => {
    test('should allow player to enter dungeon', async () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      const entered = await dungeonSystem.enterDungeon(playerId, dungeon.id)
      
      expect(entered).toBe(true)
    })

    test('should return false for invalid dungeon ID', async () => {
      const entered = await dungeonSystem.enterDungeon(playerId, 'invalid_dungeon')
      expect(entered).toBe(false)
    })

    test('should return true if already in dungeon', async () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      await dungeonSystem.enterDungeon(playerId, dungeon.id)
      
      const entered = await dungeonSystem.enterDungeon(playerId, dungeon.id)
      expect(entered).toBe(true)
    })

    test('should return false if player in different dungeon', async () => {
      const dungeon1 = dungeonSystem.createDungeon(11111, 1, 10)
      const dungeon2 = dungeonSystem.createDungeon(22222, 1, 10)
      
      await dungeonSystem.enterDungeon(playerId, dungeon1.id)
      const entered = await dungeonSystem.enterDungeon(playerId, dungeon2.id)
      
      expect(entered).toBe(false)
    })
  })

  describe('exitDungeon', () => {
    test('should remove player from dungeon', async () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      await dungeonSystem.enterDungeon(playerId, dungeon.id)
      
      await dungeonSystem.exitDungeon(playerId, dungeon.id)
      
      const playerDungeon = dungeonSystem.getPlayerDungeon(playerId)
      expect(playerDungeon).toBeNull()
    })
  })

  describe('getDungeon', () => {
    test('should return dungeon by ID', () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      const retrieved = dungeonSystem.getDungeon(dungeon.id)
      
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(dungeon.id)
    })

    test('should return null for invalid ID', () => {
      const retrieved = dungeonSystem.getDungeon('invalid_id')
      expect(retrieved).toBeNull()
    })
  })

  describe('getPlayerDungeon', () => {
    test('should return dungeon player is in', async () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      await dungeonSystem.enterDungeon(playerId, dungeon.id)
      
      const playerDungeon = dungeonSystem.getPlayerDungeon(playerId)
      expect(playerDungeon).not.toBeNull()
      expect(playerDungeon?.id).toBe(dungeon.id)
    })

    test('should return null when player not in dungeon', () => {
      const playerDungeon = dungeonSystem.getPlayerDungeon(playerId)
      expect(playerDungeon).toBeNull()
    })
  })

  describe('clearRoom', () => {
    test('should mark room as cleared', () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      const roomId = dungeon.rooms[0].id
      
      dungeonSystem.clearRoom(dungeon.id, roomId)
      
      const updatedDungeon = dungeonSystem.getDungeon(dungeon.id)
      const room = updatedDungeon?.rooms.find(r => r.id === roomId)
      expect(room?.cleared).toBe(true)
    })
  })

  describe('defeatEntity', () => {
    test('should mark entity as defeated', () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      const entityId = dungeon.entities[0]?.id
      if (!entityId) return
      
      dungeonSystem.defeatEntity(dungeon.id, entityId)
      
      const updatedDungeon = dungeonSystem.getDungeon(dungeon.id)
      const entity = updatedDungeon?.entities.find(e => e.id === entityId)
      expect(entity?.defeated).toBe(true)
    })
  })

  describe('getDungeonProgress', () => {
    test('should return progress for player in dungeon', async () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      await dungeonSystem.enterDungeon(playerId, dungeon.id)
      
      const progress = await dungeonSystem.getDungeonProgress(playerId, dungeon.id)
      
      expect(progress).not.toBeNull()
      expect(progress?.dungeonId).toBe(dungeon.id)
      expect(progress?.currentFloor).toBeGreaterThanOrEqual(0)
    })

    test('should return null for player not in dungeon', async () => {
      const dungeon = dungeonSystem.createDungeon(12345, 1, 10)
      const progress = await dungeonSystem.getDungeonProgress(playerId, dungeon.id)
      
      expect(progress).toBeNull()
    })
  })
})

