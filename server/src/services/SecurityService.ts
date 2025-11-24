/**
 * SecurityService - Server-side validation and anti-cheat measures
 * Validates all player actions to prevent cheating
 */

import { GAME_CONFIG } from '../../shared/config'

export type SuspicionLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

export interface PlayerAction {
  type: 'move' | 'spellCast' | 'damage' | 'inventory' | 'trade' | 'loot'
  playerId: string
  timestamp: number
  data: any
}

export interface SuspiciousActivity {
  playerId: string
  reason: string
  level: SuspicionLevel
  timestamp: number
  data: any
}

export interface SecurityService {
  validateMovement(playerId: string, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, timestamp: number): boolean
  validateDamage(playerId: string, damage: number, targetId: string, spellId?: string): boolean
  validateInventoryChange(playerId: string, itemId: string, quantity: number, operation: 'add' | 'remove'): Promise<boolean>
  validateSpellCast(playerId: string, spellId: string, manaCost: number, cooldownTime: number): boolean
  detectCheating(playerId: string, action: PlayerAction): SuspicionLevel
  logSuspiciousActivity(playerId: string, reason: string, level: SuspicionLevel, data: any): void
  getSuspiciousActivities(playerId?: string, limit?: number): SuspiciousActivity[]
  getPlayerSuspicionLevel(playerId: string): SuspicionLevel
}

export class SecurityServiceImpl implements SecurityService {
  private suspiciousActivities: SuspiciousActivity[] = []
  private playerLastPositions: Map<string, { x: number; y: number; z: number; timestamp: number }> = new Map()
  private playerLastSpellCasts: Map<string, Map<string, number>> = new Map() // playerId -> spellId -> timestamp
  private playerActionCounts: Map<string, { count: number; windowStart: number }> = new Map()
  private playerSuspicionLevels: Map<string, SuspicionLevel> = new Map()

  // Configuration
  private readonly MAX_MOVE_SPEED = GAME_CONFIG.playerSpeed * 1.5 // Allow 50% tolerance
  private readonly MAX_TELEPORT_DISTANCE = 50 // Max distance for teleport detection
  private readonly ACTION_RATE_LIMIT = 100 // Max actions per minute
  private readonly ACTION_WINDOW_MS = 60000 // 1 minute window
  private readonly SUSPICION_THRESHOLDS = {
    low: 3,
    medium: 5,
    high: 10,
    critical: 20
  }

