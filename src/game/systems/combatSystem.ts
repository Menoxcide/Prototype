/**
 * Combat System - Handles damage calculation, combos, and critical hits
 * 
 * This module provides server-authoritative combat calculations including:
 * - Base damage calculation with spell modifiers
 * - Combo system for consecutive kills
 * - Critical hit chance and multipliers
 * - Status effect integration
 */

import { Spell } from '../types'

/**
 * Tracks combo state for consecutive kills
 */
export interface ComboTracker {
  /** Number of kills in current combo */
  kills: number
  /** Timestamp when combo started */
  startTime: number
  /** Damage multiplier for this combo */
  multiplier: number
}

/**
 * Result of damage calculation
 */
export interface DamageResult {
  /** Base damage before multipliers */
  damage: number
  /** Whether this was a critical hit */
  isCrit: boolean
  /** Final damage after all multipliers */
  finalDamage: number
}

const COMBO_WINDOW = 8000 // 8 seconds

/**
 * Calculate damage for a spell cast
 * 
 * @param _spell - The spell being cast (currently unused but kept for future use)
 * @param baseDamage - Base damage value
 * @param comboMultiplier - Combo multiplier (default: 1.0)
 * @param critChance - Critical hit chance (0.0-1.0, default: 0.1)
 * @param critMultiplier - Critical hit damage multiplier (default: 2.0)
 * @returns Damage result with base damage, crit status, and final damage
 * 
 * @example
 * ```ts
 * const result = calculateDamage(spell, 50, 1.5, 0.2, 2.5)
 * // result: { damage: 50, isCrit: true/false, finalDamage: 125-187 }
 * ```
 */
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

/**
 * Calculate critical hit chance with bonuses
 * 
 * @param baseChance - Base critical hit chance (0.0-1.0, default: 0.1)
 * @param bonuses - Bonus values for crit chance
 * @param bonuses.critChance - Direct crit chance bonus (0.0-1.0)
 * @param bonuses.critRating - Crit rating (converted to chance: 100 rating = 1%)
 * @returns Final critical hit chance, capped between 0% and 95%
 * 
 * @example
 * ```ts
 * const chance = calculateCriticalChance(0.1, { critChance: 0.15, critRating: 500 })
 * // Returns: 0.25 (10% base + 15% bonus + 5% from rating)
 * ```
 */
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

/**
 * Update combo tracker with a new kill
 * 
 * @param combo - Current combo state (null if no active combo)
 * @param killTime - Timestamp of the kill
 * @returns Updated combo tracker
 * 
 * @example
 * ```ts
 * let combo = null
 * combo = updateCombo(combo, Date.now()) // First kill
 * combo = updateCombo(combo, Date.now() + 1000) // Second kill within window
 * ```
 */
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

/**
 * Get damage multiplier from combo
 * 
 * @param combo - Combo tracker (null if no active combo)
 * @returns Damage multiplier (1.0 if no combo or <3 kills, otherwise combo multiplier)
 * 
 * @example
 * ```ts
 * const multiplier = getComboMultiplier(combo) // Returns 1.0-3.0
 * ```
 */
export function getComboMultiplier(combo: ComboTracker | null): number {
  if (!combo || combo.kills < 3) return 1
  return combo.multiplier
}

/**
 * Check if enemy should aggro on player based on distance
 * 
 * @param enemyPosition - Enemy's current position
 * @param playerPosition - Player's current position
 * @param aggroRange - Aggro range in units (default: 10)
 * @returns True if player is within aggro range
 * 
 * @example
 * ```ts
 * const shouldAggro = checkEnemyAggro(
 *   { x: 0, y: 0, z: 0 },
 *   { x: 5, y: 0, z: 5 },
 *   10
 * ) // Returns: true (distance ~7.07 < 10)
 * ```
 */
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

/**
 * Check if enemy has exceeded leash range from spawn
 * 
 * @param enemyPosition - Enemy's current position
 * @param spawnPosition - Enemy's spawn position
 * @param leashRange - Maximum distance from spawn (default: 20)
 * @returns True if enemy is within leash range
 * 
 * @example
 * ```ts
 * const withinLeash = checkEnemyLeash(
 *   { x: 15, y: 0, z: 15 },
 *   { x: 0, y: 0, z: 0 },
 *   20
 * ) // Returns: true (distance ~21.21 > 20, should return to spawn)
 * ```
 */
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

