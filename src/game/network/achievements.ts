/**
 * Achievement network functions - Client-side achievement communication
 */

import { getRoom } from './colyseus'

export function requestAchievementProgress(): void {
  const room = getRoom()
  if (!room) return

  room.send('requestAchievementProgress', {})
}

