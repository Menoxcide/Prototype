/**
 * Battle pass network functions - Client-side battle pass communication
 */

import { getRoom } from './colyseus'

export function claimBattlePassReward(tier: number, track: 'free' | 'premium'): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('claimBattlePassReward', { tier, track })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send claim battle pass reward:', error)
    }
  }
}

export function unlockBattlePassPremium(): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('unlockBattlePassPremium', {})
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send unlock battle pass premium:', error)
    }
  }
}

export function requestBattlePassProgress(): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('requestBattlePassProgress', {})
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send request battle pass progress:', error)
    }
  }
}

