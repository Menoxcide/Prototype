/**
 * Trading network functions - Client-side trading communication
 */

import { getRoom } from './colyseus'

export function initiateTrade(targetPlayerId: string): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('initiateTrade', { targetPlayerId })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send initiate trade:', error)
    }
  }
}

export function addTradeItem(sessionId: string, itemId: string, quantity: number): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('addTradeItem', { sessionId, itemId, quantity })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send add trade item:', error)
    }
  }
}

export function removeTradeItem(sessionId: string, itemId: string): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('removeTradeItem', { sessionId, itemId })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send remove trade item:', error)
    }
  }
}

export function setTradeCredits(sessionId: string, credits: number): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('setTradeCredits', { sessionId, credits })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send set trade credits:', error)
    }
  }
}

export function confirmTrade(sessionId: string): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('confirmTrade', { sessionId })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send confirm trade:', error)
    }
  }
}

export function cancelTrade(sessionId: string): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('cancelTrade', { sessionId })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send cancel trade:', error)
    }
  }
}

