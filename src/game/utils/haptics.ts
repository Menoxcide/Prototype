/**
 * Haptic Feedback Utility
 * Provides vibration patterns for game events using Vibration API
 */

const HAPTIC_PATTERNS = {
  jump: [50], // Short pulse
  grapple: [30, 50, 30], // Double pulse
  landing: [80], // Medium pulse
  wallRun: [20, 20, 20, 20, 20], // Continuous vibration
  airDash: [40, 30, 40], // Triple pulse
  damage: [100], // Strong pulse
  heal: [30, 30, 30] // Gentle pulses
}

class HapticManager {
  private isSupported: boolean
  private isEnabled: boolean = true

  constructor() {
    // Check if Vibration API is supported
    this.isSupported = 'vibrate' in navigator || 'vibrate' in (navigator as any)
    
    // Check user preference (can be disabled in settings)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hapticsEnabled')
      if (saved !== null) {
        this.isEnabled = saved === 'true'
      }
    }
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('hapticsEnabled', enabled.toString())
    }
  }

  /**
   * Check if haptics are enabled
   */
  getEnabled(): boolean {
    return this.isEnabled && this.isSupported
  }

  /**
   * Trigger haptic feedback with a pattern
   */
  vibrate(pattern: number | number[]): void {
    if (!this.getEnabled() || !this.isSupported) return

    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern)
      } else if ((navigator as any).vibrate) {
        (navigator as any).vibrate(pattern)
      }
    } catch (error) {
      // Silently fail if vibration is not available
      if (import.meta.env.DEV) {
        console.debug('Haptic feedback not available:', error)
      }
    }
  }

  /**
   * Jump haptic feedback
   */
  jump(): void {
    this.vibrate(HAPTIC_PATTERNS.jump)
  }

  /**
   * Grapple haptic feedback
   */
  grapple(): void {
    this.vibrate(HAPTIC_PATTERNS.grapple)
  }

  /**
   * Landing haptic feedback
   */
  landing(intensity: number = 1): void {
    // Scale pattern based on intensity
    const pattern = HAPTIC_PATTERNS.landing.map(v => Math.floor(v * intensity))
    this.vibrate(pattern)
  }

  /**
   * Wall-run haptic feedback
   */
  wallRun(): void {
    this.vibrate(HAPTIC_PATTERNS.wallRun)
  }

  /**
   * Air dash haptic feedback
   */
  airDash(): void {
    this.vibrate(HAPTIC_PATTERNS.airDash)
  }

  /**
   * Damage haptic feedback
   */
  damage(): void {
    this.vibrate(HAPTIC_PATTERNS.damage)
  }

  /**
   * Heal haptic feedback
   */
  heal(): void {
    this.vibrate(HAPTIC_PATTERNS.heal)
  }
}

export const hapticManager = new HapticManager()
