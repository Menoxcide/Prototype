/**
 * Terrain Generator - Creates height maps, rivers, mountains, and landscapes
 * Kid-friendly terrain generation for tablet MMO
 */

export interface TerrainChunk {
  x: number
  z: number
  heightMap: number[][]
  biome: string
  objects: TerrainObject[]
  rivers: River[]
  mountains: Mountain[]
}

export interface TerrainObject {
  id: string
  type: string
  position: { x: number; y: number; z: number }
  rotation: number
  scale: number
}

export interface River {
  id: string
  path: { x: number; z: number }[]
  width: number
  depth: number
  color: string
}

export interface Mountain {
  id: string
  position: { x: number; y: number; z: number }
  height: number
  radius: number
  color: string
}

export interface TerrainConfig {
  chunkSize: number
  heightMapResolution: number
  maxHeight: number
  minHeight: number
  noiseScale: number
  riverCount: number
  mountainCount: number
  smoothness: number
}

const DEFAULT_CONFIG: TerrainConfig = {
  chunkSize: 100,
  heightMapResolution: 32,
  maxHeight: 20,
  minHeight: 0,
  noiseScale: 0.1,
  riverCount: 2,
  mountainCount: 3,
  smoothness: 0.5
}

/**
 * Simple noise function for terrain generation
 */
function noise(x: number, z: number, scale: number = 0.1): number {
  const n = Math.sin(x * scale) * Math.cos(z * scale)
  return (n + 1) / 2 // Normalize to 0-1
}

/**
 * Generate height map for a chunk
 */
export function generateHeightMap(
  chunkX: number,
  chunkZ: number,
  config: TerrainConfig = DEFAULT_CONFIG
): number[][] {
  const { heightMapResolution, maxHeight, minHeight, noiseScale } = config
  const heightMap: number[][] = []
  
  for (let x = 0; x < heightMapResolution; x++) {
    heightMap[x] = []
    for (let z = 0; z < heightMapResolution; z++) {
      const worldX = chunkX * config.chunkSize + (x / heightMapResolution) * config.chunkSize
      const worldZ = chunkZ * config.chunkSize + (z / heightMapResolution) * config.chunkSize
      
      // Multi-octave noise for more natural terrain
      let height = 0
      height += noise(worldX, worldZ, noiseScale) * 1.0
      height += noise(worldX, worldZ, noiseScale * 2) * 0.5
      height += noise(worldX, worldZ, noiseScale * 4) * 0.25
      
      // Normalize and scale
      height = minHeight + (maxHeight - minHeight) * height
      heightMap[x][z] = height
    }
  }
  
  return heightMap
}

/**
 * Smooth height map
 */
export function smoothHeightMap(
  heightMap: number[][],
  iterations: number = 1
): number[][] {
  const smoothed = heightMap.map(row => [...row])
  const width = heightMap.length
  const depth = heightMap[0].length
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let x = 1; x < width - 1; x++) {
      for (let z = 1; z < depth - 1; z++) {
        const avg = (
          smoothed[x - 1][z] +
          smoothed[x + 1][z] +
          smoothed[x][z - 1] +
          smoothed[x][z + 1]
        ) / 4
        smoothed[x][z] = smoothed[x][z] * 0.7 + avg * 0.3
      }
    }
  }
  
  return smoothed
}

/**
 * Generate rivers in a chunk
 */
export function generateRivers(
  chunkX: number,
  chunkZ: number,
  config: TerrainConfig = DEFAULT_CONFIG
): River[] {
  const rivers: River[] = []
  const { riverCount, chunkSize } = config
  
  for (let i = 0; i < riverCount; i++) {
    // Simple river generation - straight line for now
    const startX = (Math.random() - 0.5) * chunkSize
    const startZ = -chunkSize / 2
    const endX = (Math.random() - 0.5) * chunkSize
    const endZ = chunkSize / 2
    
    const path: { x: number; z: number }[] = []
    const steps = 20
    
    for (let step = 0; step <= steps; step++) {
      const t = step / steps
      const x = startX + (endX - startX) * t
      const z = startZ + (endZ - startZ) * t
      
      // Add some noise to make it more natural
      const noiseX = (Math.random() - 0.5) * 5
      const noiseZ = (Math.random() - 0.5) * 5
      
      path.push({
        x: chunkX * chunkSize + x + noiseX,
        z: chunkZ * chunkSize + z + noiseZ
      })
    }
    
    rivers.push({
      id: `river_${chunkX}_${chunkZ}_${i}`,
      path,
      width: 3 + Math.random() * 2,
      depth: 0.5,
      color: '#00BFFF'
    })
  }
  
  return rivers
}

