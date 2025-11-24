/**
 * Environmental Combat Interactions - Terrain-based combat mechanics
 */

export interface EnvironmentalHazard {
  id: string
  type: 'fire' | 'poison' | 'electric' | 'ice' | 'acid'
  position: { x: number; y: number; z: number }
  radius: number
  damage: number
  duration: number
  createdAt: number
}

export interface CoverObject {
  id: string
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  coverValue: number // 0-1, reduces incoming damage
}

class EnvironmentalCombatManager {
  private hazards: Map<string, EnvironmentalHazard> = new Map()
  private coverObjects: Map<string, CoverObject> = new Map()

  /**
   * Create environmental hazard
   */
  createHazard(
    type: EnvironmentalHazard['type'],
    position: { x: number; y: number; z: number },
    radius: number,
    damage: number,
    duration: number
  ): EnvironmentalHazard {
    const hazard: EnvironmentalHazard = {
      id: `hazard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      radius,
      damage,
      duration,
      createdAt: Date.now()
    }

    this.hazards.set(hazard.id, hazard)
    return hazard
  }

  /**
   * Check if entity is in hazard
   */
  checkHazardDamage(
    entityPosition: { x: number; y: number; z: number },
    _entityId: string
  ): { damage: number; hazardType: EnvironmentalHazard['type'] | null } {
    const now = Date.now()
    let totalDamage = 0
    let hazardType: EnvironmentalHazard['type'] | null = null

    for (const [id, hazard] of this.hazards.entries()) {
      // Check if expired
      if (now - hazard.createdAt > hazard.duration) {
        this.hazards.delete(id)
        continue
      }

      // Check distance
      const dx = entityPosition.x - hazard.position.x
      const dz = entityPosition.z - hazard.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance <= hazard.radius) {
        totalDamage += hazard.damage
        hazardType = hazard.type
      }
    }

    return { damage: totalDamage, hazardType }
  }

  /**
   * Add cover object
   */
  addCover(cover: CoverObject): void {
    this.coverObjects.set(cover.id, cover)
  }

  /**
   * Remove cover object
   */
  removeCover(coverId: string): void {
    this.coverObjects.delete(coverId)
  }

  /**
   * Check if position has cover
   */
  getCoverValue(position: { x: number; y: number; z: number }): number {
    let maxCover = 0

    for (const cover of this.coverObjects.values()) {
      const dx = Math.abs(position.x - cover.position.x)
      const dz = Math.abs(position.z - cover.position.z)

      if (dx <= cover.size.width / 2 && dz <= cover.size.depth / 2) {
        maxCover = Math.max(maxCover, cover.coverValue)
      }
    }

    return maxCover
  }

  /**
   * Check if line of sight is blocked
   */
  isLineOfSightBlocked(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number }
  ): boolean {
    // Simple line-of-sight check against cover objects
    for (const cover of this.coverObjects.values()) {
      // Check if line intersects with cover object
      if (this.lineIntersectsBox(from, to, cover)) {
        return true
      }
    }
    return false
  }

  private lineIntersectsBox(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    box: CoverObject
  ): boolean {
    // Simplified AABB line intersection
    const minX = box.position.x - box.size.width / 2
    const minZ = box.position.z - box.size.depth / 2
    const maxZ = box.position.z + box.size.depth / 2

    // Check if line segment intersects box
    const t = (minX - from.x) / (to.x - from.x)
    if (t >= 0 && t <= 1) {
      const y = from.z + t * (to.z - from.z)
      if (y >= minZ && y <= maxZ) {
        return true
      }
    }

    return false
  }

  /**
   * Cleanup expired hazards
   */
  cleanup(): void {
    const now = Date.now()
    for (const [id, hazard] of this.hazards.entries()) {
      if (now - hazard.createdAt > hazard.duration) {
        this.hazards.delete(id)
      }
    }
  }

  /**
   * Get all hazards
   */
  getHazards(): EnvironmentalHazard[] {
    return Array.from(this.hazards.values())
  }

  /**
   * Get all cover objects
   */
  getCoverObjects(): CoverObject[] {
    return Array.from(this.coverObjects.values())
  }
}

export const environmentalCombatManager = new EnvironmentalCombatManager()

