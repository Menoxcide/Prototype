/**
 * DeltaCompressor for server-side state updates
 * Compresses state changes to reduce network bandwidth
 */

export interface DeltaUpdate {
  path: string
  value: unknown
  operation: 'set' | 'delete' | 'add' | 'remove'
}

export interface DeltaCompressor {
  compress(current: Record<string, unknown>, previous: Record<string, unknown> | null, threshold?: number): DeltaUpdate[]
  decompress(base: Record<string, unknown>, deltas: DeltaUpdate[]): Record<string, unknown>
  shouldSendDelta(deltas: DeltaUpdate[], threshold?: number): boolean
}

export function createDeltaCompressor(): DeltaCompressor {
  function compressRecursive(current: any, previous: any, path = ''): DeltaUpdate[] {
    const deltas: DeltaUpdate[] = []

    // Handle null/undefined cases
    if (current === null || current === undefined) {
      if (previous !== null && previous !== undefined) {
        deltas.push({ path, value: null, operation: 'delete' })
      }
      return deltas
    }

    if (previous === null || previous === undefined) {
      deltas.push({ path, value: current, operation: 'set' })
      return deltas
    }

    // Handle primitives
    if (typeof current !== 'object' || current instanceof Date) {
      if (current !== previous) {
        deltas.push({ path, value: current, operation: 'set' })
      }
      return deltas
    }

    // Handle arrays
    if (Array.isArray(current)) {
      const prevArray = Array.isArray(previous) ? previous : []
      
      // Check for additions/removals
      if (current.length !== prevArray.length) {
        deltas.push({ path, value: current, operation: 'set' })
        return deltas
      }

      // Check each element
      for (let i = 0; i < current.length; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`
        deltas.push(...compressRecursive(current[i], prevArray[i], itemPath))
      }
      return deltas
    }

    // Handle objects
    const currentKeys = new Set(Object.keys(current))
    const previousKeys = new Set(Object.keys(previous))

    // Check for deleted keys
    for (const key of previousKeys) {
      if (!currentKeys.has(key)) {
        const keyPath = path ? `${path}.${key}` : key
        deltas.push({ path: keyPath, value: null, operation: 'delete' })
      }
    }

    // Check for added/changed keys
    for (const key of currentKeys) {
      const keyPath = path ? `${path}.${key}` : key
      if (!previousKeys.has(key)) {
        deltas.push({ path: keyPath, value: current[key], operation: 'set' })
      } else {
        deltas.push(...compressRecursive(current[key], previous[key], keyPath))
      }
    }

    return deltas
  }

  /**
   * Calculate change magnitude for a delta
   */
  function calculateChangeMagnitude(delta: DeltaUpdate): number {
    if (delta.operation === 'delete') return 1.0
    if (delta.operation === 'set') {
      // For numeric values, calculate relative change
      if (typeof delta.value === 'number') {
        return Math.abs(delta.value)
      }
      // For objects/arrays, use size as magnitude
      if (typeof delta.value === 'object') {
        return JSON.stringify(delta.value).length
      }
      return 1.0
    }
    return 0.5
  }

  return {
    compress(current: any, previous: any, threshold: number = 0): DeltaUpdate[] {
      const deltas = compressRecursive(current, previous)
      
      // If threshold is set, filter out small changes
      if (threshold > 0) {
        return deltas.filter(delta => calculateChangeMagnitude(delta) >= threshold)
      }
      
      return deltas
    },
    
    shouldSendDelta(deltas: DeltaUpdate[], threshold: number = 0): boolean {
      if (deltas.length === 0) return false
      if (threshold === 0) return true
      
      // Check if any delta exceeds threshold
      return deltas.some(delta => calculateChangeMagnitude(delta) >= threshold)
    },

    decompress(base: Record<string, unknown>, deltas: DeltaUpdate[]): Record<string, unknown> {
      if (!base) {
        base = {}
      }

      const result = JSON.parse(JSON.stringify(base)) // Deep clone

      for (const delta of deltas) {
        const pathParts = delta.path.split(/[\.\[\]]/).filter(p => p !== '')
        let target: Record<string, unknown> = result

        // Navigate to the target location
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i]
          if (!target[part]) {
            target[part] = {}
          }
          target = target[part]
        }

        const finalKey = pathParts[pathParts.length - 1]

        switch (delta.operation) {
          case 'set':
            target[finalKey] = delta.value
            break
          case 'delete':
            delete target[finalKey]
            break
          case 'add':
            if (Array.isArray(target[finalKey])) {
              target[finalKey].push(delta.value)
            }
            break
          case 'remove':
            if (Array.isArray(target[finalKey])) {
              const index = target[finalKey].indexOf(delta.value)
              if (index > -1) {
                target[finalKey].splice(index, 1)
              }
            }
            break
        }
      }

      return result
    }
  }
}

