/**
 * Snapshot Interpolation
 * Smooths entity movement between server updates to eliminate visual jitter
 */

export interface Snapshot {
  timestamp: number
  position: { x: number; y: number; z: number }
  rotation: number
}

export interface InterpolatedState {
  position: { x: number; y: number; z: number }
  rotation: number
}

class SnapshotInterpolator {
  private snapshots: Map<string, Snapshot[]> = new Map()
  private readonly MAX_SNAPSHOTS = 3
  private readonly INTERPOLATION_DELAY = 100 // ms delay for interpolation

  /**
   * Add a snapshot for an entity
   */
  addSnapshot(entityId: string, snapshot: Snapshot): void {
    if (!this.snapshots.has(entityId)) {
      this.snapshots.set(entityId, [])
    }

    const snapshots = this.snapshots.get(entityId)!
    snapshots.push(snapshot)

    // Keep only recent snapshots
    if (snapshots.length > this.MAX_SNAPSHOTS) {
      snapshots.shift()
    }
  }

  /**
   * Get interpolated state for an entity
   */
  getInterpolatedState(entityId: string, currentTime: number): InterpolatedState | null {
    const snapshots = this.snapshots.get(entityId)
    if (!snapshots || snapshots.length < 2) {
      return null
    }

    // Find two snapshots to interpolate between
    const targetTime = currentTime - this.INTERPOLATION_DELAY
    
    let snapshot1: Snapshot | null = null
    let snapshot2: Snapshot | null = null

    for (let i = 0; i < snapshots.length - 1; i++) {
      if (snapshots[i].timestamp <= targetTime && snapshots[i + 1].timestamp >= targetTime) {
        snapshot1 = snapshots[i]
        snapshot2 = snapshots[i + 1]
        break
      }
    }

    // If no valid pair found, use most recent snapshot
    if (!snapshot1 || !snapshot2) {
      const latest = snapshots[snapshots.length - 1]
      return {
        position: { ...latest.position },
        rotation: latest.rotation
      }
    }

    // Interpolate between snapshots
    const timeDiff = snapshot2.timestamp - snapshot1.timestamp
    if (timeDiff === 0) {
      return {
        position: { ...snapshot1.position },
        rotation: snapshot1.rotation
      }
    }

    const t = (targetTime - snapshot1.timestamp) / timeDiff
    const clampedT = Math.max(0, Math.min(1, t))

    return {
      position: {
        x: snapshot1.position.x + (snapshot2.position.x - snapshot1.position.x) * clampedT,
        y: snapshot1.position.y + (snapshot2.position.y - snapshot1.position.y) * clampedT,
        z: snapshot1.position.z + (snapshot2.position.z - snapshot1.position.z) * clampedT
      },
      rotation: snapshot1.rotation + (snapshot2.rotation - snapshot1.rotation) * clampedT
    }
  }

  /**
   * Remove snapshots for an entity
   */
  removeEntity(entityId: string): void {
    this.snapshots.delete(entityId)
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear()
  }
}

// Singleton instance
export const snapshotInterpolator = new SnapshotInterpolator()

/**
 * Add a snapshot for interpolation
 */
export function addSnapshot(entityId: string, position: { x: number; y: number; z: number }, rotation: number): void {
  snapshotInterpolator.addSnapshot(entityId, {
    timestamp: Date.now(),
    position,
    rotation
  })
}

/**
 * Get interpolated state
 */
export function getInterpolatedState(entityId: string): InterpolatedState | null {
  return snapshotInterpolator.getInterpolatedState(entityId, Date.now())
}

