/**
 * DeltaCompressor - Compresses state updates by only sending changes
 * Reduces network bandwidth by sending deltas instead of full state
 */

import { DeltaUpdate } from '../types'

export interface DeltaCompressor {
  compress(current: any, previous: any): DeltaUpdate[]
  decompress(base: any, deltas: DeltaUpdate[]): any
}

/**
 * Creates a new DeltaCompressor instance
 */
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

  return {
    compress(current: any, previous: any): DeltaUpdate[] {
      return compressRecursive(current, previous)
    },

    decompress(base: any, deltas: DeltaUpdate[]): any {
      if (!base) {
        base = {}
      }

      const result = JSON.parse(JSON.stringify(base)) // Deep clone

      for (const delta of deltas) {
        const pathParts = delta.path.split(/[\.\[\]]/).filter(p => p !== '')
        let target: any = result

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

