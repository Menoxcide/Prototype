/**
 * Centralized Cooldown Management System
 * Tracks cooldowns for all game actions (spells, grapple, jump, etc.)
 */

export class CooldownManager {
  private cooldowns: Map<string, number> = new Map() // Action ID -> remaining time in ms

  /**
   * Start a cooldown for an action
   * @param actionId Unique identifier for the action (e.g., 'grapple', 'spell:quantum_bolt')
   * @param duration Cooldown duration in milliseconds
   */
  startCooldown(actionId: string, duration: number): void {
    this.cooldowns.set(actionId, duration)
  }

  /**
   * Check if an action is currently on cooldown
   * @param actionId Unique identifier for the action
   * @returns true if action is on cooldown
   */
  isOnCooldown(actionId: string): boolean {
    const remaining = this.cooldowns.get(actionId) || 0
    return remaining > 0
  }

  /**
   * Get remaining cooldown time in milliseconds
   * @param actionId Unique identifier for the action
   * @returns Remaining time in ms, or 0 if not on cooldown
   */
  getRemainingCooldown(actionId: string): number {
    return Math.max(0, this.cooldowns.get(actionId) || 0)
  }

  /**
   * Get cooldown progress as a value between 0 and 1
   * @param actionId Unique identifier for the action
   * @param totalDuration Total cooldown duration in ms (needed to calculate progress)
   * @returns Progress from 0 (just started) to 1 (ready)
   */
  getCooldownProgress(actionId: string, totalDuration: number): number {
    const remaining = this.getRemainingCooldown(actionId)
    if (remaining === 0) return 1
    return 1 - (remaining / totalDuration)
  }

  /**
   * Update all cooldowns (call every frame)
   * @param deltaTime Time elapsed since last update in seconds
   */
  update(deltaTime: number): void {
    const deltaMs = deltaTime * 1000
    const toRemove: string[] = []

    this.cooldowns.forEach((remaining, actionId) => {
      const newRemaining = remaining - deltaMs
      if (newRemaining <= 0) {
        toRemove.push(actionId)
      } else {
        this.cooldowns.set(actionId, newRemaining)
      }
    })

    // Remove expired cooldowns
    toRemove.forEach(actionId => this.cooldowns.delete(actionId))
  }

  /**
   * Clear a specific cooldown
   * @param actionId Unique identifier for the action
   */
  clearCooldown(actionId: string): void {
    this.cooldowns.delete(actionId)
  }

  /**
   * Clear all cooldowns
   */
  clearAllCooldowns(): void {
    this.cooldowns.clear()
  }

  /**
   * Get all active cooldowns (for debugging/UI)
   * @returns Map of action IDs to remaining times
   */
  getAllCooldowns(): Map<string, number> {
    return new Map(this.cooldowns)
  }
}

// Singleton instance
let cooldownManagerInstance: CooldownManager | null = null

/**
 * Get the global cooldown manager instance
 */
export function getCooldownManager(): CooldownManager {
  if (!cooldownManagerInstance) {
    cooldownManagerInstance = new CooldownManager()
  }
  return cooldownManagerInstance
}

/**
 * Reset the cooldown manager (useful for testing or resetting state)
 */
export function resetCooldownManager(): void {
  cooldownManagerInstance = new CooldownManager()
}

