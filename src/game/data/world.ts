/**
 * World Data Index - Central export for all world-related data
 */

export * from './biomes'
export * from './npcs'
export * from './towns'
export * from './monsters'
export * from './environmentalObjects'
export * from './zones'

// Re-export for convenience
import { BIOMES, getBiome, getBiomesByLevel, getBiomeByPosition } from './biomes'
import { NPCS, getNPC, getNPCsByBiome, getNPCsByTown, getNPCsByType } from './npcs'
import { TOWNS, getTown, getTownsByBiome, isInSafeZone, getNearestTown } from './towns'
import { MONSTERS, getMonster, getMonstersByBiome, getMonstersByLevel, getBossMonsters } from './monsters'
import { 
  ENVIRONMENTAL_OBJECTS, 
  getEnvironmentalObject, 
  getEnvironmentalObjectsByBiome,
  getHarvestableObjects,
  getObjectsByType
} from './environmentalObjects'

export const WORLD_DATA = {
  biomes: BIOMES,
  npcs: NPCS,
  towns: TOWNS,
  monsters: MONSTERS,
  environmentalObjects: ENVIRONMENTAL_OBJECTS
}

export const WORLD_FUNCTIONS = {
  // Biome functions
  getBiome,
  getBiomesByLevel,
  getBiomeByPosition,
  
  // NPC functions
  getNPC,
  getNPCsByBiome,
  getNPCsByTown,
  getNPCsByType,
  
  // Town functions
  getTown,
  getTownsByBiome,
  isInSafeZone,
  getNearestTown,
  
  // Monster functions
  getMonster,
  getMonstersByBiome,
  getMonstersByLevel,
  getBossMonsters,
  
  // Environmental object functions
  getEnvironmentalObject,
  getEnvironmentalObjectsByBiome,
  getHarvestableObjects,
  getObjectsByType
}

