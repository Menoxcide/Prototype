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

// World types
export interface Biome {
  id: string
  name: string
  description: string
  color: string
  groundColor: string
  skyColor: string
  levelRange: [number, number]
  temperature: 'cold' | 'temperate' | 'warm' | 'hot'
  humidity: 'dry' | 'moderate' | 'wet'
  resources: string[]
  monsters: string[]
  npcs: string[]
  towns: string[]
  specialFeatures: string[]
  musicTheme?: string
  ambientSounds?: string[]
  weather: 'sunny' | 'rainy' | 'snowy' | 'foggy' | 'windy'
  spawnRate: number
}

export interface NPC {
  id: string
  name: string
  description: string
  type: 'quest_giver' | 'merchant' | 'crafting' | 'guard' | 'story' | 'pet_shop' | 'fishing' | 'mining'
  position: { x: number; y: number; z: number }
  biome: string
  town?: string
  level: number
  icon: string
  model?: string
  dialogue: string[]
  quests?: string[]
  shopItems?: { itemId: string; price: number; stock?: number }[]
  services?: string[]
  personality: 'friendly' | 'cheerful' | 'wise' | 'playful' | 'mysterious' | 'energetic'
  greeting: string
  farewell: string
}

export interface Town {
  id: string
  name: string
  description: string
  biome: string
  position: { x: number; y: number; z: number }
  size: number
  level: number
  isSafeZone: boolean
  buildings: any[]
  npcs: string[]
  shops: string[]
  services: string[]
  icon: string
  color: string
  musicTheme?: string
  specialFeatures: string[]
}

export interface Monster {
  id: string
  name: string
  description: string
  type: 'passive' | 'neutral' | 'aggressive' | 'boss' | 'elite'
  level: number
  health: number
  maxHealth: number
  damage: number
  defense: number
  speed: number
  xpReward: number
  creditReward: number
  lootTable: { itemId: string; chance: number; minQuantity?: number; maxQuantity?: number }[]
  biome: string[]
  spawnRate: number
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  color: string
  icon: string
  model?: string
  abilities?: string[]
  behavior: 'wander' | 'patrol' | 'guard' | 'follow' | 'flee' | 'stationary'
  aggroRange: number
  fleeHealthPercent: number
  respawnTime: number
  specialDrops?: { itemId: string; chance: number }[]
}

export interface EnvironmentalObject {
  id: string
  name: string
  description: string
  type: 'tree' | 'rock' | 'flower' | 'bush' | 'crystal' | 'fountain' | 'statue' | 'building' | 'decoration' | 'resource'
  biome: string[]
  position?: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  color: string
  icon: string
  model?: string
  harvestable: boolean
  harvestItem?: string
  harvestTime?: number
  respawnTime?: number
  interactable: boolean
  interactionType?: 'examine' | 'harvest' | 'climb' | 'enter' | 'activate'
  spawnRate: number
  minLevel?: number
  maxLevel?: number
}

// Re-export skill types from shared
export type { Skill, PlayerSkill, SkillCategory, SkillType } from '../../shared/src/types/skills'