  /**
   * Validate player movement
   */
  validateMovement(
    playerId: string,
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    timestamp: number
  ): boolean {
    const lastPosition = this.playerLastPositions.get(playerId)
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) +
      Math.pow(to.y - from.y, 2) +
      Math.pow(to.z - from.z, 2)
    )

    // Calculate time delta (in seconds)
    const timeDelta = lastPosition ? (timestamp - lastPosition.timestamp) / 1000 : 0.1
    const speed = timeDelta > 0 ? distance / timeDelta : 0

    // Check for teleportation
    if (distance > this.MAX_TELEPORT_DISTANCE) {
      this.logSuspiciousActivity(
        playerId,
        `Teleportation detected: moved ${distance.toFixed(2)} units`,
        'high',
        { from, to, distance, timestamp }
      )
      return false
    }

    // Check speed limit
    if (speed > this.MAX_MOVE_SPEED && timeDelta > 0.01) {
      this.logSuspiciousActivity(
        playerId,
        `Speed hack detected: ${speed.toFixed(2)} units/sec (max: ${this.MAX_MOVE_SPEED})`,
        'medium',
        { from, to, speed, maxSpeed: this.MAX_MOVE_SPEED, timestamp }
      )
      return false
    }

    // Update last position
    this.playerLastPositions.set(playerId, { x: to.x, y: to.y, z: to.z, timestamp })

    return true
  }

  /**
   * Validate damage calculation
   */
  validateDamage(playerId: string, damage: number, targetId: string, spellId?: string): boolean {
    // Check for negative or zero damage
    if (damage <= 0) {
      this.logSuspiciousActivity(
        playerId,
        `Invalid damage: ${damage}`,
        'low',
        { damage, targetId, spellId }
      )
      return false
    }

    // Check for unrealistic damage (e.g., > 10000)
    const MAX_DAMAGE = 10000
    if (damage > MAX_DAMAGE) {
      this.logSuspiciousActivity(
        playerId,
        `Excessive damage: ${damage} (max: ${MAX_DAMAGE})`,
        'high',
        { damage, targetId, spellId, maxDamage: MAX_DAMAGE }
      )
      return false
    }

    return true
  }

  /**
   * Validate inventory changes
   */
  async validateInventoryChange(
    playerId: string,
    itemId: string,
    quantity: number,
    operation: 'add' | 'remove'
  ): Promise<boolean> {
    // Check for invalid quantities
    if (quantity <= 0 || quantity > 10000) {
      this.logSuspiciousActivity(
        playerId,
        `Invalid inventory quantity: ${quantity} for ${operation}`,
        'medium',
        { itemId, quantity, operation }
      )
      return false
    }

    // Check for negative quantities on remove
    if (operation === 'remove' && quantity < 0) {
      this.logSuspiciousActivity(
        playerId,
        `Negative quantity on remove: ${quantity}`,
        'high',
        { itemId, quantity, operation }
      )
      return false
    }

    return true
  }

  /**
   * Validate spell cast (cooldown and mana)
   */
  validateSpellCast(playerId: string, spellId: string, manaCost: number, cooldownTime: number): boolean {
    const now = Date.now()
    const playerSpells = this.playerLastSpellCasts.get(playerId) || new Map()
    const lastCastTime = playerSpells.get(spellId) || 0

    // Check cooldown
    if (now - lastCastTime < cooldownTime) {
      const remainingCooldown = cooldownTime - (now - lastCastTime)
      this.logSuspiciousActivity(
        playerId,
        `Spell cooldown violation: ${spellId} (${remainingCooldown}ms remaining)`,
        'medium',
        { spellId, lastCastTime, now, cooldownTime, remainingCooldown }
      )
      return false
    }

    // Update last cast time
    playerSpells.set(spellId, now)
    this.playerLastSpellCasts.set(playerId, playerSpells)

    return true
  }

  /**
   * Detect cheating patterns
   */
  detectCheating(playerId: string, action: PlayerAction): SuspicionLevel {
    const now = Date.now()
    
    // Check action rate limit
    const actionCount = this.playerActionCounts.get(playerId)
    if (actionCount) {
      if (now - actionCount.windowStart > this.ACTION_WINDOW_MS) {
        // Reset window
        this.playerActionCounts.set(playerId, { count: 1, windowStart: now })
      } else {
        actionCount.count++
        if (actionCount.count > this.ACTION_RATE_LIMIT) {
          this.logSuspiciousActivity(
            playerId,
            `Action rate limit exceeded: ${actionCount.count} actions in ${this.ACTION_WINDOW_MS}ms`,
            'high',
            { actionType: action.type, count: actionCount.count, limit: this.ACTION_RATE_LIMIT }
          )
          return 'high'
        }
      }
    } else {
      this.playerActionCounts.set(playerId, { count: 1, windowStart: now })
    }

    // Check for suspicious patterns
    const recentActivities = this.suspiciousActivities.filter(
      a => a.playerId === playerId && now - a.timestamp < 60000 // Last minute
    )

    const activityCount = recentActivities.length
    if (activityCount >= this.SUSPICION_THRESHOLDS.critical) {
      return 'critical'
    } else if (activityCount >= this.SUSPICION_THRESHOLDS.high) {
      return 'high'
    } else if (activityCount >= this.SUSPICION_THRESHOLDS.medium) {
      return 'medium'
    } else if (activityCount >= this.SUSPICION_THRESHOLDS.low) {
      return 'low'
    }

    return 'none'
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(playerId: string, reason: string, level: SuspicionLevel, data: any): void {
    const activity: SuspiciousActivity = {
      playerId,
      reason,
      level,
      timestamp: Date.now(),
      data
    }

    this.suspiciousActivities.push(activity)

    // Keep only last 1000 activities
    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities.shift()
    }

    // Update player suspicion level
    const currentLevel = this.getPlayerSuspicionLevel(playerId)
    if (this.compareSuspicionLevels(level, currentLevel) > 0) {
      this.playerSuspicionLevels.set(playerId, level)
    }

    // Log to console (in production, send to monitoring service)
    console.warn(`[SECURITY] ${level.toUpperCase()}: Player ${playerId} - ${reason}`, data)
  }

  /**
   * Get suspicious activities
   */
  getSuspiciousActivities(playerId?: string, limit: number = 100): SuspiciousActivity[] {
    let activities = this.suspiciousActivities

    if (playerId) {
      activities = activities.filter(a => a.playerId === playerId)
    }

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp)

    return activities.slice(0, limit)
  }

  /**
   * Get player suspicion level
   */
  getPlayerSuspicionLevel(playerId: string): SuspicionLevel {
    return this.playerSuspicionLevels.get(playerId) || 'none'
  }

  /**
   * Compare suspicion levels
   */
  private compareSuspicionLevels(a: SuspicionLevel, b: SuspicionLevel): number {
    const levels: SuspicionLevel[] = ['none', 'low', 'medium', 'high', 'critical']
    return levels.indexOf(a) - levels.indexOf(b)
  }

  /**
   * Reset player data (on disconnect)
   */
  resetPlayer(playerId: string): void {
    this.playerLastPositions.delete(playerId)
    this.playerLastSpellCasts.delete(playerId)
    this.playerActionCounts.delete(playerId)
    // Keep suspicion levels and activities for review
  }
}

