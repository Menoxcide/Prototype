/**
 * Shared dungeon types used across client and server
 */

export interface Dungeon {
  id: string
  seed: number
  difficulty: number
  level: number
  layout: DungeonLayout
  rooms: Room[]
  entities: DungeonEntity[]
  completed: boolean
  completedAt?: number
  startedAt: number
  playerIds: string[] // Players currently in dungeon
}

export interface DungeonLayout {
  width: number
  height: number
  depth: number
  grid: Cell[][][]
}

export interface Cell {
  type: 'wall' | 'floor' | 'door' | 'spawn' | 'exit' | 'boss'
  roomId?: string
  visited: boolean
}

export interface Room {
  id: string
  type: 'start' | 'normal' | 'boss' | 'treasure' | 'puzzle'
  bounds: DungeonBoundingBox
  connections: string[] // Room IDs this room connects to
  cleared: boolean
  entities: string[] // Entity IDs in this room
}

export interface DungeonBoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface DungeonEntity {
  id: string
  type: 'enemy' | 'boss' | 'loot' | 'puzzle'
  roomId: string
  position: { x: number; y: number; z: number }
  data: any // Entity-specific data (enemy type, loot items, etc.)
  spawned: boolean
  defeated?: boolean
}

export interface DungeonConfig {
  minRooms: number
  maxRooms: number
  roomSize: { min: number; max: number }
  corridorWidth: number
  bossRoomChance: number
  treasureRoomChance: number
  puzzleRoomChance: number
}

export interface DungeonProgress {
  dungeonId: string
  currentFloor: number
  roomsCleared: string[]
  entitiesDefeated: string[]
  startedAt: number
  completedAt?: number
}

