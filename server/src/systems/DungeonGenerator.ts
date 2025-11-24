/**
 * DungeonGenerator - Procedural dungeon generation system
 * Generates unique dungeon layouts using seed-based algorithms
 */

import { Dungeon, DungeonLayout, Room, Cell, DungeonBoundingBox, DungeonConfig, DungeonEntity } from '../../../shared/src/types/dungeons'

export interface DungeonGenerator {
  generate(seed: number, difficulty: number, level: number): Dungeon
  placeRooms(layout: DungeonLayout, config: DungeonConfig): Room[]
  connectRooms(rooms: Room[]): void
  spawnEntities(layout: DungeonLayout, level: number, rooms: Room[]): DungeonEntity[]
}

export class DungeonGeneratorImpl implements DungeonGenerator {
  private defaultConfig: DungeonConfig = {
    minRooms: 5,
    maxRooms: 15,
    roomSize: { min: 3, max: 8 },
    corridorWidth: 1,
    bossRoomChance: 0.1,
    treasureRoomChance: 0.15,
    puzzleRoomChance: 0.1
  }

  /**
   * Generate a complete dungeon
   */
  generate(seed: number, difficulty: number, level: number): Dungeon {
    const config = this.getConfigForDifficulty(difficulty)
    
    // Initialize layout
    const layout = this.createLayout(50, 50, 3) // 50x50x3 grid
    
    // Place rooms
    const rooms = this.placeRooms(layout, config)
    
    // Connect rooms
    this.connectRooms(rooms)
    
    // Spawn entities
    const entities = this.spawnEntities(layout, level, rooms)
    
    const dungeon: Dungeon = {
      id: `dungeon_${seed}_${Date.now()}`,
      seed,
      difficulty,
      level,
      layout,
      rooms,
      entities,
      completed: false,
      startedAt: Date.now(),
      playerIds: []
    }
    
    return dungeon
  }

  /**
   * Get configuration based on difficulty
   */
  private getConfigForDifficulty(difficulty: number): DungeonConfig {
    const baseRooms = 5 + Math.floor(difficulty * 2)
    return {
      ...this.defaultConfig,
      minRooms: baseRooms,
      maxRooms: baseRooms + 10,
      roomSize: {
        min: 3 + Math.floor(difficulty * 0.5),
        max: 8 + Math.floor(difficulty * 1.5)
      }
    }
  }

  /**
   * Create initial layout grid
   */
  private createLayout(width: number, height: number, depth: number): DungeonLayout {
    const grid: Cell[][][] = []
    
    for (let z = 0; z < depth; z++) {
      const floor: Cell[][] = []
      for (let y = 0; y < height; y++) {
        const row: Cell[] = []
        for (let x = 0; x < width; x++) {
          row.push({
            type: 'wall',
            visited: false
          })
        }
        floor.push(row)
      }
      grid.push(floor)
    }
    
    return { width, height, depth, grid }
  }

  /**
   * Place rooms in the dungeon layout
   */
  placeRooms(layout: DungeonLayout, config: DungeonConfig): Room[] {
    const rooms: Room[] = []
    const rng = this.createRNG(12345) // Use seed for reproducibility
    
    const numRooms = config.minRooms + Math.floor(rng() * (config.maxRooms - config.minRooms))
    
    // Place start room at center
    const startRoom = this.createRoom('start', layout.width / 2, layout.height / 2, 0, config, rng)
    rooms.push(startRoom)
    this.fillRoom(layout, startRoom, 0)
    
    // Place other rooms
    for (let i = 1; i < numRooms; i++) {
      let attempts = 0
      let placed = false
      
      while (!placed && attempts < 50) {
        const x = Math.floor(rng() * (layout.width - 10)) + 5
        const y = Math.floor(rng() * (layout.height - 10)) + 5
        const z = Math.floor(rng() * layout.depth)
        
        const room = this.createRoom(this.getRoomType(i, numRooms, rng), x, y, z, config, rng)
        
        // Check if room overlaps with existing rooms
        if (!this.roomOverlaps(room, rooms)) {
          rooms.push(room)
          this.fillRoom(layout, room, z)
          placed = true
        }
        
        attempts++
      }
    }
    
    return rooms
  }

