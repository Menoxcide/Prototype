/**
 * Combat Log Utilities
 * Functions to add combat and status messages to the chat system
 */

// Import directly from gameStore to avoid circular dependency
// (gameStore.ts dynamically imports this file)
import { useGameStore } from '../store/gameStore'

/**
 * Add a combat log message to chat
 */
export function addCombatLog(
  message: string,
  color: string = '#ff4444',
  source?: string
): void {
  const { addChatMessage } = useGameStore.getState()
  addChatMessage({
    id: `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerId: 'system',
    playerName: source ? `[Combat] ${source}` : '[Combat]',
    message,
    timestamp: Date.now(),
    type: 'system',
    color
  })
}

/**
 * Add a status log message to chat
 */
export function addStatusLog(
  message: string,
  color: string = '#00aaff',
  source?: string
): void {
  const { addChatMessage } = useGameStore.getState()
  addChatMessage({
    id: `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerId: 'system',
    playerName: source ? `[Status] ${source}` : '[Status]',
    message,
    timestamp: Date.now(),
    type: 'system',
    color
  })
}

/**
 * Log damage dealt
 */
export function logDamageDealt(
  damage: number,
  target: string,
  isCrit: boolean = false
): void {
  const critText = isCrit ? ' CRITICAL!' : ''
  addCombatLog(
    `Dealt ${Math.floor(damage)} damage to ${target}${critText}`,
    isCrit ? '#ff00ff' : '#ff4444'
  )
}

/**
 * Log damage taken
 */
export function logDamageTaken(
  damage: number,
  source: string,
  isCrit: boolean = false
): void {
  const critText = isCrit ? ' CRITICAL!' : ''
  addCombatLog(
    `Took ${Math.floor(damage)} damage from ${source}${critText}`,
    isCrit ? '#ff0088' : '#ff6666'
  )
}

/**
 * Log healing received
 */
export function logHealing(
  amount: number,
  source?: string
): void {
  const sourceText = source ? ` from ${source}` : ''
  addCombatLog(
    `Healed ${Math.floor(amount)} HP${sourceText}`,
    '#00ff88'
  )
}

/**
 * Log status effect applied
 */
export function logStatusEffect(
  effectName: string,
  target: string,
  isBuff: boolean = false
): void {
  const type = isBuff ? 'Buff' : 'Debuff'
  addStatusLog(
    `${effectName} ${isBuff ? 'applied to' : 'inflicted on'} ${target}`,
    isBuff ? '#00ff00' : '#ff8800',
    type
  )
}

/**
 * Log status effect removed
 */
export function logStatusEffectRemoved(
  effectName: string,
  target: string
): void {
  addStatusLog(
    `${effectName} removed from ${target}`,
    '#888888'
  )
}

/**
 * Log stat change
 */
export function logStatChange(
  statName: string,
  oldValue: number,
  newValue: number,
  isIncrease: boolean
): void {
  const change = isIncrease ? 'increased' : 'decreased'
  const delta = Math.abs(newValue - oldValue)
  addStatusLog(
    `${statName} ${change} by ${delta} (${oldValue} → ${newValue})`,
    isIncrease ? '#00ff00' : '#ff8800'
  )
}

/**
 * Log XP gain
 */
export function logXP(amount: number, source?: string): void {
  const sourceText = source ? ` from ${source}` : ''
  addStatusLog(
    `Gained ${amount} XP${sourceText}`,
    '#ffff00'
  )
}

/**
 * Log level up
 */
export function logLevelUp(newLevel: number): void {
  addStatusLog(
    `⭐ LEVEL UP! You are now level ${newLevel}! ⭐`,
    '#ff00ff'
  )
}

/**
 * Log mana gain/loss
 */
export function logMana(amount: number, isGain: boolean = true): void {
  const action = isGain ? 'Restored' : 'Lost'
  addStatusLog(
    `${action} ${Math.abs(amount)} MP`,
    isGain ? '#00aaff' : '#ff6666'
  )
}

/**
 * Log combo
 */
export function logCombo(kills: number, multiplier: number): void {
  addCombatLog(
    `🔥 ${kills}x COMBO! ${multiplier.toFixed(1)}x multiplier! 🔥`,
    '#ff00ff'
  )
}

/**
 * Log kill
 */
export function logKill(killerName: string, enemyType: string): void {
  addCombatLog(
    `${killerName} defeated ${enemyType}`,
    '#00ff00'
  )
}