/**
 * Generate mountains in a chunk
 */
export function generateMountains(
  chunkX: number,
  chunkZ: number,
  config: TerrainConfig = DEFAULT_CONFIG
): Mountain[] {
  const mountains: Mountain[] = []
  const { mountainCount, chunkSize, maxHeight } = config
  
  for (let i = 0; i < mountainCount; i++) {
    const x = chunkX * chunkSize + (Math.random() - 0.5) * chunkSize * 0.8
    const z = chunkZ * chunkSize + (Math.random() - 0.5) * chunkSize * 0.8
    const height = maxHeight * 0.5 + Math.random() * maxHeight * 0.5
    const radius = 10 + Math.random() * 15
    
    mountains.push({
      id: `mountain_${chunkX}_${chunkZ}_${i}`,
      position: { x, y: height / 2, z },
      height,
      radius,
      color: '#8B7355'
    })
  }
  
  return mountains
}

/**
 * Generate a complete terrain chunk
 */
export function generateTerrainChunk(
  chunkX: number,
  chunkZ: number,
  biomeId: string,
  config: TerrainConfig = DEFAULT_CONFIG
): TerrainChunk {
  const heightMap = generateHeightMap(chunkX, chunkZ, config)
  const smoothedHeightMap = smoothHeightMap(heightMap, 2)
  const rivers = generateRivers(chunkX, chunkZ, config)
  const mountains = generateMountains(chunkX, chunkZ, config)
  
  return {
    x: chunkX,
    z: chunkZ,
    heightMap: smoothedHeightMap,
    biome: biomeId,
    objects: [],
    rivers,
    mountains
  }
}

/**
 * Get height at a specific world position
 */
export function getHeightAt(
  x: number,
  z: number,
  heightMap: number[][],
  chunkX: number,
  chunkZ: number,
  config: TerrainConfig = DEFAULT_CONFIG
): number {
  const localX = (x - chunkX * config.chunkSize) / config.chunkSize
  const localZ = (z - chunkZ * config.chunkSize) / config.chunkSize
  
  const mapX = Math.floor(localX * heightMap.length)
  const mapZ = Math.floor(localZ * heightMap[0].length)
  
  if (mapX < 0 || mapX >= heightMap.length || mapZ < 0 || mapZ >= heightMap[0].length) {
    return 0
  }
  
  return heightMap[mapX][mapZ]
}

/**
 * Check if position is in water (river)
 */
export function isInWater(
  x: number,
  z: number,
  rivers: River[]
): boolean {
  for (const river of rivers) {
    for (let i = 0; i < river.path.length - 1; i++) {
      const p1 = river.path[i]
      const p2 = river.path[i + 1]
      
      const dist = distanceToLineSegment(x, z, p1.x, p1.z, p2.x, p2.z)
      if (dist < river.width / 2) {
        return true
      }
    }
  }
  return false
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1
  const dz = z2 - z1
  const length2 = dx * dx + dz * dz
  
  if (length2 === 0) {
    return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2)
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / length2))
  const projX = x1 + t * dx
  const projZ = z1 + t * dz
  
  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2)
}

/**
 * Generate terrain objects based on biome
 */
export function generateTerrainObjects(
  chunk: TerrainChunk,
  biomeObjects: any[],
  density: number = 0.1
): TerrainObject[] {
  const objects: TerrainObject[] = []
  const { chunkSize } = DEFAULT_CONFIG
  
  for (const objTemplate of biomeObjects) {
    const count = Math.floor(objTemplate.spawnRate * density * 100)
    
    for (let i = 0; i < count; i++) {
      const x = chunk.x * chunkSize + (Math.random() - 0.5) * chunkSize * 0.9
      const z = chunk.z * chunkSize + (Math.random() - 0.5) * chunkSize * 0.9
      const rotation = Math.random() * Math.PI * 2
      const scale = 0.8 + Math.random() * 0.4
      
      objects.push({
        id: `${objTemplate.id}_${chunk.x}_${chunk.z}_${i}`,
        type: objTemplate.id,
        position: { x, y: 0, z },
        rotation,
        scale
      })
    }
  }
  
  return objects
}

