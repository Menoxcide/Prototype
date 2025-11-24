/**
 * Rate Limiter - Prevents spam and abuse by limiting action frequency
 */

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, Map<string, { count: number; resetTime: number }>> = new Map()
  
  /**
   * Check if action is allowed
   */
  checkLimit(
    playerId: string,
    action: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now()
    const key = `${playerId}:${action}`
    
    if (!this.limits.has(key)) {
      this.limits.set(key, new Map())
    }
    
    const playerLimits = this.limits.get(key)!
    let limit = playerLimits.get(action)
    
    // Reset if window expired
    if (!limit || now > limit.resetTime) {
      limit = {
        count: 0,
        resetTime: now + config.windowMs
      }
      playerLimits.set(action, limit)
    }
    
    // Check if limit exceeded
    if (limit.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: limit.resetTime
      }
    }
    
    // Increment count
    limit.count++
    
    return {
      allowed: true,
      remaining: config.maxRequests - limit.count,
      resetTime: limit.resetTime
    }
  }
  
  /**
   * Reset limit for a player/action
   */
  resetLimit(playerId: string, action: string): void {
    const key = `${playerId}:${action}`
    const playerLimits = this.limits.get(key)
    if (playerLimits) {
      playerLimits.delete(action)
      if (playerLimits.size === 0) {
        this.limits.delete(key)
      }
    }
  }
  
  /**
   * Clear all limits (for cleanup)
   */
  clear(): void {
    this.limits.clear()
  }
  
  /**
   * Cleanup expired limits
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, playerLimits] of this.limits.entries()) {
      for (const [action, limit] of playerLimits.entries()) {
        if (now > limit.resetTime) {
          playerLimits.delete(action)
        }
      }
      if (playerLimits.size === 0) {
        this.limits.delete(key)
      }
    }
  }
}

export const rateLimiter = new RateLimiter()

// Predefined rate limit configurations
export const RATE_LIMITS = {
  CHAT: { maxRequests: 10, windowMs: 10000 }, // 10 messages per 10 seconds
  GUILD_CHAT: { maxRequests: 20, windowMs: 10000 }, // 20 messages per 10 seconds
  WHISPER: { maxRequests: 5, windowMs: 10000 }, // 5 whispers per 10 seconds
  SPELL_CAST: { maxRequests: 30, windowMs: 1000 }, // 30 casts per second
  MOVE: { maxRequests: 60, windowMs: 1000 }, // 60 moves per second
  TRADE: { maxRequests: 5, windowMs: 60000 }, // 5 trades per minute
  QUEST_ACCEPT: { maxRequests: 10, windowMs: 60000 }, // 10 accepts per minute
  DUNGEON_ENTER: { maxRequests: 3, windowMs: 60000 }, // 3 enters per minute
  GUILD_CREATE: { maxRequests: 1, windowMs: 3600000 }, // 1 per hour
  GUILD_INVITE: { maxRequests: 10, windowMs: 60000 } // 10 invites per minute
} as const

