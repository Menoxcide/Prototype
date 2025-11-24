/**
 * Quest network functions - Client-side quest communication
 */

import { getRoom } from './colyseus'
import { useGameStore } from '../store/useGameStore'

export function acceptQuest(questId: string): void {
  const room = getRoom()
  if (!room) return

  room.send('acceptQuest', { questId })
}

export function completeQuest(questId: string): void {
  const room = getRoom()
  if (!room) return

  room.send('completeQuest', { questId })
}

export function requestAvailableQuests(): void {
  const room = getRoom()
  if (!room) return

  const { player } = useGameStore.getState()
  if (!player) return

  room.send('requestAvailableQuests', { level: player.level })
}

