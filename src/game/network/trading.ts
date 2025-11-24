/**
 * Trading network functions - Client-side trading communication
 */

import { getRoom } from './colyseus'

export function initiateTrade(targetPlayerId: string): void {
  const room = getRoom()
  if (!room) return

  room.send('initiateTrade', { targetPlayerId })
}

export function addTradeItem(sessionId: string, itemId: string, quantity: number): void {
  const room = getRoom()
  if (!room) return

  room.send('addTradeItem', { sessionId, itemId, quantity })
}

export function removeTradeItem(sessionId: string, itemId: string): void {
  const room = getRoom()
  if (!room) return

  room.send('removeTradeItem', { sessionId, itemId })
}

export function setTradeCredits(sessionId: string, credits: number): void {
  const room = getRoom()
  if (!room) return

  room.send('setTradeCredits', { sessionId, credits })
}

export function confirmTrade(sessionId: string): void {
  const room = getRoom()
  if (!room) return

  room.send('confirmTrade', { sessionId })
}

export function cancelTrade(sessionId: string): void {
  const room = getRoom()
  if (!room) return

  room.send('cancelTrade', { sessionId })
}

