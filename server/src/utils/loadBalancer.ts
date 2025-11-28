/**
 * Load Balancer for Room Distribution
 * Routes players to optimal room instances based on load
 */

import { roomShardingManager } from './roomSharding'

export interface LoadBalancingOptions {
  zone?: string
  preferredRoomId?: string
}

/**
 * Find or create optimal room for player
 */
export async function findOptimalRoom(
  gameServer: any,
  options: LoadBalancingOptions = {}
): Promise<string | null> {
  const { zone = 'default', preferredRoomId } = options
  
  // Check if we should create a new shard
  if (roomShardingManager.shouldCreateShard(zone)) {
    // Create new room instance
    try {
      const room = await gameServer.create('nexus', { zone })
      return room.roomId
    } catch (error) {
      console.error('Failed to create new room shard:', error)
      // Fallback to finding existing room
    }
  }
  
  // Find best existing room
  return roomShardingManager.findBestRoom(zone, preferredRoomId)
}

/**
 * Get load balancing statistics
 */
export function getLoadBalancingStats() {
  return roomShardingManager.getHealthStats()
}

