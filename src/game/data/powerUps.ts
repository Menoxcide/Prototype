/**
 * Power-up System - Temporary buffs that spawn in the world
 * Players can pick them up to gain temporary advantages
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

export const POWER_UPS: PowerUp[] = [
  // Common power-ups
  {
    id: 'health_boost',
    type: 'health_boost',
    name: 'Health Boost',
    description: 'Restores 50% of maximum health',
    icon: '❤️',
    color: '#ff0000',
    rarity: 'common',
    duration: 0, // Instant
    effectType: 'instant',
    effectValue: 0.5, // 50% of max health
    spawnWeight: 30
  },
  {
    id: 'mana_boost',
    type: 'mana_boost',
    name: 'Mana Boost',
    description: 'Restores 100% of maximum mana',
    icon: '💙',
    color: '#0066ff',
    rarity: 'common',
    duration: 0, // Instant
    effectType: 'instant',
    effectValue: 1.0, // 100% of max mana
    spawnWeight: 30
  },
  {
    id: 'speed_boost',
    type: 'speed_boost',
    name: 'Speed Boost',
    description: 'Increases movement speed by 50% for 30 seconds',
    icon: '⚡',
    color: '#ffff00',
    rarity: 'uncommon',
    duration: 30000, // 30 seconds
    effectType: 'duration',
    effectValue: 0.5, // +50% speed
    spawnWeight: 20
  },
  {
    id: 'damage_boost',
    type: 'damage_boost',
    name: 'Damage Boost',
    description: 'Increases damage by 25% for 60 seconds',
    icon: '⚔️',
    color: '#ff6600',
    rarity: 'uncommon',
    duration: 60000, // 60 seconds
    effectType: 'duration',
    effectValue: 0.25, // +25% damage
    spawnWeight: 15
  },
  {
    id: 'xp_boost',
    type: 'xp_boost',
    name: 'XP Boost',
    description: 'Increases XP gain by 50% for 5 minutes',
    icon: '⭐',
    color: '#ff00ff',
    rarity: 'rare',
    duration: 300000, // 5 minutes
    effectType: 'duration',
    effectValue: 0.5, // +50% XP
    spawnWeight: 10
  },
  {
    id: 'shield',
    type: 'shield',
    name: 'Shield',
    description: 'Grants a temporary shield that absorbs damage for 30 seconds',
    icon: '🛡️',
    color: '#00ffff',
    rarity: 'uncommon',
    duration: 30000, // 30 seconds
    effectType: 'duration',
    effectValue: 100, // Shield amount
    spawnWeight: 15
  },
  {
    id: 'regeneration',
    type: 'regeneration',
    name: 'Regeneration',
    description: 'Restores health over time for 60 seconds',
    icon: '💚',
    color: '#00ff00',
    rarity: 'uncommon',
    duration: 60000, // 60 seconds
    effectType: 'duration',
    effectValue: 10, // Health per second
    spawnWeight: 15
  },
  {
    id: 'haste',
    type: 'haste',
    name: 'Haste',
    description: 'Increases movement and attack speed by 30% for 45 seconds',
    icon: '⚡',
    color: '#ff00ff',
    rarity: 'rare',
    duration: 45000, // 45 seconds
    effectType: 'duration',
    effectValue: 0.3, // +30% speed
    spawnWeight: 10
  },
  {
    id: 'armor_boost',
    type: 'armor_boost',
    name: 'Armor Boost',
    description: 'Reduces damage taken by 25% for 60 seconds',
    icon: '🛡️',
    color: '#888888',
    rarity: 'rare',
    duration: 60000, // 60 seconds
    effectType: 'duration',
    effectValue: 0.25, // -25% damage taken
    spawnWeight: 10
  }
]

export const POWER_UP_MAP = new Map(POWER_UPS.map(powerUp => [powerUp.id, powerUp]))

export function getPowerUp(id: string): PowerUp | undefined {
  return POWER_UP_MAP.get(id)
}

export function getPowerUpByType(type: PowerUpType): PowerUp | undefined {
  return POWER_UPS.find(p => p.type === type)
}

export function getPowerUpsByRarity(rarity: PowerUpRarity): PowerUp[] {
  return POWER_UPS.filter(p => p.rarity === rarity)
}

/**
 * Get a random power-up weighted by spawn weight
 */
export function getRandomPowerUp(): PowerUp {
  const totalWeight = POWER_UPS.reduce((sum, p) => sum + p.spawnWeight, 0)
  let random = Math.random() * totalWeight
  
  for (const powerUp of POWER_UPS) {
    random -= powerUp.spawnWeight
    if (random <= 0) {
      return powerUp
    }
  }
  
  // Fallback to first power-up
  return POWER_UPS[0]
}

