/**
 * Feature Flag System
 * Centralized feature toggles for debugging and performance optimization
 * Flags are persisted in localStorage for consistency across sessions
 */

export type FeatureFlag = 
  | 'weatherEnabled'
  | 'postProcessingEnabled'
  | 'shadowsEnabled'
  | 'networkReconciliationEnabled'
  | 'collisionDetectionEnabled'
  | 'cameraSmoothingEnabled'

interface FeatureFlags {
  weatherEnabled: boolean
  postProcessingEnabled: boolean
  shadowsEnabled: boolean
  networkReconciliationEnabled: boolean
  collisionDetectionEnabled: boolean
  cameraSmoothingEnabled: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  weatherEnabled: false, // Disabled by default to investigate stuttering
  postProcessingEnabled: true,
  shadowsEnabled: true,
  networkReconciliationEnabled: true,
  collisionDetectionEnabled: true,
  cameraSmoothingEnabled: true,
}

const STORAGE_KEY = 'gameFeatureFlags'

/**
 * Load feature flags from localStorage or return defaults
 */
function loadFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle new flags
      return { ...DEFAULT_FLAGS, ...parsed }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to load feature flags from localStorage:', error)
    }
  }
  return { ...DEFAULT_FLAGS }
}

/**
 * Save feature flags to localStorage
 */
function saveFlags(flags: FeatureFlags): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to save feature flags to localStorage:', error)
    }
  }
}

// Internal state
let flags: FeatureFlags = loadFlags()

/**
 * Get the current value of a feature flag
 */
export function getFeatureFlag(flag: FeatureFlag): boolean {
  return flags[flag]
}

/**
 * Set a feature flag value
 */
export function setFeatureFlag(flag: FeatureFlag, value: boolean): void {
  flags[flag] = value
  saveFlags(flags)
  
  if (import.meta.env.DEV) {
    console.log(`Feature flag "${flag}" set to ${value}`)
  }
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return getFeatureFlag(flag)
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags(): void {
  flags = { ...DEFAULT_FLAGS }
  saveFlags(flags)
  
  if (import.meta.env.DEV) {
    console.log('All feature flags reset to defaults')
  }
}

/**
 * Get all feature flags (for debugging)
 */
export function getAllFeatureFlags(): Readonly<FeatureFlags> {
  return { ...flags }
}

/**
 * Set multiple feature flags at once
 */
export function setFeatureFlags(newFlags: Partial<FeatureFlags>): void {
  flags = { ...flags, ...newFlags }
  saveFlags(flags)
  
  if (import.meta.env.DEV) {
    console.log('Feature flags updated:', newFlags)
  }
}

// Reload flags on module load to ensure consistency
flags = loadFlags()