  /**
   * Create a room
   */
  private createRoom(
    type: 'start' | 'normal' | 'boss' | 'treasure' | 'puzzle',
    centerX: number,
    centerY: number,
    z: number,
    config: DungeonConfig,
    rng: () => number
  ): Room {
    const width = config.roomSize.min + Math.floor(rng() * (config.roomSize.max - config.roomSize.min))
    const height = config.roomSize.min + Math.floor(rng() * (config.roomSize.max - config.roomSize.min))
    
    const bounds: DungeonBoundingBox = {
      minX: Math.floor(centerX - width / 2),
      maxX: Math.floor(centerX + width / 2),
      minY: Math.floor(centerY - height / 2),
      maxY: Math.floor(centerY + height / 2),
      minZ: z,
      maxZ: z
    }
    
    return {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      bounds,
      connections: [],
      cleared: false,
      entities: []
    }
  }

  /**
   * Get room type based on position and chance
   */
  private getRoomType(index: number, total: number, rng: () => number): 'start' | 'normal' | 'boss' | 'treasure' | 'puzzle' {
    if (index === 0) return 'start'
    if (index === total - 1) return 'boss' // Last room is boss
    
    const rand = rng()
    if (rand < 0.1) return 'puzzle'
    if (rand < 0.25) return 'treasure'
    return 'normal'
  }

