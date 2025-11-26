// Re-export for convenience
export { useGameStore } from './gameStore'

/**
 * Helper hook for selective state subscriptions
 * Use this instead of useGameStore() directly to reduce re-renders
 * 
 * Example:
 *   const player = useGameStoreSelector(state => state.player)
 *   const enemies = useGameStoreSelector(state => state.enemies)
 */
import { useGameStore as useGameStoreBase } from './gameStore'

// Shallow equality function for comparing objects/arrays
function shallow<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (!(key in b) || !Object.is((a as any)[key], (b as any)[key])) {
      return false
    }
  }
  
  return true
}

export function useGameStoreSelector<T>(
  selector: (state: ReturnType<typeof useGameStoreBase.getState>) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  // Zustand's useStore hook accepts selector and optional equality function
  // Type assertion needed due to Zustand's type definitions
  return (useGameStoreBase as any)(selector, equalityFn || shallow)
}

