/**
 * Biome Spawn Points
 * Defines spawn positions for each biome when players teleport via portals
 * Each biome has a unique spawn location to prevent overlap
 */

export interface BiomeSpawnPoint {
  x: number
  y: number
  z: number
}

// Spawn points for each biome - arranged in a grid pattern to prevent overlap
// Each biome is spaced 200 units apart
const BIOME_SPAWN_POINTS: Map<string, BiomeSpawnPoint> = new Map([
  // Starting biomes - safe and friendly (near origin)
  ['sunflower_meadows', { x: 0, y: 1.1, z: 0 }],
  ['crystal_forest', { x: 200, y: 1.1, z: 0 }],
  ['rainbow_hills', { x: 0, y: 1.1, z: 200 }],
  
  // Mid-level biomes
  ['candy_canyon', { x: 200, y: 1.1, z: 200 }],
  ['ocean_reef', { x: -200, y: 1.1, z: 0 }],
  ['starlight_desert', { x: 0, y: 1.1, z: -200 }],
  
  // Advanced biomes
  ['frosty_peaks', { x: -200, y: 1.1, z: 200 }],
  ['volcano_islands', { x: 200, y: 1.1, z: -200 }],
  ['cloud_kingdom', { x: -200, y: 1.1, z: -200 }],
  
  // High-level biomes
  ['enchanted_grove', { x: 400, y: 1.1, z: 0 }],
  ['neon_city', { x: 0, y: 1.1, z: 400 }],
  ['cosmic_garden', { x: 400, y: 1.1, z: 400 }],
])

/**
 * Get spawn point for a biome
 * Returns default spawn if biome not found
 */
export function getBiomeSpawnPoint(biomeId: string): BiomeSpawnPoint {
  const spawnPoint = BIOME_SPAWN_POINTS.get(biomeId)
  if (spawnPoint) {
    return spawnPoint
  }
  
  // Fallback: return origin if biome not found
  console.warn(`No spawn point defined for biome: ${biomeId}, using default`)
  return { x: 0, y: 1.1, z: 0 }
}

/**
 * Get all spawn points (for debugging/visualization)
 */
export function getAllBiomeSpawnPoints(): Map<string, BiomeSpawnPoint> {
  return new Map(BIOME_SPAWN_POINTS)
}

/**
 * Check if a biome has a defined spawn point
 */
export function hasBiomeSpawnPoint(biomeId: string): boolean {
  return BIOME_SPAWN_POINTS.has(biomeId)
}

