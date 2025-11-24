import { Enemy } from '../types'

export interface Dungeon {
  id: string
  name: string
  level: number
  minPlayers: number
  maxPlayers: number
  enemies: Enemy[]
  rewards: { itemId: string; quantity: number }[]
  completed: boolean
}

export interface DungeonPortal {
  id: string
  position: { x: number; y: number; z: number }
  dungeonId: string
  dungeonName: string
  requiredLevel: number
}

export function generateDungeon(
  dungeonId: string,
  level: number,
  playerCount: number
): Dungeon {
  const enemyCount = 5 + playerCount * 2
  const enemies: Enemy[] = []

  for (let i = 0; i < enemyCount; i++) {
    const angle = (i / enemyCount) * Math.PI * 2
    const distance = 5 + Math.random() * 5
    enemies.push({
      id: `dungeon_enemy_${Date.now()}_${i}`,
      type: 'cyber_drone',
      position: {
        x: Math.cos(angle) * distance,
        y: 0,
        z: Math.sin(angle) * distance
      },
      rotation: 0,
      health: 100 + level * 10,
      maxHealth: 100 + level * 10,
      level: level
    })
  }

  // Generate rewards based on dungeon level
  const rewards = [
    { itemId: 'cyber_scrap', quantity: 10 + level * 2 },
    { itemId: 'quantum_crystal', quantity: 2 + level },
    { itemId: 'health_pack', quantity: 3 }
  ]

  if (level >= 10) {
    rewards.push({ itemId: 'quantum_blade', quantity: 1 })
  }

  return {
    id: dungeonId,
    name: `Dungeon Level ${level}`,
    level,
    minPlayers: 1,
    maxPlayers: 4,
    enemies,
    rewards,
    completed: false
  }
}

export function getDungeonPortals(): DungeonPortal[] {
  return [
    {
      id: 'portal_1',
      position: { x: 20, y: 0, z: 20 },
      dungeonId: 'dungeon_1',
      dungeonName: 'Quantum Ruins',
      requiredLevel: 5
    },
    {
      id: 'portal_2',
      position: { x: -20, y: 0, z: -20 },
      dungeonId: 'dungeon_2',
      dungeonName: 'Void Catacombs',
      requiredLevel: 15
    },
    {
      id: 'portal_3',
      position: { x: 30, y: 0, z: -30 },
      dungeonId: 'dungeon_3',
      dungeonName: 'Neon Depths',
      requiredLevel: 25
    }
  ]
}

