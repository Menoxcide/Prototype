/**
 * Achievement network functions - Client-side achievement communication
 */

import { getRoom } from './colyseus'

export function requestAchievementProgress(): void {
  const room = getRoom()
  if (!room || !room.connection || !room.connection.isOpen) return

  try {
    room.send('requestAchievementProgress', {})
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send achievement progress request:', error)
    }
  }
}

