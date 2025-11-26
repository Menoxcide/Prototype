/**
 * Biome Teleportation System
 * Handles teleporting players between biomes via portals
 */

import { useGameStore } from '../store/useGameStore'
import { getBiome } from '../data/biomes'
import { getBiomeSpawnPoint } from '../data/biomeSpawns'

/**
 * Teleport player to a specific biome
 * Updates player position, zone, and store state
 */
export function teleportToBiome(biomeId: string): boolean {
  const store = useGameStore.getState()
  const player = store.player
  
  if (!player) {
    console.warn('Cannot teleport: player not found')
    return false
  }
  
  // Get biome data
  const biome = getBiome(biomeId)
  if (!biome) {
    console.warn(`Cannot teleport: biome not found: ${biomeId}`)
    return false
  }
  
  // Get spawn point for biome
  const spawnPoint = getBiomeSpawnPoint(biomeId)
  
  // Update player position
  store.updatePlayerPosition({
    x: spawnPoint.x,
    y: spawnPoint.y,
    z: spawnPoint.z
  })
  
  // Update player zone property
  const updatedPlayer = {
    ...player,
    zone: biomeId
  }
  store.setPlayer(updatedPlayer)
  
  // Update store currentZone
  store.setCurrentZone(biomeId)
  
  // Log teleportation
  if (import.meta.env.DEV) {
    console.log(`🌍 Teleported to biome: ${biome.name} (${biomeId})`, {
      position: spawnPoint,
      biome: biome.name,
      levelRange: biome.levelRange
    })
  }
  
  return true
}

/**
 * Check if player can teleport to a biome (level requirements, etc.)
 */
export function canTeleportToBiome(biomeId: string, playerLevel: number): boolean {
  const biome = getBiome(biomeId)
  if (!biome) {
    return false
  }
  
  // Check level requirements
  const [minLevel, maxLevel] = biome.levelRange
  return playerLevel >= minLevel && playerLevel <= maxLevel
}

