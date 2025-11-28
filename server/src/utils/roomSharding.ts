/**
 * Room Sharding System
 * Distributes players across multiple room instances for better performance
 */

export interface RoomShard {
  roomId: string
  playerCount: number
  zone: string
  health: 'healthy' | 'degraded' | 'unhealthy'
  lastHealthCheck: number
  capacity: number
}

export interface ShardingConfig {
  maxPlayersPerRoom: number
  shardThreshold: number // When to create new shard
  healthCheckInterval: number
  unhealthyThreshold: number // Player count that indicates unhealthy
}

class RoomShardingManager {
  private shards: Map<string, RoomShard> = new Map()
  private config: ShardingConfig = {
    maxPlayersPerRoom: 500,
    shardThreshold: 400, // Create new shard when room reaches 400 players
    healthCheckInterval: 30000, // 30 seconds
    unhealthyThreshold: 450 // Consider unhealthy if over 450 players
  }
  
  private zoneShards: Map<string, string[]> = new Map() // zone -> room IDs
  private healthCheckTimer: NodeJS.Timeout | null = null

  constructor(config?: Partial<ShardingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Register a room shard
   */
  registerShard(roomId: string, zone: string = 'default', capacity: number = this.config.maxPlayersPerRoom): void {
    const shard: RoomShard = {
      roomId,
      playerCount: 0,
      zone,
      health: 'healthy',
      lastHealthCheck: Date.now(),
      capacity
    }
    
    this.shards.set(roomId, shard)
    
    // Add to zone mapping
    if (!this.zoneShards.has(zone)) {
      this.zoneShards.set(zone, [])
    }
    this.zoneShards.get(zone)!.push(roomId)
  }

  /**
   * Unregister a room shard
   */
  unregisterShard(roomId: string): void {
    const shard = this.shards.get(roomId)
    if (shard) {
      const zoneShards = this.zoneShards.get(shard.zone)
      if (zoneShards) {
        const index = zoneShards.indexOf(roomId)
        if (index > -1) {
          zoneShards.splice(index, 1)
        }
      }
    }
    this.shards.delete(roomId)
  }

  /**
   * Update player count for a shard
   */
  updatePlayerCount(roomId: string, count: number): void {
    const shard = this.shards.get(roomId)
    if (shard) {
      shard.playerCount = count
      shard.lastHealthCheck = Date.now()
      
      // Update health status
      if (count >= this.config.unhealthyThreshold) {
        shard.health = 'unhealthy'
      } else if (count >= this.config.shardThreshold) {
        shard.health = 'degraded'
      } else {
        shard.health = 'healthy'
      }
    }
  }

  /**
   * Find best room for a player based on zone and load
   */
  findBestRoom(zone: string = 'default', preferredRoomId?: string): string | null {
    // If preferred room exists and is healthy, use it
    if (preferredRoomId) {
      const preferred = this.shards.get(preferredRoomId)
      if (preferred && preferred.zone === zone && preferred.health !== 'unhealthy') {
        if (preferred.playerCount < preferred.capacity) {
          return preferredRoomId
        }
      }
    }
    
    // Find rooms in the same zone
    const zoneRoomIds = this.zoneShards.get(zone) || []
    const zoneRooms = zoneRoomIds
      .map(id => this.shards.get(id))
      .filter((shard): shard is RoomShard => shard !== undefined)
      .filter(shard => shard.health !== 'unhealthy')
      .filter(shard => shard.playerCount < shard.capacity)
      .sort((a, b) => a.playerCount - b.playerCount) // Prefer rooms with fewer players
    
    if (zoneRooms.length > 0) {
      return zoneRooms[0].roomId
    }
    
    // No room in zone, find any available room
    const allRooms = Array.from(this.shards.values())
      .filter(shard => shard.health !== 'unhealthy')
      .filter(shard => shard.playerCount < shard.capacity)
      .sort((a, b) => a.playerCount - b.playerCount)
    
    return allRooms.length > 0 ? allRooms[0].roomId : null
  }

  /**
   * Check if a new shard should be created
   */
  shouldCreateShard(zone: string = 'default'): boolean {
    const zoneRoomIds = this.zoneShards.get(zone) || []
    const zoneRooms = zoneRoomIds
      .map(id => this.shards.get(id))
      .filter((shard): shard is RoomShard => shard !== undefined)
    
    // Check if any room in zone is at threshold
    return zoneRooms.some(shard => shard.playerCount >= this.config.shardThreshold)
  }

  /**
   * Get room health statistics
   */
  getHealthStats(): {
    totalShards: number
    healthyShards: number
    degradedShards: number
    unhealthyShards: number
    totalPlayers: number
    averagePlayersPerShard: number
  } {
    const shards = Array.from(this.shards.values())
    const totalPlayers = shards.reduce((sum, shard) => sum + shard.playerCount, 0)
    
    return {
      totalShards: shards.length,
      healthyShards: shards.filter(s => s.health === 'healthy').length,
      degradedShards: shards.filter(s => s.health === 'degraded').length,
      unhealthyShards: shards.filter(s => s.health === 'unhealthy').length,
      totalPlayers,
      averagePlayersPerShard: shards.length > 0 ? totalPlayers / shards.length : 0
    }
  }

  /**
   * Get all shards for a zone
   */
  getZoneShards(zone: string): RoomShard[] {
    const zoneRoomIds = this.zoneShards.get(zone) || []
    return zoneRoomIds
      .map(id => this.shards.get(id))
      .filter((shard): shard is RoomShard => shard !== undefined)
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckTimer) return
    
    this.healthCheckTimer = setInterval(() => {
      const now = Date.now()
      this.shards.forEach(shard => {
        // Mark as unhealthy if health check is stale
        if (now - shard.lastHealthCheck > this.config.healthCheckInterval * 2) {
          shard.health = 'unhealthy'
        }
      })
    }, this.config.healthCheckInterval)
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }
}

// Singleton instance
export const roomShardingManager = new RoomShardingManager()

// Auto-start health monitoring
roomShardingManager.startHealthMonitoring()

