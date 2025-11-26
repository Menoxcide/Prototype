/**
 * Terrain utility functions
 */

/**
 * Get terrain height at a position (for collision)
 * For city streets, keep it flat
 */
export function getTerrainHeight(_x: number, _z: number): number {
  // Flat city streets - can add slight variation if needed
  return 0
}

