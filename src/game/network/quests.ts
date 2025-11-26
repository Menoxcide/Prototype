/**
 * Quest network functions - Client-side quest communication
 */

import { getRoom } from './colyseus'
import { useGameStore } from '../store/useGameStore'

export function acceptQuest(questId: string): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('acceptQuest', { questId })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send accept quest:', error)
    }
  }
}

export function completeQuest(questId: string): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('completeQuest', { questId })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send complete quest:', error)
    }
  }
}

export function requestAvailableQuests(): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  const { player } = useGameStore.getState()
  if (!player) return

  try {
    room.send('requestAvailableQuests', { level: player.level })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send request available quests:', error)
    }
  }
}

