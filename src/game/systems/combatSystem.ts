import { Spell } from '../types'

export interface ComboTracker {
  kills: number
  startTime: number
  multiplier: number
}

export interface DamageResult {
  damage: number
  isCrit: boolean
  finalDamage: number
}

const COMBO_WINDOW = 8000 // 8 seconds

export function calculateDamage(
  _spell: Spell,
  baseDamage: number,
  comboMultiplier: number = 1,
  critChance: number = 0.1,
  critMultiplier: number = 2.0
): DamageResult {
  // Critical hit calculation
  const isCrit = Math.random() < critChance

  let finalDamage = baseDamage * comboMultiplier

  if (isCrit) {
    finalDamage *= critMultiplier // Critical hits do multiplied damage
  }

  return {
    damage: baseDamage,
    isCrit,
    finalDamage: Math.floor(finalDamage)
  }
}

export function calculateCriticalChance(
  baseChance: number = 0.1,
  bonuses: { critChance?: number; critRating?: number } = {}
): number {
  let chance = baseChance
  
  if (bonuses.critChance) {
    chance += bonuses.critChance
  }
  
  if (bonuses.critRating) {
    // Convert crit rating to chance (e.g., 100 rating = 1% chance)
    chance += bonuses.critRating / 10000
  }
  
  return Math.min(0.95, Math.max(0, chance)) // Cap between 0% and 95%
}

export function updateCombo(
  combo: ComboTracker | null,
  killTime: number
): ComboTracker {
  if (!combo) {
    return {
      kills: 1,
      startTime: killTime,
      multiplier: 1
    }
  }

  const timeSinceStart = killTime - combo.startTime

  if (timeSinceStart > COMBO_WINDOW) {
    // Combo expired, start new one
    return {
      kills: 1,
      startTime: killTime,
      multiplier: 1
    }
  }

  const newKills = combo.kills + 1
  const multiplier = newKills >= 3 ? 1 + (newKills - 2) * 0.1 : 1

  return {
    kills: newKills,
    startTime: combo.startTime,
    multiplier: Math.min(multiplier, 3) // Cap at 3x
  }
}

export function getComboMultiplier(combo: ComboTracker | null): number {
  if (!combo || combo.kills < 3) return 1
  return combo.multiplier
}

export function checkEnemyAggro(
  enemyPosition: { x: number; y: number; z: number },
  playerPosition: { x: number; y: number; z: number },
  aggroRange: number = 10
): boolean {
  const dx = enemyPosition.x - playerPosition.x
  const dz = enemyPosition.z - playerPosition.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  return distance <= aggroRange
}

export function checkEnemyLeash(
  enemyPosition: { x: number; y: number; z: number },
  spawnPosition: { x: number; y: number; z: number },
  leashRange: number = 20
): boolean {
  const dx = enemyPosition.x - spawnPosition.x
  const dz = enemyPosition.z - spawnPosition.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  return distance <= leashRange
}

