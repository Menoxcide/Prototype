/**
 * Dodge System - Handles dodge mechanics and invincibility frames
 */

export interface DodgeState {
  isDodging: boolean
  dodgeStartTime: number
  dodgeDuration: number
  invincibilityEndTime: number
  cooldownEndTime: number
}

export interface DodgeConfig {
  dodgeDuration: number // How long the dodge animation lasts
  invincibilityDuration: number // How long invincibility lasts
  cooldown: number // Cooldown between dodges
  distance: number // Distance to dodge
}

const DEFAULT_DODGE_CONFIG: DodgeConfig = {
  dodgeDuration: 300, // 300ms
  invincibilityDuration: 400, // 400ms
  cooldown: 1000, // 1 second
  distance: 5 // 5 units
}

class DodgeManager {
  private dodgeStates: Map<string, DodgeState> = new Map()
  private config: DodgeConfig = DEFAULT_DODGE_CONFIG

  /**
   * Attempt to dodge
   */
  attemptDodge(entityId: string, direction: { x: number; y: number; z: number }): {
    success: boolean
    newPosition?: { x: number; y: number; z: number }
    reason?: string
  } {
    const state = this.dodgeStates.get(entityId)
    const now = Date.now()

    // Check cooldown
    if (state && now < state.cooldownEndTime) {
      return {
        success: false,
        reason: 'Dodge on cooldown'
      }
    }

    // Check if already dodging
    if (state && state.isDodging) {
      return {
        success: false,
        reason: 'Already dodging'
      }
    }

    // Start dodge
    const dodgeState: DodgeState = {
      isDodging: true,
      dodgeStartTime: now,
      dodgeDuration: this.config.dodgeDuration,
      invincibilityEndTime: now + this.config.invincibilityDuration,
      cooldownEndTime: now + this.config.cooldown
    }

    this.dodgeStates.set(entityId, dodgeState)

    // Calculate new position
    const normalizedDir = this.normalizeDirection(direction)
    const newPosition = {
      x: normalizedDir.x * this.config.distance,
      y: normalizedDir.y * this.config.distance,
      z: normalizedDir.z * this.config.distance
    }

    return {
      success: true,
      newPosition
    }
  }

  /**
   * Update dodge state
   */
  updateDodge(entityId: string, _currentPosition: { x: number; y: number; z: number }, _deltaTime: number): {
    isDodging: boolean
    isInvincible: boolean
    newPosition?: { x: number; y: number; z: number }
  } {
    const state = this.dodgeStates.get(entityId)
    if (!state) {
      return { isDodging: false, isInvincible: false }
    }

    const now = Date.now()
    const elapsed = now - state.dodgeStartTime

    // Check if dodge animation is complete
    if (state.isDodging && elapsed >= state.dodgeDuration) {
      state.isDodging = false
    }

    const isInvincible = now < state.invincibilityEndTime

    // Clean up if dodge is completely done
    if (!state.isDodging && !isInvincible && now >= state.cooldownEndTime) {
      this.dodgeStates.delete(entityId)
    }

    return {
      isDodging: state.isDodging,
      isInvincible
    }
  }

  /**
   * Check if entity is invincible
   */
  isInvincible(entityId: string): boolean {
    const state = this.dodgeStates.get(entityId)
    if (!state) return false
    return Date.now() < state.invincibilityEndTime
  }

  /**
   * Check if entity can dodge
   */
  canDodge(entityId: string): boolean {
    const state = this.dodgeStates.get(entityId)
    if (!state) return true
    return Date.now() >= state.cooldownEndTime && !state.isDodging
  }

  /**
   * Get dodge cooldown remaining
   */
  getCooldownRemaining(entityId: string): number {
    const state = this.dodgeStates.get(entityId)
    if (!state) return 0
    const remaining = state.cooldownEndTime - Date.now()
    return Math.max(0, remaining)
  }

  /**
   * Normalize direction vector
   */
  private normalizeDirection(dir: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z)
    if (length === 0) {
      return { x: 0, y: 0, z: 0 }
    }
    return {
      x: dir.x / length,
      y: dir.y / length,
      z: dir.z / length
    }
  }

  /**
   * Set dodge configuration
   */
  setConfig(config: Partial<DodgeConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

export const dodgeManager = new DodgeManager()

