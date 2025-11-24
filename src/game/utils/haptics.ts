// Haptic feedback utilities
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if ('vibrate' in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 50,
      heavy: 100
    }
    navigator.vibrate(patterns[type])
  }
}

export function triggerHapticPattern(pattern: number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Game-specific haptic patterns
export const HAPTIC_PATTERNS = {
  spellCast: [10, 20, 10],
  enemyHit: [30, 20, 30],
  lootPickup: [20],
  levelUp: [50, 30, 50, 30, 50],
  death: [100, 50, 100]
}

