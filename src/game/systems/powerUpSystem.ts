/**
 * Power-up System - Handles power-up effects and application
 */

import { getPowerUp } from '../data/powerUps'
import { useGameStore } from '../store/useGameStore'
import { ActivePowerUp } from '../../../shared/src/types/powerUps'
import { createFloatingNumber } from '../utils/floatingNumbers'

/**
 * Apply a power-up effect to the player
 */
export function applyPowerUpEffect(powerUpId: string, powerUpEntityId: string): void {
  const powerUpData = getPowerUp(powerUpId)
  if (!powerUpData) {
    console.warn(`Power-up not found: ${powerUpId}`)
    return
  }

  const { player, updatePlayerHealth, updatePlayerMana, applyPowerUp } = useGameStore.getState()
  if (!player) return

  const now = Date.now()

  // Handle instant effects
  if (powerUpData.effectType === 'instant') {
    switch (powerUpData.type) {
      case 'health_boost':
        const healthRestore = Math.floor(player.maxHealth * powerUpData.effectValue)
        updatePlayerHealth(player.health + healthRestore)
        createFloatingNumber(
          `+${healthRestore} HP`,
          { x: player.position.x, y: player.position.y + 1.5, z: player.position.z },
          'healing'
        )
        break

      case 'mana_boost':
        const manaRestore = Math.floor(player.maxMana * powerUpData.effectValue)
        updatePlayerMana(player.mana + manaRestore)
        createFloatingNumber(
          `+${manaRestore} MP`,
          { x: player.position.x, y: player.position.y + 1.3, z: player.position.z },
          'mana'
        )
        break
    }
  } else {
    // Handle duration-based effects
    const activePowerUp: ActivePowerUp = {
      id: `active_${powerUpEntityId}_${now}`,
      powerUpId: powerUpId,
      type: powerUpData.type,
      startTime: now,
      expiresAt: now + powerUpData.duration,
      effectValue: powerUpData.effectValue
    }

    applyPowerUp(activePowerUp)

    // Show visual feedback
    createFloatingNumber(
      powerUpData.name,
      { x: player.position.x, y: player.position.y + 1.8, z: player.position.z },
      'buff'
    )
  }
}

/**
 * Update active power-up effects
 * Should be called every frame in the game loop
 */
export function updateActivePowerUps(deltaTime: number): void {
  const { activePowerUps, player, updatePlayerHealth, removeActivePowerUp } = useGameStore.getState()
  if (!player) return

  const now = Date.now()

  // Check for expired power-ups
  const expired: string[] = []
  
  for (const [id, activePowerUp] of activePowerUps.entries()) {
    if (now >= activePowerUp.expiresAt) {
      expired.push(id)
      continue
    }

    // Apply duration-based effects
    const powerUpData = getPowerUp(activePowerUp.powerUpId)
    if (!powerUpData) {
      expired.push(id)
      continue
    }

    // Handle regeneration effect
    if (activePowerUp.type === 'regeneration') {
      const healthPerSecond = activePowerUp.effectValue
      const healthGain = healthPerSecond * (deltaTime / 1000)
      if (healthGain > 0) {
        const currentPlayer = useGameStore.getState().player
        if (currentPlayer && currentPlayer.health < currentPlayer.maxHealth) {
          updatePlayerHealth(Math.min(currentPlayer.maxHealth, currentPlayer.health + healthGain))
        }
      }
    }
  }

  // Remove expired power-ups
  expired.forEach(id => {
    removeActivePowerUp(id)
  })
}

/**
 * Get active power-up modifiers
 * Returns multipliers and bonuses for various stats
 */
export function getPowerUpModifiers(): {
  speedMultiplier: number
  damageMultiplier: number
  xpMultiplier: number
  armorReduction: number
  shieldAmount: number
} {
  const { activePowerUps } = useGameStore.getState()
  
  let speedMultiplier = 1.0
  let damageMultiplier = 1.0
  let xpMultiplier = 1.0
  let armorReduction = 0
  let shieldAmount = 0

  for (const activePowerUp of activePowerUps.values()) {
    switch (activePowerUp.type) {
      case 'speed_boost':
      case 'haste':
        speedMultiplier += activePowerUp.effectValue
        break
      case 'damage_boost':
        damageMultiplier += activePowerUp.effectValue
        break
      case 'xp_boost':
        xpMultiplier += activePowerUp.effectValue
        break
      case 'armor_boost':
        armorReduction += activePowerUp.effectValue
        break
      case 'shield':
        shieldAmount = Math.max(shieldAmount, activePowerUp.effectValue)
        break
    }
  }

  return {
    speedMultiplier,
    damageMultiplier,
    xpMultiplier,
    armorReduction,
    shieldAmount
  }
}

/**
 * Check if player has a specific active power-up
 */
export function hasActivePowerUp(type: string): boolean {
  const { activePowerUps } = useGameStore.getState()
  return Array.from(activePowerUps.values()).some(p => p.type === type)
}

/**
 * Get remaining time for an active power-up
 */
export function getPowerUpRemainingTime(type: string): number {
  const { activePowerUps } = useGameStore.getState()
  const powerUp = Array.from(activePowerUps.values()).find(p => p.type === type)
  if (!powerUp) return 0
  
  const now = Date.now()
  return Math.max(0, powerUp.expiresAt - now)
}