  /**
   * Check if room overlaps with existing rooms
   */
  private roomOverlaps(room: Room, existingRooms: Room[]): boolean {
    for (const existing of existingRooms) {
      if (room.bounds.minZ !== existing.bounds.minZ) continue
      
      if (
        room.bounds.minX < existing.bounds.maxX + 2 &&
        room.bounds.maxX + 2 > existing.bounds.minX &&
        room.bounds.minY < existing.bounds.maxY + 2 &&
        room.bounds.maxY + 2 > existing.bounds.minY
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Fill room cells in layout
   */
  private fillRoom(layout: DungeonLayout, room: Room, z: number): void {
    for (let y = room.bounds.minY; y <= room.bounds.maxY; y++) {
      for (let x = room.bounds.minX; x <= room.bounds.maxX; x++) {
        if (x >= 0 && x < layout.width && y >= 0 && y < layout.height) {
          const cell = layout.grid[z][y][x]
          cell.type = room.type === 'start' ? 'spawn' : room.type === 'boss' ? 'boss' : 'floor'
          cell.roomId = room.id
        }
      }
    }
  }

  /**
   * Connect rooms with corridors
   */
  connectRooms(rooms: Room[]): void {
    if (rooms.length <= 1) return
    
    // Create minimum spanning tree to ensure all rooms are connected
    const connected: Set<string> = new Set([rooms[0].id])
    const unconnected = rooms.slice(1)
    
    while (unconnected.length > 0) {
      let minDistance = Infinity
      let closestRoom: Room | null = null
      let closestConnected: Room | null = null
      
      for (const connectedRoom of rooms.filter(r => connected.has(r.id))) {
        for (const unconnectedRoom of unconnected) {
          const distance = this.roomDistance(connectedRoom, unconnectedRoom)
          if (distance < minDistance) {
            minDistance = distance
            closestRoom = unconnectedRoom
            closestConnected = connectedRoom
          }
        }
      }
      
      if (closestRoom && closestConnected) {
        closestRoom.connections.push(closestConnected.id)
        closestConnected.connections.push(closestRoom.id)
        connected.add(closestRoom.id)
        unconnected.splice(unconnected.indexOf(closestRoom), 1)
      } else {
        break
      }
    }
    
    // Add some extra connections for variety
    const rng = this.createRNG(54321)
    for (let i = 0; i < rooms.length * 0.3; i++) {
      const room1 = rooms[Math.floor(rng() * rooms.length)]
      const room2 = rooms[Math.floor(rng() * rooms.length)]
      
      if (room1.id !== room2.id && !room1.connections.includes(room2.id)) {
        const distance = this.roomDistance(room1, room2)
        if (distance < 20 && rng() < 0.3) {
          room1.connections.push(room2.id)
          room2.connections.push(room1.id)
        }
      }
    }
  }

  /**
   * Calculate distance between two rooms
   */
  private roomDistance(room1: Room, room2: Room): number {
    const center1X = (room1.bounds.minX + room1.bounds.maxX) / 2
    const center1Y = (room1.bounds.minY + room1.bounds.maxY) / 2
    const center2X = (room2.bounds.minX + room2.bounds.maxX) / 2
    const center2Y = (room2.bounds.minY + room2.bounds.maxY) / 2
    
    return Math.sqrt(
      Math.pow(center1X - center2X, 2) +
      Math.pow(center1Y - center2Y, 2)
    )
  }

  /**
   * Spawn entities in dungeon rooms
   */
  spawnEntities(layout: DungeonLayout, level: number, rooms: Room[]): DungeonEntity[] {
    const entities: DungeonEntity[] = []
    const rng = this.createRNG(99999)
    
    for (const room of rooms) {
      if (room.type === 'start') continue
      
      const centerX = (room.bounds.minX + room.bounds.maxX) / 2
      const centerY = (room.bounds.minY + room.bounds.maxY) / 2
      const z = room.bounds.minZ
      
      if (room.type === 'boss') {
        // Spawn boss
        entities.push({
          id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'boss',
          roomId: room.id,
          position: { x: centerX, y: 0, z: centerY },
          data: {
            enemyType: 'dungeon_boss',
            level: level + 5,
            health: 1000 + level * 100
          },
          spawned: false
        })
      } else if (room.type === 'treasure') {
        // Spawn treasure
        entities.push({
          id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'loot',
          roomId: room.id,
          position: { x: centerX, y: 0, z: centerY },
          data: {
            items: this.generateTreasure(level, rng)
          },
          spawned: false
        })
      } else if (room.type === 'normal') {
        // Spawn enemies
        const numEnemies = 2 + Math.floor(rng() * 3)
        for (let i = 0; i < numEnemies; i++) {
          const offsetX = (rng() - 0.5) * (room.bounds.maxX - room.bounds.minX) * 0.6
          const offsetZ = (rng() - 0.5) * (room.bounds.maxY - room.bounds.minY) * 0.6
          
          entities.push({
            id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'enemy',
            roomId: room.id,
            position: {
              x: centerX + offsetX,
              y: 0,
              z: centerY + offsetZ
            },
            data: {
              enemyType: this.getEnemyTypeForLevel(level, rng),
              level: level + Math.floor(rng() * 3),
              health: 100 + level * 20
            },
            spawned: false
          })
        }
      } else if (room.type === 'puzzle') {
        // Spawn puzzle
        entities.push({
          id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'puzzle',
          roomId: room.id,
          position: { x: centerX, y: 0, z: centerY },
          data: {
            puzzleType: 'pressure_plates',
            solved: false
          },
          spawned: false
        })
      }
    }
    
    return entities
  }

  /**
   * Get enemy type based on level
   */
  private getEnemyTypeForLevel(level: number, rng: () => number): string {
    const types = ['drone', 'cyborg', 'android', 'void_walker']
    const index = Math.min(Math.floor(level / 5), types.length - 1)
    return types[index] || types[0]
  }

  /**
   * Generate treasure items
   */
  private generateTreasure(level: number, rng: () => number): Array<{ itemId: string; quantity: number }> {
    const items: Array<{ itemId: string; quantity: number }> = []
    
    // Always give credits
    items.push({
      itemId: 'credits',
      quantity: 100 + level * 50
    })
    
    // Chance for items
    if (rng() < 0.7) {
      items.push({
        itemId: 'quantum_crystal',
        quantity: 1 + Math.floor(rng() * 3)
      })
    }
    
    return items
  }

  /**
   * Create seeded RNG
   */
  private createRNG(seed: number): () => number {
    let state = seed
    return () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
  }
}

