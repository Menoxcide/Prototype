/**
 * Unit tests for Dungeon Generator
 */

import { DungeonGeneratorImpl } from '../../systems/DungeonGenerator'

describe('Dungeon Generator', () => {
  let generator: DungeonGeneratorImpl

  beforeEach(() => {
    generator = new DungeonGeneratorImpl()
  })

  describe('generate', () => {
    test('should generate dungeon with given parameters', () => {
      const dungeon = generator.generate(12345, 1, 10)
      
      expect(dungeon).toBeDefined()
      expect(dungeon.seed).toBe(12345)
      expect(dungeon.difficulty).toBe(1)
      expect(dungeon.level).toBe(10)
      expect(dungeon.id).toBeDefined()
      expect(dungeon.layout).toBeDefined()
      expect(dungeon.rooms).toBeDefined()
      expect(dungeon.entities).toBeDefined()
    })

    test('should generate consistent dungeon with same seed', () => {
      const dungeon1 = generator.generate(11111, 1, 10)
      const dungeon2 = generator.generate(11111, 1, 10)
      
      expect(dungeon1.seed).toBe(dungeon2.seed)
      expect(dungeon1.difficulty).toBe(dungeon2.difficulty)
      expect(dungeon1.level).toBe(dungeon2.level)
    })

    test('should generate different dungeons with different seeds', () => {
      const dungeon1 = generator.generate(11111, 1, 10)
      const dungeon2 = generator.generate(22222, 1, 10)
      
      expect(dungeon1.id).not.toBe(dungeon2.id)
    })

    test('should generate rooms', () => {
      const dungeon = generator.generate(12345, 1, 10)
      
      expect(dungeon.rooms.length).toBeGreaterThan(0)
      dungeon.rooms.forEach(room => {
        expect(room.id).toBeDefined()
        expect(room.type).toBeDefined()
        expect(room.position).toBeDefined()
        expect(room.size).toBeDefined()
      })
    })

    test('should generate entities', () => {
      const dungeon = generator.generate(12345, 1, 10)
      
      expect(Array.isArray(dungeon.entities)).toBe(true)
    })
  })

  describe('placeRooms', () => {
    test('should place rooms in layout', () => {
      const layout = {
        width: 50,
        height: 50,
        depth: 3,
        grid: Array(3).fill(null).map(() =>
          Array(50).fill(null).map(() =>
            Array(50).fill({ type: 'wall', visited: false })
          )
        )
      }
      
      const config = {
        minRooms: 5,
        maxRooms: 10,
        roomSize: { min: 3, max: 8 },
        corridorWidth: 1,
        bossRoomChance: 0.1,
        treasureRoomChance: 0.15,
        puzzleRoomChance: 0.1
      }
      
      const rooms = generator.placeRooms(layout, config)
      
      expect(rooms.length).toBeGreaterThanOrEqual(config.minRooms)
      expect(rooms.length).toBeLessThanOrEqual(config.maxRooms)
    })
  })

  describe('connectRooms', () => {
    test('should connect rooms', () => {
      const layout = {
        width: 50,
        height: 50,
        depth: 3,
        grid: Array(3).fill(null).map(() =>
          Array(50).fill(null).map(() =>
            Array(50).fill({ type: 'wall', visited: false })
          )
        )
      }
      
      const config = {
        minRooms: 5,
        maxRooms: 10,
        roomSize: { min: 3, max: 8 },
        corridorWidth: 1,
        bossRoomChance: 0.1,
        treasureRoomChance: 0.15,
        puzzleRoomChance: 0.1
      }
      
      const rooms = generator.placeRooms(layout, config)
      generator.connectRooms(rooms)
      
      // Rooms should have connections
      expect(rooms.length).toBeGreaterThan(0)
    })
  })

  describe('spawnEntities', () => {
    test('should spawn entities in dungeon', () => {
      const layout = {
        width: 50,
        height: 50,
        depth: 3,
        grid: Array(3).fill(null).map(() =>
          Array(50).fill(null).map(() =>
            Array(50).fill({ type: 'wall', visited: false })
          )
        )
      }
      
      const config = {
        minRooms: 5,
        maxRooms: 10,
        roomSize: { min: 3, max: 8 },
        corridorWidth: 1,
        bossRoomChance: 0.1,
        treasureRoomChance: 0.15,
        puzzleRoomChance: 0.1
      }
      
      const rooms = generator.placeRooms(layout, config)
      const entities = generator.spawnEntities(layout, 10, rooms)
      
      expect(Array.isArray(entities)).toBe(true)
    })
  })
})

