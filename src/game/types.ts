// Core game types

export type Race = 'human' | 'cyborg' | 'android' | 'voidborn' | 'quantum'

export interface Player {
  id: string
  name: string
  race: Race
  level: number
  xp: number
  xpToNext: number
  credits: number
  position: { x: number; y: number; z: number }
  rotation: number
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  guildId?: string
  guildTag?: string
  tradition?: 'hermetic' | 'shamanic' | 'technomancer' | 'adept' | 'none'
}

export interface Spell {
  id: string
  name: string
  description: string
  manaCost: number
  cooldown: number
  damage: number
  range: number
  castTime: number
  icon: string
  color: string
  category?: 'combat' | 'manipulation' | 'detection' | 'health' | 'illusion'
  tradition?: 'hermetic' | 'shamanic' | 'technomancer' | 'adept' | 'none'
}

export interface Item {
  id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'consumable' | 'resource' | 'material'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  value: number
  icon: string
  stackable: boolean
  maxStack?: number
}

export interface InventoryItem {
  item: Item
  quantity: number
  slot?: number
}

export interface Recipe {
  id: string
  name: string
  description: string
  ingredients: { itemId: string; quantity: number }[]
  result: { itemId: string; quantity: number }
  craftingTime: number
  level: number
}

export interface Zone {
  id: string
  name: string
  description: string
  levelRange: [number, number]
  enemies: string[]
  resources: string[]
  color: string
}

export interface Enemy {
  id: string
  type: string
  position: { x: number; y: number; z: number }
  rotation: number
  health: number
  maxHealth: number
  level: number
  ownerId?: string // For server-authoritative ownership
}

export interface ResourceNode {
  id: string
  type: string
  position: { x: number; y: number; z: number }
  respawnTime: number
  lastHarvested?: number
}

export interface LootDrop {
  id: string
  item: Item
  position: { x: number; y: number; z: number }
  ownerId?: string
  expiresAt: number
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: number
  type: 'global' | 'guild' | 'whisper' | 'system'
  color?: string
}

export interface GameConfig {
  playerSpeed: number
  spellCastRange: number
  enemySpawnRate: number
  resourceRespawnTime: number
  lootExpireTime: number
  maxPlayersPerZone: number
  worldBossSpawnInterval: number
}

// Re-export skill types from shared
export type { Skill, PlayerSkill, SkillCategory, SkillType } from '../../shared/src/types/skills'

