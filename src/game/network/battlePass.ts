/**
 * Battle pass network functions - Client-side battle pass communication
 */

import { getRoom } from './colyseus'

export function claimBattlePassReward(tier: number, track: 'free' | 'premium'): void {
  const room = getRoom()
  if (!room) return

  room.send('claimBattlePassReward', { tier, track })
}

export function unlockBattlePassPremium(): void {
  const room = getRoom()
  if (!room) return

  room.send('unlockBattlePassPremium', {})
}

export function requestBattlePassProgress(): void {
  const room = getRoom()
  if (!room) return

  room.send('requestBattlePassProgress', {})
}

