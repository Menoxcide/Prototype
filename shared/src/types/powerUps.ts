/**
 * Power-up Types - Shared between client and server
 */

export type PowerUpType = 
  | 'health_boost'
  | 'mana_boost'
  | 'speed_boost'
  | 'damage_boost'
  | 'xp_boost'
  | 'shield'
  | 'regeneration'
  | 'haste'
  | 'armor_boost'

export type PowerUpRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface PowerUp {
  id: string
  type: PowerUpType
  name: string
  description: string
  icon: string
  color: string
  rarity: PowerUpRarity
  duration: number // milliseconds
  effectType: 'instant' | 'duration'
  effectValue: number // Percentage or flat value
  spawnWeight: number // Higher = more likely to spawn
}

export interface PowerUpEntity {
  id: string
  powerUpId: string // References PowerUp.id
  type: PowerUpType
  position: { x: number; y: number; z: number }
  spawnTime: number
  expiresAt: number // When power-up despawns if not picked up
}

export interface ActivePowerUp {
  id: string
  powerUpId: string
  type: PowerUpType
  startTime: number
  expiresAt: number
  effectValue: number
}

