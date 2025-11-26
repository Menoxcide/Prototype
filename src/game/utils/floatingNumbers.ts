/**
 * Floating Numbers Utilities
 * Functions to create and manage floating numbers in the game world
 */

import { useGameStore } from '../store/useGameStore'
import type { FloatingNumberType } from '../components/FloatingNumber'

/**
 * Create a floating number
 */
export function createFloatingNumber(
  value: number | string,
  position: { x: number; y: number; z: number },
  type: FloatingNumberType,
  options: {
    isCrit?: boolean
    duration?: number
  } = {}
): string {
  const id = `float_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const { addFloatingNumber, removeFloatingNumber } = useGameStore.getState()
  
  addFloatingNumber({
    id,
    value,
    position,
    type,
    isCrit: options.isCrit || false,
    createdAt: Date.now(),
    opacity: 1,
    yOffset: 0
  })
  
  // Auto-remove after duration (default 2 seconds, longer for special types)
  const duration = options.duration || (type === 'level-up' ? 4000 : type === 'combo' ? 3000 : 2000)
  setTimeout(() => {
    removeFloatingNumber(id)
  }, duration)
  
  return id
}

/**
 * Create a damage floating number
 */
export function createDamageNumber(
  damage: number,
  position: { x: number; y: number; z: number },
  isCrit: boolean = false
): string {
  return createFloatingNumber(damage, position, isCrit ? 'critical' : 'damage', { isCrit })
}

/**
 * Create a healing floating number
 */
export function createHealingNumber(
  amount: number,
  position: { x: number; y: number; z: number }
): string {
  return createFloatingNumber(amount, position, 'healing')
}

/**
 * Create an XP floating number
 */
export function createXPNumber(
  amount: number,
  position: { x: number; y: number; z: number }
): string {
  return createFloatingNumber(amount, position, 'xp')
}

/**
 * Create a level-up floating number
 */
export function createLevelUpNumber(
  level: number,
  position: { x: number; y: number; z: number }
): string {
  return createFloatingNumber(`LEVEL ${level}!`, position, 'level-up', { duration: 4000 })
}

/**
 * Create a mana floating number
 */
export function createManaNumber(
  amount: number,
  position: { x: number; y: number; z: number },
  isGain: boolean = true
): string {
  return createFloatingNumber(
    isGain ? `+${amount} MP` : `-${amount} MP`,
    position,
    'mana'
  )
}

/**
 * Create a status effect floating number
 */
export function createStatusNumber(
  statusName: string,
  position: { x: number; y: number; z: number },
  isBuff: boolean = false
): string {
  return createFloatingNumber(statusName, position, isBuff ? 'buff' : 'debuff')
}

/**
 * Create a combo floating number
 */
export function createComboNumber(
  comboText: string,
  position: { x: number; y: number; z: number }
): string {
  return createFloatingNumber(comboText, position, 'combo', { duration: 3000 })
}

